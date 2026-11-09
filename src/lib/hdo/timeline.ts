import { addDays, pragueDate, pragueInstant } from "./prague.ts";
import { lowIntervals, type Rate, type Selection } from "./schedule.ts";
import type { DistributorData } from "./schema.ts";

export interface Segment {
  /** Clipped to the window – use for drawing. */
  start: number;
  end: number;
  rate: Rate;
  /** Real boundaries of this rate run, which may lie outside the window (first and last segment). */
  runStart: number;
  runEnd: number;
}

/** Low/high segments covering [from, from + hours) exactly, in order. */
export function timeline(data: DistributorData, selection: Selection, from: number, hours = 24): Segment[] {
  const to = from + hours * 3_600_000;
  const day = pragueDate(from);
  // Look a day beyond both ends so the first and last runs can be reported unclipped.
  const all = lowIntervals(data, selection, addDays(day, -2), addDays(day, Math.ceil(hours / 24) + 2));

  const runs: { start: number; end: number; rate: Rate }[] = [];
  for (const [i, low] of all.entries()) {
    if (i > 0) runs.push({ start: all[i - 1].end, end: low.start, rate: "high" });
    runs.push({ start: low.start, end: low.end, rate: "low" });
  }

  // Fill gaps the look-around window can't explain (no low rate for days) with high rate.
  if (!runs.length) runs.push({ start: from, end: to, rate: "high" });
  if (runs[0].start > from) runs.unshift({ start: from, end: runs[0].start, rate: runs[0].rate === "low" ? "high" : "low" });
  if (runs.at(-1)!.end < to) runs.push({ start: runs.at(-1)!.end, end: to, rate: runs.at(-1)!.rate === "low" ? "high" : "low" });

  return runs
    .filter((run) => run.end > from && run.start < to)
    .map((run) => ({
      start: Math.max(run.start, from),
      end: Math.min(run.end, to),
      rate: run.rate,
      runStart: run.start,
      runEnd: run.end,
    }));
}

/** Instants of whole Prague hours divisible by `step` within (from, to). */
export function hourTicks(from: number, to: number, step = 3): number[] {
  const ticks: number[] = [];
  for (let date = addDays(pragueDate(from), 0), i = 0; i < 3; date = addDays(date, 1), i++) {
    for (let hour = 0; hour < 24; hour += step) {
      const t = pragueInstant(date, hour * 60);
      if (t > from && t < to) ticks.push(t);
    }
  }
  return ticks;
}
