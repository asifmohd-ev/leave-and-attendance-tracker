"use client";

import { useStore } from "@/lib/store";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, authLoaded } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const isPublicPath = pathname === "/login" || pathname === "/report/view" || pathname.startsWith("/report-view");

  useEffect(() => {
    if (!mounted) return;
    if (authLoaded && !user && !isPublicPath) {
      router.push("/login");
    } else if (authLoaded && user && pathname === "/login") {
      router.push("/");
    }
  }, [user, authLoaded, pathname, router, mounted, isPublicPath]);

  if (!mounted) return null;

  if (!authLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
      </div>
    );
  }

  if (!user && !isPublicPath) {
    return null;
  }
  if (user && pathname === "/login") {
    return null;
  }

  return <>{children}</>;
}