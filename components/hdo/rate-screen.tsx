"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useStored } from "@/hooks/use-stored";
import { useNow } from "@/hooks/use-now";
import { DATA, DISTRIBUTORS } from "@/lib/hdo/data";
import { completeSelection, type DraftSelection } from "@/lib/hdo/options";
import { isoDate, pragueDate } from "@/lib/hdo/prague";
import { getRateState, isStale, periodFor, type RateState } from "@/lib/hdo/schedule";
import type { DistributorData } from "@/lib/hdo/schema";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import { Countdown } from "./countdown";
import { LanguageSwitch } from "./language-switch";
import { RateBackground } from "./rate-background";
import { SelectionSentence } from "./selection-sentence";

export const SELECTION_KEY = "hdo.selection.v1";

function parseDraft(raw: string | null | undefined): DraftSelection {
  try {
    const value = raw ? JSON.parse(raw) : null;
    if (value && typeof value === "object" && typeof value.distributor === "string" && value.distributor in DATA) {
      return value as DraftSelection;
    }
  } catch {
    // corrupted storage → start over
  }
  return { distributor: "pre" };
}

export function RateScreen({ onLocaleChange }: { onLocaleChange: (locale: Locale) => void }) {
  const now = useNow();
  const [storedDraft, setStoredDraft] = useStored(SELECTION_KEY);
  const draft = parseDraft(storedDraft);
  const data = DATA[draft.distributor]!;
  const period = now !== null ? periodFor(data, pragueDate(now)) : data.periods[0];
  const selection = completeSelection(period, draft);
  const state = now !== null && selection ? getRateState(data, selection, now) : null;
  const mode = state?.kind === "ok" ? state.rate : "idle";

  return (
    <>
      <RateBackground mode={mode} />
      <main className={cn("relative flex min-h-dvh flex-col", "px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]", "text-white")}>
        <header className={cn("flex justify-end")}>
          <LanguageSwitch onChange={onLocaleChange} />
        </header>

        <div className={cn("mx-auto flex w-full max-w-xl flex-col items-center gap-3", "mt-4", "text-center")}>
          <SelectionSentence period={period} draft={draft} onChange={(next) => setStoredDraft(JSON.stringify(next))} />
          {now !== null && isStale(data, now) && <StaleBanner data={data} />}
        </div>

        <section className={cn("flex flex-1 flex-col items-center justify-center", "py-8", "text-center")}>
          <Status state={state} now={now} />
        </section>

        <footer className={cn("text-center")}>
          <ValidityNote data={data} />
        </footer>
      </main>
    </>
  );
}

/** The rate, or the same layout with placeholders while nothing is selected (no layout shift). */
function Status({ state, now }: { state: RateState | null; now: number | null }) {
  const t = useTranslations();
  const format = useFormatter();

  if (state?.kind === "not-found") return <Message>{t("notFound")}</Message>;
  if (state?.kind === "data-issue") {
    return (
      <Message title={t("issue.title")}>
        <p>{t("issue.body")}</p>
        <ul className={cn("mt-3", "text-sm", "opacity-70")}>
          {state.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      </Message>
    );
  }

  const rate = state?.rate ?? null;
  const until = state?.until ?? null;
  const sameDay = until !== null && now !== null && isoDate(pragueDate(until)) === isoDate(pragueDate(now));
  const time = until !== null ? format.dateTime(until, { hour: "2-digit", minute: "2-digit" }) : null;
  const untilText =
    until === null
      ? state
        ? t("status.noChange")
        : "\u00a0"
      : sameDay
        ? t("status.until", { time: time! })
        : t("status.untilDay", { day: format.dateTime(until, { weekday: "short" }), time: time! });

  return (
    <div key={rate ?? "none"} className={cn("flex flex-col items-center gap-2", rate && "animate-in fade-in slide-in-from-bottom-6 zoom-in-95 duration-700")}>
      <p className={cn("text-sm font-medium uppercase tracking-[0.3em]", "opacity-80")}>{t("status.now")}</p>
      <h1
        className={cn(
          "text-[clamp(3.5rem,19vw,10rem)] leading-none font-black tracking-tight",
          "drop-shadow-[0_4px_24px_rgb(0_0_0/0.25)]",
          !rate && "opacity-30",
        )}
      >
        {rate ? t(`rate.${rate}`) : "—"}
      </h1>
      <p className={cn("mt-4 text-sm uppercase tracking-[0.2em]", "opacity-80")}>{t("status.remaining")}</p>
      {until !== null && now !== null ? (
        <Countdown ms={until - now} className={cn("text-[clamp(2.5rem,12vw,5rem)] leading-none")} />
      ) : (
        <span className={cn("text-[clamp(2.5rem,12vw,5rem)] leading-none font-semibold", "opacity-30")}>
          –:––<span className={cn("text-[0.55em]")}>:––</span>
        </span>
      )}
      <p className={cn("mt-1 text-base", "opacity-85")}>{untilText}</p>
    </div>
  );
}

function Message({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex max-w-md flex-col gap-2", "rounded-2xl bg-black/25 p-6", "text-left backdrop-blur-sm")}>
      {title && <h1 className={cn("text-2xl font-bold")}>{title}</h1>}
      <div className={cn("text-base", "text-white/90")}>{children}</div>
    </div>
  );
}

function ValidityNote({ data }: { data: DistributorData }) {
  const t = useTranslations("validity");
  const format = useFormatter();
  const validTo = data.periods.at(-1)?.validTo;
  if (!validTo) return null;
  const name = DISTRIBUTORS.find((d) => d.id === data.distributor)?.name ?? data.distributor;
  return (
    <p className={cn("text-xs", "text-white/60")}>
      {t("validUntil", { distributor: name, date: format.dateTime(new Date(`${validTo}T12:00:00Z`), { dateStyle: "medium" }) })}
    </p>
  );
}

function StaleBanner({ data }: { data: DistributorData }) {
  const t = useTranslations("validity");
  const format = useFormatter();
  const validTo = data.periods.at(-1)!.validTo!;
  return (
    <p role="alert" className={cn("max-w-md", "rounded-xl bg-amber-300 px-3 py-2", "text-sm font-medium text-amber-950")}>
      {t("stale", { date: format.dateTime(new Date(`${validTo}T12:00:00Z`), { dateStyle: "medium" }) })}
    </p>
  );
}
