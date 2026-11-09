"use client";

import { useTranslations } from "next-intl";
import { DISTRIBUTORS } from "@/lib/hdo/data";
import { draftForTariff, programGroups, type DraftSelection } from "@/lib/hdo/options";
import type { Period } from "@/lib/hdo/schema";
import { cn } from "@/lib/utils";
import { TokenCombobox, type TokenGroup } from "./token-combobox";

interface SelectionSentenceProps {
  period: Period;
  draft: DraftSelection;
  onChange: (draft: DraftSelection) => void;
  className?: string;
}

/** "Distribuce PRE, sazba D57d, program D57 573 574 575" – every value is a combobox. */
export function SelectionSentence({ period, draft, onChange, className }: SelectionSentenceProps) {
  const t = useTranslations("selection");
  const tDevice = useTranslations("device");

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

  const groups = draft.tariff ? programGroups(period, draft.tariff) : [];
  const options = groups.flatMap((g) => g.options);
  const programTokenGroups: TokenGroup[] = groups.map((group) => ({
    heading: t("program", { command: group.command }),
    description: group.label ?? undefined,
    items: group.options.map((option) => ({
      value: option.key,
      label: option.display,
      description: [
        tDevice(option.device),
        option.display.startsWith(option.id) ? null : `ID ${option.id}`,
        t("hours", { hours: option.hours.map(formatHours).join("/") }),
      ]
        .filter(Boolean)
        .join(" · "),
      keywords: [option.id, option.command],
      note: option.hasIssues ? `${tDevice(option.device)} · ID ${option.id} · ${t("dataIssue")}` : undefined,
      warning: option.hasIssues,
    })),
  }));

  const selectedKey = draft.command && draft.device && draft.variantId ? `${draft.command}|${draft.device}|${draft.variantId}` : undefined;
  const selectedOption = options.find((o) => o.key === selectedKey);
  const distributorName = DISTRIBUTORS.find((d) => d.id === draft.distributor)?.name ?? draft.distributor;

  return (
    <p className={cn("text-lg leading-relaxed sm:text-xl", "text-white/85", className)}>
      {t.rich("sentence", {
        distributor: () => (
          <TokenCombobox
            text={distributorName}
            value={draft.distributor}
            groups={distributorGroups}
            onSelect={() => undefined}
            searchable={false}
            searchPlaceholder={t("search")}
            emptyText={t("empty")}
          />
        ),
        tariff: () => (
          <TokenCombobox
            text={draft.tariff ?? t("chooseTariff")}
            isPlaceholder={!draft.tariff}
            value={draft.tariff}
            groups={tariffGroups}
            onSelect={(tariff) => onChange(draftForTariff(period, draft.distributor, tariff))}
            searchPlaceholder={t("search")}
            emptyText={t("empty")}
          />
        ),
        program: () => (
          <TokenCombobox
            text={selectedOption?.display ?? t("chooseProgram")}
            isPlaceholder={!selectedOption}
            interactive={!!draft.tariff && options.length > 1}
            value={selectedKey}
            groups={programTokenGroups}
            onSelect={(key) => {
              const option = options.find((o) => o.key === key);
              if (option) onChange({ ...draft, command: option.command, device: option.device, variantId: option.id });
            }}
            searchPlaceholder={t("search")}
            emptyText={t("empty")}
          />
        ),
      })}
    </p>
  );
}

function formatHours(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}
