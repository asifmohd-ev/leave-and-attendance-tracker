"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CalendarCheck, CalendarOff, CalendarDays, FileDown } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Attendance", href: "/attendance", icon: CalendarCheck },
    { name: "Leaves", href: "/leaves", icon: CalendarOff },
    { name: "Calendar", href: "/calendar", icon: CalendarDays },
    { name: "Employees", href: "/employees", icon: Users },
    { name: "Export", href: "/export", icon: FileDown },
  ];

  return (
    <div className="w-64 h-full bg-white border-r border-slate-200 text-slate-800 flex flex-col z-10 transition-all duration-300">
      <div className="p-8 border-b border-slate-100 mb-4">
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-3">
          <div className="w-14 h-14 flex items-center justify-center shrink-0 transition-all transform hover:scale-110 duration-500">
            <Image src="/images/logo.png" alt="Logo" width={44} height={44} className="object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="truncate tracking-tighter font-extrabold text-xl text-slate-900 leading-none">Elevate</span>
            <span className="truncate tracking-widest font-bold text-[9px] text-teal-600 uppercase mt-1">Ventures</span>
          </div>
        </h1>
      </div>
      
      <nav className="flex-1 flex flex-col gap-1 px-4">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
          
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                isActive 
                  ? "bg-teal-50 text-teal-600" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Icon size={18} strokeWidth={2.5} className={isActive ? "text-teal-600" : "text-slate-400 group-hover:text-slate-600 transition-colors"} />
              {link.name}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-6 border-t border-slate-50 text-[10px] text-slate-400 font-medium text-center tracking-tight">
        Enterprise Workspace v5.0
      </div>
    </div>
  );
}
