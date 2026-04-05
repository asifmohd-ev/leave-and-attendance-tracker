"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CalendarCheck, CalendarOff, CalendarDays, FileDown, LogOut, ShieldAlert } from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useStore } from "@/lib/store";

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { user } = useStore();

  const handleLogout = async () => {
    await signOut(auth);
  };

  const links = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Attendance", href: "/attendance", icon: CalendarCheck },
    { name: "Leaves", href: "/leaves", icon: CalendarOff },
    { name: "Calendar", href: "/calendar", icon: CalendarDays },
    { name: "Employees", href: "/employees", icon: Users },
    { name: "Export", href: "/export", icon: FileDown },
    { name: "Settings", href: "/users", icon: ShieldAlert },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 text-slate-800 flex flex-col z-50 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
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
              onClick={onClose}
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
      
      {user && (
        <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm shrink-0">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-bold text-slate-700 truncate">{user.email?.split('@')[0]}</span>
              <span className="text-[10px] font-medium text-slate-400 truncate">{user.email}</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
            title="Log out"
          >
            <LogOut size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}
      
      <div className="p-6 border-t border-slate-50 text-[10px] text-slate-400 font-medium text-center tracking-tight">
        Enterprise Workspace v5.0
      </div>
    </div>
    </>
  );
}
