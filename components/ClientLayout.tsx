"use client";

import { Sidebar } from "@/components/Sidebar";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { AdminGuard } from "@/components/RoleGuard";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isLogin = pathname === "/login";
  const isEmployeePage = pathname === "/my-leave";
  const isReportView = pathname.startsWith("/report-view");

  // Close sidebar on path change (mobile)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSidebarOpen(false);
  }, [pathname]);

  if (isLogin || isReportView) {
    return (
      <main className="flex-1 w-full bg-slate-50 overflow-y-auto overscroll-contain">{children}</main>
    );
  }

  if (isEmployeePage) {
    return (
      <div className="flex h-dvh w-full overflow-hidden">
        <main className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden">
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="p-4 lg:p-10 max-w-[1600px] mx-auto min-h-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 z-30">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <Menu size={24} />
            </button>
            <span className="font-extrabold text-lg text-slate-900 tracking-tighter">Elevate</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 lg:p-10 max-w-[1600px] mx-auto min-h-full">
            <AdminGuard>
              {children}
            </AdminGuard>
          </div>
        </div>
      </main>
    </div>
  );
}