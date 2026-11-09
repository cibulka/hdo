import { totalMinutes } from "./minutes.ts";
import { findVariant, type Selection } from "./schedule.ts";
import { DAY_KEYS, type DeviceType, type DistributorId, type Period, type Program, type Variant } from "./schema.ts";

/** What is stored in localStorage: possibly incomplete while the user is still choosing. */
export interface DraftSelection {
  distributor: DistributorId;
  tariff?: string;
  command?: string;
  device?: DeviceType;
  variantId?: string;
}

/**
 * Shown until the user picks their own (not saved). D25d is the most widespread two-rate household
 * tariff and the HDO receiver the most common device; PRE publishes no usage per program, so the
 * program is simply the first one listed.
 */
export const DEFAULT_SELECTION: DraftSelection = {
  distributor: "pre",
  tariff: "D25d",
  command: "490",
  device: "hdo",
  variantId: "490",
};

export interface ProgramOption {
  command: string;
  /** HDO receiver address (e.g. "A4B6DP9"), the label most people can find on their device. */
  address: string | null;
  /** Printed labels of all device variants (HDO address, TOU/AMM names), for display and search. */
  aliases: string[];
  /** Distinct daily NT hours across variants. */
  hours: number[];
}

export interface DeviceOption {
  /** Stable key "device|id". */
  key: string;
  device: DeviceType;
  id: string;
  /** How the program is printed on the device / in the distributor's tables. */
  printed: string;
  hours: number[];
  hasIssues: boolean;
  /** More than one variant of this device type exists in the program (needs the ID to tell apart). */
  ambiguous: boolean;
}

export function variantPrinted(variant: Variant): string {
  switch (variant.device) {
    case "hdo":
      return variant.name ? `${variant.id} / ${variant.name}` : variant.id;
    case "amm":
      return variant.name ?? variant.id;
    default:
      return variant.name ? `${variant.id} · ${variant.name}` : variant.id;
  }
}

function dailyHours(variants: Variant[]): number[] {
  const hours = variants.flatMap((v) => DAY_KEYS.map((d) => totalMinutes(v.week[d]) / 60));
  return [...new Set(hours)];
}

function findProgram(period: Period, tariff: string | undefined, command: string | undefined): Program | undefined {
  return period.tariffs.find((t) => t.code === tariff)?.programs.find((p) => p.command === command);
}

export function programOptions(period: Period, tariff: string): ProgramOption[] {
  const found = period.tariffs.find((t) => t.code === tariff);
  return (found?.programs ?? []).map((program) => ({
    command: program.command,
    address: program.variants.find((v) => v.device === "hdo")?.name ?? null,
    aliases: [...new Set(program.variants.flatMap((v) => [v.name, v.device === "hdo" ? null : v.id]).filter((a): a is string => !!a))],
    hours: dailyHours(program.variants),
  }));
}

export function deviceOptions(period: Period, tariff: string, command: string): DeviceOption[] {
  const variants = findProgram(period, tariff, command)?.variants ?? [];
  return variants.map((variant) => ({
    key: `${variant.device}|${variant.id}`,
    device: variant.device,
    id: variant.id,
    printed: variantPrinted(variant),
    hours: dailyHours([variant]),
    hasIssues: variant.issues.length > 0,
    ambiguous: variants.filter((v) => v.device === variant.device).length > 1,
  }));
}

/** A complete, existing selection, or null. */
export function completeSelection(period: Period, draft: DraftSelection | null): Selection | null {
  if (!draft?.tariff || !draft.command || !draft.device || !draft.variantId) return null;
  const selection: Selection = {
    distributor: draft.distributor,
    tariff: draft.tariff,
    command: draft.command,
    device: draft.device,
    variantId: draft.variantId,
  };
  return findVariant(period, selection) ? selection : null;
}

/**
 * Fills in the device for a chosen program: the only variant if there is one, otherwise the
 * variant of the previously chosen device type if that is unambiguous; else leaves it open.
 */
function withDevice(period: Period, draft: DraftSelection, previousDevice: DeviceType | undefined): DraftSelection {
  const options = deviceOptions(period, draft.tariff!, draft.command!);
  const sameDevice = options.filter((o) => o.device === previousDevice);
  const pick = options.length === 1 ? options[0] : sameDevice.length === 1 ? sameDevice[0] : null;
  return pick ? { ...draft, device: pick.device, variantId: pick.id } : draft;
}

/** Choosing a tariff: auto-picks the program if there is only one. */
export function draftForTariff(period: Period, previous: DraftSelection, tariff: string): DraftSelection {
  const programs = programOptions(period, tariff);
  const draft: DraftSelection = { distributor: previous.distributor, tariff };
  if (programs.length !== 1) return draft;
  return withDevice(period, { ...draft, command: programs[0].command }, previous.device);
}

/** Choosing a program: keeps the device type when possible. */
export function draftForProgram(period: Period, previous: DraftSelection, command: string): DraftSelection {
  return withDevice(period, { distributor: previous.distributor, tariff: previous.tariff, command }, previous.device);
}

export function draftForDevice(previous: DraftSelection, option: DeviceOption): DraftSelection {
  return { ...previous, device: option.device, variantId: option.id };
}
