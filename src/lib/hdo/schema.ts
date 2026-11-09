// Shape of output/<distributor>.json. Shared by the parsers (scripts/parse) and the app.

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun", "hol"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

/** Low-rate (NT) window in Prague local time: [start, end) in minutes from midnight, end ≤ 1440. */
export type Window = [start: number, end: number];
export type Week = Record<DayKey, Window[]>;

export type DistributorId = "pre" | "egd" | "cez";

/** Device that switches the tariff. PRE-specific set; other distributors may add their own. */
export type DeviceType = "hdo" | "tou-a" | "tou-t" | "amm";

export interface Variant {
  device: DeviceType;
  /** Identifier as printed by the distributor: "573", "AD57_001", "1052". */
  id: string;
  /** Second printed label, e.g. HDO address "A4B6DP9" or TOU name "D57 573 574 575". */
  name: string | null;
  week: Week;
  /**
   * Problems found in the distributor's data for this variant (e.g. the same printed name
   * maps to two different schedules). Non-empty → the app shows an error instead of a status.
   */
  issues: string[];
}

export interface Program {
  /** NT command / tariff register shared by all device variants, e.g. "573". */
  command: string;
  /** Distributor's description, if any. */
  label: string | null;
  variants: Variant[];
}

export interface Tariff {
  /** "D57d", "C25d", or a named product such as "Sdílení 8". */
  code: string;
  programs: Program[];
}

export interface Period {
  /** "YYYY-MM-DD", inclusive. */
  validFrom: string;
  /** "YYYY-MM-DD", inclusive; null = until further notice. */
  validTo: string | null;
  tariffs: Tariff[];
}

export interface DistributorData {
  schemaVersion: 1;
  distributor: DistributorId;
  /** Sorted by validFrom. */
  periods: Period[];
  /** Input file names the data was generated from. */
  sources: string[];
}
