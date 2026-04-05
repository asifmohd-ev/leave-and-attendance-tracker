import { create } from 'zustand';
import { db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';

export type Employee = {
  id: string;
  name: string;
  photoUrl?: string;
  joinDate: string; // ISO String
};

export type Attendance = {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // e.g. "09:00 AM"
  checkOut?: string; // e.g. "05:00 PM"
};

export type LeaveType = 'Annual' | 'Sick/Emergency';

export type Leave = {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  type: LeaveType;
};

interface AppState {
  employees: Employee[];
  attendance: Attendance[];
  leaves: Leave[];
  
  // Setters for listeners
  setEmployees: (employees: Employee[]) => void;
  setAttendance: (attendance: Attendance[]) => void;
  setLeaves: (leaves: Leave[]) => void;
  
  // Actions
  addEmployee: (emp: { name: string; photoUrl?: string }) => Promise<void>;
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  removeEmployee: (id: string) => Promise<void>;
  markAttendance: (employeeId: string, date: string, type: 'checkIn' | 'checkOut', time: string) => Promise<void>;
  addLeave: (employeeId: string, date: string, type: LeaveType) => Promise<void>;
  removeLeave: (id: string) => Promise<void>;
  
  // Initializer
  initRealtimeSync: () => () => void;
}

export const useStore = create<AppState>()((set, get) => ({
  employees: [],
  attendance: [],
  leaves: [],
  
  setEmployees: (employees) => set({ employees }),
  setAttendance: (attendance) => set({ attendance }),
  setLeaves: (leaves) => set({ leaves }),
  
  initRealtimeSync: () => {
    // Listen to Employees
    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
      const employeesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      set({ employees: employeesData });
    });

    // Listen to Attendance
    const unsubAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
      const attendanceData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance));
      set({ attendance: attendanceData });
    });

    // Listen to Leaves
    const unsubLeaves = onSnapshot(collection(db, 'leaves'), (snapshot) => {
      const leavesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Leave));
      set({ leaves: leavesData });
    });

    return () => {
      unsubEmployees();
      unsubAttendance();
      unsubLeaves();
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
    // Delete employee
    await deleteDoc(doc(db, 'employees', id));
    
    // Cleanup related attendance
    const state = get();
    const relatedAttendance = state.attendance.filter(a => a.employeeId === id);
    for (const a of relatedAttendance) {
      deleteDoc(doc(db, 'attendance', a.id));
    }
    
    // Cleanup related leaves
    const relatedLeaves = state.leaves.filter(l => l.employeeId === id);
    for (const l of relatedLeaves) {
      deleteDoc(doc(db, 'leaves', l.id));
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
  
  addLeave: async (employeeId, date, type) => {
    const state = get();
    const exists = state.leaves.find((l) => l.employeeId === employeeId && l.date === date);
    if (exists) return; // Prevent duplicate leave
    
    const id = crypto.randomUUID();
    await setDoc(doc(db, 'leaves', id), {
      employeeId,
      date,
      type
    });
  },
  
  removeLeave: async (id) => {
    await deleteDoc(doc(db, 'leaves', id));
  }
}));
