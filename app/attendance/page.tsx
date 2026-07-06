"use client";

import { useStore } from "@/lib/store";
import { useState, useEffect } from "react";
import { format, parse } from "date-fns";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, Palmtree, ShieldAlert } from "lucide-react";

// Helpers for bidirectional time format conversion
const to24Hour = (time12h: string) => {
  if (!time12h) return "";
  const d = parse(time12h, 'hh:mm a', new Date());
  return format(d, 'HH:mm');
};

const to12Hour = (time24h: string) => {
  if (!time24h) return "";
  const d = parse(time24h, 'HH:mm', new Date());
  return format(d, 'hh:mm a');
};

export default function AttendancePage() {
  const [mounted, setMounted] = useState(false);
  const { employees, attendance, leaves, markAttendance } = useStore();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const getCurrentTime12Hour = () => format(new Date(), 'hh:mm a');
  const activeEmployees = employees.filter(e => !e.deletedAt);
  const activeAttendanceRecords = attendance.filter(a => !a.deletedAt);
  const activeLeaves = leaves.filter(l => !l.deletedAt);

  const handleQuickMark = (employeeId: string, type: 'checkIn' | 'checkOut') => {
    markAttendance(employeeId, dateStr, type, getCurrentTime12Hour());
  };

  const handleManualSelect = (employeeId: string, type: 'checkIn' | 'checkOut', val24h: string) => {
    if(!val24h) return;
    markAttendance(employeeId, dateStr, type, to12Hour(val24h));
  };

  const handleUncheck = (employeeId: string, type: 'checkIn' | 'checkOut') => {
    markAttendance(employeeId, dateStr, type, "");
  };

  const nextDay = () => {
    const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d);
  };
  const prevDay = () => {
    const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-10">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Attendance Log</h1>
          <p className="text-slate-500 mt-1 text-base">Daily registry for personnel presence and session tracking.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm">
          <button onClick={prevDay} className="p-2 hover:bg-slate-100 transition-all rounded-lg text-slate-400 hover:text-slate-900">
            <ChevronLeft size={18} strokeWidth={2.5}/>
          </button>
          <div className="font-semibold text-slate-700 min-w-[140px] text-center text-xs">
            {format(selectedDate, 'MMM dd, yyyy')}
          </div>
          <button onClick={nextDay} className="p-2 hover:bg-slate-100 transition-all rounded-lg text-slate-400 hover:text-slate-900">
            <ChevronRight size={18} strokeWidth={2.5}/>
          </button>
        </div>
      </header>

      {activeEmployees.length === 0 ? (
        <div className="bg-white p-20 text-center rounded-2xl border border-slate-200 text-slate-400 text-sm font-medium">
          No personnel records found in the database.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-8 py-5">Employee</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5">Check In</th>
                  <th className="px-8 py-5">Check Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeEmployees.map((emp) => {
                  const record = activeAttendanceRecords.find(a => a.employeeId === emp.id && a.date === dateStr);
                  const isPresent = !!record?.checkIn;
                  const currentLeave = activeLeaves.find(l => {
                    if (l.employeeId !== emp.id) return false;
                    const start = l.startDate || (l as { date?: string }).date;
                    const end = l.endDate || (l as { date?: string }).date;
                    if (!start || !end) return false;
                    return dateStr >= start && dateStr <= end; 
                  });
                  
                  return (
                    <tr key={emp.id} className={`transition-all duration-200 ${currentLeave ? 'bg-rose-50/30' : 'hover:bg-slate-50 group'}`}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-11 h-11 border-2 transition-colors flex items-center justify-center font-bold text-sm flex-shrink-0 rounded-full overflow-hidden ${currentLeave ? 'bg-rose-100 border-white text-rose-600 shadow-sm' : 'bg-slate-100 border-white text-slate-500'}`}>
                            {emp.photoUrl ? <img src={emp.photoUrl} alt="" className="w-full h-full object-cover"/> : emp.name.charAt(0)}
                          </div>
                          <span className={`font-semibold text-sm tracking-tight ${currentLeave ? 'text-rose-700' : 'text-slate-700'}`}>{emp.name}</span>
                        </div>
                      </td>
                      
                      <td className="px-8 py-6">
                        {currentLeave ? (
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-100 text-rose-700 text-[10px] font-bold uppercase tracking-wider rounded-lg">
                            {currentLeave.type === 'Annual' ? <Palmtree size={12} strokeWidth={3}/> : <ShieldAlert size={12} strokeWidth={3}/>} 
                            ON LEAVE
                          </span>
                        ) : isPresent ? (
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-lg">
                            <CheckCircle2 size={12} strokeWidth={3} /> Present
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider rounded-lg">
                            <Circle size={12} strokeWidth={3} /> Pending
                          </span>
                        )}
                      </td>

                      {currentLeave ? (
                        <td colSpan={2} className="px-8 py-6 text-sm font-medium text-rose-400 italic opacity-60 text-center">
                           Leave protocol active
                        </td>
                      ) : (
                        <>
                          <td className="px-8 py-6">
                            {record?.checkIn ? (
                              <div className="flex items-center gap-4">
                                <span className="font-bold text-lg text-slate-900 border-b-2 border-teal-200 pb-0.5 tabular-nums">{record.checkIn}</span>
                                <div className="flex gap-2">
                                  <input 
                                    type="time"
                                    className="text-[11px] font-bold text-slate-400 outline-none bg-slate-50 border border-slate-200 px-2 py-1 rounded-md focus:border-teal-400 transition-all lg:opacity-0 group-hover:opacity-100"
                                    onChange={(e) => handleManualSelect(emp.id, 'checkIn', e.target.value)}
                                    value={to24Hour(record.checkIn || "")}
                                  />
                                  <button
                                    onClick={() => handleUncheck(emp.id, 'checkIn')}
                                    className="text-[11px] font-bold text-rose-500 outline-none bg-rose-50 border border-rose-200 px-2 py-1 rounded-md hover:bg-rose-100 transition-all lg:opacity-0 group-hover:opacity-100"
                                  >
                                    Undo
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => handleQuickMark(emp.id, 'checkIn')}
                                  className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 text-[11px] font-bold rounded-lg transition-all shadow-sm"
                                >
                                  Check In
                                </button>
                                <input 
                                  type="time"
                                  className="bg-white border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 outline-none focus:border-teal-400 transition-all rounded-lg w-32"
                                  onChange={(e) => handleManualSelect(emp.id, 'checkIn', e.target.value)}
                                  value={""}
                                />
                              </div>
                            )}
                          </td>
                          <td className="px-8 py-6">
                            {record?.checkOut ? (
                              <div className="flex items-center gap-4">
                                <span className="font-bold text-lg text-slate-900 border-b-2 border-teal-200 pb-0.5 tabular-nums">{record.checkOut}</span>
                                <div className="flex gap-2">
                                  <input 
                                    type="time"
                                    className="text-[11px] font-bold text-slate-400 outline-none bg-slate-50 border border-slate-200 px-2 py-1 rounded-md focus:border-teal-400 transition-all lg:opacity-0 group-hover:opacity-100"
                                    onChange={(e) => handleManualSelect(emp.id, 'checkOut', e.target.value)}
                                    value={to24Hour(record.checkOut || "")}
                                  />
                                  <button
                                    onClick={() => handleUncheck(emp.id, 'checkOut')}
                                    className="text-[11px] font-bold text-rose-500 outline-none bg-rose-50 border border-rose-200 px-2 py-1 rounded-md hover:bg-rose-100 transition-all lg:opacity-0 group-hover:opacity-100"
                                  >
                                    Undo
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => handleQuickMark(emp.id, 'checkOut')}
                                  disabled={!record?.checkIn}
                                  className={`px-5 py-2 text-[11px] font-bold rounded-lg transition-all shadow-sm ${record?.checkIn ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-slate-50 border border-slate-100 text-slate-300 cursor-not-allowed'}`}
                                >
                                  Check Out
                                </button>
                                <input 
                                  type="time"
                                  className="bg-white border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 outline-none focus:border-teal-400 transition-all rounded-lg w-32 disabled:opacity-50"
                                  onChange={(e) => handleManualSelect(emp.id, 'checkOut', e.target.value)}
                                  disabled={!record?.checkIn}
                                  value={""}
                                />
                              </div>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-slate-100">
            {activeEmployees.map((emp) => {
              const record = activeAttendanceRecords.find(a => a.employeeId === emp.id && a.date === dateStr);
              const isPresent = !!record?.checkIn;
              const currentLeave = activeLeaves.find(l => {
                if (l.employeeId !== emp.id) return false;
                const start = l.startDate || (l as { date?: string }).date;
                const end = l.endDate || (l as { date?: string }).date;
                if (!start || !end) return false;
                return dateStr >= start && dateStr <= end; 
              });

              return (
                <div key={emp.id} className={`p-5 space-y-5 transition-all ${currentLeave ? 'bg-rose-50/30' : 'bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 border-2 rounded-full overflow-hidden flex items-center justify-center font-bold text-xs shrink-0 ${currentLeave ? 'bg-rose-100 border-white text-rose-600' : 'bg-slate-100 border-white text-slate-500'}`}>
                        {emp.photoUrl ? <img src={emp.photoUrl} alt="" className="w-full h-full object-cover"/> : emp.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className={`font-bold text-sm tracking-tight ${currentLeave ? 'text-rose-700' : 'text-slate-800'}`}>{emp.name}</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {emp.id.slice(0, 8)}</p>
                      </div>
                    </div>
                    {currentLeave ? (
                      <span className="px-3 py-1 bg-rose-100 text-rose-700 text-[9px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5">
                        <ShieldAlert size={10} /> LEAVE
                      </span>
                    ) : isPresent ? (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5">
                        <CheckCircle2 size={10} /> PRESENT
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-slate-100 text-slate-400 text-[9px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5">
                        <Circle size={10} /> PENDING
                      </span>
                    )}
                  </div>

                  {!currentLeave && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Check In</p>
                        {record?.checkIn ? (
                          <div className="flex flex-col gap-2">
                            <span className="font-extrabold text-lg text-slate-900 tabular-nums">{record.checkIn}</span>
                            <button
                              onClick={() => handleUncheck(emp.id, 'checkIn')}
                              className="w-full py-2 text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-100 rounded-lg"
                            >
                              Reset
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <button 
                              onClick={() => handleQuickMark(emp.id, 'checkIn')}
                              className="w-full bg-teal-600 text-white py-3 rounded-xl text-[11px] font-bold shadow-lg shadow-teal-600/10"
                            >
                              Mark In
                            </button>
                            <input 
                              type="time"
                              className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-semibold text-slate-600"
                              onChange={(e) => handleManualSelect(emp.id, 'checkIn', e.target.value)}
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Check Out</p>
                        {record?.checkOut ? (
                          <div className="flex flex-col gap-2">
                            <span className="font-extrabold text-lg text-slate-900 tabular-nums">{record.checkOut}</span>
                            <button
                              onClick={() => handleUncheck(emp.id, 'checkOut')}
                              className="w-full py-2 text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-100 rounded-lg"
                            >
                              Reset
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <button 
                              onClick={() => handleQuickMark(emp.id, 'checkOut')}
                              disabled={!record?.checkIn}
                              className={`w-full py-3 rounded-xl text-[11px] font-bold shadow-lg ${record?.checkIn ? 'bg-white border border-slate-200 text-slate-800 shadow-slate-200/50' : 'bg-slate-50 border border-slate-100 text-slate-300 shadow-none'}`}
                            >
                              Mark Out
                            </button>
                            <input 
                              type="time"
                              disabled={!record?.checkIn}
                              className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-semibold text-slate-600 disabled:opacity-50"
                              onChange={(e) => handleManualSelect(emp.id, 'checkOut', e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  );
}
