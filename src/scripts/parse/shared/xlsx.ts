import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";

export type Cell = string | number | boolean | null;
export type Row = Cell[];

export interface Workbook {
  file: string;
  sheetNames: string[];
  /** Rows with empty cells as null, column positions preserved, raw (unformatted) values. */
  rows(sheet: string): Row[];
}

export function readWorkbook(path: string): Workbook {
  const wb = XLSX.read(readFileSync(path));
  return {
    file: path,
    sheetNames: wb.SheetNames,
    rows(sheet) {
      const ws = wb.Sheets[sheet];
      if (!ws) throw new Error(`sheet "${sheet}" not found in ${path}`);
      return XLSX.utils
        .sheet_to_json<Row>(ws, { header: 1, raw: true, defval: null, blankrows: false })
        .map((row) => row.map((cell) => (cell === "" ? null : cell)));
    },
  };
}

/** All .xls/.xlsx files in a directory, sorted by name. */
export function spreadsheetsIn(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => /\.xlsx?$/i.test(name) && !name.startsWith("~$"))
    .sort()
    .map((name) => join(dir, name));
}

export function text(cell: Cell | undefined): string {
  return cell === null || cell === undefined ? "" : String(cell).replace(/\s+/g, " ").trim();
}
