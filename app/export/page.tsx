"use client";

import { useStore } from "@/lib/store";
import { useState, useEffect } from "react";
import { format, isWithinInterval, parseISO, eachDayOfInterval, isSameMonth, parse } from "date-fns";
import { isBusinessDay, ANNUAL_LEAVE_LIMIT } from "@/lib/dateUtils";
import { Calendar, Users, Settings2, Download, CheckSquare, Table, Zap, Share2, Check, FileCode, ClipboardList } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function ExportPage() {
  const [mounted, setMounted] = useState(false);
  const employees = useStore(s => s.employees);
  const attendance = useStore(s => s.attendance);
  const leaves = useStore(s => s.leaves);
  const saveReportConfig = useStore(s => s.saveReportConfig);

  const activeEmployees = employees.filter(e => !e.deletedAt);
  const activeAttendance = attendance.filter(a => !a.deletedAt);
  const activeLeaves = leaves.filter(l => !l.deletedAt);

  const [copied, setCopied] = useState(false);
  
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  
  const [selectedEmps, setSelectedEmps] = useState<string[]>([]);
  
  const [incAttendance, setIncAttendance] = useState(true);
  const [incAnnual, setIncAnnual] = useState(true);
  const [incSick, setIncSick] = useState(true);
  const [incAbsent, setIncAbsent] = useState(true);
  const [incSummary, setIncSummary] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setSelectedEmps(employees.filter(e => !e.deletedAt).map(e => e.id));
  }, [employees]);

  if (!mounted) return null;

  const toggleEmp = (id: string) => setSelectedEmps(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const selectAllEmps = () => setSelectedEmps(activeEmployees.map(e => e.id));
  const deselectAllEmps = () => setSelectedEmps([]);

  const setTodayPreset = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setFromDate(today);
    setToDate(today);
  };

  const isDateInRange = (d: string) => {
    if (!fromDate && !toDate) return true;
    if (fromDate && !toDate) return new Date(d) >= new Date(fromDate);
    if (!fromDate && toDate) return new Date(d) <= new Date(toDate);
    const start = parseISO(fromDate);
    const end = parseISO(toDate);
    const date = parseISO(d);
    try { return isWithinInterval(date, { start, end }); } catch { return true; }
  };

  const getFilteredData = () => {
    const records: { Emp: string; Date: string; Type: string; Details: string }[] = [];
    let globalAtt = 0;
    let globalAnn = 0;
    let globalSick = 0;
    let globalAbs = 0;
    const empCounts: Record<string, { att: number, ann: number, sick: number, abs: number }> = {};

    selectedEmps.forEach(empId => {
      const emp = activeEmployees.find(e => e.id === empId);
      if (!emp) return;
      
      const atts = activeAttendance.filter(a => a.employeeId === empId && a.checkIn && isDateInRange(a.date));
      const attAbsences = activeAttendance.filter(a => a.employeeId === empId && a.absent && isDateInRange(a.date));
      const rawAnns = activeLeaves.filter(l => l.employeeId === empId && l.type === 'Annual');
      const rawSicks = activeLeaves.filter(l => l.employeeId === empId && l.type === 'Sick/Emergency');
      const rawAbs = activeLeaves.filter(l => l.employeeId === empId && l.type === 'Absent');

      const anns: string[] = [];
      rawAnns.forEach(l => {
        const start = l.startDate || (l as { date?: string }).date;
        const end = l.endDate || start;
        if (!start || !end) return;
        eachDayOfInterval({ start: new Date(start), end: new Date(end) }).forEach(d => {
          const dStr = format(d, 'yyyy-MM-dd');
          if (isDateInRange(dStr) && isBusinessDay(d)) anns.push(dStr);
        });
      });

      const sicks: string[] = [];
      rawSicks.forEach(l => {
        const start = l.startDate || (l as { date?: string }).date;
        const end = l.endDate || start;
        if (!start || !end) return;
        eachDayOfInterval({ start: new Date(start), end: new Date(end) }).forEach(d => {
          const dStr = format(d, 'yyyy-MM-dd');
          if (isDateInRange(dStr) && isBusinessDay(d)) sicks.push(dStr);
        });
      });

      const abss: string[] = [];
      rawAbs.forEach(l => {
        const start = l.startDate || (l as { date?: string }).date;
        const end = l.endDate || start;
        if (!start || !end) return;
        eachDayOfInterval({ start: new Date(start), end: new Date(end) }).forEach(d => {
          const dStr = format(d, 'yyyy-MM-dd');
          if (isDateInRange(dStr) && isBusinessDay(d)) abss.push(dStr);
        });
      });
      attAbsences.forEach(a => abss.push(a.date));

      empCounts[empId] = { att: atts.length, ann: anns.length, sick: sicks.length, abs: abss.length };

      globalAtt += atts.length;
      globalAnn += anns.length;
      globalSick += sicks.length;
      globalAbs += abss.length;

      if (incAttendance) atts.forEach(a => records.push({ Emp: emp.name, Date: a.date, Type: 'Attendance', Details: `IN: ${a.checkIn} ${a.checkOut ? `OUT: ${a.checkOut}` : ''}` }));
      if (incAnnual) anns.forEach(dStr => records.push({ Emp: emp.name, Date: dStr, Type: 'Annual Leave', Details: 'Full Day' }));
      if (incSick) sicks.forEach(dStr => records.push({ Emp: emp.name, Date: dStr, Type: 'Sick Leave', Details: 'Full Day' }));
      if (incAbsent) abss.forEach(dStr => records.push({ Emp: emp.name, Date: dStr, Type: 'Absent', Details: 'Full Day' }));
    });
    
    records.sort((a,b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
    return { records, globalAtt, globalAnn, globalSick, globalAbs, empCounts };
  };

  const getFileRangeName = () => {
    if (!fromDate && !toDate) return 'All_Time';
    if (fromDate && !toDate) return `Since_${fromDate}`;
    if (!fromDate && toDate) return `Until_${toDate}`;
    return fromDate === toDate ? `Date_${fromDate}` : `Range_${fromDate}_to_${toDate}`;
  };

  const loadLogoDataUri = async () => {
    try {
      const res = await fetch("/images/logo.png");
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const generateReportHTML = async () => {
    const { records, globalAtt, globalAnn, globalSick, globalAbs, empCounts } = getFilteredData();
    const rangeLabel = (fromDate && toDate)
      ? (fromDate === toDate ? `Date: ${fromDate}` : `${fromDate} — ${toDate}`)
      : "All Records";
    const generatedAt = format(new Date(), 'MMM dd, yyyy HH:mm');
    const totalEvents = globalAtt + globalAnn + globalSick + globalAbs;
    const logoDataUri = await loadLogoDataUri();

    const summaryRows = selectedEmps.map(empId => {
      const emp = activeEmployees.find(e => e.id === empId);
      if (!emp) return '';
      const c = empCounts[empId] || { att: 0, ann: 0, sick: 0, abs: 0 };
      return `<tr><td>${emp.name}</td><td>${c.att}</td><td>${c.ann}</td><td>${c.sick}</td><td>${c.abs}</td></tr>`;
    }).join('');

    const activityLogs = selectedEmps.map(empId => {
      const emp = activeEmployees.find(e => e.id === empId);
      if (!emp) return '';
      const empRecs = records.filter(r => r.Emp === emp.name);
      if (empRecs.length === 0) return '';
      const rows = empRecs.map(r => {
        const badge = r.Type.includes('Annual') ? 'badge-annual' : r.Type.includes('Sick') ? 'badge-sick' : r.Type.includes('Absent') ? 'badge-abs' : 'badge-att';
        return `<tr><td>${r.Date}</td><td><span class="badge ${badge}">${r.Type}</span></td><td>${r.Details}</td></tr>`;
      }).join('');
      return `<div class="emp-section"><div class="emp-header"><h3>${emp.name}</h3><span class="emp-id">ID: ${emp.id.slice(0,8)}</span></div><table><thead><tr><th>Date</th><th>Type</th><th>Details</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }).join('');

    const barAtt = totalEvents > 0 ? `${(globalAtt/totalEvents*100).toFixed(1)}%` : '0%';
    const barAnn = totalEvents > 0 ? `${(globalAnn/totalEvents*100).toFixed(1)}%` : '0%';
    const barSick = totalEvents > 0 ? `${(globalSick/totalEvents*100).toFixed(1)}%` : '0%';
    const barAbs = totalEvents > 0 ? `${(globalAbs/totalEvents*100).toFixed(1)}%` : '0%';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Elevate Ventures — Personnel Report</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;color:#0f172a;padding:24px}
.page{max-width:900px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 40px rgba(0,0,0,.08)}
header{background:#0d9488;color:#fff;padding:40px 48px;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px}
.brand h1{font-size:28px;font-weight:900;letter-spacing:-1px}
.brand p{font-size:11px;font-weight:700;opacity:.7;text-transform:uppercase;letter-spacing:.2em;margin-top:4px}
.meta{text-align:right}
.meta .range{font-size:18px;font-weight:700}
.meta .gen{font-size:10px;opacity:.6;text-transform:uppercase;letter-spacing:.15em;margin-top:6px}
.body{padding:40px 48px;display:flex;flex-direction:column;gap:40px}
.section-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.25em;color:#94a3b8;text-align:center;padding:0 0 16px;display:flex;align-items:center;gap:12px}
.section-title::before,.section-title::after{content:'';flex:1;height:1px;background:#f1f5f9}
.bar-wrap{height:10px;border-radius:99px;overflow:hidden;display:flex;background:#f1f5f9;border:1px solid #e2e8f0}
.bar-att{background:#14b8a6;height:100%}
.bar-ann{background:#f59e0b;height:100%}
.bar-sick{background:#f43f5e;height:100%}
.bar-abs{background:#64748b;height:100%}
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-top:16px}
.metric{display:flex;align-items:center;gap:10px}
.dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.dot-att{background:#14b8a6}.dot-ann{background:#f59e0b}.dot-sick{background:#f43f5e}.dot-abs{background:#64748b}
.metric-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8}
.metric-val{font-size:22px;font-weight:800;color:#0f172a}
.metric-unit{font-size:11px;color:#94a3b8;font-weight:500}
table{width:100%;border-collapse:collapse;font-size:13px}
thead tr{border-bottom:2px solid #0f172a}
thead th{text-align:left;padding:12px 8px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.15em;color:#94a3b8}
tbody tr{border-bottom:1px solid #f1f5f9}
tbody td{padding:14px 8px;color:#334155;font-weight:500}
.emp-section{margin-bottom:32px}
.emp-header{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:12px;padding-left:16px;border-left:4px solid #0d9488}
.emp-header h3{font-size:20px;font-weight:900;color:#0f172a;letter-spacing:-.5px}
.emp-id{font-size:9px;font-weight:800;color:#cbd5e1;text-transform:uppercase;letter-spacing:.2em}
.badge{display:inline-block;padding:3px 10px;border-radius:99px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;border:1px solid}
.badge-annual{background:#fefce8;border-color:#fde68a;color:#92400e}
.badge-sick{background:#fff1f2;border-color:#fecdd3;color:#9f1239}
.badge-abs{background:#f1f5f9;border-color:#cbd5e1;color:#334155}
.badge-att{background:#f0fdfa;border-color:#99f6e4;color:#134e4a}
footer{background:#f8fafc;border-top:1px solid #f1f5f9;padding:24px 48px;text-align:center;font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.15em}
@media print{body{padding:0;background:#fff}.page{box-shadow:none;border-radius:0}}
</style>
</head>
<body>
<div class="page">
<header>
<div class="brand" style="display:flex;align-items:center;gap:16px">${logoDataUri ? `<img src="${logoDataUri}" alt="Elevate Ventures" style="width:52px;height:52px;border-radius:12px;background:#fff;padding:6px;object-fit:contain;flex-shrink:0"/>` : ''}<div><h1>ELEVATE VENTURES</h1><p>Workforce Reporting Suite</p></div></div>
<div class="meta"><div class="range">${rangeLabel}</div><div class="gen">Generated: ${generatedAt}</div></div>
</header>
<div class="body">
${incSummary && selectedEmps.length > 0 ? `
<section>
<div class="section-title">Executive Metrics</div>
${totalEvents > 0 ? `
<div class="bar-wrap"><div class="bar-att" style="width:${barAtt}"></div><div class="bar-ann" style="width:${barAnn}"></div><div class="bar-sick" style="width:${barSick}"></div><div class="bar-abs" style="width:${barAbs}"></div></div>
<div class="metrics">
<div class="metric"><div class="dot dot-att"></div><div><div class="metric-label">Active Presence</div><div class="metric-val">${globalAtt} <span class="metric-unit">days</span></div></div></div>
<div class="metric"><div class="dot dot-ann"></div><div><div class="metric-label">Annual Leaves</div><div class="metric-val">${globalAnn} <span class="metric-unit">days</span></div></div></div>
<div class="metric"><div class="dot dot-sick"></div><div><div class="metric-label">Sick/Emergency</div><div class="metric-val">${globalSick} <span class="metric-unit">days</span></div></div></div>
<div class="metric"><div class="dot dot-abs"></div><div><div class="metric-label">Absent Days</div><div class="metric-val">${globalAbs} <span class="metric-unit">days</span></div></div></div>
</div>` : ''}
<table style="margin-top:24px">
<thead><tr><th>Employee Name</th><th>Active Days</th><th>Annual Leaves</th><th>Sick Leaves</th><th>Absent Days</th></tr></thead>
<tbody>${summaryRows}</tbody>
</table>
</section>` : ''}
${(incAttendance || incAnnual || incSick || incAbsent) && activityLogs ? `
<section>
<div class="section-title">Branded Activity Logs</div>
${activityLogs}
</section>` : ''}
${records.length === 0 ? '<div style="text-align:center;padding:60px;color:#cbd5e1;font-weight:700;text-transform:uppercase;letter-spacing:.2em;border:3px dashed #f1f5f9;border-radius:12px">No records found for this configuration</div>' : ''}
</div>
<footer>Elevate Ventures • Operational Excellence Protocol 2026</footer>
</div>
</body>
</html>`;
  };

  const copyLink = async () => {
    try {
      const htmlContent = await generateReportHTML();
      const rangeLabel = (fromDate && toDate)
        ? (fromDate === toDate ? `Date: ${fromDate}` : `Range: ${fromDate} to ${toDate}`)
        : "All Records";

      const sid = await saveReportConfig({ htmlContent, rangeLabel });
      const shortLink = `${window.location.origin}/report-view?sid=${sid}`;
      const clipboardText = `HR Personnel Report (${rangeLabel}): ${shortLink}`;

      await navigator.clipboard.writeText(clipboardText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to generate share link", err);
    }
  };

  const generatePDF = async () => {
    const doc = new jsPDF({ compress: true });
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    const { globalAtt, globalAnn, globalSick, globalAbs, empCounts } = getFilteredData();
    const selectedEmployees = selectedEmps
      .map(empId => activeEmployees.find(e => e.id === empId))
      .filter((e): e is (typeof activeEmployees)[number] => !!e);

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

    const leaveCache = new Map<string, string[]>();
    const presentCache = new Map<string, typeof activeAttendance>();
    const absentCache = new Map<string, typeof activeAttendance>();

    const getPresent = (empId: string) => {
      let records = presentCache.get(empId);
      if (!records) {
        records = activeAttendance.filter(a => a.employeeId === empId && a.checkIn);
        presentCache.set(empId, records);
      }
      return records;
    };

    const getAbsent = (empId: string) => {
      let records = absentCache.get(empId);
      if (!records) {
        records = activeAttendance.filter(a => a.employeeId === empId && a.absent);
        absentCache.set(empId, records);
      }
      return records;
    };

    const getLeaveDays = (empId: string, type: 'Annual' | 'Sick/Emergency' | 'Absent') => {
      const key = `${empId}|${type}`;
      const cached = leaveCache.get(key);
      if (cached) return cached;
      const dates: string[] = [];
      activeLeaves.filter(l => l.employeeId === empId && l.type === type).forEach(l => {
        const start = l.startDate || (l as { date?: string }).date;
        const end = l.endDate || start;
        if (!start || !end) return;
        try {
          eachDayOfInterval({ start: new Date(start), end: new Date(end) }).forEach(d => {
            const dStr = format(d, 'yyyy-MM-dd');
            if (isBusinessDay(d) && isDateInRange(dStr)) dates.push(dStr);
          });
        } catch {
          // ignore invalid ranges
        }
      });
      leaveCache.set(key, dates);
      return dates;
    };

    const getMonthly = (empIds: string[]) => {
      const months: { label: string; present: number; annual: number; sick: number; absent: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const base = new Date();
        base.setDate(1);
        base.setMonth(base.getMonth() - i);
        let present = 0;
        let annual = 0;
        let sick = 0;
        let absent = 0;
        empIds.forEach(empId => {
          present += getPresent(empId).filter(a => isSameMonth(new Date(a.date), base) && isDateInRange(a.date)).length;
          absent += getAbsent(empId).filter(a => isSameMonth(new Date(a.date), base) && isDateInRange(a.date)).length;
          annual += getLeaveDays(empId, 'Annual').filter(dStr => isSameMonth(parseISO(dStr), base)).length;
          sick += getLeaveDays(empId, 'Sick/Emergency').filter(dStr => isSameMonth(parseISO(dStr), base)).length;
          absent += getLeaveDays(empId, 'Absent').filter(dStr => isSameMonth(parseISO(dStr), base)).length;
        });
        months.push({ label: format(base, 'MMM'), present, annual, sick, absent });
      }
      return months;
    };

    const buildLogs = (empId: string) => {
      const logs: string[][] = [];
      if (incAttendance) {
        getPresent(empId).filter(a => isDateInRange(a.date)).forEach(a => logs.push([
          a.date, format(parseISO(a.date), 'EEE'), a.checkIn || '—', a.checkOut || '—', hoursBetween(a.checkIn, a.checkOut), 'Present',
        ]));
      }
      if (incAbsent) {
        getAbsent(empId).filter(a => isDateInRange(a.date)).forEach(a => logs.push([
          a.date, format(parseISO(a.date), 'EEE'), '—', '—', '—', 'Absent',
        ]));
        getLeaveDays(empId, 'Absent').forEach(dStr => logs.push([dStr, format(parseISO(dStr), 'EEE'), '—', '—', '—', 'Absent']));
      }
      if (incAnnual) getLeaveDays(empId, 'Annual').forEach(dStr => logs.push([dStr, format(parseISO(dStr), 'EEE'), '—', '—', '—', 'Annual Leave']));
      if (incSick) getLeaveDays(empId, 'Sick/Emergency').forEach(dStr => logs.push([dStr, format(parseISO(dStr), 'EEE'), '—', '—', '—', 'Sick Leave']));
      logs.sort((a, b) => a[0].localeCompare(b[0]));
      return logs;
    };

    const drawKpiCards = (kpis: { label: string; value: string; color: number[] }[], topY: number) => {
      const gap = 6;
      const cardW = (pageWidth - margin * 2 - gap * (kpis.length - 1)) / kpis.length;
      const cardH = 22;
      kpis.forEach((k, i) => {
        const x = margin + i * (cardW + gap);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.rect(x, topY, cardW, cardH, "FD");
        doc.setFillColor(k.color[0], k.color[1], k.color[2]);
        doc.rect(x, topY, 2, cardH, "F");
        doc.setTextColor(148, 163, 184);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text(k.label, x + 6, topY + 8);
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(15);
        doc.text(k.value, x + 6, topY + 18);
      });
    };

    const drawMonthly = (title: string, monthlyData: { label: string; present: number; annual: number; sick: number; absent: number }[], topY: number) => {
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(title, margin, topY);

      const legendItems = [
        { label: "Present", color: [13, 148, 136] },
        { label: "Leave", color: [245, 158, 11] },
        { label: "Absent", color: [244, 63, 94] },
      ];
      let lx = pageWidth - margin - 60;
      legendItems.forEach(lg => {
        doc.setFillColor(lg.color[0], lg.color[1], lg.color[2]);
        doc.rect(lx, topY - 4, 3, 3, "F");
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text(lg.label, lx + 4.5, topY - 1);
        lx += 20;
      });

      const cx = margin + 7;
      const cy = topY + 8;
      const cw = pageWidth - margin * 2 - 10;
      const ch = 50;
      const maxRaw = Math.max(1, ...monthlyData.map(m => m.present + m.annual + m.sick + m.absent));
      const maxVal = Math.max(5, Math.ceil(maxRaw / 5) * 5);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      for (let i = 0; i <= 4; i++) {
        const yy = cy + ch - (ch * i) / 4;
        doc.line(cx, yy, cx + cw, yy);
        doc.setTextColor(148, 163, 184);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.text(String(Math.round((maxVal * i) / 4)), cx - 2, yy + 2, { align: "right" });
      }

      const groupW = cw / monthlyData.length;
      const barW = Math.min(16, groupW * 0.45);
      monthlyData.forEach((m, i) => {
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
    };

    const drawBreakdown = (title: string, annual: number, sick: number, absent: number, topY: number) => {
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(title, margin, topY);

      const total = annual + sick + absent;
      const barX = margin;
      const barY = topY + 8;
      const barW2 = pageWidth - margin * 2;
      const barH = 12;
      doc.setFillColor(241, 245, 249);
      doc.rect(barX, barY, barW2, barH, "F");

      if (total > 0) {
        let segX = barX;
        const segs: { value: number; color: [number, number, number] }[] = [
          { value: annual, color: [245, 158, 11] },
          { value: sick, color: [100, 116, 139] },
          { value: absent, color: [244, 63, 94] },
        ];
        segs.forEach(s => {
          const w = (s.value / total) * barW2;
          if (w > 0) {
            doc.setFillColor(s.color[0], s.color[1], s.color[2]);
            doc.rect(segX, barY, w, barH, "F");
            if (w > 10) {
              doc.setTextColor(255, 255, 255);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(7);
              doc.text(`${Math.round((s.value / total) * 100)}%`, segX + w / 2, barY + 7.5, { align: "center" });
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

      const items = [
        { label: "Annual", value: annual, color: [245, 158, 11] as [number, number, number] },
        { label: "Sick", value: sick, color: [100, 116, 139] as [number, number, number] },
        { label: "Absent", value: absent, color: [244, 63, 94] as [number, number, number] },
      ];
      let bx = margin;
      items.forEach(it => {
        doc.setFillColor(it.color[0], it.color[1], it.color[2]);
        doc.rect(bx, barY + barH + 6, 3, 3, "F");
        doc.setTextColor(71, 85, 105);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`${it.label}: ${it.value} day${it.value === 1 ? "" : "s"}`, bx + 4.5, barY + barH + 9);
        bx += 55;
      });
    };

    // Load logo (optional)
    let logo: HTMLImageElement | null = null;
    try {
      logo = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.src = "/images/logo.png";
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
      });
    } catch {
      logo = null;
    }

    // Page 1 header
    doc.setFillColor(13, 148, 136);
    doc.rect(0, 0, pageWidth, 45, "F");
    if (logo) doc.addImage(logo, "PNG", 15, 12, 20, 20, "brand-logo", "FAST");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("ELEVATE VENTURES", logo ? 40 : margin, 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("WORKFORCE REPORTING SUITE", logo ? 40 : margin, 31);
    const rangeText = (fromDate && toDate) ? (fromDate === toDate ? `Date: ${fromDate}` : `Range: ${fromDate} to ${toDate}`) : "Range: All Time";
    doc.text(rangeText, pageWidth - margin, 22, { align: "right" });
    doc.text(`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`, pageWidth - margin, 30, { align: "right" });

    // Global overview
    drawKpiCards([
      { label: "PRESENT DAYS", value: String(globalAtt), color: [13, 148, 136] },
      { label: "ABSENT DAYS", value: String(globalAbs), color: [244, 63, 94] },
      { label: "ANNUAL LEAVE", value: String(globalAnn), color: [245, 158, 11] },
      { label: "SICK LEAVE", value: String(globalSick), color: [100, 116, 139] },
    ], 55);

    const globalMonthly = getMonthly(selectedEmps);
    drawMonthly("MONTHLY PRESENCE - SELECTED PERSONNEL", globalMonthly, 86);
    drawBreakdown("LEAVE & ABSENCE BREAKDOWN", globalAnn, globalSick, globalAbs, 158);

    if (incSummary && selectedEmps.length > 0) {
      const summaryBody = selectedEmps.map(empId => {
        const emp = activeEmployees.find(e => e.id === empId);
        if (!emp) return [];
        const counts = empCounts[empId] || { att: 0, ann: 0, sick: 0, abs: 0 };
        return [emp.name, counts.att.toString(), counts.ann.toString(), counts.sick.toString(), counts.abs.toString()];
      }).filter(x => x.length > 0);

      autoTable(doc, {
        startY: 196,
        head: [["EMPLOYEE NAME", "PRESENT", "ANNUAL", "SICK", "ABSENT"]],
        body: summaryBody,
        theme: "striped",
        headStyles: { fillColor: [248, 250, 252], textColor: [71, 85, 105], fontStyle: "bold", lineWidth: 0.1, lineColor: [226, 232, 240] },
        styles: { font: "helvetica", fontSize: 9, textColor: [15, 23, 42], cellPadding: 3 },
        alternateRowStyles: { fillColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      });
    }

    // Per-employee detailed sections
    if (incAttendance || incAnnual || incSick || incAbsent) {
      selectedEmployees.forEach(emp => {
        const counts = empCounts[emp.id] || { att: 0, ann: 0, sick: 0, abs: 0 };
        const empMonthly = getMonthly([emp.id]);
        const logs = buildLogs(emp.id);

        doc.addPage();

        // Employee header
        doc.setFillColor(13, 148, 136);
        doc.rect(0, 0, pageWidth, 38, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text(emp.name.toUpperCase(), margin, 16);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("EMPLOYEE PERFORMANCE REPORT", margin, 23);
        doc.text(`ID: ${emp.id.slice(0, 8).toUpperCase()}`, pageWidth - margin, 14, { align: "right" });
        doc.text(`Joined: ${format(new Date(emp.joinDate), "MMM dd, yyyy")}`, pageWidth - margin, 20, { align: "right" });
        doc.text(`Generated: ${format(new Date(), "MMM dd, yyyy HH:mm")}`, pageWidth - margin, 26, { align: "right" });

        drawKpiCards([
          { label: "PRESENT DAYS", value: String(counts.att), color: [13, 148, 136] },
          { label: "ABSENT DAYS", value: String(counts.abs), color: [244, 63, 94] },
          { label: "ANNUAL LEAVE", value: `${counts.ann}/${ANNUAL_LEAVE_LIMIT}`, color: [245, 158, 11] },
          { label: "SICK LEAVE", value: String(counts.sick), color: [100, 116, 139] },
        ], 46);

        drawMonthly("MONTHLY PRESENCE - LAST 6 MONTHS", empMonthly, 76);
        drawBreakdown("LEAVE & ABSENCE BREAKDOWN", counts.ann, counts.sick, counts.abs, 146);

        autoTable(doc, {
          startY: 184,
          head: [["MONTH", "PRESENT", "ANNUAL", "SICK", "ABSENT"]],
          body: empMonthly.map(m => [m.label, String(m.present), String(m.annual), String(m.sick), String(m.absent)]),
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
      });
    }

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

    doc.save(`Personnel_Report_${getFileRangeName()}.pdf`);
  };

  const generateDailyPDF = async () => {
    const doc = new jsPDF({ compress: true });
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    const now = new Date();
    const dateStr = format(now, "yyyy-MM-dd");

    const toMins = (t: string) => {
      const d = parse(t, "hh:mm a", new Date());
      return isNaN(d.getTime()) ? null : d.getHours() * 60 + d.getMinutes();
    };
    const hoursBetween = (inT?: string, outT?: string) => {
      if (!inT || !outT) return "—";
      const a = toMins(inT);
      const b = toMins(outT);
      if (a === null || b === null) return "—";
      let mins = b - a;
      if (mins < 0) mins += 24 * 60;
      return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
    };

    const employeesForReport = (selectedEmps.length
      ? selectedEmps.map(empId => activeEmployees.find(e => e.id === empId))
      : activeEmployees
    )
      .filter((e): e is (typeof activeEmployees)[number] => !!e)
      .sort((a, b) => a.name.localeCompare(b.name));

    const getLeave = (empId: string) => activeLeaves.find(l => {
      if (l.employeeId !== empId) return false;
      const start = l.startDate || (l as { date?: string }).date;
      const end = l.endDate || start;
      if (!start || !end) return false;
      return dateStr >= start && dateStr <= end;
    });

    let present = 0;
    let absent = 0;
    let onLeave = 0;
    let pending = 0;
    const rows: string[][] = [];

    employeesForReport.forEach(emp => {
      const record = activeAttendance.find(a => a.employeeId === emp.id && a.date === dateStr);
      const leave = getLeave(emp.id);
      let status = "Pending";
      let checkIn = "—";
      let checkOut = "—";
      let hours = "—";

      if (leave) {
        status = `On Leave (${leave.type})`;
        onLeave += 1;
      } else if (record?.absent) {
        status = "Absent";
        absent += 1;
      } else if (record?.checkIn) {
        status = "Present";
        checkIn = record.checkIn;
        checkOut = record.checkOut || "—";
        hours = hoursBetween(record.checkIn, record.checkOut);
        present += 1;
      } else {
        pending += 1;
      }

      rows.push([emp.name, checkIn, checkOut, hours, status]);
    });

    // Header
    doc.setFillColor(13, 148, 136);
    doc.rect(0, 0, pageWidth, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("DAILY ATTENDANCE REPORT", margin, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Elevate Ventures - Workforce Report", margin, 26);
    doc.text(`Date: ${format(now, "EEEE, MMM dd, yyyy")}`, pageWidth - margin, 16, { align: "right" });
    doc.text(`Generated: ${format(now, "MMM dd, yyyy HH:mm")}`, pageWidth - margin, 24, { align: "right" });

    // Summary cards
    const kpis = [
      { label: "PRESENT", value: String(present), color: [13, 148, 136] },
      { label: "ABSENT", value: String(absent), color: [244, 63, 94] },
      { label: "ON LEAVE", value: String(onLeave), color: [245, 158, 11] },
      { label: "PENDING", value: String(pending), color: [100, 116, 139] },
    ];
    const gap = 6;
    const cardW = (pageWidth - margin * 2 - gap * (kpis.length - 1)) / kpis.length;
    const cardY = 50;
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

    // Table
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TODAY'S ATTENDANCE", margin, 86);

    autoTable(doc, {
      startY: 90,
      head: [["EMPLOYEE", "CHECK IN", "CHECK OUT", "HOURS", "STATUS"]],
      body: rows.length ? rows : [["—", "—", "—", "—", "No employees"]],
      theme: "grid",
      headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
      styles: { font: "helvetica", fontSize: 9, textColor: [51, 65, 85], cellPadding: 3 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: margin, right: margin, bottom: 25 },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 4) {
          const value = String(data.cell.raw);
          if (value === "Present") data.cell.styles.textColor = [13, 148, 136];
          else if (value === "Absent") data.cell.styles.textColor = [244, 63, 94];
          else if (value.startsWith("On Leave")) data.cell.styles.textColor = [245, 158, 11];
          else data.cell.styles.textColor = [148, 163, 184];
        }
      },
    });

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      `Total: ${employeesForReport.length} employees  ·  Present ${present}  ·  Absent ${absent}  ·  On Leave ${onLeave}  ·  Pending ${pending}`,
      margin,
      finalY + 10
    );

    // Footer
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

    doc.save(`Daily_Report_${dateStr}.pdf`);
  };

  const generateExcel = () => {
    const { records, globalAtt, globalAnn, globalSick, globalAbs, empCounts } = getFilteredData();
    const wb = XLSX.utils.book_new();
    const rangeText = (fromDate && toDate) ? (fromDate === toDate ? `Date: ${fromDate}` : `Range: ${fromDate} to ${toDate}`) : "Range: All Time";

    if (incSummary) {
      const sumData = [['Elevate Ventures - Global Workforce Summary'], [`Time Period: ${rangeText}`], []];
      sumData.push(['Total Active Days', globalAtt.toString()]);
      sumData.push(['Total Annual Leave', globalAnn.toString()]);
      sumData.push(['Total Sick Leave', globalSick.toString()]);
      sumData.push(['Total Absent Days', globalAbs.toString()]);
      sumData.push([]);
      sumData.push(['Employee Name', 'Active Days', 'Annual Leaves', 'Sick Leaves', 'Absent Days']);
      
      selectedEmps.forEach(empId => {
        const emp = activeEmployees.find(e => e.id === empId);
        if(!emp) return;
        const counts = empCounts[empId] || { att: 0, ann: 0, sick: 0, abs: 0 };
        sumData.push([
          emp.name, 
          counts.att.toString(),
          counts.ann.toString(),
          counts.sick.toString(),
          counts.abs.toString()
        ]);
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sumData), "Workforce Summary");
    }

    if (incAttendance || incAnnual || incSick || incAbsent) {
      const detailsData = [['Branded Activity Logs'], [`Time Period: ${rangeText}`], [], ['Employee Name', 'Date', 'Type', 'Details']];
      records.forEach(r => detailsData.push([r.Emp, r.Date, r.Type, r.Details]));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detailsData), "Detailed Logs");
    }

    XLSX.writeFile(wb, `Personnel_Export_${getFileRangeName()}.xlsx`);
  };

  const downloadHTML = async () => {
    const htmlContent = await generateReportHTML();
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Personnel_Report_${getFileRangeName()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-10">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reports & Export</h1>
          <p className="text-slate-500 mt-1 text-base">Generate branded workforce analytics and comprehensive personnel activity reports.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button 
            onClick={copyLink}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-3 transition-all shadow-sm border ${
              copied ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-slate-200 hover:border-teal-200 text-slate-700 hover:text-teal-600'
            }`}
          >
            {copied ? <Check size={18} strokeWidth={2.5}/> : <Share2 size={18} strokeWidth={2.5}/>}
            {copied ? "Link Copied" : "Get Share Link"}
          </button>
          <button 
            onClick={generateExcel}
            className="w-full sm:w-auto bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-8 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-3 transition-all shadow-sm"
          >
            <Table size={18} strokeWidth={2.5}/> Excel Export
          </button>
          <button 
            onClick={generateDailyPDF}
            className="w-full sm:w-auto bg-white border border-slate-200 hover:border-teal-200 text-slate-700 hover:text-teal-600 px-8 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-3 transition-all shadow-sm"
          >
            <ClipboardList size={18} strokeWidth={2.5}/> Daily Report
          </button>
          <button 
            onClick={downloadHTML}
            disabled={selectedEmps.length === 0 || (!incAttendance && !incAnnual && !incSick && !incAbsent && !incSummary)}
            className="w-full sm:w-auto bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-8 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-3 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <FileCode size={18} strokeWidth={2.5}/> Download HTML
          </button>
          <button 
            onClick={generatePDF}
            disabled={selectedEmps.length === 0 || (!incAttendance && !incAnnual && !incSick && !incAbsent && !incSummary)}
            className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white px-10 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-3 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-teal-100"
          >
            <Download size={18} strokeWidth={2.5}/> Download PDF
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-8 space-y-8">
          
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-7 px-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-3 text-slate-800">
                <Calendar size={20} strokeWidth={2.5} className="text-teal-600" />
                <h2 className="text-[11px] font-bold uppercase tracking-widest">Time range</h2>
              </div>
              <button onClick={setTodayPreset} className="text-[10px] bg-white hover:bg-slate-50 text-teal-600 border border-slate-200 font-bold px-4 py-1.5 rounded-lg flex items-center gap-2 transition-all shadow-sm">
                <Zap size={14} strokeWidth={2.5} fill="currentColor"/> Today
              </button>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">From Date (Optional)</label>
                <input 
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-5 py-3.5 bg-slate-50 text-slate-800 border-2 border-slate-100 focus:border-teal-400 focus:outline-none transition-all rounded-xl font-semibold text-sm shadow-inner tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Until Date (Optional)</label>
                <input 
                  type="date"
                  value={toDate}
                  min={fromDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-5 py-3.5 bg-slate-50 text-slate-800 border-2 border-slate-100 focus:border-teal-400 focus:outline-none transition-all rounded-xl font-semibold text-sm shadow-inner tabular-nums"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-7 px-8 border-b border-slate-50 flex items-center gap-3 bg-slate-50/30">
              <Settings2 size={20} strokeWidth={2.5} className="text-amber-500" />
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-800">Report configuration</h2>
            </div>
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
              {[
                { state: incSummary, set: setIncSummary, label: "EXECUTIVE SUMMARY" },
                { state: incAttendance, set: setIncAttendance, label: "PRESENCE LOGS" },
                { state: incAnnual, set: setIncAnnual, label: "ANNUAL LEAVES" },
                { state: incSick, set: setIncSick, label: "SICK LEAVES" },
                { state: incAbsent, set: setIncAbsent, label: "ABSENT DAYS" },
              ].map((item, idx) => (
                <label key={idx} className="flex items-center gap-5 cursor-pointer group/item">
                  <input type="checkbox" checked={item.state} onChange={e => item.set(e.target.checked)} className="peer sr-only" />
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-all duration-300 ${item.state ? 'bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-100' : 'bg-slate-50 border-slate-200 text-transparent group-hover/item:border-teal-200'}`}>
                    <CheckSquare size={16} strokeWidth={3} />
                  </div>
                  <span className={`font-bold text-[11px] tracking-widest uppercase transition-all duration-300 ${item.state ? 'text-slate-800' : 'text-slate-400 group-hover/item:text-slate-600'}`}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

        </div>

        <div className="lg:col-span-4">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col h-full overflow-hidden max-h-[850px]">
            <div className="p-7 px-8 bg-slate-50/50 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3 text-slate-800">
                <Users size={20} strokeWidth={2.5} className="text-teal-600" />
                <h2 className="text-[11px] font-bold uppercase tracking-widest">Select Personnel</h2>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 bg-white border border-slate-200 text-slate-500 rounded-lg tabular-nums shadow-sm">{selectedEmps.length} / {activeEmployees.length}</span>
            </div>
            
            <div className="p-6 shrink-0 flex gap-3 bg-slate-50/20 border-b border-slate-50">
              <button 
                onClick={selectAllEmps} 
                className="flex-1 py-3 text-[10px] font-bold uppercase tracking-wider bg-white border border-slate-200 text-slate-600 shadow-sm transition-all rounded-xl hover:bg-slate-50 hover:border-slate-300"
              >
                Select All
              </button>
              <button 
                onClick={deselectAllEmps} 
                className="flex-1 py-3 text-[10px] font-bold uppercase tracking-wider bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all rounded-xl"
              >
                Clear
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-white">
              {activeEmployees.length === 0 ? (
                <div className="text-center text-slate-300 text-xs font-bold py-20 italic">No employees identified.</div>
              ) : (
                activeEmployees.map(emp => {
                  const isSelected = selectedEmps.includes(emp.id);
                  return (
                    <button 
                      key={emp.id}
                      onClick={() => toggleEmp(emp.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all group/entity ${
                        isSelected ? 'bg-teal-50/30 border-teal-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-10 h-10 rounded-full shrink-0 border-2 transition-all duration-300 ${isSelected ? 'bg-white border-teal-200 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                          {emp.photoUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={emp.photoUrl} alt="" className={`w-full h-full object-cover rounded-full ${!isSelected && 'grayscale'}`} />
                          ) : (
                            <span className="font-bold text-sm h-full flex items-center justify-center">{emp.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="text-left">
                          <span className={`font-bold text-xs tracking-tight truncate uppercase block ${isSelected ? 'text-slate-900' : 'text-slate-400 group-hover/entity:text-slate-600'}`}>{emp.name}</span>
                          <span className="text-[10px] font-bold text-slate-300 tabular-nums uppercase tracking-widest">{emp.id.slice(0,8)}</span>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${isSelected ? 'bg-teal-600 border-teal-600 text-white shadow-sm' : 'border-slate-100 bg-slate-50 text-transparent'}`}>
                        <CheckSquare size={14} strokeWidth={4} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
