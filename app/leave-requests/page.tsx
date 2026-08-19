"use client";

import { useStore } from "@/lib/store";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock } from "lucide-react";

export default function LeaveRequestsPage() {
  const [mounted, setMounted] = useState(false);
  const { user, leaveRequests, updateLeaveRequestStatus } = useStore();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const filtered = filter === "all" ? leaveRequests : leaveRequests.filter(r => r.status === filter);
  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const pendingCount = leaveRequests.filter(r => r.status === "pending").length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-5xl mx-auto pb-10">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Leave Requests</h1>
          <p className="text-slate-500 mt-1 text-base">Review and manage employee leave requests.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex items-center shadow-sm">
            {(["pending", "approved", "rejected", "all"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${filter === f ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                {f} {f === "pending" ? `(${pendingCount})` : ""}
              </button>
            ))}
          </div>
        </div>
      </header>

      {sorted.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-24 text-center flex flex-col items-center shadow-sm">
          <Clock size={40} className="text-slate-200" strokeWidth={2} />
          <h3 className="text-xl font-bold text-slate-800 mt-4">No requests found</h3>
          <p className="text-slate-500 text-sm mt-1">No leave requests match the current filter.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-50">
            {sorted.map(req => (
              <div key={req.id} className="p-6 px-8 hover:bg-slate-50/50 transition-all">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 font-bold text-sm flex items-center justify-center shrink-0 shadow-sm border border-white">
                      {req.employeeName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-bold text-sm text-slate-800">{req.employeeName}</h3>
                        <span className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg border ${
                          req.status === 'approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                          req.status === 'rejected' ? 'bg-rose-50 border-rose-200 text-rose-600' :
                          'bg-amber-50 border-amber-200 text-amber-700'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-500 mt-1.5">
                        {req.startDate === req.endDate
                          ? format(new Date(req.startDate), 'EEEE, MMM dd, yyyy')
                          : `${format(new Date(req.startDate), 'MMM dd, yyyy')} - ${format(new Date(req.endDate), 'MMM dd, yyyy')}`
                        }
                      </p>
                      <p className="text-xs text-slate-400 mt-2 font-medium bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                        &ldquo;{req.reason}&rdquo;
                      </p>
                      <p className="text-[10px] text-slate-400 mt-2 font-semibold">
                        Submitted {format(new Date(req.createdAt), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>

                  {req.status === "pending" && user && (
                    <div className="flex items-center gap-2 shrink-0 pt-1">
                      <button
                        onClick={() => updateLeaveRequestStatus(req.id, "approved", user.email || "admin")}
                        className="p-2.5 text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 rounded-lg transition-all"
                        title="Approve"
                      >
                        <CheckCircle size={20} strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => updateLeaveRequestStatus(req.id, "rejected", user.email || "admin")}
                        className="p-2.5 text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-all"
                        title="Reject"
                      >
                        <XCircle size={20} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
