"use client";

import { useSyncExternalStore } from "react";

// One shared clock that ticks on whole seconds. The server snapshot is null, so nothing
// time-dependent is rendered during prerendering (the page stays fully static).

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

function schedule() {
  timer = setTimeout(() => {
    listeners.forEach((listener) => listener());
    schedule();
  }, 1000 - (Date.now() % 1000) + 5);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) schedule();
  // Phones freeze timers in the background; re-read the clock as soon as the app is visible again.
  document.addEventListener("visibilitychange", listener);
  return () => {
    listeners.delete(listener);
    document.removeEventListener("visibilitychange", listener);
    if (listeners.size === 0 && timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => Math.floor(Date.now() / 1000) * 1000;
const getServerSnapshot = () => null;

/** Current time in ms, floored to the second; null during server rendering. */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
