"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";

export function FirebaseInitializer() {
  const initRealtimeSync = useStore(state => state.initRealtimeSync);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const unsubscribe = initRealtimeSync();
      
      return () => {
        unsubscribe();
        initialized.current = false;
      };
    }
  }, [initRealtimeSync]);

  return null;
}