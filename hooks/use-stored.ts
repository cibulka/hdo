"use client";

import { useCallback, useSyncExternalStore } from "react";

// localStorage-backed state. Reads are wrapped in try/catch (private mode, blocked storage);
// the server snapshot is undefined so callers can tell "not on the client yet" from "nothing stored".

const EVENT = "hdo:storage";
/** Fallback when localStorage throws, so a choice at least lasts until reload. */
const memory = new Map<string, string | null>();

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(EVENT, listener);
  };
}

/** Raw stored string: undefined on the server, null when nothing is stored. */
export function useStored(key: string): [string | null | undefined, (value: string | null) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => undefined,
  );

  const write = useCallback(
    (next: string | null) => {
      memory.set(key, next);
      try {
        if (next === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, next);
      } catch {
        // storage unavailable: the in-memory value is used
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );

  return [value, write];
}
