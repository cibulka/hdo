"use client";

import { useSyncExternalStore } from "react";

/** Chromium's install prompt event (not in the standard DOM typings). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallKind = "prompt" | "ios" | null;

// Module-level so the event is caught even if it fires before React has mounted the button.
let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // we show our own button instead of the browser's mini-infobar
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    notify();
  });
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** iPhone/iPad in any browser (all use WebKit there); iPadOS reports itself as a Mac with touch. */
function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function getKind(): InstallKind {
  if (installed || isStandalone()) return null;
  if (deferred) return "prompt";
  return isIos() ? "ios" : null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * How the app can be installed here: "prompt" (Chromium: native dialog via install()),
 * "ios" (only manually, Share → Add to Home Screen) or null (installed already / not possible).
 */
export function useInstall(): { kind: InstallKind; install: () => Promise<void> } {
  const kind = useSyncExternalStore(subscribe, getKind, () => null);

  const install = async () => {
    if (!deferred) return;
    const event = deferred;
    deferred = null; // a prompt can only be used once
    try {
      await event.prompt();
      const { outcome } = await event.userChoice;
      if (outcome === "accepted") installed = true;
    } catch {
      // the browser refused to show its dialog; nothing else to do
    }
    notify();
  };

  return { kind, install };
}
