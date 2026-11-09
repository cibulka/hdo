import assert from "node:assert/strict";
import { test } from "node:test";
import { cellToMinutes, eventsToWindows, excelSerialToIso, mergeWindows } from "./time.ts";

const on = (minutes: number) => ({ minutes, on: true });
const off = (minutes: number) => ({ minutes, on: false });

test("cellToMinutes reads Excel fractions and HH:MM strings", () => {
  assert.equal(cellToMinutes(0.5), 720);
  assert.equal(cellToMinutes(0.9166666666666666), 1320);
  assert.equal(cellToMinutes("0:00"), 0);
  assert.equal(cellToMinutes("23:15"), 1395);
  assert.equal(cellToMinutes(null), null);
  assert.throws(() => cellToMinutes("Vysílán v dvacáté šesté minutě"));
  assert.throws(() => cellToMinutes("24:00"));
});

test("excelSerialToIso", () => {
  assert.equal(excelSerialToIso(46051), "2026-01-29");
  assert.equal(excelSerialToIso(46752), "2027-12-31");
});

test("on/off pairs, trailing 0:00 means midnight", () => {
  // HDO 573 Monday: zapnout 00:00, vypnout 02:20, …, zapnout 23:20, vypnout 0:00
  assert.deepEqual(eventsToWindows([on(0), off(140), on(180), off(380), on(1400), off(0)]), [
    [0, 140],
    [180, 380],
    [1400, 1440],
  ]);
});

test("leading off at 0:00 is a no-op (TOU rows starting in a Vyp column)", () => {
  assert.deepEqual(eventsToWindows([off(0), on(80), off(380), on(880), off(1060)]), [
    [80, 380],
    [880, 1060],
  ]);
});

test("NT still on at the end of the row lasts until midnight", () => {
  assert.deepEqual(eventsToWindows([on(0)]), [[0, 1440]]); // D61d Saturday
  assert.deepEqual(eventsToWindows([off(0), on(720)]), [[720, 1440]]); // D61d Friday
});

test("empty row means no NT", () => {
  assert.deepEqual(eventsToWindows([]), []);
});

test("rejects out-of-order times and double switching", () => {
  assert.throws(() => eventsToWindows([on(600), off(300)]));
  assert.throws(() => eventsToWindows([on(0), on(60)]));
  assert.throws(() => eventsToWindows([off(60)]));
});

test("mergeWindows joins touching windows", () => {
  assert.deepEqual(mergeWindows([[60, 120], [0, 60], [200, 300]]), [
    [0, 120],
    [200, 300],
  ]);
});
