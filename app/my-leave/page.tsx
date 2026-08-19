"use client";

import { useStore } from "@/lib/store";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EmployeeGuard } from "@/components/RoleGuard";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { format, eachDayOfInterval } from "date-fns";
import { isBusinessDay, ANNUAL_LEAVE_LIMIT } from "@/lib/dateUtils";
import { CalendarOff, Send, CheckCircle, Loader2, History } from "lucide-react";

export default function MyLeavePage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { employees, leaveRequests, addLeaveRequest, leaves } = useStore();

  const [authUser, setAuthUser] = useState<{ uid: string; email: string } | null>(null);
  const [myEmployee, setMyEmployee] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setAuthUser({ uid: user.uid, email: user.email || "" });

      // Find employee by authUid
      const empRef = doc(db, "employees", user.uid);
      const empSnap = await getDoc(empRef);
      if (empSnap.exists()) {
        const empData = { id: empSnap.id, ...empSnap.data() } as { id: string; name: string };
        setMyEmployee(empData);
      } else {
        // Also try to find via employees array (if authUid is stored in employee doc)
        const found = employees.find(e => e.authUid === user.uid);
        if (found) {
          setMyEmployee({ id: found.id, name: found.name });
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router, employees]);

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  if (!authUser) {
    return null;
  }

  if (!myEmployee) {
    return (
      <div className="space-y-10 animate-in fade-in duration-700 max-w-3xl mx-auto pb-10 text-center pt-20">
        <CalendarOff size={48} className="text-slate-200 mx-auto" strokeWidth={2} />
        <h2 className="text-2xl font-bold text-slate-800">No Employee Profile Linked</h2>
        <p className="text-slate-500">Your account is not linked to any employee profile. Contact your administrator.</p>
      </div>
    );
  }

  const myRequests = leaveRequests.filter(r => r.employeeId === myEmployee.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Calculate remaining annual leave
  const currentYear = new Date().getFullYear();
  const myLeaves = leaves.filter(l => l.employeeId === myEmployee.id && l.type === 'Annual');
  let annualTaken = 0;
  myLeaves.forEach(l => {
    const start = new Date(l.startDate);
    const end = new Date(l.endDate);
    try {
      const days = eachDayOfInterval({ start, end });
      days.forEach(d => {
        if (d.getFullYear() === currentYear && isBusinessDay(d)) annualTaken += 1;
      });
    } catch {}
  });
  // Also count approved requests not yet in leaves
  const pendingApproved = myRequests.filter(r => r.status === 'approved');
  pendingApproved.forEach(r => {
    const start = new Date(r.startDate);
    const end = new Date(r.endDate);
    try {
      const days = eachDayOfInterval({ start, end });
      days.forEach(d => {
        if (d.getFullYear() === currentYear && isBusinessDay(d)) {
          // Check if this day is already counted in myLeaves
          const alreadyCounted = myLeaves.some(l => {
            const ls = new Date(l.startDate);
            const le = new Date(l.endDate);
            return d >= ls && d <= le;
          });
          if (!alreadyCounted) annualTaken += 1;
        }
      });
    } catch {}
  });
  const remaining = Math.max(0, ANNUAL_LEAVE_LIMIT - annualTaken);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) return;
    setSubmitting(true);
    await addLeaveRequest(myEmployee.id, myEmployee.name, startDate, endDate, reason);
    setStartDate("");
    setEndDate("");
    setReason("");
    setSubmitting(false);
    setSuccessMsg("Leave request submitted successfully!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  return (
    <EmployeeGuard>
    <div className="space-y-8 animate-in fade-in duration-700 max-w-4xl mx-auto pb-10">
      <header className="mb-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Leave Portal</h1>
        <p className="text-slate-500 mt-1 text-base">Welcome, {myEmployee.name}</p>
      </header>

      {/* Balance Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shadow-sm">
              <CalendarOff size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Annual Leave Balance</h2>
              <p className="text-xs text-slate-400 font-medium">Current year ({currentYear})</p>
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-extrabold text-teal-600 tabular-nums">{remaining}</span>
            <span className="text-lg font-bold text-slate-300">/ {ANNUAL_LEAVE_LIMIT} days remaining</span>
          </div>
          <div className="mt-4 h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-teal-600 rounded-full transition-all" style={{ width: `${(annualTaken / ANNUAL_LEAVE_LIMIT) * 100}%` }} />
          </div>
          <p className="text-xs font-semibold text-slate-400 mt-2">{annualTaken} days taken</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* New Request Form */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-3">
              <Send size={16} className="text-teal-600" strokeWidth={2.5} />
              Request Annual Leave
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle size={14} /> {successMsg}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">From</label>
                <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-teal-400 outline-none font-semibold text-sm" />
              </div>
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">To</label>
                <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-teal-400 outline-none font-semibold text-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Reason</label>
              <textarea required value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-teal-400 outline-none font-semibold text-sm resize-none"
                placeholder="Please provide a reason for your leave request..." />
            </div>
            <button type="submit" disabled={submitting || !startDate || !endDate || !reason.trim() || remaining <= 0}
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-teal-100 flex items-center justify-center gap-2">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Submit Request
            </button>
          </form>
        </div>

        {/* My Requests History */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col max-h-[500px]">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-3">
              <History size={16} className="text-teal-600" strokeWidth={2.5} />
              My Requests
            </h2>
            <span className="px-3 py-1 bg-white border border-slate-200 text-slate-500 text-[10px] font-bold rounded-lg">{myRequests.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {myRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-300 text-sm font-semibold">No leave requests yet.</div>
            ) : myRequests.map(req => (
              <div key={req.id} className="p-5 px-6 hover:bg-slate-50/50 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-800">
                    {req.startDate === req.endDate
                      ? format(new Date(req.startDate), 'MMM dd, yyyy')
                      : `${format(new Date(req.startDate), 'MMM dd')} - ${format(new Date(req.endDate), 'MMM dd, yyyy')}`
                    }
                  </span>
                  <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${
                    req.status === 'approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                    req.status === 'rejected' ? 'bg-rose-50 border-rose-200 text-rose-600' :
                    'bg-amber-50 border-amber-200 text-amber-700'
                  }`}>
                    {req.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">{req.reason}</p>
                <p className="text-[10px] text-slate-400 mt-1.5 font-semibold">
                  Submitted {format(new Date(req.createdAt), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </EmployeeGuard>
  );
}
