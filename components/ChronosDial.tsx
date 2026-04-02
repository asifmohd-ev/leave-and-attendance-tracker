"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, subDays, isSameDay } from "date-fns";
import { ChevronRight, Calendar as CalendarIcon, Zap } from "lucide-react";

interface ChronosDialProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export default function ChronosDial({ selectedDate, onDateChange }: ChronosDialProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Generate 7 days around the selected date (3 before, 3 after)
  const days = Array.from({ length: 7 }, (_, i) => addDays(subDays(selectedDate, 3), i));

  return (
    <div className="relative flex items-center justify-center">
      {/* Mini Dial / Header Trigger */}
      <motion.button
        layout
        onClick={() => setIsExpanded(!isExpanded)}
        className={`group relative flex items-center gap-4 p-4 pl-6 bg-card border-2 transition-all rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:border-accent/40 ${
          isExpanded ? "border-accent-magenta" : "border-card-border"
        }`}
      >
        <div className="flex flex-col items-start tabular-nums">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-40">Horizon Context</span>
          <span className="text-xl font-black text-foreground tracking-tighter uppercase transition-colors group-hover:text-accent">
            {format(selectedDate, "EEEE, MMM dd")}
          </span>
        </div>

        <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all duration-500 ${
          isExpanded ? "bg-accent-magenta border-accent-magenta text-white rotate-180" : "bg-black/40 border-accent/20 text-accent"
        }`}>
          <Zap size={22} fill={isExpanded ? "currentColor" : "none"} strokeWidth={3} className={isExpanded ? "animate-pulse" : ""} />
        </div>
        
        {/* Glow behind */}
        <div className={`absolute inset-0 blur-2xl -z-10 opacity-0 group-hover:opacity-40 transition-opacity rounded-2xl ${isExpanded ? "bg-accent-magenta" : "bg-accent"}`} />
      </motion.button>

      {/* Expanded Chronos Dial Overlay */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpanded(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100]"
            />

            {/* The Dial */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, rotate: -20 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.8, opacity: 0, rotate: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-[450px] h-[450px] flex items-center justify-center"
            >
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Outer Rotating Ring - Liquid Gradient */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-2 border-transparent"
                  style={{
                    background: "conic-gradient(from 0deg, var(--accent), var(--accent-magenta), var(--accent)) border-box",
                    WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "destination-out",
                    maskComposite: "exclude",
                    opacity: 0.4
                  }}
                />
                
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-[20px] rounded-full border-2 border-accent/10 border-dashed"
                />

                {/* Date Segments */}
                {days.map((day, idx) => {
                  const angle = (idx / days.length) * 360 - 90;
                  const radius = 175;
                  const _isSelected = isSameDay(day, selectedDate);
                  
                  return (
                    <motion.button
                      key={day.toISOString()}
                      whileHover={{ scale: 1.1, zIndex: 10 }}
                      onClick={() => {
                        onDateChange(day);
                        setIsExpanded(false);
                      }}
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        x: Math.cos((angle * Math.PI) / 180) * radius - 45,
                        y: Math.sin((angle * Math.PI) / 180) * radius - 45,
                      }}
                      className={`w-[90px] h-[90px] rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border-2 ${
                        _isSelected 
                        ? "bg-accent-magenta border-accent-magenta text-white shadow-[0_0_40px_rgba(217,70,239,0.4)]" 
                        : "bg-black/80 border-card-border text-muted-foreground hover:border-accent hover:text-foreground"
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest">{format(day, "EEE")}</span>
                      <span className="text-2xl font-black">{format(day, "dd")}</span>
                    </motion.button>
                  );
                })}

                {/* Central Control Hub - Absolute Black Deepening */}
                <div className="w-[190px] h-[190px] rounded-full bg-[#000000] border-2 border-white/5 shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center p-6 text-center z-20 overflow-hidden relative group/hub">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent-magenta/10 to-transparent opacity-40" />
                    <Zap size={36} className="text-accent-magenta mb-2 relative z-10" strokeWidth={3} fill="currentColor" />
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground/60 mb-1 relative z-10">SELECTED</span>
                    <span className="text-2xl font-black text-foreground uppercase tracking-tight leading-none relative z-10">{format(selectedDate, "MMM dd")}</span>
                    <div className="absolute inset-0 rounded-full border-2 border-accent-magenta/20 animate-ping opacity-10 pointer-events-none" />
                </div>

                {/* Scanline Animation */}
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-accent/40 to-transparent pointer-events-none opacity-20"
                />
              </div>

              {/* Close Label */}
              <div className="absolute -bottom-16 w-full text-center">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] animate-pulse">Click backdrop to exit system</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
