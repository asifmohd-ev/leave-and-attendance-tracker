"use client";

import { useStore } from "@/lib/store";
import { useState, useEffect } from "react";
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trash2, RotateCcw, User, CalendarOff, Shield } from "lucide-react";
import { format } from "date-fns";

type DeletedUser = {
  uid: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  deletedAt?: string | null;
};

export default function RecycleBinPage() {
  const [mounted, setMounted] = useState(false);
  const { employees, leaves, restoreEmployee, restoreLeave, permanentlyDeleteEmployee, permanentlyDeleteLeave } = useStore();
  const [deletedUsers, setDeletedUsers] = useState<DeletedUser[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const unsub = onSnapshot(collection(db, "system_users"), (snapshot) => {
      const allUsers = snapshot.docs.map((d) => ({ uid: d.id, ...d.data() } as DeletedUser));
      setDeletedUsers(allUsers.filter(u => u.deletedAt));
    });
    return () => unsub();
  }, []);

  const handleRestoreUser = async (uid: string) => {
    await updateDoc(doc(db, "system_users", uid), { deletedAt: null });
  };

  const handlePermanentDeleteUser = async (uid: string) => {
    await deleteDoc(doc(db, "system_users", uid));
  };

  if (!mounted) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-10 w-64 bg-white border border-slate-200 rounded-xl" />
      </div>
    );
  }

  const deletedEmployees = employees.filter(e => e.deletedAt);
  const deletedLeaves = leaves.filter(l => l.deletedAt);
  const hasItems = deletedEmployees.length > 0 || deletedLeaves.length > 0 || deletedUsers.length > 0;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-5xl mx-auto pb-10">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Recycle Bin</h1>
          <p className="text-slate-500 mt-1 text-base">Restore accidentally deleted data or permanently remove it.</p>
        </div>
      </header>

      {!hasItems ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-24 text-center flex flex-col items-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mb-6 border-2 border-slate-100 border-dashed">
            <Trash2 size={32} strokeWidth={2} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Recycle bin is empty</h3>
          <p className="text-slate-500 max-w-xs mt-2 text-sm">Deleted items will appear here so you can restore them.</p>
        </div>
      ) : (
        <div className="space-y-8">

          {/* Deleted Employees */}
          {deletedEmployees.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <User size={18} className="text-rose-500" strokeWidth={2.5} />
                  <h2 className="text-sm font-bold text-slate-800">Deleted Employees</h2>
                </div>
                <span className="px-3 py-1 bg-rose-50 border border-rose-200 text-rose-600 text-[10px] font-bold rounded-lg">
                  {deletedEmployees.length} item(s)
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {deletedEmployees.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between p-5 px-6 hover:bg-slate-50/80 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-rose-100 text-rose-500 font-bold flex items-center justify-center rounded-full text-sm">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{emp.name}</p>
                        <p className="text-[10px] font-semibold text-slate-400">
                          Deleted {emp.deletedAt ? format(new Date(emp.deletedAt), 'MMM dd, yyyy HH:mm') : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => restoreEmployee(emp.id)}
                        className="p-2.5 text-teal-600 hover:bg-teal-50 border border-transparent hover:border-teal-200 rounded-lg transition-all"
                        title="Restore"
                      >
                        <RotateCcw size={16} strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => permanentlyDeleteEmployee(emp.id)}
                        className="p-2.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-all"
                        title="Permanently Delete"
                      >
                        <Trash2 size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deleted Leaves */}
          {deletedLeaves.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <CalendarOff size={18} className="text-rose-500" strokeWidth={2.5} />
                  <h2 className="text-sm font-bold text-slate-800">Deleted Leaves</h2>
                </div>
                <span className="px-3 py-1 bg-rose-50 border border-rose-200 text-rose-600 text-[10px] font-bold rounded-lg">
                  {deletedLeaves.length} item(s)
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {deletedLeaves.map(leave => {
                  const emp = employees.find(e => e.id === leave.employeeId);
                  return (
                    <div key={leave.id} className="flex items-center justify-between p-5 px-6 hover:bg-slate-50/80 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-rose-100 text-rose-500 font-bold flex items-center justify-center rounded-full text-sm">
                          {emp ? emp.name.charAt(0) : '?'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{emp ? emp.name : 'Unknown Employee'}</p>
                          <p className="text-[10px] font-semibold text-slate-400">
                            {leave.startDate === leave.endDate
                              ? format(new Date(leave.startDate), 'MMM dd, yyyy')
                              : `${format(new Date(leave.startDate), 'MMM dd')} - ${format(new Date(leave.endDate), 'MMM dd, yyyy')}`
                            } &middot; {leave.type}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => restoreLeave(leave.id)}
                          className="p-2.5 text-teal-600 hover:bg-teal-50 border border-transparent hover:border-teal-200 rounded-lg transition-all"
                          title="Restore"
                        >
                          <RotateCcw size={16} strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={() => permanentlyDeleteLeave(leave.id)}
                          className="p-2.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-all"
                          title="Permanently Delete"
                        >
                          <Trash2 size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Deleted Users */}
          {deletedUsers.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-rose-500" strokeWidth={2.5} />
                  <h2 className="text-sm font-bold text-slate-800">Deleted Users</h2>
                </div>
                <span className="px-3 py-1 bg-rose-50 border border-rose-200 text-rose-600 text-[10px] font-bold rounded-lg">
                  {deletedUsers.length} item(s)
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {deletedUsers.map(su => (
                  <div key={su.uid} className="flex items-center justify-between p-5 px-6 hover:bg-slate-50/80 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-rose-100 text-rose-500 font-bold flex items-center justify-center rounded-full text-sm">
                        {su.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{su.name}</p>
                        <p className="text-[10px] font-semibold text-slate-400">
                          {su.email} &middot; {su.role}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestoreUser(su.uid)}
                        className="p-2.5 text-teal-600 hover:bg-teal-50 border border-transparent hover:border-teal-200 rounded-lg transition-all"
                        title="Restore"
                      >
                        <RotateCcw size={16} strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => handlePermanentDeleteUser(su.uid)}
                        className="p-2.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-all"
                        title="Permanently Delete"
                      >
                        <Trash2 size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
