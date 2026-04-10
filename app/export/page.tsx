"use client";

import { useStore } from "@/lib/store";
import { useState, useEffect } from "react";
import { format, isWithinInterval, parseISO, eachDayOfInterval } from "date-fns";
import { isBusinessDay } from "@/lib/dateUtils";
import { Calendar, Users, Settings2, Download, CheckSquare, Table, Zap, Share2, Check } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function ExportPage() {
  const [mounted, setMounted] = useState(false);
  const { employees, attendance, leaves, saveReportConfig } = useStore();
  const [copied, setCopied] = useState(false);
  
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  
  const [selectedEmps, setSelectedEmps] = useState<string[]>([]);
  
  const [incAttendance, setIncAttendance] = useState(true);
  const [incAnnual, setIncAnnual] = useState(true);
  const [incSick, setIncSick] = useState(true);
  const [incSummary, setIncSummary] = useState(true);

  useEffect(() => {
    setMounted(true);
    setSelectedEmps(employees.map(e => e.id));
  }, [employees]);

  if (!mounted) return null;

  const toggleEmp = (id: string) => setSelectedEmps(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const selectAllEmps = () => setSelectedEmps(employees.map(e => e.id));
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
    const records: any[] = [];
    let globalAtt = 0;
    let globalAnn = 0;
    let globalSick = 0;
    const empCounts: Record<string, { att: number, ann: number, sick: number }> = {};

    selectedEmps.forEach(empId => {
      const emp = employees.find(e => e.id === empId);
      if (!emp) return;
      
      const atts = attendance.filter(a => a.employeeId === empId && a.checkIn && isDateInRange(a.date));
      const rawAnns = leaves.filter(l => l.employeeId === empId && l.type === 'Annual');
      const rawSicks = leaves.filter(l => l.employeeId === empId && l.type === 'Sick/Emergency');

      const anns: string[] = [];
      rawAnns.forEach(l => {
        const start = l.startDate || (l as any).date;
        const end = l.endDate || start;
        if (!start) return;
        eachDayOfInterval({ start: new Date(start), end: new Date(end) }).forEach(d => {
          const dStr = format(d, 'yyyy-MM-dd');
          if (isDateInRange(dStr) && isBusinessDay(d)) anns.push(dStr);
        });
      });

      const sicks: string[] = [];
      rawSicks.forEach(l => {
        const start = l.startDate || (l as any).date;
        const end = l.endDate || start;
        if (!start) return;
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

  const getShareLink = () => {
    const params = new URLSearchParams({
      from: fromDate,
      to: toDate,
      emps: selectedEmps.join(','),
      att: incAttendance.toString(),
      ann: incAnnual.toString(),
      sick: incSick.toString(),
      sum: incSummary.toString(),
    });
    return `${window.location.origin}/report/view?${params.toString()}`;
  };

  const copyLink = async () => {
    const config = {
      from: fromDate,
      to: toDate,
      emps: selectedEmps,
      att: incAttendance,
      ann: incAnnual,
      sick: incSick,
      sum: incSummary,
    };

    try {
      const sid = await saveReportConfig(config);
      const shortLink = `${window.location.origin}/report/view?sid=${sid}`;
      
      const rangeLabel = (fromDate && toDate) 
        ? (fromDate === toDate ? `Date: ${fromDate}` : `Range: ${fromDate} to ${toDate}`) 
        : "All Records";
      
      const clipboardText = `HR Personnel Report (${rangeLabel}): ${shortLink}`;
      
      await navigator.clipboard.writeText(clipboardText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to generate short link", err);
      // Fallback to old long link if Firestore fails
      const longLink = getShareLink();
      await navigator.clipboard.writeText(longLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
        const emp = employees.find(e => e.id === empId);
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
      
      currentY = (doc as any).lastAutoTable.finalY + 20;
    }

    // Detailed Activity
    if (incAttendance || incAnnual || incSick) {
      if (currentY > doc.internal.pageSize.height - 40 && incSummary) {
        doc.addPage();
        currentY = 20;
      }

      selectedEmps.forEach((empId) => {
        const emp = employees.find(e => e.id === empId);
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

        currentY = (doc as any).lastAutoTable.finalY + 15;
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
        const emp = employees.find(e => e.id === empId);
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
              <span className="text-[10px] font-bold px-2 py-1 bg-white border border-slate-200 text-slate-500 rounded-lg tabular-nums shadow-sm">{selectedEmps.length} / {employees.length}</span>
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
              {employees.length === 0 ? (
                <div className="text-center text-slate-300 text-xs font-bold py-20 italic">No employees identified.</div>
              ) : (
                employees.map(emp => {
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
                          {emp.photoUrl ? <img src={emp.photoUrl} alt="" className={`w-full h-full object-cover rounded-full ${!isSelected && 'grayscale'}`} /> : <span className="font-bold text-sm h-full flex items-center justify-center">{emp.name.charAt(0)}</span>}
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
