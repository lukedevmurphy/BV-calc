"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Fires a single login-tracking ping per browser session once the user is on
 *  an authenticated page. Mounted globally; it no-ops on the sign-in page and
 *  the server endpoint is the real authority (it 401s if there's no session). */
export function LoginTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/signin") return;
    if (sessionStorage.getItem("bv-login-tracked")) return;
    // Optimistically mark first to avoid duplicate pings on fast re-renders.
    sessionStorage.setItem("bv-login-tracked", "1");
    fetch("/api/track/login", { method: "POST" }).catch(() => {
      // Network hiccup — allow a retry on the next navigation.
      sessionStorage.removeItem("bv-login-tracked");
    });
  }, [pathname]);

  return null;
}
