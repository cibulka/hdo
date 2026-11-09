import type { Window } from "./schema.ts";

/** Total minutes covered by a day's windows. */
export function totalMinutes(windows: Window[]): number {
  return windows.reduce((sum, [start, end]) => sum + end - start, 0);
}
