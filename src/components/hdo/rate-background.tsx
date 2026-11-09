"use client";

import { useEffect } from "react";
import { THEME_COLORS, type BackgroundMode } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Full-screen animated gradient; all layers are always mounted so a switch is a crossfade. */
export function RateBackground({ mode }: { mode: BackgroundMode }) {
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[mode]);
  }, [mode]);

  return (
    <div aria-hidden className={cn("fixed inset-0 -z-10", "overflow-hidden")}>
      {(["idle", "low", "high"] as const).map((layer) => (
        <div key={layer} data-active={layer === mode} className={cn("rate-layer", `rate-layer--${layer}`)} />
      ))}
    </div>
  );
}
