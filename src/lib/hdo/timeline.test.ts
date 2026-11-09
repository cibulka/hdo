import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { pragueInstant } from "./prague.ts";
import type { Selection } from "./schedule.ts";
import type { DistributorData } from "./schema.ts";
import { timeline } from "./timeline.ts";

const pre: DistributorData = JSON.parse(readFileSync(new URL("../../../output/pre.json", import.meta.url), "utf8"));
const amm605: Selection = { distributor: "pre", tariff: "D57d", command: "605", device: "amm", variantId: "1053" };

test("timeline covers exactly 24 h with alternating rates", () => {
  const from = pragueInstant({ year: 2026, month: 11, day: 9 }, 20 * 60 + 47);
  const segments = timeline(pre, amm605, from);
  assert.equal(segments[0].start, from);
  assert.equal(segments.at(-1)!.end, from + 24 * 3_600_000);
  segments.slice(1).forEach((s, i) => {
    assert.equal(s.start, segments[i].end);
    assert.notEqual(s.rate, segments[i].rate);
  });
  // Monday 20:47, program 605 smart meter: high until 21:00
  assert.deepEqual(segments[0], {
    start: from,
    end: pragueInstant({ year: 2026, month: 11, day: 9 }, 21 * 60),
    rate: "high",
    runStart: pragueInstant({ year: 2026, month: 11, day: 9 }, 20 * 60 + 15), // the run began before the window
    runEnd: pragueInstant({ year: 2026, month: 11, day: 9 }, 21 * 60),
  });
  const lowMinutes = segments.filter((s) => s.rate === "low").reduce((sum, s) => sum + s.end - s.start, 0) / 60_000;
  assert.ok(lowMinutes > 19 * 60 && lowMinutes < 21 * 60, `about 20 h of low rate, got ${lowMinutes / 60} h`);
});
