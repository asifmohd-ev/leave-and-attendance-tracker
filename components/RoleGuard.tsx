"use client";

import { useStore } from "@/lib/store";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, userRole, authLoaded } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (authLoaded && !user) router.push("/login");
    if (authLoaded && user && userRole === "employee") router.push("/my-leave");
  }, [authLoaded, user, userRole, router]);

  if (!authLoaded || !user || userRole === "employee") {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

export function EmployeeGuard({ children }: { children: React.ReactNode }) {
  const { user, userRole, authLoaded } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (authLoaded && !user) router.push("/login");
    if (authLoaded && user && userRole === "admin") router.push("/");
  }, [authLoaded, user, userRole, router]);

  if (!authLoaded || !user) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
