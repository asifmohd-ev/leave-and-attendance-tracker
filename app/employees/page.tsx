"use client";

import { useStore } from "@/lib/store";
import { useState, useEffect } from "react";
import { Plus, Trash2, User, ChevronRight, Edit2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function EmployeesPage() {
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const { employees, addEmployee, removeEmployee, updateEmployee } = useStore();
  
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-10 w-64 bg-white border border-slate-200 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-64 bg-white border border-slate-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const openAddModal = () => {
    setName("");
    setPhotoUrl("");
    setEditingId(null);
    setModalOpen(true);
  };

  const openEditModal = (emp: { id: string; name: string; photoUrl?: string }) => {
    setName(emp.name);
    setPhotoUrl(emp.photoUrl || "");
    setEditingId(emp.id);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    if (editingId) {
      updateEmployee(editingId, { name: name.trim(), photoUrl: photoUrl.trim() });
    } else {
      addEmployee({ name: name.trim(), photoUrl: photoUrl.trim() });
    }
    
    setName("");
    setPhotoUrl("");
    setEditingId(null);
    setModalOpen(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-10">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Employee Directory</h1>
          <p className="text-slate-500 mt-1 text-base">Manage personnel profiles and workforce information.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2.5 transition-all shadow-md shadow-teal-100"
        >
          <Plus size={18} strokeWidth={2.5}/> Add Employee
        </button>
      </header>

      {employees.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-24 text-center flex flex-col items-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mb-6 border-2 border-slate-100 border-dashed">
            <User size={32} strokeWidth={2} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">No personnel records</h3>
          <p className="text-slate-500 max-w-xs mt-2 mb-8 text-sm">Start by adding an employee to the directory tracker.</p>
          <button onClick={openAddModal} className="text-teal-600 font-bold text-xs border-b-2 border-teal-100 hover:border-teal-400 pb-1 transition-all">
            Add your first employee
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((emp) => (
            <div key={emp.id} className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 flex flex-col group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 bg-slate-50 border-2 border-white shadow-sm flex flex-shrink-0 items-center justify-center rounded-full overflow-hidden group-hover:scale-105 transition-transform">
                    {emp.photoUrl ? (
                      <img src={emp.photoUrl} alt={emp.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-slate-300">{emp.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="max-w-[140px] truncate">
                    <h3 className="font-bold text-lg text-slate-800 tracking-tight group-hover:text-teal-600 transition-colors">{emp.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 tabular-nums uppercase tracking-wider">ID: {emp.id.slice(0, 8)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => openEditModal(emp)} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-slate-50 rounded-lg transition-all border border-transparent hover:border-slate-100">
                     <Edit2 size={16} strokeWidth={2.5} />
                   </button>
                   <button onClick={() => removeEmployee(emp.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-lg transition-all border border-transparent hover:border-slate-100">
                     <Trash2 size={16} strokeWidth={2.5} />
                   </button>
                </div>
              </div>
              <div className="mt-8 flex items-center justify-between pt-5 border-t border-slate-50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest tabular-nums">
                  Since {format(new Date(emp.joinDate), 'MMM yyyy')}
                </span>
                <Link href={`/employees/${emp.id}`} className="text-[11px] font-bold text-teal-600 flex items-center gap-1.5 hover:text-teal-700 transition-all uppercase tracking-wider">
                  Profile <ChevronRight size={14} strokeWidth={2.5} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white shadow-2xl border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden transition-all duration-500">
            <div className="p-10 border-b border-slate-50 flex items-center gap-5 bg-slate-50/30">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
                {editingId ? <Edit2 size={20} strokeWidth={2.5}/> : <Plus size={20} strokeWidth={2.5}/>}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  {editingId ? "Edit Info" : "New Employee"}
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">Please provide valid information below.</p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                <input 
                  type="text" 
                  required 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-5 py-3.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl focus:border-teal-400 focus:outline-none transition-all placeholder:text-slate-300 font-semibold text-sm shadow-inner"
                  placeholder="e.g. Adam Jensen"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Avatar URL (Optional)</label>
                <input 
                  type="url" 
                  value={photoUrl} 
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full px-5 py-3.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl focus:border-teal-400 focus:outline-none transition-all placeholder:text-slate-300 font-semibold text-sm shadow-inner"
                  placeholder="https://images.unsplash.com/photo-..."
                />
              </div>
              <div className="flex gap-4 pt-6">
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3.5 px-4 font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 transition-all text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3.5 px-4 font-bold text-white bg-teal-600 hover:bg-teal-700 transition-all text-xs rounded-xl shadow-md shadow-teal-100"
                >
                  {editingId ? 'Update Info' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
