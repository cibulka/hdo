import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DAY_KEYS, type DistributorData, type Variant } from "#/lib/hdo/schema.ts";
import { ParseError } from "./errors.ts";

export const ROOT = join(import.meta.dirname, "../../../..");
export const OUTPUT_DIR = join(ROOT, "output");

/** Structural checks every distributor's output must pass before it is written. */
export function validate(data: DistributorData): void {
  if (data.periods.length === 0) throw new ParseError("no validity period found");
  data.periods.forEach((period, i) => {
    const next = data.periods[i + 1];
    if (period.validTo && period.validTo < period.validFrom) {
      throw new ParseError(`period ${period.validFrom}: validTo ${period.validTo} is before validFrom`);
    }
    if (next && next.validFrom <= period.validFrom) throw new ParseError("periods are not sorted by validFrom");
    if (period.tariffs.length === 0) throw new ParseError(`period ${period.validFrom} has no tariffs`);
    for (const tariff of period.tariffs) {
      for (const program of tariff.programs) {
        if (program.variants.length === 0) throw new ParseError(`${tariff.code}/${program.command} has no variants`);
        program.variants.forEach((variant) => validateVariant(variant, `${tariff.code}/${program.command}/${variant.id}`));
      }
    }
  });
}

function validateVariant(variant: Variant, where: string): void {
  for (const day of DAY_KEYS) {
    const windows = variant.week[day];
    if (!windows) throw new ParseError(`${where}: missing day "${day}"`);
    let last = -1;
    for (const [start, end] of windows) {
      if (!(start >= 0 && end <= 1440 && start < end)) throw new ParseError(`${where} ${day}: invalid window [${start}, ${end}]`);
      if (start <= last) throw new ParseError(`${where} ${day}: overlapping or unsorted windows`);
      last = end;
    }
  }
}

/** Deterministic JSON: 2-space indent, each day's windows on one line. Same input → same bytes. */
export function stringify(data: DistributorData): string {
  const json = JSON.stringify(data, null, 2);
  return (
    json
      // [\n  0,\n  140\n] → [0, 140]
      .replace(/\[\s+(\d+),\s+(\d+)\s+\]/g, "[$1, $2]")
      // "mon": [\n [0, 140],\n [180, 380]\n] → "mon": [[0, 140], [180, 380]]
      .replace(/\[\s+((?:\[\d+, \d+\],?\s*)+)\]/g, (_, inner: string) => `[${inner.trim().split(/,\s*(?=\[)/).join(", ")}]`) +
    "\n"
  );
}

export function writeOutput(data: DistributorData): string {
  validate(data);
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const file = join(OUTPUT_DIR, `${data.distributor}.json`);
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, stringify(data));
  renameSync(tmp, file);
  return file;
}
