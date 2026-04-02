"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface MinimalDateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export default function MinimalDateSelector({ selectedDate, onDateChange }: MinimalDateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(selectedDate);

  // Build full month grid (with leading/trailing days to fill the week)
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const isCurrentMonth = (day: Date) =>
    day.getMonth() === viewDate.getMonth() && day.getFullYear() === viewDate.getFullYear();

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-5 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-teal-400 hover:bg-slate-50 transition-all shadow-sm group"
      >
        <CalendarIcon size={18} className="text-slate-400 group-hover:text-teal-600 transition-colors" />
        <span className="text-sm font-semibold text-slate-700">
          {format(selectedDate, "MMM dd, yyyy")}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-3 p-5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 w-80 origin-top-right"
            >
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setViewDate(subMonths(viewDate, 1))}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  {format(viewDate, "MMMM yyyy")}
                </span>
                <button
                  onClick={() => setViewDate(addMonths(viewDate, 1))}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <div key={d} className="text-center text-[10px] font-bold text-slate-300 py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Full month grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const _isToday = isToday(day);
                  const inMonth = isCurrentMonth(day);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => {
                        onDateChange(day);
                        setIsOpen(false);
                      }}
                      className={`h-8 w-full rounded-lg text-xs font-bold transition-all flex items-center justify-center relative
                        ${isSelected
                          ? "bg-teal-600 text-white shadow-md shadow-teal-100"
                          : _isToday
                          ? "bg-teal-50 text-teal-600 border border-teal-200"
                          : inMonth
                          ? "hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                          : "text-slate-200 cursor-default"
                        }`}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>

              {/* Go to Today */}
              <button
                onClick={() => {
                  const today = new Date();
                  onDateChange(today);
                  setViewDate(today);
                  setIsOpen(false);
                }}
                className="mt-4 w-full py-2 text-[10px] font-bold text-teal-600 hover:bg-teal-50 border border-teal-100 rounded-lg transition-all uppercase tracking-widest"
              >
                Go to Today
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
