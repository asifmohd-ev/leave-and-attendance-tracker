"use client";

import { useStore } from "@/lib/store";
import { eachDayOfInterval, getYear } from "date-fns";
import { CalendarOff, BadgeAlert } from "lucide-react";

interface Props {
  timeHorizon?: "current_year" | "all_time";
}

export default function LeaveBalancesGrid({ timeHorizon = "current_year" }: Props) {
  const { employees, leaves } = useStore();
  const currentYear = new Date().getFullYear();

  const data = employees.map((emp) => {
    let annualTaken = 0;
    let sickTaken = 0;
    
    // Process leaves specific to employee
    const empLeaves = leaves.filter(l => l.employeeId === emp.id);
    
    empLeaves.forEach(l => {
      const start = new Date(l.startDate || (l as any).date || new Date());
      const end = new Date(l.endDate || (l as any).date || new Date());
      
      try {
        const days = eachDayOfInterval({ start, end });
        days.forEach(d => {
          if (timeHorizon === "all_time" || getYear(d) === currentYear) {
            if (l.type === 'Annual') annualTaken += 1;
            else sickTaken += 1;
          }
        });
      } catch (e) {
        // Safe fallback in case of invalid dates
      }
    });

    return {
      emp,
      annualTaken: Math.min(annualTaken, 28), // Safe limit bounds
      sickTaken
    };
  });

  if (data.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full mt-2">
      {data.map((item) => {
        const { emp, annualTaken, sickTaken } = item;
        const remaining = Math.max(0, 28 - annualTaken);
        const percent = (annualTaken / 28) * 100;

        return (
          <div key={emp.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-teal-300 transition-all overflow-hidden group flex flex-col">
            <div className="p-6 py-5 border-b border-slate-50 flex items-center gap-4 shrink-0 bg-white">
               <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center font-bold text-slate-300 border border-slate-100 shadow-inner overflow-hidden uppercase shrink-0">
                 {emp.photoUrl ? <img src={emp.photoUrl} alt="" className="w-full h-full object-cover" /> : emp.name.charAt(0)}
               </div>
               <div className="overflow-hidden">
                 <h3 className="font-bold text-slate-800 tracking-tight truncate">{emp.name}</h3>
                 <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block truncate">{emp.id.slice(0, 8)}</span>
               </div>
            </div>
            
            <div className="p-6 bg-slate-50/50 space-y-6 flex-1 flex flex-col justify-between">
              
              {/* Annual Leave Details */}
              <div>
                <div className="flex justify-between items-end mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <CalendarOff size={14} className="text-amber-500" />
                    Annual Usage
                  </span>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 text-sm">{annualTaken}</span>
                    <span className="text-xs font-bold text-slate-400"> / 28</span>
                  </div>
                </div>
                {/* Advanced Progress Visualizer */}
                <div className="h-2 w-full bg-slate-200/60 rounded-full overflow-hidden flex shadow-inner">
                   <div 
                     className="h-full bg-teal-600 rounded-full transition-all duration-1000 ease-out shadow-sm" 
                     style={{ width: `${percent}%` }}
                   />
                </div>
                <div className="mt-2.5 text-right">
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                     <span className="text-teal-600">{remaining} Days</span> Remaining
                   </span>
                </div>
              </div>

              {/* Sick Leaves Details */}
              <div className="flex items-center justify-between pt-5 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <BadgeAlert size={14} className="text-rose-500" />
                    Sick Log
                  </span>
                  <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5 tabular-nums">
                    {sickTaken} <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">Days</span>
                  </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
