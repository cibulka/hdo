"use client";

import { useEffect, useState } from "react";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function randomFrom(alphabet: string, pattern: string): string {
  const chars = [...alphabet];
  const pick = (set: string[]) => set[Math.floor(Math.random() * set.length)];
  return [...pattern].map((p) => (p === "#" ? pick(chars) : p === "%" ? pick([..."012345"]) : p)).join("");
}

/**
 * Placeholder that keeps flickering random characters, e.g. letters in place of LOW/HIGH or
 * digits in place of the countdown. `pattern` marks random positions with "#" (any character of
 * `alphabet`) or "%" (0–5, for the tens of minutes/seconds): "#:%#" → "4:07".
 * With reduced motion it shows one static random frame.
 */
export function Scramble({ alphabet, pattern, interval = 90 }: { alphabet: string; pattern: string; interval?: number }) {
  const [text, setText] = useState(() => pattern.replace(/[#%]/g, "\u2007"));

  useEffect(() => {
    const tick = () => setText(randomFrom(alphabet, pattern));
    tick();
    if (reducedMotion()) return;
    const id = setInterval(tick, interval);
    return () => clearInterval(id);
  }, [alphabet, pattern, interval]);

  return <span aria-hidden>{text}</span>;
}
