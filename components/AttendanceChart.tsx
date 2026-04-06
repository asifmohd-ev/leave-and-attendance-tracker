"use client";

import { useStore } from "@/lib/store";
import { format, subDays, isSameDay } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface AttendanceChartProps {
  selectedDate?: Date;
  viewMode?: "daily" | "whole_data";
}

export default function AttendanceChart({ selectedDate = new Date(), viewMode = "daily" }: AttendanceChartProps) {
  const { attendance } = useStore();

  let data;

  if (viewMode === "whole_data") {
    const daysData = [
      { name: "Sun", count: 0, fullDate: "All Time (Sun)" },
      { name: "Mon", count: 0, fullDate: "All Time (Mon)" },
      { name: "Tue", count: 0, fullDate: "All Time (Tue)" },
      { name: "Wed", count: 0, fullDate: "All Time (Wed)" },
      { name: "Thu", count: 0, fullDate: "All Time (Thu)" },
      { name: "Fri", count: 0, fullDate: "All Time (Fri)" },
      { name: "Sat", count: 0, fullDate: "All Time (Sat)" },
    ];
    
    attendance.forEach(a => {
      if (a.checkIn) {
        try {
          const d = new Date(a.date + "T12:00:00Z");
          const dayName = format(d, "EEE"); 
          const match = daysData.find(dd => dd.name === dayName);
          if (match) match.count += 1;
        } catch { }
      }
    });

    data = daysData;
  } else {
    // Generate last 7 days of data ending at selectedDate
    data = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(selectedDate, 6 - i);
      const dateStr = format(date, "yyyy-MM-dd");
      const count = attendance.filter((a) => a.date === dateStr && a.checkIn).length;

      return {
        name: format(date, "EEE"),
        fullDate: dateStr,
        count,
      };
    });
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1E293B"
            vertical={false}
            opacity={1}
          />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94A3B8", fontSize: 12, fontWeight: 700 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94A3B8", fontSize: 12, fontWeight: 700 }}
            allowDecimals={false}
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
            itemStyle={{ color: "#0D9488", fontWeight: "900", textTransform: 'uppercase' }}
          />
          <Bar
            dataKey="count"
            radius={[6, 6, 0, 0]}
            barSize={45}
            animationDuration={1500}
          >
            {data.map((entry, index) => {
              const isSelected = viewMode === "whole_data" || (entry.fullDate.startsWith("All") ? false : isSameDay(selectedDate, new Date(entry.fullDate)));
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={isSelected ? "#22D3EE" : "#1E293B"}
                  fillOpacity={isSelected ? 1 : 0.4}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
