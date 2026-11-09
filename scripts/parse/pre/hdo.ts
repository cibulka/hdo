import { DAY_KEYS, type Week } from "../../../lib/hdo/schema.ts";
import { ParseError, withContext } from "../shared/errors.ts";
import { cellToMinutes, eventsToWindows, excelSerialToIso, type SwitchEvent } from "../shared/time.ts";
import { text, type Row, type Workbook } from "../shared/xlsx.ts";
import { tariffsFromDescription } from "./tariffs.ts";
import type { HdoProgramFile, RawVariant } from "./types.ts";

const DAY_LABELS = ["pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota", "neděle", "svátek"];

export function isHdoProgram(wb: Workbook): boolean {
  return wb.sheetNames.some((sheet) => wb.rows(sheet).some((row) => row.some((cell) => text(cell) === "Program povelů HDO")));
}

/**
 * PRE "Program povelů HDO" (.xls): validity in the header, then 8 rows per command
 * (Mon–Sun + holiday) with zapnout/vypnout column pairs.
 */
export function parseHdoProgram(wb: Workbook): HdoProgramFile {
  const sheet = wb.sheetNames.find((s) => wb.rows(s).some((row) => row.some((cell) => text(cell) === "Program povelů HDO")))!;
  const rows = wb.rows(sheet);

  const validFrom = findDateAfterLabel(rows, "od:");
  const validTo = findDateAfterLabel(rows, "do:");
  if (!validFrom) throw new ParseError(`${sheet}: validity "od:" not found`);

  const headerIndex = rows.findIndex((row) => text(row[0]) === "číselný kód povelu");
  if (headerIndex < 0) throw new ParseError(`${sheet}: header row "číselný kód povelu" not found`);
  const header = rows[headerIndex].map(text);
  const dayCol = header.indexOf("platnost ve dni");
  const switchCols = header
    .map((label, col) => ({ col, on: label === "zapnout" ? true : label === "vypnout" ? false : null }))
    .filter((c): c is { col: number; on: boolean } => c.on !== null);
  if (dayCol < 0 || switchCols.length === 0) throw new ParseError(`${sheet}: unexpected header ${JSON.stringify(header)}`);

  const variants: RawVariant[] = [];
  const skipped: string[] = [];
  const warnings: string[] = [];

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[0] === null) continue;

    const code = text(row[0]);
    const address = text(row[1]) || null;
    const description = text(row[2]);
    const block = rows.slice(i, i + DAY_LABELS.length);
    const days = block.map((r) => text(r[dayCol]));
    if (days.join() !== DAY_LABELS.join()) {
      throw new ParseError(`${sheet} row ${i + 1} (command ${code}): expected day rows ${DAY_LABELS.join(", ")}, got ${days.join(", ")}`);
    }

    const skip = (reason: string) => skipped.push(`${code} "${description}": ${reason}`);
    if (!/^Odblokování NT/.test(description)) { skip("not an NT command"); continue; }
    if (!/^\d+$/.test(code)) { skip("not a plain command number (negative = inverted command)"); continue; }

    const tariffs = tariffsFromDescription(description);
    if (tariffs.length === 0) throw new ParseError(`command ${code}: no tariff found in "${description}"`);

    const hasTimes = block.some((r) => switchCols.some(({ col }) => r[col] !== null));
    if (!hasTimes) { skip("no switching times"); continue; }

    const week = {} as Week;
    block.forEach((r, d) => {
      const events: SwitchEvent[] = [];
      for (const { col, on } of switchCols) {
        if (r[col] === null) continue;
        events.push({ minutes: toMinutes(r[col], `command ${code} ${DAY_LABELS[d]}`), on });
      }
      week[DAY_KEYS[d]] = withContext(() => eventsToWindows(events), `command ${code} ${DAY_LABELS[d]}`);
    });

    for (const r of block) {
      const extra = r.slice(switchCols.at(-1)!.col + 1).filter((c) => c !== null);
      if (extra.length) warnings.push(`command ${code}: ignored cells after the last time column: ${JSON.stringify(extra)}`);
    }

    variants.push({ tariffs, command: code, device: "hdo", id: code, name: address, label: description, week });
    i += DAY_LABELS.length - 1;
  }

  return { kind: "hdo", validFrom, validTo, variants, skipped, warnings };
}

function findDateAfterLabel(rows: Row[], label: string): string | null {
  for (const row of rows.slice(0, 10)) {
    const col = row.findIndex((cell) => text(cell) === label);
    if (col >= 0) {
      const value = row.slice(col + 1).find((cell) => cell !== null);
      if (typeof value !== "number") throw new ParseError(`validity "${label}" is not a date: ${JSON.stringify(value)}`);
      return excelSerialToIso(value);
    }
  }
  return null;
}

function toMinutes(cell: Row[number], where: string): number {
  return withContext(() => cellToMinutes(cell)!, where);
}
