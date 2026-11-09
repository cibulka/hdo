// Plain module (no "use client"): server code (layout, manifest) must import real values,
// not client references.

export type BackgroundMode = "idle" | "low" | "high";

/** Status-bar colour per mode (theme-color meta / manifest), matching the gradients in globals.css. */
export const THEME_COLORS: Record<BackgroundMode, string> = {
  idle: "#0f172a",
  low: "#047857",
  high: "#991b1b",
};
