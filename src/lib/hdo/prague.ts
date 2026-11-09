// Europe/Prague wall-clock helpers built on Intl, independent of the device's time zone.

export const TIME_ZONE = "Europe/Prague";

/** A calendar date in Prague, month 1–12. */
export interface CivilDate {
  year: number;
  month: number;
  day: number;
}

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

interface WallClock extends CivilDate {
  hour: number;
  minute: number;
  second: number;
}

function wallClock(instant: number): WallClock {
  const parts: Record<string, number> = {};
  for (const { type, value } of formatter.formatToParts(instant)) {
    if (type !== "literal") parts[type] = Number(value);
  }
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute, second: parts.second };
}

/** Prague UTC offset in minutes at an instant (+60 in winter, +120 in summer). */
function offsetMinutes(instant: number): number {
  const w = wallClock(instant);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return Math.round((asUtc - Math.floor(instant / 1000) * 1000) / 60_000);
}

/** The Prague calendar date of an instant. */
export function pragueDate(instant: number): CivilDate {
  const { year, month, day } = wallClock(instant);
  return { year, month, day };
}

/**
 * The instant of a Prague wall-clock time: `minutes` from local midnight of `date` (1440 = next midnight).
 * Times skipped by the spring DST change map forward by an hour; repeated autumn times map to the later one.
 */
export function pragueInstant(date: CivilDate, minutes: number): number {
  const naive = Date.UTC(date.year, date.month - 1, date.day, 0, minutes);
  const first = naive - offsetMinutes(naive) * 60_000;
  const second = naive - offsetMinutes(first) * 60_000;
  return second;
}

export function addDays(date: CivilDate, days: number): CivilDate {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(date: CivilDate): number {
  return (new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay() + 6) % 7;
}

/** "YYYY-MM-DD" */
export function isoDate(date: CivilDate): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}
