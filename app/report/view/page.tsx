"use client";

import { useStore } from "@/lib/store";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { format, isWithinInterval, parseISO, eachDayOfInterval } from "date-fns";
import { isBusinessDay } from "@/lib/dateUtils";
import { Shield, ArrowLeft, Printer, Share2 } from "lucide-react";
import Link from "next/link";

function ReportViewerContent() {
  const searchParams = useSearchParams();
  const { employees, attendance, leaves, initRealtimeSync, getReportConfig } = useStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filter state
  const [config, setConfig] = useState<{
    from: string;
    to: string;
    emps: string[];
    att: boolean;
    ann: boolean;
    sick: boolean;
    sum: boolean;
  }>({
    from: searchParams.get("from") || "",
    to: searchParams.get("to") || "",
    emps: (searchParams.get("emps") || "").split(",").filter(Boolean),
    att: searchParams.get("att") === "true",
    ann: searchParams.get("ann") === "true",
    sick: searchParams.get("sick") === "true",
    sum: searchParams.get("sum") === "true",
  });

  useEffect(() => {
    setMounted(true);
    const unsub = initRealtimeSync();

    const fetchShortConfig = async () => {
      const sid = searchParams.get("sid");
      if (sid) {
        setLoading(true);
        const fetchedConfig = await getReportConfig(sid);
        if (fetchedConfig) {
          setConfig(fetchedConfig);
        }
        setLoading(false);
      }
    };

    fetchShortConfig();
    return () => unsub();
  }, [initRealtimeSync, searchParams, getReportConfig]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-6">
        <div className="w-16 h-16 border-4 border-teal-100 border-t-teal-600 rounded-full animate-spin" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em] animate-pulse">Decrypting Workforce Intelligence...</p>
      </div>
    );
  }

  const { from: fromDate, to: toDate, emps: selectedEmps, att: incAttendance, ann: incAnnual, sick: incSick, sum: incSummary } = config;

  const isDateInRange = (d: string) => {
    if (!fromDate && !toDate) return true;
    try {
      const date = parseISO(d);
      if (fromDate && !toDate) return date >= parseISO(fromDate);
      if (!fromDate && toDate) return date <= parseISO(toDate);
      return isWithinInterval(date, { start: parseISO(fromDate), end: parseISO(toDate) });
    } catch { return true; }
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
        const start = l.startDate;
        const end = l.endDate || start;
        if (!start) return;
        eachDayOfInterval({ start: new Date(start), end: new Date(end) }).forEach(d => {
          const dStr = format(d, 'yyyy-MM-dd');
          if (isDateInRange(dStr) && isBusinessDay(d)) anns.push(dStr);
        });
      });

      const sicks: string[] = [];
      rawSicks.forEach(l => {
        const start = l.startDate;
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

  const { records, globalAtt, globalAnn, globalSick, empCounts } = getFilteredData();
  const totalEvents = globalAtt + globalAnn + globalSick;

  return (
    <div className="min-h-screen bg-white print:p-0 p-4 md:p-8">
      {/* Tool Bar - Hidden in print */}
      <div className="max-w-5xl mx-auto mb-8 flex items-center justify-between print:hidden">
        <Link href="/export" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-widest transition-all">
          <ArrowLeft size={16} /> Back to Export
        </Link>
        <div className="flex gap-4">
            <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
                <Printer size={16} /> Print Report
            </button>
        </div>
      </div>

      {/* Actual Report Content */}
      <div className="max-w-5xl mx-auto bg-white shadow-2xl print:shadow-none border border-slate-100 print:border-none rounded-3xl overflow-hidden min-h-[11in]">
        
        {/* Brand Header */}
        <header className="bg-teal-600 p-12 text-white flex flex-col md:flex-row items-center md:items-end justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center ring-4 ring-white/10 backdrop-blur-sm">
                <Shield size={40} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tighter">ELEVATE VENTURES</h1>
              <p className="text-teal-100 font-bold text-xs uppercase tracking-[0.2em] mt-1 opacity-80">Workforce Reporting Suite</p>
            </div>
          </div>
          
          <div className="text-right flex flex-col items-center md:items-end gap-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-200">Time Horizon</p>
            <p className="text-xl font-bold tracking-tight">
                {(fromDate && toDate) ? (fromDate === toDate ? fromDate : `${fromDate} — ${toDate}`) : "All Records"}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-200/60 mt-2">
                Generated: {format(new Date(), 'MMM dd, yyyy HH:mm')}
            </p>
          </div>
        </header>

        <div className="p-12 space-y-16">
          
          {/* Executive Summary Section */}
          {incSummary && selectedEmps.length > 0 && (
            <section className="space-y-10">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-100" />
                <h2 className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Executive metrics</h2>
                <div className="h-px flex-1 bg-slate-100" />
              </div>

              {totalEvents > 0 && (
                <div className="space-y-6">
                  <div className="flex h-4 w-full rounded-full overflow-hidden bg-slate-50 border border-slate-100">
                    <div style={{ width: `${(globalAtt/totalEvents)*100}%` }} className="bg-teal-500" />
                    <div style={{ width: `${(globalAnn/totalEvents)*100}%` }} className="bg-amber-500" />
                    <div style={{ width: `${(globalSick/totalEvents)*100}%` }} className="bg-rose-500" />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-8">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-teal-500 shadow-sm shadow-teal-100" />
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Presence</p>
                            <p className="text-xl font-bold text-slate-800">{globalAtt} <span className="text-xs font-medium text-slate-400">days</span></p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-100" />
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Annual Leaves</p>
                            <p className="text-xl font-bold text-slate-800">{globalAnn} <span className="text-xs font-medium text-slate-400">days</span></p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-100" />
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sick/Emergency</p>
                            <p className="text-xl font-bold text-slate-800">{globalSick} <span className="text-xs font-medium text-slate-400">days</span></p>
                        </div>
                    </div>
                  </div>
                </div>
              )}

              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-900">
                    <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Employee Name</th>
                    <th className="text-center py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Active Days</th>
                    <th className="text-center py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Annual</th>
                    <th className="text-center py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Sick</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedEmps.map(empId => {
                    const emp = employees.find(e => e.id === empId);
                    if (!emp) return null;
                    const c = empCounts[empId] || { att: 0, ann: 0, sick: 0 };
                    return (
                      <tr key={empId} className="group">
                        <td className="py-5 font-bold text-slate-800">{emp.name}</td>
                        <td className="py-5 text-center font-bold text-slate-600 tabular-nums">{c.att}</td>
                        <td className="py-5 text-center font-bold text-slate-600 tabular-nums">{c.ann}</td>
                        <td className="py-5 text-center font-bold text-slate-600 tabular-nums">{c.sick}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          {/* Detailed Logs Section */}
          {(incAttendance || incAnnual || incSick) && (
            <section className="space-y-12">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-100" />
                <h2 className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Branded activity logs</h2>
                <div className="h-px flex-1 bg-slate-100" />
              </div>

              {selectedEmps.map(empId => {
                const emp = employees.find(e => e.id === empId);
                if (!emp) return null;
                const empRecs = records.filter(r => r.Emp === emp.name);
                if (empRecs.length === 0) return null;

                return (
                  <div key={empId} className="space-y-6">
                    <div className="flex items-baseline justify-between mb-4 border-l-4 border-teal-500 pl-6">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{emp.name}</h3>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">ID: {emp.id.slice(0,8)}</span>
                    </div>

                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-y border-slate-200">
                          <th className="text-left font-bold text-[10px] uppercase tracking-widest text-slate-500 p-4 w-1/4">Date</th>
                          <th className="text-left font-bold text-[10px] uppercase tracking-widest text-slate-500 p-4 w-1/4">Event Type</th>
                          <th className="text-left font-bold text-[10px] uppercase tracking-widest text-slate-500 p-4">Summary of activity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {empRecs.map((r, it) => (
                          <tr key={it} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 font-bold text-slate-600 tabular-nums text-sm">{r.Date}</td>
                            <td className="p-4">
                                <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                    r.Type.includes('Annual') ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                    r.Type.includes('Sick') ? 'bg-rose-50 border-rose-200 text-rose-700' :
                                    'bg-teal-50 border-teal-200 text-teal-700'
                                }`}>
                                    {r.Type}
                                </span>
                            </td>
                            <td className="p-4 text-sm font-medium text-slate-500">{r.Details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </section>
          )}

          {records.length === 0 && (
            <div className="text-center py-24 border-4 border-dashed border-slate-50 rounded-3xl">
              <p className="text-slate-300 font-black uppercase tracking-widest">No matching records found for this configuration.</p>
            </div>
          )}

        </div>

        {/* Brand Footer */}
        <footer className="bg-slate-50 border-t border-slate-100 p-12 flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-2 text-slate-400">
                <Shield size={18} strokeWidth={2.5}/>
                <span className="text-[10px] font-bold uppercase tracking-widest">Digital Authentication Secured</span>
            </div>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">Elevate Ventures • Operational Excellence Protocol 2026</p>
        </footer>
      </div>
    </div>
  );
}

export default function ReportViewer() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-slate-400 animate-pulse">Initializing Branded Reporting Suite...</div>}>
      <ReportViewerContent />
    </Suspense>
  );
}
