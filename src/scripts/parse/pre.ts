// npm run parse-pre — reads every spreadsheet in input/pre/ and writes output/pre.json.
import { basename, join, relative } from "node:path";
import { DAY_KEYS, type DistributorData, type Period, type Program, type Tariff, type Variant } from "#/lib/hdo/schema.ts";
import { isAmmTable, parseAmmTable } from "./pre/amm.ts";
import { isHdoProgram, parseHdoProgram } from "./pre/hdo.ts";
import { compareTariffs } from "./pre/tariffs.ts";
import { isTouTable, parseTouTable } from "./pre/tou.ts";
import type { HdoProgramFile, ParsedFile, RawVariant } from "./pre/types.ts";
import { ParseError, runParser } from "./shared/errors.ts";
import { ROOT, writeOutput } from "./shared/output.ts";
import { totalMinutes } from "./shared/time.ts";
import { readWorkbook, spreadsheetsIn, text, type Workbook } from "./shared/xlsx.ts";

const INPUT_DIR = join(ROOT, "input/pre");
const DEVICE_ORDER = ["hdo", "tou-a", "tou-t", "amm"];

await runParser("parse-pre", () => {
  const files = spreadsheetsIn(INPUT_DIR);
  if (files.length === 0) throw new ParseError(`no .xls/.xlsx files in ${relative(ROOT, INPUT_DIR)}/`);

  const parsed = files.map((file) => ({ file: basename(file), result: parseFile(readWorkbook(file)) }));
  const hdoPrograms = parsed.flatMap(({ result }) => (result.kind === "hdo" ? [result] : []));
  const deviceTables = parsed.flatMap(({ result }) => (result.kind === "tou" || result.kind === "amm" ? result.variants : []));
  if (hdoPrograms.length === 0) throw new ParseError("no HDO program file (\"Program povelů HDO\") found – it carries the validity dates");

  const data: DistributorData = {
    schemaVersion: 1,
    distributor: "pre",
    periods: buildPeriods(hdoPrograms, deviceTables),
    sources: parsed.map(({ file }) => file),
  };
  const out = writeOutput(data);

  printSummary(parsed, data);
  console.log(`\n✔ wrote ${relative(ROOT, out)}`);
});

function parseFile(wb: Workbook): ParsedFile {
  if (isHdoProgram(wb)) return parseHdoProgram(wb);
  if (isTouTable(wb)) return parseTouTable(wb);
  if (isAmmTable(wb)) return parseAmmTable(wb);

  const cells = wb.sheetNames.flatMap((s) => wb.rows(s).flat()).filter((c) => c !== null);
  if (cells.length > 0 && cells.length <= 5 && cells.every((c) => typeof c === "string")) {
    return { kind: "note", note: cells.map(text).join(" ") };
  }
  throw new ParseError(`${basename(wb.file)}: unknown file layout`);
}

/** One period per HDO program file. TOU/AMM tables carry no validity, so they belong to every period. */
function buildPeriods(hdoPrograms: HdoProgramFile[], deviceVariants: RawVariant[]): Period[] {
  const sorted = [...hdoPrograms].sort((a, b) => a.validFrom.localeCompare(b.validFrom));
  return sorted.map((program, i) => {
    const next = sorted[i + 1];
    let validTo = program.validTo;
    if (next && (!validTo || validTo >= next.validFrom)) validTo = dayBefore(next.validFrom);
    return { validFrom: program.validFrom, validTo, tariffs: groupTariffs([...program.variants, ...deviceVariants]) };
  });
}

function groupTariffs(raw: RawVariant[]): Tariff[] {
  const tariffs = new Map<string, Map<string, Program>>();
  for (const v of raw) {
    for (const code of v.tariffs) {
      const programs = tariffs.get(code) ?? new Map<string, Program>();
      tariffs.set(code, programs);
      const program = programs.get(v.command) ?? { command: v.command, label: null, variants: [] };
      programs.set(v.command, program);
      if (v.label && !program.label) program.label = v.label;
      program.variants.push({ device: v.device, id: v.id, name: v.name, week: v.week, issues: [] });
    }
  }

  return [...tariffs.entries()]
    .sort(([a], [b]) => compareTariffs(a, b))
    .map(([code, programs]) => ({
      code,
      programs: [...programs.values()]
        .sort((a, b) => Number(a.command) - Number(b.command))
        .map((program) => ({ ...program, variants: flagConflicts(sortVariants(program.variants), `${code}/${program.command}`) })),
    }));
}

function sortVariants(variants: Variant[]): Variant[] {
  return [...variants].sort(
    (a, b) => DEVICE_ORDER.indexOf(a.device) - DEVICE_ORDER.indexOf(b.device) || a.id.localeCompare(b.id, "cs", { numeric: true }),
  );
}

/**
 * Users identify their program by the printed name. If one name on one device type maps to
 * different schedules, the data is ambiguous: every such variant gets an issue and the app
 * shows an error instead of a status. The same ID with different schedules is a hard error.
 */
function flagConflicts(variants: Variant[], where: string): Variant[] {
  const byId = Map.groupBy(variants, (v) => `${v.device}|${v.id}`);
  for (const [key, group] of byId) {
    if (new Set(group.map((v) => JSON.stringify(v.week))).size > 1) throw new ParseError(`${where}: ${key} has two different schedules`);
  }

  const byName = Map.groupBy(variants.filter((v) => v.name), (v) => `${v.device}|${v.name}`);
  for (const group of byName.values()) {
    if (new Set(group.map((v) => JSON.stringify(v.week))).size < 2) continue;
    const list = group.map((v) => `${v.id} (${hoursLabel(v)})`).join(", ");
    for (const v of group) v.issues.push(`"${v.name}" maps to different schedules: ${list}`);
  }

  // Exact duplicates (same device, same schedule, same name) add nothing for the user.
  const seen = new Set<string>();
  return variants.filter((v) => {
    const key = `${v.device}|${v.id}|${v.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hoursLabel(v: Variant): string {
  const hours = [...new Set(DAY_KEYS.map((d) => totalMinutes(v.week[d]) / 60))];
  return hours.map((h) => `${+h.toFixed(2)}`).join("/") + " h";
}

function dayBefore(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function printSummary(parsed: { file: string; result: ParsedFile }[], data: DistributorData): void {
  console.log("Files:");
  for (const { file, result } of parsed) {
    const detail =
      result.kind === "hdo" ? `HDO program ${result.validFrom} → ${result.validTo ?? "∞"}, ${result.variants.length} NT commands` :
      result.kind === "note" ? `note only: "${result.note}"` :
      `${result.kind.toUpperCase()} table, ${result.variants.length} programs`;
    console.log(`  ${file}: ${detail}`);
  }

  const skipped = parsed.flatMap(({ result }) => (result.kind === "hdo" ? result.skipped : []));
  const warnings = parsed.flatMap(({ result }) => ("warnings" in result ? result.warnings : []));
  if (skipped.length) {
    // Group by reason; list codes only, the full descriptions are in the source file.
    const byReason = Map.groupBy(skipped, (s) => s.slice(s.lastIndexOf(": ") + 2));
    console.log(`\nSkipped HDO commands (${skipped.length}):`);
    for (const [reason, items] of byReason) console.log(`  - ${reason}: ${items.map((s) => s.split(" ")[0]).join(", ")}`);
  }
  if (warnings.length) console.log(`\nWarnings (${warnings.length}):\n${warnings.map((s) => `  ! ${s}`).join("\n")}`);

  for (const period of data.periods) {
    console.log(`\nPeriod ${period.validFrom} → ${period.validTo ?? "∞"}: daily NT hours per variant`);
    for (const tariff of period.tariffs) {
      console.log(`  ${tariff.code}`);
      for (const program of tariff.programs) {
        const variants = program.variants.map((v) => `${v.device}:${v.id} ${hoursLabel(v)}${v.issues.length ? " ⚠" : ""}`).join(" | ");
        console.log(`    ${program.command.padEnd(4)} ${variants}`);
      }
    }
  }

  const issues = data.periods[0].tariffs.flatMap((t) => t.programs.flatMap((p) => p.variants.flatMap((v) => v.issues.map((i) => `${t.code}/${p.command} ${v.device}:${v.id}: ${i}`))));
  if (issues.length) console.log(`\n⚠ Data issues shown as errors in the app (${issues.length}):\n${issues.map((s) => `  - ${s}`).join("\n")}`);
}
