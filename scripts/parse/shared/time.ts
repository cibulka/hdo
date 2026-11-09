import type { Window } from "../../../lib/hdo/schema.ts";
import { ParseError } from "./errors.ts";

const DAY_MINUTES = 1440;

/**
 * Converts a spreadsheet time cell to minutes from midnight.
 * Accepts Excel day fractions (0.5 = 12:00) and "H:MM" / "HH:MM" strings.
 * Returns null for empty cells.
 */
export function cellToMinutes(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    if (value < 0 || value >= 1) throw new ParseError(`time out of range: ${value}`);
    return Math.round(value * DAY_MINUTES);
  }
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) throw new ParseError(`not a time: ${JSON.stringify(value)}`);
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  if (minutes >= DAY_MINUTES) throw new ParseError(`time out of range: ${value}`);
  return minutes;
}

/** Excel date serial (days since 1899-12-30) → "YYYY-MM-DD". */
export function excelSerialToIso(serial: number): string {
  if (!Number.isFinite(serial)) throw new ParseError(`not a date serial: ${serial}`);
  const ms = Date.UTC(1899, 11, 30) + Math.round(serial) * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

export interface SwitchEvent {
  minutes: number;
  /** true = low rate (NT) switches on, false = switches off. */
  on: boolean;
}

/**
 * Turns one day's switch events (in column order) into NT windows.
 * - The day starts with NT off; a leading "off at 0:00" is a no-op.
 * - "Off at 0:00" after NT was switched on later in the day means 24:00.
 * - NT still on after the last event lasts until 24:00.
 */
export function eventsToWindows(events: SwitchEvent[]): Window[] {
  const windows: Window[] = [];
  let onSince: number | null = null;
  let last = 0;

  for (const event of events) {
    let t = event.minutes;
    if (!event.on && t === 0 && onSince !== null) t = DAY_MINUTES;
    if (t < last) throw new ParseError(`times not in order: ${describe(events)}`);
    last = t;

    if (event.on) {
      if (onSince !== null) throw new ParseError(`NT switched on twice: ${describe(events)}`);
      onSince = t;
    } else {
      if (onSince === null) {
        if (t !== 0) throw new ParseError(`NT switched off while off: ${describe(events)}`);
        continue;
      }
      if (t > onSince) windows.push([onSince, t]);
      onSince = null;
    }
  }
  if (onSince !== null && onSince < DAY_MINUTES) windows.push([onSince, DAY_MINUTES]);
  return mergeWindows(windows);
}

/** Sorts and merges touching or overlapping windows. */
export function mergeWindows(windows: Window[]): Window[] {
  const sorted = [...windows].sort((a, b) => a[0] - b[0]);
  const out: Window[] = [];
  for (const [start, end] of sorted) {
    const prev = out.at(-1);
    if (prev && start <= prev[1]) prev[1] = Math.max(prev[1], end);
    else out.push([start, end]);
  }
  return out;
}

export function totalMinutes(windows: Window[]): number {
  return windows.reduce((sum, [start, end]) => sum + end - start, 0);
}

function describe(events: SwitchEvent[]): string {
  return events
    .map((e) => `${e.on ? "on" : "off"} ${String(Math.floor(e.minutes / 60)).padStart(2, "0")}:${String(e.minutes % 60).padStart(2, "0")}`)
    .join(", ");
}
