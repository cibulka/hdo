"use client";

import { useEffect } from "react";

/** Registers /sw.js in production builds only (in dev it would serve stale files). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // offline support is a nice-to-have; the app works without it
    });
  }, []);
  return null;
}
