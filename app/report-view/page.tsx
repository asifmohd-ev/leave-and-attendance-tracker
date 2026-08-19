"use client";

import { useStore } from "@/lib/store";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Shield, ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";

function SnapshotViewer({ sid }: { sid: string }) {
  const { getReportConfig } = useStore();
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getReportConfig(sid).then((data) => {
      if (data?.htmlContent) {
        setHtml(data.htmlContent as string);
      } else if (data?.config && (data.config as Record<string, unknown>)?.htmlContent) {
        setHtml((data.config as Record<string, unknown>).htmlContent as string);
      } else {
        setError(true);
      }
      setLoading(false);
    }).catch(() => {
      setError(true);
      setLoading(false);
    });
  }, [sid, getReportConfig]);

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-white gap-6">
        <div className="w-16 h-16 border-4 border-teal-100 border-t-teal-600 rounded-full animate-spin" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em] animate-pulse">Loading Report...</p>
      </div>
    );
  }

  if (error || !html) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-white gap-4 p-8">
        <Shield size={40} className="text-slate-200" />
        <p className="text-slate-400 font-bold text-sm">This report link is invalid or has expired.</p>
        <Link href="/" className="text-teal-600 text-xs font-bold uppercase tracking-widest hover:underline">Go to Dashboard</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="print:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-100 shadow-sm px-6 py-3 flex items-center justify-between">
        <Link href="/export" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-widest transition-all">
          <ArrowLeft size={14} /> Back to Export
        </Link>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg">
          <Printer size={14} /> Print / Save PDF
        </button>
      </div>
      <div className="pt-14 print:pt-0" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function ReportViewerContent() {
  const searchParams = useSearchParams();
  const sid = searchParams.get("sid");

  if (sid) {
    return <SnapshotViewer sid={sid} />;
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-white gap-4 p-8">
      <Shield size={40} className="text-slate-200" />
      <p className="text-slate-400 font-bold text-sm">This link format is no longer supported.</p>
      <p className="text-slate-300 text-xs">Please generate a new share link from the Export page.</p>
      <Link href="/export" className="text-teal-600 text-xs font-bold uppercase tracking-widest hover:underline mt-2">Go to Export</Link>
    </div>
  );
}

export default function ReportViewer() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex flex-col items-center justify-center bg-white gap-6">
        <div className="w-16 h-16 border-4 border-teal-100 border-t-teal-600 rounded-full animate-spin" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em] animate-pulse">Loading Report...</p>
      </div>
    }>
      <ReportViewerContent />
    </Suspense>
  );
}
