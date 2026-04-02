"use client";

import { useStore } from "@/lib/store";
import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, UserCheck, CalendarOff, ShieldAlert, CircleDashed } from "lucide-react";

export default function CalendarPage() {
  const [mounted, setMounted] = useState(false);
  const { employees, attendance, leaves } = useStore();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  
  // Details for selected Date
  const attendedToday = attendance.filter(a => a.date === dateStr && a.checkIn).map(a => ({
    record: a,
    emp: employees.find(e => e.id === a.employeeId)
  })).filter(x => x.emp);

  const leavesToday = leaves.filter(l => l.date === dateStr).map(l => ({
    record: l,
    emp: employees.find(e => e.id === l.employeeId)
  })).filter(x => x.emp);

  const annualLeaves = leavesToday.filter(l => l.record.type === 'Annual');
  const sickLeaves = leavesToday.filter(l => l.record.type === 'Sick/Emergency');

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto h-[calc(100vh-140px)] overflow-hidden flex flex-col pb-6">
      <header className="shrink-0 mb-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Attendance Matrix</h1>
        <p className="text-slate-500 mt-1 text-base">Comprehensive view of workforce distribution and attendance patterns.</p>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0">
        
        {/* Left Pane: Calendar Grid */}
        <div className="w-full lg:w-3/5 xl:w-[65%] bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between shrink-0 bg-slate-50/30">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Monthly Overview</h2>
            <div className="flex items-center gap-4 bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm">
               <button 
                  onClick={() => { const d = new Date(currentMonth); d.setMonth(d.getMonth() - 1); setCurrentMonth(d); }}
                  className="p-2 hover:bg-slate-50 transition-all rounded-lg text-slate-400 hover:text-slate-900 focus:outline-none"
                >
                 <ChevronLeft size={20} strokeWidth={2.5} />
               </button>
               <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700 min-w-[120px] text-center">
                 {format(currentMonth, 'MMMM yyyy')}
               </span>
               <button 
                  onClick={() => { const d = new Date(currentMonth); d.setMonth(d.getMonth() + 1); setCurrentMonth(d); }}
                  className="p-2 hover:bg-slate-50 transition-all rounded-lg text-slate-400 hover:text-slate-900 focus:outline-none"
                >
                 <ChevronRight size={20} strokeWidth={2.5} />
               </button>
            </div>
          </div>

          <div className="p-8 flex-1 overflow-y-auto bg-white relative">
            <div className="grid grid-cols-7 gap-3 mb-6">
              {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
                <div key={d} className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-300 py-2 border-b border-slate-50">{d}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-3">
               {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="h-28 rounded-xl bg-slate-50/50 border border-slate-50 opacity-40" />
              ))}
              
              {daysInMonth.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const _isToday = isToday(day);
                const _isSelected = isSameDay(day, selectedDate);
                
                const hasAttendance = attendance.some(a => a.date === dayStr && a.checkIn);
                const hasAnnualLeave = leaves.some(l => l.date === dayStr && l.type === 'Annual');
                const hasSickLeave = leaves.some(l => l.date === dayStr && l.type === 'Sick/Emergency');

                return (
                  <button 
                    key={dayStr}
                    onClick={() => setSelectedDate(day)}
                    className={`h-28 rounded-xl border p-3 flex flex-col relative transition-all focus:outline-none group ${
                      _isSelected 
                        ? 'bg-teal-50 border-teal-600 shadow-md shadow-teal-50 z-10' 
                        : _isToday 
                          ? 'bg-white border-teal-200' 
                          : 'bg-white border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-auto w-full">
                      <span className={`text-[10px] font-bold flex items-center justify-center w-7 h-7 rounded-lg transition-all ${
                        _isSelected ? 'bg-teal-600 text-white' : _isToday ? 'bg-teal-50 text-teal-600' : 'text-slate-300'
                      }`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 justify-end w-full">
                      {hasAttendance && <div className="w-1.5 h-1.5 rounded-full bg-teal-500" title="Present" />}
                      {hasAnnualLeave && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Annual Leave" />}
                      {hasSickLeave && <div className="w-1.5 h-1.5 rounded-full bg-rose-400" title="Sick Leave" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Pane: Daily Summary */}
        <div className="w-full lg:w-2/5 xl:w-[35%] bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-slate-50/30">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Daily Summary</h2>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{format(selectedDate, 'EEEE, MMM do')}</p>
          </div>

          <div className="p-8 flex-1 overflow-y-auto space-y-10 bg-white">
            
            {/* Presence */}
            <section className="space-y-5">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between border-b border-slate-50 pb-3">
                <span className="flex items-center gap-2"><UserCheck size={16} strokeWidth={2.5} className="text-teal-600" /> Present</span>
                <span className="bg-slate-50 px-2 py-0.5 rounded-md text-slate-500 text-[10px] tabular-nums font-bold">{attendedToday.length}</span>
              </h3>
              {attendedToday.length === 0 ? (
                <p className="text-center py-6 text-slate-300 text-xs font-semibold">No attendance recorded.</p>
              ) : (
                <div className="space-y-3">
                  {attendedToday.map(({ emp, record }) => (
                    <div key={emp!.id} className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-xl group hover:border-teal-200 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full shrink-0 bg-white border border-slate-200 text-slate-300 font-bold text-sm flex items-center justify-center transition-transform group-hover:scale-105">
                          {emp!.photoUrl ? <img src={emp!.photoUrl} alt="" className="w-full h-full object-cover rounded-full" /> : emp!.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-sm text-slate-800 tracking-tight block uppercase">{emp!.name}</span>
                          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{emp!.id.slice(0,8)}</span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-[11px] font-bold text-teal-600 tabular-nums">{record.checkIn}</span>
                        {record.checkOut && <span className="text-[9px] font-bold text-slate-400 tabular-nums uppercase opacity-50 mt-0.5">{record.checkOut}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Annual Leave */}
            <section className="space-y-5">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between border-b border-slate-50 pb-3">
                <span className="flex items-center gap-2"><CircleDashed size={16} strokeWidth={2.5} className="text-amber-500" /> Annual Leave</span>
                <span className="bg-slate-50 px-2 py-0.5 rounded-md text-slate-500 text-[10px] tabular-nums font-bold">{annualLeaves.length}</span>
              </h3>
              {annualLeaves.length === 0 ? (
                 <p className="text-center py-6 text-slate-200 text-xs font-semibold">No annual leaves.</p>
              ) : (
                <div className="space-y-3">
                  {annualLeaves.map(({ emp }) => (
                    <div key={emp!.id} className="flex items-center gap-3 p-3 bg-white border border-amber-100 rounded-xl">
                      <div className="w-8 h-8 rounded-full shrink-0 bg-amber-50 text-amber-600 font-bold text-xs flex items-center justify-center">
                        {emp!.photoUrl ? <img src={emp!.photoUrl} alt="" className="w-full h-full object-cover rounded-full" /> : emp!.name.charAt(0)}
                      </div>
                      <span className="font-bold text-xs text-slate-700 tracking-tight uppercase">{emp!.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Sick Leave */}
            <section className="space-y-5">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between border-b border-slate-50 pb-3">
                <span className="flex items-center gap-2"><ShieldAlert size={16} strokeWidth={2.5} className="text-rose-500" /> Sick Leave</span>
                <span className="bg-slate-50 px-2 py-0.5 rounded-md text-slate-500 text-[10px] tabular-nums font-bold">{sickLeaves.length}</span>
              </h3>
              {sickLeaves.length === 0 ? (
                 <p className="text-center py-6 text-slate-200 text-xs font-semibold">No sick leaves.</p>
              ) : (
                <div className="space-y-3">
                  {sickLeaves.map(({ emp }) => (
                    <div key={emp!.id} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                      <div className="w-8 h-8 rounded-full shrink-0 bg-slate-50 text-slate-400 font-bold text-xs flex items-center justify-center">
                        {emp!.photoUrl ? <img src={emp!.photoUrl} alt="" className="w-full h-full object-cover rounded-full" /> : emp!.name.charAt(0)}
                      </div>
                      <span className="font-bold text-xs text-slate-700 tracking-tight uppercase">{emp!.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
