import { DAY_KEYS, type DayKey, type Week } from "../../../lib/hdo/schema.ts";
import { ParseError, withContext } from "../shared/errors.ts";
import { cellToMinutes, eventsToWindows, type SwitchEvent } from "../shared/time.ts";
import { text, type Row, type Workbook } from "../shared/xlsx.ts";
import { tariffFromTouId } from "./tariffs.ts";
import type { DeviceTableFile, RawVariant } from "./types.ts";

const INDEX_SHEET = "TOU tabulky";
const DAY_HEADERS: Record<string, DayKey> = { Po: "mon", Ut: "tue", St: "wed", Čt: "thu", Pa: "fri", So: "sat", Ne: "sun", Sv: "hol" };

export function isTouTable(wb: Workbook): boolean {
  return wb.sheetNames.includes(INDEX_SHEET);
}

interface Block {
  sheet: string;
  register: string;
  name: string | null;
  week: Partial<Week>;
}

/**
 * PRE TOU tables for meters with an internal time switch (A and T families).
 * Index sheet: ID → name → tariff register. Tariff sheets: blocks per register;
 * the first block of a program is the tariff register, "Relé 1/2" blocks follow.
 */
export function parseTouTable(wb: Workbook): DeviceTableFile {
  const warnings: string[] = [];
  const tariffBlocks = wb.sheetNames.filter((s) => s !== INDEX_SHEET).flatMap((sheet) => readTariffBlocks(wb.rows(sheet), sheet));

  const variants: RawVariant[] = [];
  let device: "tou-a" | "tou-t" | null = null;

  for (const row of wb.rows(INDEX_SHEET).slice(1)) {
    const id = text(row[0]);
    if (!id) continue;
    const name = text(row[1]) || null;
    const register = text(row[2]);
    const tariff = tariffFromTouId(id);
    if (!tariff || !/^\d+$/.test(register)) throw new ParseError(`${INDEX_SHEET}: unexpected row ${JSON.stringify(row)}`);

    const rowDevice = id.startsWith("A") ? "tou-a" : "tou-t";
    if (device && device !== rowDevice) throw new ParseError(`${INDEX_SHEET}: mixes A and T meter IDs`);
    device = rowDevice;

    const matches = tariffBlocks.filter((b) => b.register === register);
    if (matches.length === 0) throw new ParseError(`${id}: no schedule block for register ${register}`);
    const weeks = new Set(matches.map((b) => JSON.stringify(b.week)));
    if (weeks.size > 1) throw new ParseError(`${id}: register ${register} has conflicting schedules in sheets ${matches.map((b) => b.sheet).join(", ")}`);
    const block = matches[0];

    if (block.name && name && block.name !== name) {
      warnings.push(`${id}: name in sheet "${block.name}" differs from index "${name}" – using the index`);
    }
    variants.push({ tariffs: [tariff], command: register, device: rowDevice, id, name, label: null, week: block.week as Week });
  }

  if (!device) throw new ParseError(`${INDEX_SHEET}: no programs`);
  return { kind: "tou", variants, warnings };
}

function readTariffBlocks(rows: Row[], sheet: string): Block[] {
  const blocks: Block[] = [];
  let header: string[] = rows[0].map(text);
  let current: Block | null = null;
  let afterRelayHeader = false;

  const finish = () => {
    if (!current) return;
    // Relay blocks are not used and PRE sometimes leaves their day marks empty, so only tariff blocks are checked.
    const missing = DAY_KEYS.filter((d) => !current!.week[d]);
    if (missing.length && !current.register.startsWith("relay:")) throw new ParseError(`${sheet} register ${current.register}: missing days ${missing.join(", ")}`);
    blocks.push(current);
    current = null;
  };

  for (const [i, row] of rows.slice(1).entries()) {
    const where = `${sheet} row ${i + 2}`;
    if (text(row[0]) === "ID TOU") { finish(); header = row.map(text); afterRelayHeader = false; continue; }

    const registerCol = header.indexOf("Registry");
    const label = text(row[registerCol]);
    // Relay sub-header: "Relé 1 | Zap | Vyp …". In some sheets (TD27) the "Relé" label is
    // replaced by a register number, so the Zap/Vyp labels are what identify the row.
    if (/^Relé/.test(label) || row.some((cell) => text(cell) === "Zap")) { finish(); afterRelayHeader = true; continue; }

    const dayKeys = header.flatMap((h, col) => (DAY_HEADERS[h] && text(row[col]) ? [DAY_HEADERS[h]] : []));

    if (dayKeys.length === 0 && /^\d+$/.test(label)) {
      finish();
      // Relay blocks are parsed (to validate them) but marked, so only tariff blocks are returned.
      current = afterRelayHeader
        ? { sheet, register: `relay:${label}`, name: null, week: {} }
        : { sheet, register: label, name: text(row[1]) || null, week: {} };
      afterRelayHeader = false;
      continue;
    }
    if (dayKeys.length === 0) continue;
    if (!current) throw new ParseError(`${where}: day row outside of a block`);

    const events: SwitchEvent[] = [];
    header.forEach((h, col) => {
      if ((h === "Zap" || h === "Vyp") && row[col] !== null) {
        events.push({ minutes: withContext(() => cellToMinutes(row[col])!, where), on: h === "Zap" });
      }
    });
    const windows = withContext(() => eventsToWindows(events), where);
    for (const day of dayKeys) {
      if (current.week[day]) throw new ParseError(`${where}: day "${day}" defined twice`);
      current.week[day] = windows;
    }
  }
  finish();
  return blocks.filter((b) => !b.register.startsWith("relay:"));
}
