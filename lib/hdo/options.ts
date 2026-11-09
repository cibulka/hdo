import { totalMinutes } from "./minutes.ts";
import { findVariant, type Selection } from "./schedule.ts";
import { DAY_KEYS, type DeviceType, type DistributorId, type Period, type Variant } from "./schema.ts";

/** What is stored in localStorage: possibly incomplete while the user is still choosing. */
export interface DraftSelection {
  distributor: DistributorId;
  tariff?: string;
  command?: string;
  device?: DeviceType;
  variantId?: string;
}

export interface VariantOption {
  /** Stable key "command|device|id". */
  key: string;
  command: string;
  device: DeviceType;
  id: string;
  /** How the program is printed on the device / in PRE's tables. */
  display: string;
  /** Distinct daily NT hours, e.g. [20] or [0, 12, 24, 22]. */
  hours: number[];
  hasIssues: boolean;
}

export interface ProgramGroup {
  command: string;
  label: string | null;
  options: VariantOption[];
}

export function variantDisplay(variant: Variant): string {
  switch (variant.device) {
    case "hdo":
      return variant.name ? `${variant.id} / ${variant.name}` : variant.id;
    case "amm":
      return variant.name ?? variant.id;
    default:
      return variant.id;
  }
}

export function programGroups(period: Period, tariff: string): ProgramGroup[] {
  const found = period.tariffs.find((t) => t.code === tariff);
  if (!found) return [];
  return found.programs.map((program) => ({
    command: program.command,
    label: program.label,
    options: program.variants.map((variant) => ({
      key: `${program.command}|${variant.device}|${variant.id}`,
      command: program.command,
      device: variant.device,
      id: variant.id,
      display: variantDisplay(variant),
      hours: [...new Set(DAY_KEYS.map((d) => totalMinutes(variant.week[d]) / 60))],
      hasIssues: variant.issues.length > 0,
    })),
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

/** Choosing a tariff: keep nothing below it, unless there is exactly one option, which is picked. */
export function draftForTariff(period: Period, distributor: DistributorId, tariff: string): DraftSelection {
  const options = programGroups(period, tariff).flatMap((g) => g.options);
  if (options.length === 1) {
    const [only] = options;
    return { distributor, tariff, command: only.command, device: only.device, variantId: only.id };
  }
  return { distributor, tariff };
}
