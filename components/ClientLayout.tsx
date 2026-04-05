"use client";

import { Sidebar } from "@/components/Sidebar";
import { usePathname } from "next/navigation";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <main className="flex-1 w-full bg-slate-50">{children}</main>;
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50 relative">
        <div className="p-6 lg:p-10 max-w-[1600px] mx-auto min-h-screen">
          {children}
        </div>
      </main>
    </>
  );
}