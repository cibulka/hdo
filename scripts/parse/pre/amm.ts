import { DAY_KEYS, type DayKey, type Week } from "#/lib/hdo/schema.ts";
import { ParseError, withContext } from "../shared/errors.ts";
import { cellToMinutes, eventsToWindows, type SwitchEvent } from "../shared/time.ts";
import { text, type Workbook } from "../shared/xlsx.ts";
import { tariffFromAmmSheet } from "./tariffs.ts";
import type { DeviceTableFile, RawVariant } from "./types.ts";

const DAY_HEADERS: Record<string, DayKey> = { PO: "mon", ÚT: "tue", ST: "wed", ČT: "thu", PÁ: "fri", SO: "sat", NE: "sun", SV: "hol" };
const TARIFF_ROW_LABEL = "TARIF2";

export function isAmmTable(wb: Workbook): boolean {
  return wb.sheetNames.length > 0 && wb.sheetNames.every((s) => tariffFromAmmSheet(s) !== null);
}

interface Block {
  id: string;
  name: string | null;
  register: string;
  rowLabel: string | null;
  week: Partial<Week>;
}

/**
 * PRE TOU table for AMM smart meters: one sheet per tariff, each program has three blocks
 * (RELE1, RELE2, TARIF2). Only the TARIF2 block (the NT register) is used.
 */
export function parseAmmTable(wb: Workbook): DeviceTableFile {
  const variants: RawVariant[] = [];

  for (const sheet of wb.sheetNames) {
    const tariff = tariffFromAmmSheet(sheet)!;
    const rows = wb.rows(sheet);
    let header = rows[0].map(text);
    const blocks: Block[] = [];
    let current: Block | null = null;

    for (const [i, row] of rows.slice(1).entries()) {
      const where = `${sheet} row ${i + 2}`;
      const first = text(row[0]);
      if (first === "ID TOU") { header = row.map(text); continue; }

      const registerCol = header.indexOf("Registry");
      if (first) {
        current = { id: first, name: text(row[1]) || null, register: text(row[registerCol]), rowLabel: null, week: {} };
        blocks.push(current);
        continue;
      }

      const dayKeys = header.flatMap((h, col) => (DAY_HEADERS[h] && text(row[col]) ? [DAY_HEADERS[h]] : []));
      if (dayKeys.length === 0) continue;
      if (!current) throw new ParseError(`${where}: day row outside of a block`);
      if (dayKeys.length > 1) throw new ParseError(`${where}: one row marks several days`);

      const rowLabel = text(row[registerCol]);
      if (current.rowLabel && current.rowLabel !== rowLabel) throw new ParseError(`${where}: mixed row labels in block ${current.id}`);
      current.rowLabel = rowLabel;

      const events: SwitchEvent[] = [];
      header.forEach((h, col) => {
        if ((h === "Zap" || h === "Vyp") && row[col] !== null) {
          events.push({ minutes: withContext(() => cellToMinutes(row[col])!, where), on: h === "Zap" });
        }
      });
      if (current.week[dayKeys[0]]) throw new ParseError(`${where}: day "${dayKeys[0]}" defined twice`);
      current.week[dayKeys[0]] = withContext(() => eventsToWindows(events), where);
    }

    for (const block of blocks.filter((b) => b.rowLabel === TARIFF_ROW_LABEL)) {
      const missing = DAY_KEYS.filter((d) => !block.week[d]);
      if (missing.length) throw new ParseError(`${sheet} program ${block.id}: missing days ${missing.join(", ")}`);
      if (!/^\d+$/.test(block.register)) throw new ParseError(`${sheet} program ${block.id}: register "${block.register}" is not a number`);
      variants.push({
        tariffs: [tariff],
        command: block.register,
        device: "amm",
        id: block.id,
        name: block.name,
        label: null,
        week: block.week as Week,
      });
    }
  }

  if (variants.length === 0) throw new ParseError("AMM table: no programs");
  return { kind: "amm", variants, warnings: [] };
}
