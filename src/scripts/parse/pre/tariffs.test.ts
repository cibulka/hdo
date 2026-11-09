import assert from "node:assert/strict";
import { test } from "node:test";
import { compareTariffs, tariffFromAmmSheet, tariffFromTouId, tariffsFromDescription } from "./tariffs.ts";

test("tariffsFromDescription handles PRE's description variants", () => {
  assert.deepEqual(tariffsFromDescription("Odblokování NT sazby D 57d"), ["D57d"]);
  assert.deepEqual(tariffsFromDescription("Odblokování NT pro sazbu C/D 25d_26d"), ["C25d", "D25d", "C26d", "D26d"]);
  assert.deepEqual(tariffsFromDescription("Odblokování NT sazby D 25d_26d-sou"), ["D25d", "D26d"]);
  assert.deepEqual(tariffsFromDescription("Odblokování NT pro sazbu C35d - dělené pásmo"), ["C35d"]);
  assert.deepEqual(tariffsFromDescription("Odblokování NT pro sazbu D35 a D36 dělené pásmo"), ["D35d", "D36d"]);
  assert.deepEqual(tariffsFromDescription("Odblokování NT sazby C 25d-sou"), ["C25d"]);
  assert.deepEqual(tariffsFromDescription("Odblokování NT Sdílení 8"), ["Sdílení 8"]);
  assert.deepEqual(tariffsFromDescription("Odblokování NT"), []);
});

test("tariff from TOU id and AMM sheet", () => {
  assert.equal(tariffFromTouId("AD57_001"), "D57d");
  assert.equal(tariffFromTouId("TC25_003"), "C25d");
  assert.equal(tariffFromTouId("TOU tabulky"), null);
  assert.equal(tariffFromAmmSheet("D57D"), "D57d");
  assert.equal(tariffFromAmmSheet("List1"), null);
});

test("households first, numeric order", () => {
  assert.deepEqual(["C25d", "Sdílení 8", "D57d", "D25d"].sort(compareTariffs), ["D25d", "D57d", "C25d", "Sdílení 8"]);
});
