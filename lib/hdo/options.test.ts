import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { completeSelection, DEFAULT_SELECTION, deviceOptions, draftForProgram, draftForTariff, programOptions } from "./options.ts";
import type { DistributorData } from "./schema.ts";

const pre: DistributorData = JSON.parse(readFileSync(new URL("../../output/pre.json", import.meta.url), "utf8"));
const period = pre.periods[0];

test("D57d has two programs, each with four device variants", () => {
  assert.deepEqual(
    programOptions(period, "D57d").map((p) => p.command),
    ["573", "605"],
  );
  assert.deepEqual(
    deviceOptions(period, "D57d", "573").map((o) => o.printed),
    ["573 / A4B6DP9", "AD57_001 · AD3 573 574 575", "TD57_001 · TOU 573 574 575", "D57 573 574 575"],
  );
});

test("switching program keeps the device type", () => {
  const amm573 = { distributor: "pre" as const, tariff: "D57d", command: "573", device: "amm" as const, variantId: "1052" };
  const next = draftForProgram(period, amm573, "605");
  assert.deepEqual(next, { distributor: "pre", tariff: "D57d", command: "605", device: "amm", variantId: "1053" });
  assert.ok(completeSelection(period, next));
});

test("a tariff with one program and one device variant is completed automatically", () => {
  // Sdílení 8: HDO only, one program
  const draft = draftForTariff(period, { distributor: "pre" }, "Sdílení 8");
  assert.equal(draft.command, "541");
  assert.equal(draft.device, "hdo");
});

test("a tariff with several programs waits for the program", () => {
  assert.deepEqual(draftForTariff(period, { distributor: "pre", device: "amm" }, "D57d"), { distributor: "pre", tariff: "D57d" });
});

test("ambiguous AMM variants are marked", () => {
  const amm = deviceOptions(period, "D56d", "517").filter((o) => o.device === "amm");
  assert.equal(amm.length, 2);
  assert.ok(amm.every((o) => o.ambiguous && o.hasIssues));
});

test("the default selection exists in the data", () => {
  assert.ok(completeSelection(period, DEFAULT_SELECTION));
});
