"use client";

import { useStore, LeaveType } from "@/lib/store";
import { useState, useEffect } from "react";
import { format, eachDayOfInterval } from "date-fns";
import { CalendarOff, Trash2, Zap, CircleDashed, AlertTriangle } from "lucide-react";

export default function LeavesPage() {
  const [mounted, setMounted] = useState(false);
  const { employees, leaves, attendance, addLeave, removeLeave } = useStore();
  
  const [selectedEmp, setSelectedEmp] = useState("");
  const [leaveDate, setLeaveDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [leaveType, setLeaveType] = useState<LeaveType>("Sick/Emergency");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const handleAddLeave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!selectedEmp || !leaveDate) return;

    let finalStart = leaveDate;
    let finalEnd = leaveDate;

    if (leaveType === 'Annual') {
       finalStart = leaveDate;
       finalEnd = toDate;
    }

    // Generate dates to check for simple attendance collisions 
    const dateArray = eachDayOfInterval({ start: new Date(finalStart), end: new Date(finalEnd) }).map(d => format(d, 'yyyy-MM-dd'));

    const hasCollision = dateArray.some(d => 
      attendance.some(a => a.employeeId === selectedEmp && a.date === d && a.checkIn)
    );

    if (hasCollision) {
      setErrorMsg("Leave collision: Employee already registered presence for selected dates.");
      return;
    }

    addLeave(selectedEmp, finalStart, finalEnd, leaveType);

    setSelectedEmp("");
    setErrorMsg("");
  };

  // Fallback to .date for old documents before the migration
  const normalizedLeaves = leaves.map(l => ({
    ...l,
    startDate: l.startDate || (l as any).date || format(new Date(), 'yyyy-MM-dd'),
    endDate: l.endDate || (l as any).date || format(new Date(), 'yyyy-MM-dd')
  }));

  // we don't need complex grouping logic anymore because they are already range documents in the backend!
  const groupedLeaves = [...normalizedLeaves].sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-10">
      <header className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Leave Management</h1>
        <p className="text-slate-500 mt-1 text-base">Track and manage employee absences and leave protocols.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Form Column */}
        <div className="lg:col-span-4 space-y-6">
          <form onSubmit={handleAddLeave} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-8 pb-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shadow-sm">
                  <CalendarOff size={20} strokeWidth={2.5}/>
                </div>
                Assign New Entry
              </h2>
            </div>

            <div className="p-8 space-y-8 flex-1">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-xs font-semibold flex items-start gap-3">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              
              <div className="space-y-8">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Leave Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setLeaveType("Sick/Emergency")}
                      className={`flex flex-col items-center justify-center gap-3 py-6 border-2 transition-all rounded-xl ${leaveType === 'Sick/Emergency' ? 'border-teal-600 bg-teal-50 text-teal-700 shadow-sm' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                    >
                      <Zap size={24} strokeWidth={2.5} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Sick/Emerg.</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaveType("Annual")}
                      className={`flex flex-col items-center justify-center gap-3 py-6 border-2 transition-all rounded-xl ${leaveType === 'Annual' ? 'border-teal-600 bg-teal-50 text-teal-700 shadow-sm' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                    >
                      <CircleDashed size={24} strokeWidth={2.5} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Annual</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Personnel</label>
                  <select 
                    value={selectedEmp}
                    onChange={(e) => setSelectedEmp(e.target.value)}
                    required
                    className="w-full px-5 py-3.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl focus:border-teal-400 focus:outline-none transition-all font-semibold appearance-none text-sm shadow-inner"
                  >
                    <option value="" disabled>Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                {leaveType === 'Sick/Emergency' ? (
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Date</label>
                    <input 
                      type="date"
                      required
                      value={leaveDate}
                      onChange={(e) => setLeaveDate(e.target.value)}
                      className="w-full px-5 py-3.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl focus:border-teal-400 focus:outline-none transition-all font-semibold text-sm shadow-inner"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">From</label>
                      <input 
                        type="date"
                        required
                        value={leaveDate}
                        onChange={(e) => setLeaveDate(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl focus:border-teal-400 focus:outline-none transition-all font-semibold text-xs shadow-inner"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Until</label>
                      <input 
                        type="date"
                        required
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        min={leaveDate}
                        className="w-full px-4 py-3 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl focus:border-teal-400 focus:outline-none transition-all font-semibold text-xs shadow-inner"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 pt-0">
              <button 
                type="submit"
                disabled={!selectedEmp || !leaveDate || employees.length === 0}
                className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-teal-100"
              >
                Log Absence
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-800 tracking-tight">System History</h2>
              <span className="px-3 py-1 bg-white border border-slate-200 text-slate-500 text-[10px] font-bold rounded-lg shadow-sm tabular-nums">
                {leaves.length} Entries Marked
              </span>
            </div>
            
            {groupedLeaves.length === 0 ? (
              <div className="p-20 text-center flex flex-col items-center justify-center flex-1 space-y-4">
                <CalendarOff size={40} className="text-slate-200" strokeWidth={2} />
                <p className="font-semibold text-slate-400 text-sm">No leave records identified.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 overflow-y-auto" style={{ maxHeight: '800px' }}>
                {groupedLeaves.map(group => {
                  const emp = employees.find(e => e.id === group.employeeId);
                  if (!emp) return null;
                  
                  return (
                    <div key={group.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 px-8 hover:bg-slate-50/80 transition-all gap-6 group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 border-2 border-white text-slate-400 font-bold text-lg flex items-center justify-center shadow-sm rounded-full shrink-0 group-hover:scale-105 transition-transform">
                          {emp.photoUrl ? <img src={emp.photoUrl} alt="" className="w-full h-full object-cover rounded-full"/> : emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 tracking-tight group-hover:text-teal-600 transition-colors">{emp.name}</p>
                          <p className="text-[11px] font-semibold text-slate-400 tabular-nums">
                            {group.startDate === group.endDate 
                              ? format(new Date(group.startDate), 'EEEE, MMM dd, yyyy')
                              : `${format(new Date(group.startDate), 'MMM dd')} - ${format(new Date(group.endDate), 'MMM dd, yyyy')} (${eachDayOfInterval({start: new Date(group.startDate), end: new Date(group.endDate)}).length} days)`
                            }
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-8 w-full sm:w-auto">
                        <span className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-lg border shadow-sm ${
                          group.type === 'Annual' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-500'
                        }`}>
                          {group.type}
                        </span>
                        
                        <button 
                          onClick={() => removeLeave(group.id)}
                          className="p-2.5 text-slate-400 border border-slate-100 hover:border-rose-200 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 rounded-lg"
                        >
                          <Trash2 size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
