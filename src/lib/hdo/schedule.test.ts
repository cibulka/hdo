import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { easterSunday, isCzechHoliday } from "./holidays.ts";
import { pragueInstant } from "./prague.ts";
import { getRateState, isStale, type Selection } from "./schedule.ts";
import { DAY_KEYS, type DistributorData, type Week, type Window } from "./schema.ts";

const pre: DistributorData = JSON.parse(readFileSync(new URL("../../../output/pre.json", import.meta.url), "utf8"));
const amm573: Selection = { distributor: "pre", tariff: "D57d", command: "573", device: "amm", variantId: "1052" };

/** Prague wall-clock time → instant. */
const at = (iso: string, hhmm: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  const [h, m] = hhmm.split(":").map(Number);
  return pragueInstant({ year, month, day }, h * 60 + m);
};
const minutes = (ms: number) => ms / 60_000;

function expectState(selection: Selection, data: DistributorData, now: number, rate: "low" | "high", until: number | null) {
  const state = getRateState(data, selection, now);
  assert.equal(state.kind, "ok");
  if (state.kind !== "ok") return;
  assert.equal(state.rate, rate);
  assert.equal(state.until, until);
}

function synthetic(weeks: { validFrom: string; validTo: string | null; week: Week }[], issues: string[] = []): DistributorData {
  return {
    schemaVersion: 1,
    distributor: "pre",
    sources: [],
    periods: weeks.map(({ validFrom, validTo, week }) => ({
      validFrom,
      validTo,
      tariffs: [{ code: "X", programs: [{ command: "1", label: null, variants: [{ device: "hdo", id: "1", name: null, week, issues }] }] }],
    })),
  };
}
const everyDay = (windows: Window[], overrides: Partial<Week> = {}): Week =>
  ({ ...Object.fromEntries(DAY_KEYS.map((d) => [d, windows])), ...overrides }) as Week;
const sel: Selection = { distributor: "pre", tariff: "X", command: "1", device: "hdo", variantId: "1" };

test("PRE D57d/573 AMM, ordinary Tuesday morning: low until 11:45", () => {
  expectState(amm573, pre, at("2026-11-10", "10:00"), "low", at("2026-11-10", "11:45"));
});

test("high rate counts down to the next low window", () => {
  expectState(amm573, pre, at("2026-11-10", "11:50"), "high", at("2026-11-10", "12:15"));
});

test("a low run crossing midnight is one run (Tue 23:15 → Wed 02:15)", () => {
  expectState(amm573, pre, at("2026-11-10", "23:30"), "low", at("2026-11-11", "02:15"));
});

test("Sunday → Monday crossing", () => {
  // AMM 573: Sunday low from 23:00, Monday low 00:00–00:15
  expectState(amm573, pre, at("2026-11-15", "23:30"), "low", at("2026-11-16", "00:15"));
});

test("holidays use the 'hol' row (24 Dec 2026 is a Thursday)", () => {
  // Thursday: low 00:00–02:15. Holiday: low 00:00–01:45, high 01:45–02:15.
  expectState(amm573, pre, at("2026-12-17", "02:00"), "low", at("2026-12-17", "02:15"));
  expectState(amm573, pre, at("2026-12-24", "02:00"), "high", at("2026-12-24", "02:15"));
});

test("Czech holidays incl. Easter", () => {
  assert.deepEqual(easterSunday(2026), { year: 2026, month: 4, day: 5 });
  assert.deepEqual(easterSunday(2027), { year: 2027, month: 3, day: 28 });
  assert.ok(isCzechHoliday({ year: 2026, month: 4, day: 3 })); // Good Friday
  assert.ok(isCzechHoliday({ year: 2026, month: 4, day: 6 })); // Easter Monday
  assert.ok(isCzechHoliday({ year: 2026, month: 11, day: 17 }));
  assert.ok(!isCzechHoliday({ year: 2026, month: 4, day: 5 })); // Easter Sunday is a normal Sunday
});

test("pragueInstant matches known UTC instants across DST", () => {
  assert.equal(at("2026-03-29", "01:30"), Date.UTC(2026, 2, 29, 0, 30)); // CET, UTC+1
  assert.equal(at("2026-03-29", "04:00"), Date.UTC(2026, 2, 29, 2, 0)); // CEST, UTC+2
  assert.equal(at("2026-10-25", "01:00"), Date.UTC(2026, 9, 24, 23, 0)); // CEST
  assert.equal(at("2026-10-25", "04:00"), Date.UTC(2026, 9, 25, 3, 0)); // CET
  assert.equal(at("2026-11-10", "24:00"), Date.UTC(2026, 10, 10, 23, 0)); // midnight = next day 00:00
});

test("DST spring forward: countdown is real elapsed time", () => {
  // 29 Mar 2026: 02:00 → 03:00. Window 01:00–04:00 lasts 2 real hours.
  const data = synthetic([{ validFrom: "2026-01-01", validTo: null, week: everyDay([[60, 240]]) }]);
  const now = at("2026-03-29", "01:30");
  expectState(sel, data, now, "low", at("2026-03-29", "04:00"));
  assert.equal(minutes(at("2026-03-29", "04:00") - now), 90);
});

test("DST fall back: countdown is real elapsed time", () => {
  // 25 Oct 2026: 03:00 → 02:00. Window 01:00–04:00 lasts 4 real hours.
  const data = synthetic([{ validFrom: "2026-01-01", validTo: null, week: everyDay([[60, 240]]) }]);
  const start = at("2026-10-25", "01:00");
  expectState(sel, data, start, "low", at("2026-10-25", "04:00"));
  assert.equal(minutes(at("2026-10-25", "04:00") - start), 240);
});

test("long stretch without low rate (D61d-like weekend tariff)", () => {
  const week = everyDay([], { fri: [[720, 1440]], sat: [[0, 1440]], sun: [[0, 1320]] });
  const data = synthetic([{ validFrom: "2026-01-01", validTo: null, week }]);
  expectState(sel, data, at("2026-11-11", "12:00"), "high", at("2026-11-13", "12:00")); // Wed → Fri noon
  expectState(sel, data, at("2026-11-14", "12:00"), "low", at("2026-11-15", "22:00")); // Sat → Sun 22:00
});

test("a following period takes over on its validFrom date", () => {
  const data = synthetic([
    { validFrom: "2026-01-01", validTo: "2026-11-30", week: everyDay([[0, 360]]) },
    { validFrom: "2026-12-01", validTo: null, week: everyDay([[0, 120]]) },
  ]);
  expectState(sel, data, at("2026-11-29", "01:00"), "low", at("2026-11-29", "06:00"));
  expectState(sel, data, at("2026-12-01", "01:00"), "low", at("2026-12-01", "02:00"));
  expectState(sel, data, at("2026-11-30", "23:00"), "high", at("2026-12-01", "00:00"));
});

test("unknown selection and data issues", () => {
  assert.equal(getRateState(pre, { ...amm573, variantId: "nope" }, Date.now()).kind, "not-found");
  const data = synthetic([{ validFrom: "2026-01-01", validTo: null, week: everyDay([[0, 60]]) }], ["ambiguous"]);
  assert.deepEqual(getRateState(data, sel, at("2026-11-10", "00:30")), { kind: "data-issue", issues: ["ambiguous"] });
});

test("isStale after the last period's validTo", () => {
  assert.equal(isStale(pre, at("2027-12-31", "23:59")), false);
  assert.equal(isStale(pre, at("2028-01-01", "00:01")), true);
});
