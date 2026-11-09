"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function randomLetters(alphabet: string, length: number): string[] {
  const chars = [...alphabet];
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]);
}

/**
 * Placeholder of `length` flickering random letters (e.g. in place of LOW/HIGH).
 * Every letter sits in a fixed-width cell, so changing letters never shifts the layout.
 * With reduced motion it shows one static random frame.
 */
export function Scramble({ alphabet, length, interval = 90 }: { alphabet: string; length: number; interval?: number }) {
  const [letters, setLetters] = useState<string[]>(() => Array.from({ length }, () => " "));

  useEffect(() => {
    const tick = () => setLetters(randomLetters(alphabet, length));
    tick();
    if (reducedMotion()) return;
    const id = setInterval(tick, interval);
    return () => clearInterval(id);
  }, [alphabet, length, interval]);

  return (
    <span aria-hidden className={cn("inline-flex")}>
      {letters.map((letter, i) => (
        <span key={i} className={cn("inline-block w-[0.9em]", "text-center")}>
          {letter}
        </span>
      ))}
    </span>
  );
}
