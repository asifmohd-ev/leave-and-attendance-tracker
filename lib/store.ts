import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  
  // Actions
  addEmployee: (emp: { name: string; photoUrl?: string }) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  removeEmployee: (id: string) => void;
  markAttendance: (employeeId: string, date: string, type: 'checkIn' | 'checkOut', time: string) => void;
  addLeave: (employeeId: string, date: string, type: LeaveType) => void;
  removeLeave: (id: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      employees: [],
      attendance: [],
      leaves: [],
      
      addEmployee: ({ name, photoUrl }) => set((state) => ({
        employees: [
          ...state.employees,
          {
            id: crypto.randomUUID(),
            name,
            photoUrl,
            joinDate: new Date().toISOString()
          }
        ]
      })),
      
      updateEmployee: (id, updates) => set((state) => ({
        employees: state.employees.map((e) => 
          e.id === id ? { ...e, ...updates } : e
        )
      })),
      
      removeEmployee: (id) => set((state) => ({
        employees: state.employees.filter((e) => e.id !== id),
        attendance: state.attendance.filter((a) => a.employeeId !== id),
        leaves: state.leaves.filter((l) => l.employeeId !== id),
      })),
      
      markAttendance: (employeeId, date, type, time) => set((state) => {
        const existing = state.attendance.find((a) => a.employeeId === employeeId && a.date === date);
        
        if (existing) {
          return {
            attendance: state.attendance.map((a) => 
              a.id === existing.id ? { ...a, [type]: time } : a
            )
          };
        } else {
          return {
            attendance: [
              ...state.attendance,
              {
                id: crypto.randomUUID(),
                employeeId,
                date,
                [type]: time
              }
            ]
          };
        }
      }),
      
      addLeave: (employeeId, date, type) => set((state) => {
        // Prevent duplicate leave on same day
        const exists = state.leaves.find((l) => l.employeeId === employeeId && l.date === date);
        if (exists) return state;
        
        return {
          leaves: [
            ...state.leaves,
            {
              id: crypto.randomUUID(),
              employeeId,
              date,
              type
            }
          ]
        };
      }),
      
      removeLeave: (id) => set((state) => ({
        leaves: state.leaves.filter((l) => l.id !== id)
      }))
    }),
    {
      name: 'attendance-leave-storage', // key in local storage
    }
  )
);
