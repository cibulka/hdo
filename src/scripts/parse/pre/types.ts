import type { DeviceType, Week } from "#/lib/hdo/schema.ts";

/** One device variant of one program, before grouping into tariffs/programs. */
export interface RawVariant {
  tariffs: string[];
  /** NT command / register number shared across device variants. */
  command: string;
  device: DeviceType;
  id: string;
  name: string | null;
  label: string | null;
  week: Week;
}

export interface HdoProgramFile {
  kind: "hdo";
  validFrom: string;
  validTo: string | null;
  variants: RawVariant[];
  skipped: string[];
  warnings: string[];
}

export interface DeviceTableFile {
  kind: "tou" | "amm";
  variants: RawVariant[];
  warnings: string[];
}

export interface NoteFile {
  kind: "note";
  note: string;
}

export type ParsedFile = HdoProgramFile | DeviceTableFile | NoteFile;
