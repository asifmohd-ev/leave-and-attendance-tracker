"use client";

import { useStore, type Leave } from "@/lib/store";
import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, isWithinInterval, parseISO } from "date-fns";
import { isBusinessDay } from "@/lib/dateUtils";
import { uaeHolidays } from "@/lib/uaeHolidays";
import { ChevronLeft, ChevronRight, UserCheck, ShieldAlert, CircleDashed, CalendarPlus, X, Flag } from "lucide-react";

const expandLeaveToDays = (l: Leave): string[] => {
  const start = l.startDate;
  const end = l.endDate;
  if (!start || !end) return [];
  try {
    return eachDayOfInterval({ start: new Date(start), end: new Date(end) })
      .filter(isBusinessDay)
      .map(d => format(d, 'yyyy-MM-dd'));
  } catch {
    return [];
  }
};

export default function CalendarPage() {
  const [mounted, setMounted] = useState(false);
  const employees = useStore(s => s.employees);
  const attendance = useStore(s => s.attendance);
  const leaves = useStore(s => s.leaves);
  const calendarEvents = useStore(s => s.calendarEvents);
  const addCalendarEvent = useStore(s => s.addCalendarEvent);
  const removeCalendarEvent = useStore(s => s.removeCalendarEvent);

  const activeEmployees = useMemo(() => employees.filter(e => !e.deletedAt), [employees]);
  const activeAttendance = useMemo(() => attendance.filter(a => !a.deletedAt), [attendance]);
  const activeLeaves = useMemo(() => leaves.filter(l => !l.deletedAt), [leaves]);

  const attendanceDates = useMemo(() => new Set(activeAttendance.filter(a => a.checkIn).map(a => a.date)), [activeAttendance]);
  const annualLeaveDates = useMemo(() => new Set(activeLeaves.filter(l => l.type === 'Annual').flatMap(expandLeaveToDays)), [activeLeaves]);
  const sickLeaveDates = useMemo(() => new Set(activeLeaves.filter(l => l.type === 'Sick/Emergency').flatMap(expandLeaveToDays)), [activeLeaves]);
  const holidayDates = useMemo(() => new Set(uaeHolidays.map(h => h.date)), []);
  const customEventDates = useMemo(() => new Set(calendarEvents.map(e => e.date)), [calendarEvents]);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const isLeaveActive = (l: Leave, targetDateStr: string) => {
    if (!isBusinessDay(parseISO(targetDateStr))) return false;
    const start = l.startDate;
    const end = l.endDate;
    if (!start) return false;
    try {
      return isWithinInterval(parseISO(targetDateStr), { start: parseISO(start), end: parseISO(end) });
    } catch {
      return false;
    }
  };

  const attendedToday = activeAttendance.filter(a => a.date === dateStr && a.checkIn).map(a => ({
    record: a,
    emp: activeEmployees.find(e => e.id === a.employeeId)
  })).filter(x => x.emp);

  const leavesToday = activeLeaves.filter(l => isLeaveActive(l, dateStr)).map(l => ({
    record: l,
    emp: activeEmployees.find(e => e.id === l.employeeId)
  })).filter(x => x.emp);

  const annualLeaves = leavesToday.filter(l => l.record.type === 'Annual');
  const sickLeaves = leavesToday.filter(l => l.record.type === 'Sick/Emergency');

  // UAE holidays for this month
  const holidaysThisMonth = uaeHolidays.filter(h => h.date.startsWith(format(currentMonth, 'yyyy-MM')));

  // Custom events for selected date
  const eventsOnSelected = calendarEvents.filter(e => e.date === dateStr);

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;
    addCalendarEvent(eventTitle.trim(), dateStr, eventDesc.trim());
    setEventTitle("");
    setEventDesc("");
    setShowEventModal(false);
  };

  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto lg:h-[calc(100dvh-100px)] flex flex-col pb-6 lg:overflow-hidden">
      <header className="shrink-0 mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Attendance Matrix</h1>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">Comprehensive view of workforce distribution and attendance patterns.</p>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:gap-8 min-h-0">
        
        {/* Left Pane: Calendar Grid */}
        <div className="w-full lg:w-3/5 xl:w-[65%] bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 sm:p-6 lg:p-8 border-b border-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 bg-slate-50/30 gap-4 sm:gap-0">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">Monthly Overview</h2>
            <div className="flex items-center gap-2 sm:gap-4 bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm w-full sm:w-auto justify-between sm:justify-start">
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

          {/* Holiday Legend */}
          {holidaysThisMonth.length > 0 && (
            <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-2 flex flex-wrap gap-2">
              {holidaysThisMonth.map(h => (
                <span key={h.date} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-600 text-[9px] font-bold rounded-lg">
                  <Flag size={10} /> {format(new Date(h.date), 'MMM dd')} - {h.name}
                </span>
              ))}
            </div>
          )}

          <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto overscroll-contain bg-white relative">
            <div className="grid grid-cols-7 gap-1 sm:gap-3 mb-4 sm:mb-6">
              {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
                <div key={d} className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-300 py-2 border-b border-slate-50">{d}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1 sm:gap-3">
               {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="h-16 sm:h-24 lg:h-28 rounded-lg sm:rounded-xl bg-slate-50/50 border border-slate-50 opacity-40" />
              ))}
              
              {daysInMonth.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const _isToday = isToday(day);
                const _isSelected = isSameDay(day, selectedDate);
                
                const hasAttendance = attendanceDates.has(dayStr);
                const hasAnnualLeave = annualLeaveDates.has(dayStr);
                const hasSickLeave = sickLeaveDates.has(dayStr);
                const isHoliday = holidayDates.has(dayStr);
                const hasCustomEvent = customEventDates.has(dayStr);

                return (
                  <button 
                    key={dayStr}
                    onClick={() => setSelectedDate(day)}
                    className={`h-16 sm:h-24 lg:h-28 rounded-lg sm:rounded-xl border p-1.5 sm:p-3 flex flex-col relative transition-all focus:outline-none group ${
                      _isSelected 
                        ? 'bg-teal-50 border-teal-600 shadow-md shadow-teal-50 z-10' 
                        : _isToday 
                          ? 'bg-white border-teal-200' 
                          : isHoliday
                            ? 'bg-indigo-50/40 border-indigo-200'
                            : 'bg-white border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-auto w-full">
                      <span className={`text-[10px] sm:text-[11px] font-bold flex items-center justify-center w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg transition-all mx-auto sm:mx-0 ${
                        _isSelected ? 'bg-teal-600 text-white' : _isToday ? 'bg-teal-50 text-teal-600' : isHoliday ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 sm:text-slate-300'
                      }`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-0.5 sm:gap-1.5 justify-center sm:justify-end w-full mt-1 sm:mt-0 flex-wrap">
                      {hasAttendance && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-teal-500" title="Present" />}
                      {hasAnnualLeave && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-amber-400" title="Annual Leave" />}
                      {hasSickLeave && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-rose-400" title="Sick Leave" />}
                      {isHoliday && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-indigo-400" title="Public Holiday" />}
                      {hasCustomEvent && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-purple-400" title="Custom Event" />}
                    </div>
                    
                    {isHoliday && (
                      <div className="hidden sm:block absolute -top-1 -right-1">
                        <Flag size={10} className="text-indigo-500" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Pane: Daily Summary */}
        <div className="w-full lg:w-2/5 xl:w-[35%] bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col min-h-[400px]">
          <div className="p-6 lg:p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Daily Summary</h2>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{format(selectedDate, 'EEEE, MMM do')}</p>
            </div>
            <button onClick={() => setShowEventModal(true)} className="p-2.5 text-purple-600 hover:bg-purple-50 border border-purple-200 rounded-lg transition-all" title="Add Event">
              <CalendarPlus size={18} strokeWidth={2.5} />
            </button>
          </div>

          <div className="p-6 lg:p-8 flex-1 overflow-y-auto overscroll-contain space-y-6 lg:space-y-8 bg-white">

            {/* Holidays */}
            {uaeHolidays.filter(h => h.date === dateStr).length > 0 && (
              <section className="space-y-3">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 pb-3">
                  <Flag size={16} strokeWidth={2.5} className="text-indigo-500" /> Public Holidays
                </h3>
                {uaeHolidays.filter(h => h.date === dateStr).map(h => (
                  <div key={h.date} className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">UAE</div>
                    <span className="font-bold text-sm text-indigo-800">{h.name}</span>
                  </div>
                ))}
              </section>
            )}

            {/* Custom Events */}
            {eventsOnSelected.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between border-b border-slate-50 pb-3">
                  <span className="flex items-center gap-2"><CalendarPlus size={16} strokeWidth={2.5} className="text-purple-500" /> Events</span>
                </h3>
                <div className="space-y-2">
                  {eventsOnSelected.map(ev => (
                    <div key={ev.id} className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-xl">
                      <div>
                        <p className="text-sm font-bold text-purple-800">{ev.title}</p>
                        {ev.description && <p className="text-xs text-purple-600 mt-0.5">{ev.description}</p>}
                      </div>
                      <button onClick={() => removeCalendarEvent(ev.id)} className="p-1.5 text-purple-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                        <X size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

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

      {/* Add Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white shadow-2xl border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center gap-4 bg-purple-50/30">
              <div className="w-12 h-12 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-500 shadow-sm">
                <CalendarPlus size={20} strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Add Event</h2>
                <p className="text-slate-500 text-xs mt-0.5">{format(selectedDate, 'EEEE, MMM dd, yyyy')}</p>
              </div>
              <button onClick={() => setShowEventModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
            <form onSubmit={handleAddEvent} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Event Title</label>
                <input type="text" required value={eventTitle} onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full px-5 py-3.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl focus:border-purple-400 outline-none font-semibold text-sm"
                  placeholder="e.g. Team Meeting" autoFocus />
              </div>
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Description (Optional)</label>
                <textarea value={eventDesc} onChange={(e) => setEventDesc(e.target.value)} rows={3}
                  className="w-full px-5 py-3.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl focus:border-purple-400 outline-none font-semibold text-sm resize-none"
                  placeholder="Add details..." />
              </div>
              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setShowEventModal(false)}
                  className="flex-1 py-3.5 font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs">Cancel</button>
                <button type="submit"
                  className="flex-1 py-3.5 font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl text-xs shadow-md shadow-purple-100">Add Event</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
