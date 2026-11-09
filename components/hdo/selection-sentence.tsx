"use client";

import { useTranslations } from "next-intl";
import { DISTRIBUTORS } from "@/lib/hdo/data";
import {
  deviceOptions,
  draftForDevice,
  draftForProgram,
  draftForTariff,
  programOptions,
  type DraftSelection,
} from "@/lib/hdo/options";
import type { Period } from "@/lib/hdo/schema";
import { cn } from "@/lib/utils";
import { HintPopover } from "./hint-popover";
import { TokenCombobox, type TokenGroup } from "./token-combobox";

interface SelectionSentenceProps {
  period: Period;
  draft: DraftSelection;
  onChange: (draft: DraftSelection) => void;
  className?: string;
}

/**
 * "Jsem v síti PRE se sazbou D57d. Mám program 573 a chytrý elektroměr."
 * Every value is a combobox; a value with only one possible option is plain text.
 */
export function SelectionSentence({ period, draft, onChange, className }: SelectionSentenceProps) {
  const t = useTranslations("selection");
  const tDevice = useTranslations("device");
  const tDeviceSentence = useTranslations("deviceSentence");
  const hours = (values: number[]) => t("hours", { hours: values.map(formatHours).join("/") });
  const common = { searchPlaceholder: t("search"), emptyText: t("empty") };

  const distributorGroups: TokenGroup[] = [
    {
      items: DISTRIBUTORS.map((d) => ({
        value: d.id,
        label: d.name,
        disabled: d.id !== "pre",
        note: d.id !== "pre" ? t("unsupported") : undefined,
      })),
    },
  ];

  const tariffGroups: TokenGroup[] = [{ items: period.tariffs.map((tariff) => ({ value: tariff.code, label: tariff.code })) }];

  const programs = draft.tariff ? programOptions(period, draft.tariff) : [];
  const programGroups: TokenGroup[] = [
    {
      items: programs.map((program) => ({
        value: program.command,
        label: t("program", { command: program.command }),
        description: [hours(program.hours), program.address].filter(Boolean).join(" · "),
        keywords: program.aliases,
      })),
    },
  ];

  const devices = draft.tariff && draft.command ? deviceOptions(period, draft.tariff, draft.command) : [];
  const selectedDeviceKey = draft.device && draft.variantId ? `${draft.device}|${draft.variantId}` : undefined;
  const selectedDevice = devices.find((d) => d.key === selectedDeviceKey);
  const deviceGroups: TokenGroup[] = [
    {
      items: devices.map((option) => ({
        value: option.key,
        label: option.ambiguous ? `${tDevice(option.device)} · ID ${option.id}` : tDevice(option.device),
        description: `${t("devicePrinted", { printed: option.printed })} · ${hours(option.hours)}`,
        keywords: [option.id, option.printed],
        note: option.hasIssues ? `${t("devicePrinted", { printed: option.printed })} · ${t("dataIssue")}` : undefined,
        warning: option.hasIssues,
      })),
    },
  ];

  const distributorName = DISTRIBUTORS.find((d) => d.id === draft.distributor)?.name ?? draft.distributor;

  return (
    <p className={cn("text-xl leading-relaxed text-balance sm:text-2xl", "text-white/85", className)}>
      {t.rich("sentence", {
        distributor: () => (
          <TokenCombobox
            {...common}
            text={distributorName}
            value={draft.distributor}
            groups={distributorGroups}
            onSelect={() => undefined}
            searchable={false}
          />
        ),
        tariff: () => (
          <TokenCombobox
            {...common}
            text={draft.tariff ?? t("choose")}
            isPlaceholder={!draft.tariff}
            value={draft.tariff}
            groups={tariffGroups}
            onSelect={(tariff) => onChange(draftForTariff(period, draft, tariff))}
          />
        ),
        program: () => (
          <TokenCombobox
            {...common}
            text={draft.command ?? t("choose")}
            isPlaceholder={!draft.command}
            interactive={programs.length > 1}
            value={draft.command}
            groups={programGroups}
            onSelect={(command) => onChange(draftForProgram(period, draft, command))}
            searchable={programs.length > 6}
          />
        ),
        device: () => (
          <TokenCombobox
            {...common}
            text={selectedDevice ? tDeviceSentence(selectedDevice.device) : t("choose")}
            isPlaceholder={!selectedDevice}
            interactive={devices.length > 1}
            value={selectedDeviceKey}
            groups={deviceGroups}
            onSelect={(key) => {
              const option = devices.find((d) => d.key === key);
              if (option) onChange(draftForDevice(draft, option));
            }}
            searchable={false}
          />
        ),
      })}
      <HintPopover label={t("hintLabel")} className={cn("ml-1.5 align-middle")}>
        {t("hint")}
      </HintPopover>
    </p>
  );
}

function formatHours(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}
