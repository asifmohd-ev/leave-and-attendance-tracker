"use client";

import { useStore } from "@/lib/store";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { eachDayOfInterval, getYear } from "date-fns";
import { BarChart3 } from "lucide-react";

export default function AnnualLeaveChart() {
  const { employees, leaves } = useStore();
  const currentYear = new Date().getFullYear();

  const data = employees.map((emp) => {
    let taken = 0;
    
    // Filter to annual leaves for this employee
    const annualLeaves = leaves.filter(l => l.employeeId === emp.id && l.type === 'Annual');
    
    annualLeaves.forEach(l => {
      const start = new Date(l.startDate || (l as any).date || new Date());
      const end = new Date(l.endDate || (l as any).date || new Date());
      
      // Calculate intersection with current year
      try {
        const days = eachDayOfInterval({ start, end });
        days.forEach(d => {
          if (getYear(d) === currentYear) {
            taken += 1;
          }
        });
      } catch (e) {
        // Fallback for invalid dates
      }
    });

    return {
      name: emp.name.split(" ")[0], // Keep name short for X-axis
      taken: Math.min(taken, 28), // Cap visualization safely
      remaining: Math.max(0, 28 - taken)
    };
  });

  if (data.length === 0) {
    return (
      <div className="flex flex-col h-[300px] items-center justify-center gap-3 text-[10px] font-bold text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl uppercase tracking-[0.3em]">
        <BarChart3 size={24} className="opacity-40 mb-2" />
        No Employee Data
      </div>
    );
  }

  return (
    <div className="h-[350px] w-full bg-white p-7 rounded-2xl border border-slate-200 shadow-sm flex flex-col group hover:border-teal-400 transition-colors">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">Annual Leave Distribution</h3>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-1">Current Year ({currentYear}) | 28 Day Limit</p>
        </div>
        <BarChart3 size={20} strokeWidth={2.5} className="text-teal-600" />
      </div>
      
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: "#94A3B8", fontSize: 11, fontWeight: 700 }}
              dy={15}
            />
            <YAxis 
              domain={[0, 28]} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: "#94A3B8", fontSize: 11, fontWeight: 700 }} 
            />
            <Tooltip
              cursor={{ fill: "rgba(13, 148, 136, 0.05)" }}
              contentStyle={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                color: "#0F172A",
                boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
                fontSize: "12px",
                fontWeight: "700"
              }}
              itemStyle={{ fontWeight: "900", textTransform: "uppercase" }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={30}
              iconType="circle"
              wrapperStyle={{ paddingTop: "20px", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", color: "#64748B" }}
            />
            <Bar dataKey="taken" name="Taken" stackId="a" fill="#0D9488" radius={[0, 0, 4, 4]} animationDuration={1000} />
            <Bar dataKey="remaining" name="Remaining" stackId="a" fill="#E2E8F0" radius={[4, 4, 0, 0]} animationDuration={1000} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
