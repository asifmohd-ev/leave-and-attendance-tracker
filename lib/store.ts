import { create } from 'zustand';
import { db, auth } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  getDoc 
} from 'firebase/firestore';

export type Employee = {
  id: string;
  name: string;
  photoUrl?: string;
  joinDate: string; // ISO String
  authUid?: string;
  deletedAt?: string | null;
};

export type Attendance = {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // e.g. "09:00 AM"
  checkOut?: string; // e.g. "05:00 PM"
  deletedAt?: string | null;
};

export type LeaveType = 'Annual' | 'Sick/Emergency';

export type Leave = {
  id: string;
  employeeId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  type: LeaveType;
  deletedAt?: string | null;
};

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected';

export type LeaveRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  type: LeaveType;
  reason: string;
  status: LeaveRequestStatus;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  type: 'holiday' | 'custom';
  color?: string;
  description?: string;
};

interface AppState {
  user: FirebaseUser | null;
  userRole: 'admin' | 'employee' | null;
  authLoaded: boolean;
  employees: Employee[];
  attendance: Attendance[];
  leaves: Leave[];
  leaveRequests: LeaveRequest[];
  calendarEvents: CalendarEvent[];

  // Setters for listeners
  setUser: (user: FirebaseUser | null) => void;
  setUserRole: (role: 'admin' | 'employee' | null) => void;
  setAuthLoaded: (loaded: boolean) => void;
  setEmployees: (employees: Employee[]) => void;
  setAttendance: (attendance: Attendance[]) => void;
  setLeaves: (leaves: Leave[]) => void;
  setLeaveRequests: (requests: LeaveRequest[]) => void;
  setCalendarEvents: (events: CalendarEvent[]) => void;
  
  // Actions
  addEmployee: (emp: { name: string; photoUrl?: string }) => Promise<void>;
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  removeEmployee: (id: string) => Promise<void>;
  markAttendance: (employeeId: string, date: string, type: 'checkIn' | 'checkOut', time: string) => Promise<void>;
  addLeave: (employeeId: string, startDate: string, endDate: string, type: LeaveType) => Promise<boolean>;
  updateLeave: (id: string, startDate: string, endDate: string) => Promise<boolean>;
  removeLeave: (id: string) => Promise<void>;
  
  restoreEmployee: (id: string) => Promise<void>;
  restoreLeave: (id: string) => Promise<void>;
  permanentlyDeleteEmployee: (id: string) => Promise<void>;
  permanentlyDeleteLeave: (id: string) => Promise<void>;
  
  // Initializer
  initRealtimeSync: () => () => void;

  addLeaveRequest: (employeeId: string, employeeName: string, startDate: string, endDate: string, reason: string) => Promise<void>;
  updateLeaveRequestStatus: (id: string, status: LeaveRequestStatus, reviewedBy: string) => Promise<void>;
  addCalendarEvent: (title: string, date: string, description?: string) => Promise<void>;
  removeCalendarEvent: (id: string) => Promise<void>;
  
  // Report Links
  saveReportConfig: (config: Record<string, unknown>, snapshot?: unknown) => Promise<string>;
  getReportConfig: (id: string) => Promise<Record<string, unknown> | null>;
}

export const useStore = create<AppState>()((set, get) => ({
  user: null,
  userRole: null,
  authLoaded: false,
  employees: [],
  attendance: [],
  leaves: [],
  leaveRequests: [],
  calendarEvents: [],

  setUser: (user) => set({ user }),
  setUserRole: (role) => set({ userRole: role }),
  setAuthLoaded: (authLoaded) => set({ authLoaded }),
  setEmployees: (employees) => set({ employees }),
  setAttendance: (attendance) => set({ attendance }),
  setLeaves: (leaves) => set({ leaves }),
  setLeaveRequests: (requests) => set({ leaveRequests: requests }),
  setCalendarEvents: (events) => set({ calendarEvents: events }),

  initRealtimeSync: () => {
    let unsubEmployees: (() => void) | null = null;
    let unsubAttendance: (() => void) | null = null;
    let unsubLeaves: (() => void) | null = null;
    let unsubLeaveRequests: (() => void) | null = null;
    let unsubCalendarEvents: (() => void) | null = null;

    const startCollectionListeners = () => {
      // Listen to Employees
      unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
        const employeesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
        set({ employees: employeesData });
      }, (err) => console.error('employees snapshot error:', err));

      // Listen to Attendance
      unsubAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
        const attendanceData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance));
        set({ attendance: attendanceData });
      }, (err) => console.error('attendance snapshot error:', err));

      // Listen to Leaves
      unsubLeaves = onSnapshot(collection(db, 'leaves'), (snapshot) => {
        const leavesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Leave));
        set({ leaves: leavesData });
      }, (err) => console.error('leaves snapshot error:', err));

      // Listen to Leave Requests
      unsubLeaveRequests = onSnapshot(collection(db, 'leave_requests'), (snapshot) => {
        const requestsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest));
        set({ leaveRequests: requestsData });
      }, (err) => console.error('leave_requests snapshot error:', err));

      // Listen to Calendar Events
      unsubCalendarEvents = onSnapshot(collection(db, 'calendar_events'), (snapshot) => {
        const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarEvent));
        set({ calendarEvents: eventsData });
      }, (err) => console.error('calendar_events snapshot error:', err));
    };

    const stopCollectionListeners = () => {
      unsubEmployees?.();
      unsubAttendance?.();
      unsubLeaves?.();
      unsubLeaveRequests?.();
      unsubCalendarEvents?.();
      unsubEmployees = null;
      unsubAttendance = null;
      unsubLeaves = null;
      unsubLeaveRequests = null;
      unsubCalendarEvents = null;
      // Clear data when logged out
      set({ employees: [], attendance: [], leaves: [], leaveRequests: [], calendarEvents: [] });
    };

    // Only start Firestore listeners once auth is confirmed
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      set({ user, authLoaded: true });
      if (user) {
        startCollectionListeners();
        // Fetch user role
        try {
          const userDoc = await getDoc(doc(db, 'system_users', user.uid));
          if (userDoc.exists()) {
            set({ userRole: userDoc.data().role as 'admin' | 'employee' });
          }
        } catch {}
      } else {
        stopCollectionListeners();
        set({ userRole: null });
      }
    });

    return () => {
      unsubAuth();
      stopCollectionListeners();
    };
  },
  
  addEmployee: async ({ name, photoUrl }) => {
    const id = crypto.randomUUID();
    await setDoc(doc(db, 'employees', id), {
      name,
      photoUrl: photoUrl || null,
      joinDate: new Date().toISOString()
    });
  },
  
  updateEmployee: async (id, updates) => {
    const empRef = doc(db, 'employees', id);
    await updateDoc(empRef, updates);
  },
  
  removeEmployee: async (id) => {
    const deletedAt = new Date().toISOString();
    await updateDoc(doc(db, 'employees', id), { deletedAt });
    
    const state = get();
    const relatedAttendance = state.attendance.filter(a => a.employeeId === id);
    for (const a of relatedAttendance) {
      updateDoc(doc(db, 'attendance', a.id), { deletedAt });
    }
    
    const relatedLeaves = state.leaves.filter(l => l.employeeId === id);
    for (const l of relatedLeaves) {
      updateDoc(doc(db, 'leaves', l.id), { deletedAt });
    }
  },
  
  markAttendance: async (employeeId, date, type, time) => {
    const state = get();
    const existing = state.attendance.find((a) => a.employeeId === employeeId && a.date === date);
    
    if (existing) {
      const attendanceRef = doc(db, 'attendance', existing.id);
      await updateDoc(attendanceRef, { [type]: time });
    } else {
      const id = crypto.randomUUID();
      await setDoc(doc(db, 'attendance', id), {
        employeeId,
        date,
        [type]: time
      });
    }
  },
  
  addLeave: async (employeeId, startDate, endDate, type) => {
    // Check if a leave overlaps entirely (basic check, can be expanded)
    const state = get();
    const isCollision = state.leaves.some((l) => {
       if (l.employeeId !== employeeId) return false;
       if (l.deletedAt) return false;
       return (startDate <= l.endDate && endDate >= l.startDate);
    });

    if (isCollision) return false; // overlap

    const id = crypto.randomUUID();
    await setDoc(doc(db, 'leaves', id), {
      employeeId,
      startDate,
      endDate,
      type
    });
    return true;
  },
  
  updateLeave: async (id, startDate, endDate) => {
    const state = get();
    const current = state.leaves.find(l => l.id === id);
    if (!current) return false;

    const isCollision = state.leaves.some((l) => {
      if (l.id === id) return false;
      if (l.employeeId !== current.employeeId) return false;
      if (l.deletedAt) return false;
      return (startDate <= l.endDate && endDate >= l.startDate);
    });

    if (isCollision) return false; // overlap

    await updateDoc(doc(db, 'leaves', id), { startDate, endDate });
    return true;
  },

  removeLeave: async (id) => {
    await updateDoc(doc(db, 'leaves', id), { deletedAt: new Date().toISOString() });
  },

  restoreEmployee: async (id) => {
    await updateDoc(doc(db, 'employees', id), { deletedAt: null });
    
    const state = get();
    const relatedAttendance = state.attendance.filter(a => a.employeeId === id);
    for (const a of relatedAttendance) {
      updateDoc(doc(db, 'attendance', a.id), { deletedAt: null });
    }
    
    const relatedLeaves = state.leaves.filter(l => l.employeeId === id);
    for (const l of relatedLeaves) {
      updateDoc(doc(db, 'leaves', l.id), { deletedAt: null });
    }
  },

  restoreLeave: async (id) => {
    await updateDoc(doc(db, 'leaves', id), { deletedAt: null });
  },

  permanentlyDeleteEmployee: async (id) => {
    await deleteDoc(doc(db, 'employees', id));
    
    const state = get();
    const relatedAttendance = state.attendance.filter(a => a.employeeId === id);
    for (const a of relatedAttendance) {
      deleteDoc(doc(db, 'attendance', a.id));
    }
    
    const relatedLeaves = state.leaves.filter(l => l.employeeId === id);
    for (const l of relatedLeaves) {
      deleteDoc(doc(db, 'leaves', l.id));
    }
  },

  permanentlyDeleteLeave: async (id) => {
    await deleteDoc(doc(db, 'leaves', id));
  },

  addLeaveRequest: async (employeeId, employeeName, startDate, endDate, reason) => {
    const id = crypto.randomUUID();
    await setDoc(doc(db, 'leave_requests', id), {
      employeeId,
      employeeName,
      startDate,
      endDate,
      type: 'Annual',
      reason,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
  },

  updateLeaveRequestStatus: async (id, status, reviewedBy) => {
    await updateDoc(doc(db, 'leave_requests', id), {
      status,
      reviewedBy,
      reviewedAt: new Date().toISOString()
    });
    // If approved, also add to leaves collection
    if (status === 'approved') {
      const state = get();
      const req = state.leaveRequests.find(r => r.id === id);
      if (req) {
        await setDoc(doc(db, 'leaves', crypto.randomUUID()), {
          employeeId: req.employeeId,
          startDate: req.startDate,
          endDate: req.endDate,
          type: 'Annual'
        });
      }
    }
  },

  addCalendarEvent: async (title, date, description) => {
    const id = crypto.randomUUID();
    await setDoc(doc(db, 'calendar_events', id), {
      title,
      date,
      type: 'custom',
      description: description || '',
      color: '#0D9488'
    });
  },

  removeCalendarEvent: async (id) => {
    await deleteDoc(doc(db, 'calendar_events', id));
  },

  saveReportConfig: async (config) => {
    // Generate a short ID (6 chars)
    const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let shortId = '';
    for (let i = 0; i < 6; i++) {
      shortId += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }

    await setDoc(doc(db, 'short_links', shortId), {
      ...config,
      createdAt: new Date().toISOString()
    });

    return shortId;
  },

  getReportConfig: async (id) => {
    const { getDoc } = await import('firebase/firestore');
    const docRef = doc(db, 'short_links', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  }
}));
