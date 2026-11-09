import { addDays, pragueDate, pragueInstant } from "./prague.ts";
import { lowIntervals, type Rate, type Selection } from "./schedule.ts";
import type { DistributorData } from "./schema.ts";

export interface Segment {
  start: number;
  end: number;
  rate: Rate;
}

/** Low/high segments covering [from, from + hours) exactly, in order. */
export function timeline(data: DistributorData, selection: Selection, from: number, hours = 24): Segment[] {
  const to = from + hours * 3_600_000;
  const day = pragueDate(from);
  const lows = lowIntervals(data, selection, addDays(day, -1), addDays(day, Math.ceil(hours / 24) + 1))
    .map((i) => ({ start: Math.max(i.start, from), end: Math.min(i.end, to) }))
    .filter((i) => i.end > i.start);

  const segments: Segment[] = [];
  let cursor = from;
  for (const low of lows) {
    if (low.start > cursor) segments.push({ start: cursor, end: low.start, rate: "high" });
    segments.push({ start: low.start, end: low.end, rate: "low" });
    cursor = low.end;
  }
  if (cursor < to) segments.push({ start: cursor, end: to, rate: "high" });
  return segments;
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
