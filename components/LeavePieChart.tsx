"use client";

import { useStore } from "@/lib/store";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { isSameMonth } from "date-fns";
import { PieChart as PieChartIcon } from "lucide-react";

interface LeavePieChartProps {
  selectedDate?: Date;
}

export default function LeavePieChart({ selectedDate = new Date() }: LeavePieChartProps) {
  const { leaves } = useStore();

  const filteredLeaves = leaves.filter((l) => isSameMonth(new Date(l.date), selectedDate));
  const annualCount = filteredLeaves.filter((l) => l.type === "Annual").length;
  const sickCount = filteredLeaves.filter((l) => l.type === "Sick/Emergency").length;

  const data = [
    { name: "Annual", value: annualCount, color: "#0D9488" }, 
    { name: "Sick/Emergency", value: sickCount, color: "#E11D48" }, 
  ];

  if (annualCount === 0 && sickCount === 0) {
    return (
      <div className="flex flex-col h-[300px] items-center justify-center gap-3 text-[10px] font-bold text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl uppercase tracking-[0.3em]">
        <PieChartIcon size={24} className="opacity-40 mb-2" />
        No Leave Data
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={85}
            paddingAngle={8}
            dataKey="value"
            animationDuration={1500}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="#000000" strokeWidth={2} className="hover:opacity-80 transition-opacity" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "12px",
              color: "#0F172A",
              boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
              fontSize: "12px",
              fontWeight: "700"
            }}
            itemStyle={{ fontWeight: "900", textTransform: 'uppercase' }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => (
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
