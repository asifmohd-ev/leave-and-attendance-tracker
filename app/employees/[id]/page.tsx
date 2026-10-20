"use client";

import { useStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parse } from "date-fns";
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

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const employee = employees.find((e) => e.id === id && !e.deletedAt);

  const activeAttendance = attendance.filter(a => !a.deletedAt);
  const activeLeaves = leaves.filter(l => !l.deletedAt);

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
  const monthlyAttendance = activeAttendance.filter(a => a.employeeId === id && isSameMonth(new Date(a.date), currentMonth) && a.checkIn);
  const presentRecords = activeAttendance.filter(a => a.employeeId === id && a.checkIn);
  const absentRecords = activeAttendance.filter(a => a.employeeId === id && a.absent);
  
  // All Time Stats
  const allTimeLeaves = activeLeaves.filter(l => l.employeeId === id).map(l => ({
    ...l,
    startDate: l.startDate || (l as { date?: string }).date || new Date().toISOString(),
    endDate: l.endDate || (l as { date?: string }).date || new Date().toISOString()
  }));

  let totalAnnual = 0;
  let totalSick = 0;
  let totalAbsentLeave = 0;
  allTimeLeaves.forEach(l => {
    const start = new Date(l.startDate);
    const end = new Date(l.endDate);
    try {
      const days = eachDayOfInterval({ start, end });
      days.forEach(d => {
        if (isBusinessDay(d)) {
          if (l.type === 'Annual') totalAnnual += 1;
          else if (l.type === 'Sick/Emergency') totalSick += 1;
          else if (l.type === 'Absent') totalAbsentLeave += 1;
        }
      });
    } catch {
      // Fallback
    }
  });
  const absenceDays = totalAbsentLeave + absentRecords.length;

  const generateExcel = () => {
    const records: { Date: string; Type: string; Details: string }[] = [];
    const empAtts = activeAttendance.filter(a => a.employeeId === id && a.checkIn);
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
    const doc = new jsPDF({ compress: true });
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    const now = new Date();

    const hoursBetween = (inT?: string, outT?: string) => {
      if (!inT || !outT) return "—";
      try {
        const a = parse(inT, "hh:mm a", new Date());
        const b = parse(outT, "hh:mm a", new Date());
        let mins = b.getHours() * 60 + b.getMinutes() - (a.getHours() * 60 + a.getMinutes());
        if (mins < 0) mins += 24 * 60;
        return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
      } catch {
        return "—";
      }
    };

    // Last 6 months of presence / leave / absence
    const monthly: { label: string; present: number; annual: number; sick: number; absent: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const base = new Date();
      base.setDate(1);
      base.setMonth(base.getMonth() - i);
      let annual = 0;
      let sick = 0;
      let absentLeave = 0;
      allTimeLeaves.forEach(l => {
        try {
          eachDayOfInterval({ start: new Date(l.startDate), end: new Date(l.endDate) }).forEach(d => {
            if (isSameMonth(d, base) && isBusinessDay(d)) {
              if (l.type === "Annual") annual += 1;
              else if (l.type === "Sick/Emergency") sick += 1;
              else if (l.type === "Absent") absentLeave += 1;
            }
          });
        } catch {
          // ignore invalid ranges
        }
      });
      const present = presentRecords.filter(a => isSameMonth(new Date(a.date), base)).length;
      const absentAtt = absentRecords.filter(a => isSameMonth(new Date(a.date), base)).length;
      monthly.push({ label: format(base, "MMM"), present, annual, sick, absent: absentLeave + absentAtt });
    }

    // Header band
    doc.setFillColor(13, 148, 136);
    doc.rect(0, 0, pageWidth, 38, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(employee.name.toUpperCase(), margin, 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("EMPLOYEE PROFILE REPORT", margin, 24);
    doc.text(`ID: ${employee.id.slice(0, 8).toUpperCase()}`, pageWidth - margin, 14, { align: "right" });
    doc.text(`Joined: ${format(new Date(employee.joinDate), "MMM dd, yyyy")}`, pageWidth - margin, 20, { align: "right" });
    doc.text(`Generated: ${format(now, "MMM dd, yyyy HH:mm")}`, pageWidth - margin, 26, { align: "right" });

    // KPI cards
    const kpis = [
      { label: "PRESENT DAYS", value: String(presentRecords.length), color: [13, 148, 136] },
      { label: "ABSENT DAYS", value: String(absenceDays), color: [244, 63, 94] },
      { label: "ANNUAL LEAVE", value: `${totalAnnual}/${ANNUAL_LEAVE_LIMIT}`, color: [245, 158, 11] },
      { label: "SICK LEAVE", value: String(totalSick), color: [100, 116, 139] },
    ];
    const gap = 6;
    const cardW = (pageWidth - margin * 2 - gap * (kpis.length - 1)) / kpis.length;
    const cardY = 46;
    const cardH = 22;
    kpis.forEach((k, i) => {
      const x = margin + i * (cardW + gap);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(x, cardY, cardW, cardH, "FD");
      doc.setFillColor(k.color[0], k.color[1], k.color[2]);
      doc.rect(x, cardY, 2, cardH, "F");
      doc.setTextColor(148, 163, 184);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text(k.label, x + 6, cardY + 8);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(15);
      doc.text(k.value, x + 6, cardY + 18);
    });

    // Chart 1: monthly presence (stacked bars)
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("MONTHLY PRESENCE - LAST 6 MONTHS", margin, 80);

    const legend = [
      { label: "Present", color: [13, 148, 136] },
      { label: "Leave", color: [245, 158, 11] },
      { label: "Absent", color: [244, 63, 94] },
    ];
    let lx = pageWidth - margin - 60;
    legend.forEach(lg => {
      doc.setFillColor(lg.color[0], lg.color[1], lg.color[2]);
      doc.rect(lx, 76, 3, 3, "F");
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(lg.label, lx + 4.5, 79);
      lx += 20;
    });

    const cx = margin + 7;
    const cy = 88;
    const cw = pageWidth - margin * 2 - 10;
    const ch = 55;
    const maxRaw = Math.max(1, ...monthly.map(m => m.present + m.annual + m.sick + m.absent));
    const maxVal = Math.max(5, Math.ceil(maxRaw / 5) * 5);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    for (let i = 0; i <= 4; i++) {
      const y = cy + ch - (ch * i) / 4;
      doc.line(cx, y, cx + cw, y);
      doc.setTextColor(148, 163, 184);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.text(String(Math.round((maxVal * i) / 4)), cx - 2, y + 2, { align: "right" });
    }

    const groupW = cw / monthly.length;
    const barW = Math.min(16, groupW * 0.45);
    monthly.forEach((m, i) => {
      const x = cx + i * groupW + (groupW - barW) / 2;
      const total = m.present + m.annual + m.sick + m.absent;
      let y = cy + ch;

      const pH = (m.present / maxVal) * ch;
      doc.setFillColor(13, 148, 136);
      doc.rect(x, y - pH, barW, pH, "F");
      y -= pH;

      const lH = ((m.annual + m.sick) / maxVal) * ch;
      doc.setFillColor(245, 158, 11);
      doc.rect(x, y - lH, barW, lH, "F");
      y -= lH;

      const aH = (m.absent / maxVal) * ch;
      doc.setFillColor(244, 63, 94);
      doc.rect(x, y - aH, barW, aH, "F");

      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      if (total > 0) doc.text(String(total), x + barW / 2, y - aH - 1.5, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(m.label, x + barW / 2, cy + ch + 5, { align: "center" });
    });

    // Chart 2: leave & absence breakdown (100% stacked bar)
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("LEAVE & ABSENCE BREAKDOWN", margin, 160);

    const totalBreak = totalAnnual + totalSick + absenceDays;
    const barX = margin;
    const barY = 168;
    const barW2 = pageWidth - margin * 2;
    const barH = 12;
    doc.setFillColor(241, 245, 249);
    doc.rect(barX, barY, barW2, barH, "F");

    if (totalBreak > 0) {
      let segX = barX;
      const segs: { value: number; color: [number, number, number] }[] = [
        { value: totalAnnual, color: [245, 158, 11] },
        { value: totalSick, color: [100, 116, 139] },
        { value: absenceDays, color: [244, 63, 94] },
      ];
      segs.forEach(s => {
        const w = (s.value / totalBreak) * barW2;
        if (w > 0) {
          doc.setFillColor(s.color[0], s.color[1], s.color[2]);
          doc.rect(segX, barY, w, barH, "F");
          if (w > 10) {
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7);
            doc.text(`${Math.round((s.value / totalBreak) * 100)}%`, segX + w / 2, barY + 7.5, { align: "center" });
          }
          segX += w;
        }
      });
    } else {
      doc.setTextColor(148, 163, 184);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("No leave or absence records", barX + barW2 / 2, barY + 8, { align: "center" });
    }

    const breakdown = [
      { label: "Annual", value: totalAnnual, color: [245, 158, 11] as [number, number, number] },
      { label: "Sick", value: totalSick, color: [100, 116, 139] as [number, number, number] },
      { label: "Absent", value: absenceDays, color: [244, 63, 94] as [number, number, number] },
    ];
    let bx = margin;
    breakdown.forEach(b => {
      doc.setFillColor(b.color[0], b.color[1], b.color[2]);
      doc.rect(bx, barY + barH + 8, 3, 3, "F");
      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`${b.label}: ${b.value} day${b.value === 1 ? "" : "s"}`, bx + 4.5, barY + barH + 11);
      bx += 55;
    });

    // Page 2: tables
    doc.addPage();
    const y = 20;
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("MONTHLY SUMMARY", margin, y);

    autoTable(doc, {
      startY: y + 4,
      head: [["MONTH", "PRESENT", "ANNUAL", "SICK", "ABSENT"]],
      body: monthly.map(m => [m.label, String(m.present), String(m.annual), String(m.sick), String(m.absent)]),
      theme: "grid",
      headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      styles: { font: "helvetica", fontSize: 8, textColor: [51, 65, 85], cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: margin, right: margin },
    });

    let afterTable = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    if (afterTable > 250) {
      doc.addPage();
      afterTable = 20;
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("DETAILED ACTIVITY LOG", margin, afterTable);

    const logs: string[][] = [];
    presentRecords.forEach(a => logs.push([
      a.date,
      format(new Date(a.date), "EEE"),
      a.checkIn || "—",
      a.checkOut || "—",
      hoursBetween(a.checkIn, a.checkOut),
      "Present",
    ]));
    absentRecords.forEach(a => logs.push([
      a.date,
      format(new Date(a.date), "EEE"),
      "—", "—", "—",
      "Absent",
    ]));
    allTimeLeaves.forEach(l => {
      try {
        eachDayOfInterval({ start: new Date(l.startDate), end: new Date(l.endDate) }).forEach(d => {
          if (isBusinessDay(d)) {
            logs.push([
              format(d, "yyyy-MM-dd"),
              format(d, "EEE"),
              "—", "—", "—",
              l.type === "Sick/Emergency" ? "Sick Leave" : `${l.type} Leave`,
            ]);
          }
        });
      } catch {
        // ignore invalid ranges
      }
    });
    logs.sort((a, b) => a[0].localeCompare(b[0]));

    autoTable(doc, {
      startY: afterTable + 4,
      head: [["DATE", "DAY", "IN", "OUT", "HOURS", "STATUS"]],
      body: logs.length ? logs : [["—", "—", "—", "—", "—", "No records"]],
      theme: "grid",
      headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: "bold", fontSize: 8 },
      styles: { font: "helvetica", fontSize: 7.5, textColor: [51, 65, 85], cellPadding: 2 },
      alternateRowStyles: { fillColor: [252, 253, 254] },
      margin: { left: margin, right: margin, bottom: 25 },
    });

    const lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    let signY = lastY + 18;
    if (signY > 265) {
      doc.addPage();
      signY = 30;
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, signY - 5, pageWidth - margin, signY - 5);
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Prepared by: __________________", margin, signY + 3);
    doc.text("Reviewed by: __________________", margin + 65, signY + 3);
    doc.text("Employee: __________________", margin + 130, signY + 3);

    // Footer on every page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 285, pageWidth - margin, 285);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text("Elevate Ventures - Confidential HR Report", margin, 290);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, 290, { align: "right" });
    }

    doc.save(`Profile_${employee.name.replace(/\s+/g, "_")}.pdf`);
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
              /* eslint-disable-next-line @next/next/no-img-element */
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
          <p className="text-4xl font-bold text-slate-900 mt-8 tabular-nums">{absenceDays}</p>
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
              const attRecord = activeAttendance.find(a => a.employeeId === id && a.date === dateStr);
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
