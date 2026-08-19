"use client";

import { useStore } from "@/lib/store";
import { useState, useEffect } from "react";
import { format, isWithinInterval, parseISO, eachDayOfInterval } from "date-fns";
import { isBusinessDay } from "@/lib/dateUtils";
import { Calendar, Users, Settings2, Download, CheckSquare, Table, Zap, Share2, Check, FileCode } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function ExportPage() {
  const [mounted, setMounted] = useState(false);
  const { employees, attendance, leaves, saveReportConfig } = useStore();

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
    const empCounts: Record<string, { att: number, ann: number, sick: number }> = {};

    selectedEmps.forEach(empId => {
      const emp = activeEmployees.find(e => e.id === empId);
      if (!emp) return;
      
      const atts = activeAttendance.filter(a => a.employeeId === empId && a.checkIn && isDateInRange(a.date));
      const rawAnns = activeLeaves.filter(l => l.employeeId === empId && l.type === 'Annual');
      const rawSicks = activeLeaves.filter(l => l.employeeId === empId && l.type === 'Sick/Emergency');

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

      empCounts[empId] = { att: atts.length, ann: anns.length, sick: sicks.length };

      globalAtt += atts.length;
      globalAnn += anns.length;
      globalSick += sicks.length;

      if (incAttendance) atts.forEach(a => records.push({ Emp: emp.name, Date: a.date, Type: 'Attendance', Details: `IN: ${a.checkIn} ${a.checkOut ? `OUT: ${a.checkOut}` : ''}` }));
      if (incAnnual) anns.forEach(dStr => records.push({ Emp: emp.name, Date: dStr, Type: 'Annual Leave', Details: 'Full Day' }));
      if (incSick) sicks.forEach(dStr => records.push({ Emp: emp.name, Date: dStr, Type: 'Sick Leave', Details: 'Full Day' }));
    });
    
    records.sort((a,b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
    return { records, globalAtt, globalAnn, globalSick, empCounts };
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
    const { records, globalAtt, globalAnn, globalSick, empCounts } = getFilteredData();
    const rangeLabel = (fromDate && toDate)
      ? (fromDate === toDate ? `Date: ${fromDate}` : `${fromDate} — ${toDate}`)
      : "All Records";
    const generatedAt = format(new Date(), 'MMM dd, yyyy HH:mm');
    const totalEvents = globalAtt + globalAnn + globalSick;
    const logoDataUri = await loadLogoDataUri();

    const summaryRows = selectedEmps.map(empId => {
      const emp = activeEmployees.find(e => e.id === empId);
      if (!emp) return '';
      const c = empCounts[empId] || { att: 0, ann: 0, sick: 0 };
      return `<tr><td>${emp.name}</td><td>${c.att}</td><td>${c.ann}</td><td>${c.sick}</td></tr>`;
    }).join('');

    const activityLogs = selectedEmps.map(empId => {
      const emp = activeEmployees.find(e => e.id === empId);
      if (!emp) return '';
      const empRecs = records.filter(r => r.Emp === emp.name);
      if (empRecs.length === 0) return '';
      const rows = empRecs.map(r => {
        const badge = r.Type.includes('Annual') ? 'badge-annual' : r.Type.includes('Sick') ? 'badge-sick' : 'badge-att';
        return `<tr><td>${r.Date}</td><td><span class="badge ${badge}">${r.Type}</span></td><td>${r.Details}</td></tr>`;
      }).join('');
      return `<div class="emp-section"><div class="emp-header"><h3>${emp.name}</h3><span class="emp-id">ID: ${emp.id.slice(0,8)}</span></div><table><thead><tr><th>Date</th><th>Type</th><th>Details</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }).join('');

    const barAtt = totalEvents > 0 ? `${(globalAtt/totalEvents*100).toFixed(1)}%` : '0%';
    const barAnn = totalEvents > 0 ? `${(globalAnn/totalEvents*100).toFixed(1)}%` : '0%';
    const barSick = totalEvents > 0 ? `${(globalSick/totalEvents*100).toFixed(1)}%` : '0%';

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
.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:16px}
.metric{display:flex;align-items:center;gap:10px}
.dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.dot-att{background:#14b8a6}.dot-ann{background:#f59e0b}.dot-sick{background:#f43f5e}
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
<div class="bar-wrap"><div class="bar-att" style="width:${barAtt}"></div><div class="bar-ann" style="width:${barAnn}"></div><div class="bar-sick" style="width:${barSick}"></div></div>
<div class="metrics">
<div class="metric"><div class="dot dot-att"></div><div><div class="metric-label">Active Presence</div><div class="metric-val">${globalAtt} <span class="metric-unit">days</span></div></div></div>
<div class="metric"><div class="dot dot-ann"></div><div><div class="metric-label">Annual Leaves</div><div class="metric-val">${globalAnn} <span class="metric-unit">days</span></div></div></div>
<div class="metric"><div class="dot dot-sick"></div><div><div class="metric-label">Sick/Emergency</div><div class="metric-val">${globalSick} <span class="metric-unit">days</span></div></div></div>
</div>` : ''}
<table style="margin-top:24px">
<thead><tr><th>Employee Name</th><th>Active Days</th><th>Annual Leaves</th><th>Sick Leaves</th></tr></thead>
<tbody>${summaryRows}</tbody>
</table>
</section>` : ''}
${(incAttendance || incAnnual || incSick) && activityLogs ? `
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
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const { records, globalAtt, globalAnn, globalSick, empCounts } = getFilteredData();
    
    // Load Logo with Promise for async handling
    const loadImg = (url: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = url;
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
      });
    };

    try {
      const logo = await loadImg("/images/logo.png");
      const logoW = 25;
      const logoH = 25;
      
      // Header - Corporate Brand Band
      doc.setFillColor(13, 148, 136); // Teal-600 (Company)
      doc.rect(0, 0, pageWidth, 45, "F");
      
      // Logo and Brand Name
      doc.addImage(logo, 'PNG', 15, 10, logoW, logoH);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.text("ELEVATE VENTURES", 48, 24);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("WORKFORCE REPORTING SUITE", 48, 31);
      
      const rangeText = (fromDate && toDate) ? (fromDate === toDate ? `Date: ${fromDate}` : `Range: ${fromDate} to ${toDate}`) : "Range: All Time";
      const generatedText = `Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`;
      doc.text(rangeText, pageWidth - 15, 22, { align: "right" });
      doc.text(generatedText, pageWidth - 15, 30, { align: "right" });
    } catch {
      // Fallback if logo fails
      doc.setFillColor(13, 148, 136);
      doc.rect(0, 0, pageWidth, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("HR ATTENDANCE REPORT", 15, 25);
    }

    let currentY = 60;

    // Executive Metrics
    if (incSummary && selectedEmps.length > 0) {
      doc.setTextColor(15, 23, 42); // Navy/Slate-900
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("EXECUTIVE PERFORMANCE SUMMARY", 15, currentY);

      currentY += 12;
      
      const totalEvents = globalAtt + globalAnn + globalSick;
      if (totalEvents > 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        const barWidth = pageWidth - 30;
        const wAtt = (globalAtt / totalEvents) * barWidth;
        const wAnn = (globalAnn / totalEvents) * barWidth;
        const wSick = (globalSick / totalEvents) * barWidth;

        // Brand Palette: Teal, Amber, Rose
        doc.setFillColor(13, 148, 136); // Teal (Company)
        doc.rect(15, currentY, wAtt, 10, 'F');
        doc.setFillColor(217, 119, 6); // Amber
        doc.rect(15 + wAtt, currentY, wAnn, 10, 'F');
        doc.setFillColor(225, 29, 72); // Rose
        doc.rect(15 + wAtt + wAnn, currentY, wSick, 10, 'F');
        
        // Legend
        currentY += 18;
        doc.setFillColor(13, 148, 136);
        doc.rect(15, currentY - 3, 3, 3, 'F');
        doc.text(`Active: ${globalAtt}`, 21, currentY);

        doc.setFillColor(217, 119, 6);
        doc.rect(60, currentY - 3, 3, 3, 'F');
        doc.text(`Annual: ${globalAnn}`, 66, currentY);

        doc.setFillColor(225, 29, 72);
        doc.rect(100, currentY - 3, 3, 3, 'F');
        doc.text(`Sick/Emergency: ${globalSick}`, 106, currentY);

        currentY += 12;
      }
      
      const summaryBody = selectedEmps.map(empId => {
        const emp = activeEmployees.find(e => e.id === empId);
        if(!emp) return [];
        const counts = empCounts[empId] || { att: 0, ann: 0, sick: 0 };
        return [emp.name, counts.att.toString(), counts.ann.toString(), counts.sick.toString()];
      }).filter(x => x.length > 0);

      autoTable(doc, {
        startY: currentY,
        head: [['EMPLOYEE NAME', 'ACTIVE DAYS', 'ANNUAL LEAVES', 'SICK LEAVES']],
        body: summaryBody,
        theme: 'striped',
        headStyles: { fillColor: [248, 250, 252], textColor: [71, 85, 105], fontStyle: 'bold', lineWidth: 0.1, lineColor: [226, 232, 240] },
        styles: { font: 'helvetica', fontSize: 9, textColor: [15, 23, 42], cellPadding: 4 },
        alternateRowStyles: { fillColor: [255, 255, 255] },
      });
      
      currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
    }

    // Detailed Activity
    if (incAttendance || incAnnual || incSick) {
      if (currentY > doc.internal.pageSize.height - 40 && incSummary) {
        doc.addPage();
        currentY = 20;
      }

      selectedEmps.forEach((empId) => {
        const emp = activeEmployees.find(e => e.id === empId);
        if (!emp) return;
        const empRecs = records.filter(r => r.Emp === emp.name).map(r => [r.Date, r.Type, r.Details]);
        if (empRecs.length === 0) return;

        if (currentY > doc.internal.pageSize.height - 50) { doc.addPage(); currentY = 20; }

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`ACTIVITY LOG: ${emp.name}`, 15, currentY);

        autoTable(doc, {
          startY: currentY + 6,
          head: [['DATE', 'TYPE', 'INFORMATION SUMMARY']],
          body: empRecs,
          theme: 'grid',
          headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold', lineWidth: 0.1, lineColor: [226, 232, 240] },
          styles: { font: 'helvetica', fontSize: 8, textColor: [51, 65, 85], cellPadding: 3 },
          alternateRowStyles: { fillColor: [252, 253, 254] },
          margin: { bottom: 20 }
        });

        currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
      });
    }

    doc.save(`Personnel_Report_${getFileRangeName()}.pdf`);
  };

  const generateExcel = () => {
    const { records, globalAtt, globalAnn, globalSick, empCounts } = getFilteredData();
    const wb = XLSX.utils.book_new();
    const rangeText = (fromDate && toDate) ? (fromDate === toDate ? `Date: ${fromDate}` : `Range: ${fromDate} to ${toDate}`) : "Range: All Time";

    if (incSummary) {
      const sumData = [['Elevate Ventures - Global Workforce Summary'], [`Time Period: ${rangeText}`], []];
      sumData.push(['Total Active Days', globalAtt.toString()]);
      sumData.push(['Total Annual Leave', globalAnn.toString()]);
      sumData.push(['Total Sick Leave', globalSick.toString()]);
      sumData.push([]);
      sumData.push(['Employee Name', 'Active Days', 'Annual Leaves', 'Sick Leaves']);
      
      selectedEmps.forEach(empId => {
        const emp = activeEmployees.find(e => e.id === empId);
        if(!emp) return;
        const counts = empCounts[empId] || { att: 0, ann: 0, sick: 0 };
        sumData.push([
          emp.name, 
          counts.att.toString(),
          counts.ann.toString(),
          counts.sick.toString()
        ]);
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sumData), "Workforce Summary");
    }

    if (incAttendance || incAnnual || incSick) {
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
            onClick={downloadHTML}
            disabled={selectedEmps.length === 0 || (!incAttendance && !incAnnual && !incSick && !incSummary)}
            className="w-full sm:w-auto bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-8 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-3 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <FileCode size={18} strokeWidth={2.5}/> Download HTML
          </button>
          <button 
            onClick={generatePDF}
            disabled={selectedEmps.length === 0 || (!incAttendance && !incAnnual && !incSick && !incSummary)}
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
