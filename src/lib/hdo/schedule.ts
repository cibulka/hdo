import { isCzechHoliday } from "./holidays.ts";
import { addDays, isoDate, pragueDate, pragueInstant, weekdayIndex, type CivilDate } from "./prague.ts";
import { DAY_KEYS, type DayKey, type DeviceType, type DistributorData, type DistributorId, type Period, type Variant } from "./schema.ts";

/** What the user picked; persisted in localStorage. */
export interface Selection {
  distributor: DistributorId;
  tariff: string;
  command: string;
  device: DeviceType;
  variantId: string;
}

export type Rate = "low" | "high";

export type RateState =
  | {
      kind: "ok";
      rate: Rate;
      /** When the current rate started; null if it started before the look-back horizon. */
      since: number | null;
      /** When the current rate ends; null if it doesn't change within the look-ahead horizon. */
      until: number | null;
    }
  | { kind: "not-found" }
  | { kind: "data-issue"; issues: string[] };

export interface Interval {
  start: number;
  end: number;
}

const LOOK_BACK_DAYS = 2;
const LOOK_AHEAD_DAYS = 9; // longest no-NT stretch is D61d Mon–Thu (4 days)

/** The period valid on a Prague date. Past the last period's validTo, the last period still applies (the app warns). */
export function periodFor(data: DistributorData, date: CivilDate): Period {
  const iso = isoDate(date);
  const valid = data.periods.filter((p) => p.validFrom <= iso);
  return valid.at(-1) ?? data.periods[0];
}

export function findVariant(period: Period, selection: Selection): Variant | null {
  return (
    period.tariffs
      .find((t) => t.code === selection.tariff)
      ?.programs.find((p) => p.command === selection.command)
      ?.variants.find((v) => v.device === selection.device && v.id === selection.variantId) ?? null
  );
}

export function dayKey(date: CivilDate): DayKey {
  return isCzechHoliday(date) ? "hol" : DAY_KEYS[weekdayIndex(date)];
}

/**
 * Low-rate intervals (as instants) for the Prague dates from `from` to `to` inclusive, merged so that
 * a run crossing midnight is one interval. Dates whose period lacks the selected variant contribute nothing.
 */
export function lowIntervals(data: DistributorData, selection: Selection, from: CivilDate, to: CivilDate): Interval[] {
  const intervals: Interval[] = [];
  for (let date = from; isoDate(date) <= isoDate(to); date = addDays(date, 1)) {
    const variant = findVariant(periodFor(data, date), selection);
    if (!variant) continue;
    for (const [start, end] of variant.week[dayKey(date)]) {
      const interval = { start: pragueInstant(date, start), end: pragueInstant(date, end) };
      if (interval.end > interval.start) intervals.push(interval);
    }
  }
  intervals.sort((a, b) => a.start - b.start);

  const merged: Interval[] = [];
  for (const interval of intervals) {
    const prev = merged.at(-1);
    if (prev && interval.start <= prev.end) prev.end = Math.max(prev.end, interval.end);
    else merged.push({ ...interval });
  }
  return merged;
}

export function getRateState(data: DistributorData, selection: Selection, now: number): RateState {
  const today = pragueDate(now);
  const variant = findVariant(periodFor(data, today), selection);
  if (!variant) return { kind: "not-found" };
  if (variant.issues.length) return { kind: "data-issue", issues: variant.issues };

  const from = addDays(today, -LOOK_BACK_DAYS);
  const to = addDays(today, LOOK_AHEAD_DAYS);
  const horizonStart = pragueInstant(from, 0);
  const horizonEnd = pragueInstant(to, 1440);
  const intervals = lowIntervals(data, selection, from, to);

  const current = intervals.find((i) => i.start <= now && now < i.end);
  if (current) {
    return {
      kind: "ok",
      rate: "low",
      since: current.start > horizonStart ? current.start : null,
      until: current.end < horizonEnd ? current.end : null,
    };
  }

  const previous = intervals.findLast((i) => i.end <= now);
  const next = intervals.find((i) => i.start > now);
  return { kind: "ok", rate: "high", since: previous?.end ?? null, until: next?.start ?? null };
}

/** True when today (Prague) is after the last period's validTo. */
export function isStale(data: DistributorData, now: number): boolean {
  const last = data.periods.at(-1);
  return !!last?.validTo && isoDate(pragueDate(now)) > last.validTo;
}
