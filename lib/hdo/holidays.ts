import { addDays, isoDate, type CivilDate } from "./prague.ts";

// Czech public holidays and other days off (zákon č. 245/2000 Sb.), as MM-DD.
const FIXED = ["01-01", "05-01", "05-08", "07-05", "07-06", "09-28", "10-28", "11-17", "12-24", "12-25", "12-26"];

/** Easter Sunday (Gregorian, anonymous algorithm). */
export function easterSunday(year: number): CivilDate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { year, month, day };
}

const cache = new Map<number, Set<string>>();

function holidaysOf(year: number): Set<string> {
  let set = cache.get(year);
  if (!set) {
    const easter = easterSunday(year);
    set = new Set([
      ...FIXED.map((md) => `${year}-${md}`),
      isoDate(addDays(easter, -2)), // Velký pátek
      isoDate(addDays(easter, 1)), // Velikonoční pondělí
    ]);
    cache.set(year, set);
  }
  return set;
}

export function isCzechHoliday(date: CivilDate): boolean {
  return holidaysOf(date.year).has(isoDate(date));
}
