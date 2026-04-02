"use client";

import { useStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { 
  Users, 
  UserCheck, 
  CalendarOff, 
  CalendarCheck,
  ArrowUpRight, 
  TrendingUp, 
  PieChart as PieChartIcon 
} from "lucide-react";
import Link from "next/link";
import AttendanceChart from "@/components/AttendanceChart";
import LeavePieChart from "@/components/LeavePieChart";
import MinimalDateSelector from "@/components/MinimalDateSelector";

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { employees, attendance, leaves } = useStore();
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const isSelectedToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-40 bg-white border border-slate-200 rounded-xl" />
        <div className="flex gap-6">
          <div className="w-1/3 h-32 bg-white border border-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  const presentsOnSelectedDate = attendance.filter(a => a.date === selectedDateStr && a.checkIn).length;
  const leavesOnSelectedDate = leaves.filter(l => l.date === selectedDateStr);

  const stats = [
    {
      label: "Total Personnel",
      value: employees.length,
      icon: Users,
      link: "/employees",
      color: "text-teal-600",
      bg: "bg-teal-50",
    },
    {
      label: "Daily Presence",
      value: presentsOnSelectedDate,
      icon: UserCheck,
      link: "/attendance",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Active Leaves",
      value: leavesOnSelectedDate.length,
      icon: CalendarOff,
      link: "/leaves",
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-10">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1 text-base">Overview of core metrics and operational data.</p>
        </div>
        <div>
          <MinimalDateSelector 
            selectedDate={selectedDate} 
            onDateChange={(date) => setSelectedDate(date)} 
          />
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.link} className="block group">
              <div className="relative p-7 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 overflow-hidden">
                <div className="relative flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                    <p className="text-4xl font-bold text-slate-900 tracking-tight tabular-nums">{stat.value}</p>
                  </div>
                  <div className={`p-4 rounded-xl ${stat.bg} ${stat.color} shadow-sm group-hover:scale-105 transition-transform`}>
                    <Icon size={24} strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-8">
            <TrendingUp size={18} className="text-teal-600" strokeWidth={2.5} />
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">Attendance Analysis</h2>
          </div>
          <AttendanceChart selectedDate={selectedDate} />
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-8">
            <PieChartIcon size={18} className="text-rose-600" strokeWidth={2.5} />
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">Leave Distribution</h2>
          </div>
          <LeavePieChart selectedDate={selectedDate} />
        </div>
      </div>

      {/* Lists Section */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <CalendarCheck size={18} className="text-amber-500" strokeWidth={2.5} />
              <h2 className="text-sm font-bold text-slate-800 tracking-tight">
                Active Entries {isSelectedToday ? "Today" : `on ${format(selectedDate, 'MMM dd')}`}
              </h2>
            </div>
            <Link href="/leaves" className="text-[10px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1.5 uppercase tracking-widest transition-colors">
              Manage Leaves <ArrowUpRight size={14} />
            </Link>
          </div>
          
          {leavesOnSelectedDate.length === 0 ? (
            <div className="text-center py-20 text-xs font-semibold text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
              No active entries found for this horizon.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leavesOnSelectedDate.map((leave) => {
                const emp = employees.find(e => e.id === leave.employeeId);
                return (
                  <div key={leave.id} className="flex items-center justify-between p-5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all group">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full border-2 border-white bg-white shadow-sm flex items-center justify-center overflow-hidden">
                        {emp?.photoUrl ? (
                          <img src={emp.photoUrl} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-slate-400 uppercase">{emp?.name.charAt(0)}</span>
                        )}
                      </div>
                      <span className="font-semibold text-sm text-slate-700 tracking-tight group-hover:text-slate-900">{emp?.name || 'Unknown'}</span>
                    </div>
                    <span className="px-3 py-1 text-[9px] font-bold tracking-wider uppercase border border-rose-200 bg-rose-50 text-rose-600 rounded-lg">
                      {leave.type}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
