"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Désinstaller tout SW existant et vider les caches
    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) reg.unregister();
    });
    caches.keys().then((keys) => {
      for (const k of keys) caches.delete(k);
    });
  }, []);

  return null;
}
