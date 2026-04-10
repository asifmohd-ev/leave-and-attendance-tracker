"use client";

import { useStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from "date-fns";
import { isBusinessDay, ANNUAL_LEAVE_LIMIT } from "@/lib/dateUtils";
import { ArrowLeft, CalendarOff, UserCheck, ShieldAlert, BadgeInfo, BarChart3, Clock, Download, Table } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Link from "next/link";

export default function EmployeeProfilePage() {
  const { id } = useParams() as { id: string };
  const { employees, attendance, leaves } = useStore();
  const [mounted, setMounted] = useState(false);
  
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const employee = employees.find((e) => e.id === id);

  if (!employee) {
    return (
      <div className="p-32 text-center bg-white border border-slate-200 rounded-3xl shadow-sm mt-10">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Employee Not Found</h2>
        <p className="text-slate-500 mt-2 mb-8">The requested profile does not exist in the database.</p>
        <Link href="/employees" className="inline-block px-8 py-3 bg-teal-600 text-white font-bold text-sm rounded-xl hover:bg-teal-700 transition-all shadow-md shadow-teal-100">
          Back to Directory
        </Link>
      </div>
    );
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Monthly stats
  const monthlyAttendance = attendance.filter(a => a.employeeId === id && isSameMonth(new Date(a.date), currentMonth) && a.checkIn);
  
  // All Time Stats
  const allTimeLeaves = leaves.filter(l => l.employeeId === id).map(l => ({
    ...l,
    startDate: l.startDate || (l as any).date || new Date().toISOString(),
    endDate: l.endDate || (l as any).date || new Date().toISOString()
  }));

  let totalAnnual = 0;
  let totalSick = 0;
  allTimeLeaves.forEach(l => {
    const start = new Date(l.startDate);
    const end = new Date(l.endDate);
    try {
      const days = eachDayOfInterval({ start, end });
      days.forEach(d => {
        if (isBusinessDay(d)) {
          if (l.type === 'Annual') totalAnnual += 1;
          else totalSick += 1;
        }
      });
    } catch (e) {
      // Fallback
    }
  });

  const generateExcel = () => {
    const records: any[] = [];
    const empAtts = attendance.filter(a => a.employeeId === id && a.checkIn);
    empAtts.forEach(a => records.push({ Date: a.date, Type: 'Attendance', Details: `IN: ${a.checkIn} ${a.checkOut ? `OUT: ${a.checkOut}` : ''}` }));
    
    allTimeLeaves.forEach(l => {
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      eachDayOfInterval({ start, end }).forEach(d => {
        if (isBusinessDay(d)) {
          records.push({ Date: format(d, 'yyyy-MM-dd'), Type: l.type + ' Leave', Details: 'Full Day' });
        }
      });
    });

    records.sort((a,b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());

    const wb = XLSX.utils.book_new();
    const sumData = [
      [`Elevate Ventures - ${employee.name} Profile`],
      ['Total Active Days', empAtts.length.toString()],
      ['Total Annual Leave', totalAnnual.toString()],
      ['Remaining Annual Leave', (ANNUAL_LEAVE_LIMIT - totalAnnual).toString()],
      ['Total Sick Leave', totalSick.toString()],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sumData), "Profile Summary");

    const detailsData = [['Date', 'Type', 'Details']];
    records.forEach(r => detailsData.push([r.Date, r.Type, r.Details]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detailsData), "Detailed Logs");

    XLSX.writeFile(wb, `Profile_${employee.name.replace(/\s+/g, '_')}.xlsx`);
  };

  const generatePDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    doc.setFillColor(13, 148, 136);
    doc.rect(0, 0, pageWidth, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(`PROFILE: ${employee.name.toUpperCase()}`, 15, 25);
    
    let currentY = 55;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.text("PERFORMANCE SUMMARY", 15, currentY);
    
    currentY += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    const empAtts = attendance.filter(a => a.employeeId === id && a.checkIn);
    doc.text(`Active Days: ${empAtts.length}`, 15, currentY); currentY += 6;
    doc.text(`Annual Leaves Taken: ${totalAnnual} / ${ANNUAL_LEAVE_LIMIT} (Remaining: ${ANNUAL_LEAVE_LIMIT - totalAnnual})`, 15, currentY); currentY += 6;
    doc.text(`Sick Leaves: ${totalSick}`, 15, currentY); currentY += 15;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("ACTIVITY LOGS", 15, currentY);

    const records: any[] = [];
    empAtts.forEach(a => records.push([a.date, 'Attendance', `IN: ${a.checkIn} ${a.checkOut ? `OUT: ${a.checkOut}` : ''}` ]));
    
    allTimeLeaves.forEach(l => {
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      eachDayOfInterval({ start, end }).forEach(d => {
        if (isBusinessDay(d)) {
          records.push([format(d, 'yyyy-MM-dd'), l.type + ' Leave', 'Full Day']);
        }
      });
    });

    records.sort((a,b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

    autoTable(doc, {
      startY: currentY + 5,
      head: [['DATE', 'TYPE', 'DETAILS']],
      body: records,
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold', lineWidth: 0.1, lineColor: [226, 232, 240] },
      styles: { font: 'helvetica', fontSize: 8, textColor: [51, 65, 85], cellPadding: 3 },
      alternateRowStyles: { fillColor: [252, 253, 254] }
    });

    doc.save(`Profile_${employee.name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-10">
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-6">
          <Link href="/employees" className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-teal-600 hover:border-teal-200 transition-all shadow-sm group">
            <ArrowLeft size={20} strokeWidth={2.5} className="transition-transform group-hover:-translate-x-0.5" />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Employee Profile</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={generateExcel} className="hidden sm:flex px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:text-teal-600 hover:border-teal-200 rounded-xl items-center justify-center gap-2 transition-all shadow-sm font-bold text-xs uppercase tracking-wider group" title="Export Excel">
            <Table size={16} strokeWidth={2.5} /> Excel
          </button>
          <button onClick={generatePDF} className="flex px-4 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-xl items-center justify-center gap-2 transition-all shadow-md shadow-teal-100 font-bold text-xs uppercase tracking-wider" title="Export PDF">
            <Download size={16} strokeWidth={2.5} /> PDF
          </button>
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden relative">
        <div className="h-32 bg-slate-50 border-b border-slate-100" />
        <div className="relative px-10 pb-10 flex flex-col md:flex-row gap-8 md:items-end -mt-16">
          <div className="w-40 h-40 rounded-full border-4 border-white shadow-md bg-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center text-slate-300 font-bold text-5xl">
            {employee.photoUrl ? (
              <img src={employee.photoUrl} alt={employee.name} className="w-full h-full object-cover" />
            ) : (
              <span className="uppercase">{employee.name.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1 pb-2">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">{employee.name}</h1>
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-600 rounded-lg border border-teal-100 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                <BadgeInfo size={14} strokeWidth={2.5} /> {employee.id.slice(0, 8)}
              </span>
              <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-500 rounded-lg border border-slate-200 text-[10px] font-bold uppercase tracking-wider">
                <Clock size={14} strokeWidth={2.5} /> Joined {format(new Date(employee.joinDate), 'MMMM yyyy')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-teal-400 transition-colors">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Monthly Presence</p>
            <UserCheck size={20} strokeWidth={2.5} className="text-teal-600" />
          </div>
          <div className="mt-8 flex items-baseline gap-2">
            <span className="text-4xl font-bold text-slate-900 tabular-nums">{monthlyAttendance.length}</span>
            <span className="text-sm font-bold text-slate-300">/ {daysInMonth.length} days</span>
          </div>
        </div>

        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-slate-400 transition-colors">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Total Absences</p>
            <BarChart3 size={20} strokeWidth={2.5} className="text-slate-400" />
          </div>
          <p className="text-4xl font-bold text-slate-900 mt-8 tabular-nums">{allTimeLeaves.length}</p>
        </div>

        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-amber-400 transition-colors">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Annual Leaves</p>
            <CalendarOff size={20} strokeWidth={2.5} className="text-amber-500" />
          </div>
          <div className="mt-8 flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-900 tabular-nums">{totalAnnual}</span>
              <span className="text-sm font-bold text-slate-300">/ {ANNUAL_LEAVE_LIMIT}</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mt-1">{ANNUAL_LEAVE_LIMIT - totalAnnual} days remaining</p>
          </div>
        </div>

        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-rose-400 transition-colors">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Sick Leaves</p>
            <ShieldAlert size={20} strokeWidth={2.5} className="text-rose-500" />
          </div>
          <p className="text-4xl font-bold text-slate-900 mt-8 tabular-nums">{totalSick}</p>
        </div>
      </div>

      {/* Presence Matrix */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-50/50">
          <div className="space-y-1 text-center sm:text-left">
             <h2 className="text-lg font-bold text-slate-800 tracking-tight">Presence Matrix</h2>
             <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Detailed historical activity log</p>
          </div>
          <div className="flex items-center gap-4 bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm">
             <button 
                onClick={() => { const d = new Date(currentMonth); d.setMonth(d.getMonth() - 1); setCurrentMonth(d); }}
                className="p-2 hover:bg-slate-100 transition-all rounded-lg text-slate-400 hover:text-slate-900 focus:outline-none"
              >
               <ArrowLeft size={18} strokeWidth={2.5} />
             </button>
             <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700 min-w-[120px] text-center">
               {format(currentMonth, 'MMMM yyyy')}
             </span>
             <button 
                onClick={() => { const d = new Date(currentMonth); d.setMonth(d.getMonth() + 1); setCurrentMonth(d); }}
                className="p-2 hover:bg-slate-100 transition-all rounded-lg text-slate-400 hover:text-slate-900 focus:outline-none rotate-180"
              >
               <ArrowLeft size={18} strokeWidth={2.5} />
             </button>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-7 gap-3 mb-6">
            {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
              <div key={d} className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-300 py-2 border-b border-slate-50">{d}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-3">
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="h-32 rounded-xl bg-slate-50 border border-slate-100 opacity-40 shadow-inner" />
            ))}
            
            {daysInMonth.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const attRecord = attendance.find(a => a.employeeId === id && a.date === dateStr);
              const leaveRecord = allTimeLeaves.find(l => {
                const start = l.startDate;
                const end = l.endDate;
                return dateStr >= start && dateStr <= end;
              });
              const _isToday = isToday(day);

              return (
                <div 
                  key={dateStr} 
                  className={`h-32 rounded-xl border p-4 flex flex-col relative transition-all duration-300 ${
                    _isToday ? 'border-teal-600 bg-teal-50/20 shadow-md shadow-teal-100' : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50 shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start mb-auto">
                    <span className={`text-[11px] font-bold flex items-center justify-center w-7 h-7 rounded-lg transition-all ${
                      _isToday ? 'bg-teal-600 text-white' : 'text-slate-300'
                    }`}>
                      {format(day, 'd')}
                    </span>
                    {_isToday && <span className="text-[8px] font-bold uppercase tracking-widest text-teal-400">TODAY</span>}
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    {leaveRecord ? (
                      <div className={`text-[9px] uppercase font-bold tracking-wider px-2 py-1.5 rounded-lg text-center border shadow-sm ${
                        leaveRecord.type === 'Annual' ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        {leaveRecord.type === 'Annual' ? 'Annual' : 'Sick'}
                      </div>
                    ) : attRecord?.checkIn ? (
                      <div className="space-y-1.5">
                        <div className="bg-teal-600/5 text-teal-700 px-2 py-1 rounded-md border border-teal-100 flex items-center justify-between shadow-sm">
                          <span className="text-[8px] font-bold opacity-40 uppercase">IN</span>
                          <span className="text-[10px] font-bold tabular-nums">{attRecord.checkIn}</span>
                        </div>
                        {attRecord.checkOut && (
                          <div className="bg-slate-50 text-slate-400 px-2 py-1 rounded-md border border-slate-200 flex items-center justify-between">
                            <span className="text-[8px] font-bold opacity-40 uppercase">OUT</span>
                            <span className="text-[10px] font-bold tabular-nums">{attRecord.checkOut}</span>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
