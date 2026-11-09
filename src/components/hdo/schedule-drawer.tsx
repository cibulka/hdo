"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { Selection } from "@/lib/hdo/schedule";
import type { DistributorData } from "@/lib/hdo/schema";
import { timeline, type Segment } from "@/lib/hdo/timeline";
import { cn } from "@/lib/utils";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "../ui/drawer";

const HOURS = 24;
/** Start of the current hour. Prague's UTC offsets are whole hours, so flooring in UTC is exact. */
const hourStart = (instant: number) => Math.floor(instant / 3_600_000) * 3_600_000;
const RATE_BG = { low: "bg-emerald-600", high: "bg-red-700" } as const;
const RATE_TEXT = { low: "text-emerald-700 dark:text-emerald-400", high: "text-red-700 dark:text-red-400" } as const;

/** Underlined "Show next 24 hours" button opening a bottom drawer with a low/high timeline. */
export function ScheduleDrawer({ data, selection, now }: { data: DistributorData; selection: Selection; now: number }) {
  const t = useTranslations("schedule");

  return (
    <Drawer>
      <DrawerTrigger
        className={cn(
          "mt-3",
          "text-sm text-white/85 underline underline-offset-4",
          "cursor-pointer outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white/70",
        )}
      >
        {t("button")}
      </DrawerTrigger>
      <DrawerContent className={cn("mx-auto w-full max-w-xl")}>
        <div className={cn("overflow-y-auto", "px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]")}>
          <DrawerHeader className={cn("px-0")}>
            <DrawerTitle>{t("title")}</DrawerTitle>
            <DrawerDescription>{t("description")}</DrawerDescription>
          </DrawerHeader>
          <Timeline segments={timeline(data, selection, hourStart(now), HOURS)} from={hourStart(now)} now={now} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function Timeline({ segments, from, now }: { segments: Segment[]; from: number; now: number }) {
  const t = useTranslations("schedule");
  const format = useFormatter();
  const to = from + HOURS * 3_600_000;
  const position = (instant: number) => `${((instant - from) / (to - from)) * 100}%`;
  const time = (instant: number) => format.dateTime(instant, { hour: "2-digit", minute: "2-digit" });
  // A label every 3 hours, starting at the bar's first (whole) hour.
  const ticks = Array.from({ length: HOURS / 3 }, (_, i) => from + i * 3 * 3_600_000);

  return (
    <div className={cn("flex flex-col gap-6")}>
      <div>
        {/* Border drawn outside the bar (no gap): an inset one darkens the green edge but not the red, so red looks taller. */}
        <div className={cn("relative h-10 overflow-hidden", "rounded-lg outline-1 outline-black/20 dark:outline-white/25")}>
          {segments.map((s) => (
            <div
              key={s.start}
              className={cn("absolute inset-y-0", RATE_BG[s.rate])}
              style={{ left: position(s.start), width: position(from + (s.end - s.start)) }}
            />
          ))}
          {/* Already passed part of the current hour, dimmed. */}
          <div className={cn("absolute inset-y-0 left-0", "bg-background/55")} style={{ width: position(now) }} />
          {/* Now marker. */}
          <div className={cn("absolute inset-y-0 w-0.5 -translate-x-1/2", "bg-foreground")} style={{ left: position(now) }} />
        </div>
        <div className={cn("relative h-6", "text-xs text-muted-foreground tabular-nums")}>
          {ticks.map((tick, i) => (
            <span
              key={tick}
              className={cn("absolute top-0 flex flex-col", i === 0 ? "items-start" : "-translate-x-1/2 items-center")}
              style={{ left: position(tick) }}
            >
              <span className={cn("h-1.5 w-px", "bg-muted-foreground/60")} />
              {format.dateTime(tick, { hour: "2-digit" })}
            </span>
          ))}
        </div>
      </div>

      {/* The same runs with their real start and end times (the first/last run may extend beyond the bar). */}
      <table className={cn("mx-auto", "text-sm tabular-nums")}>
        <tbody className={cn("divide-y divide-border")}>
          {segments.map((s) => (
            <tr key={s.start}>
              <td className={cn("py-2 pr-3")}>
                <span className={cn("block size-3 rounded-full", RATE_BG[s.rate])} />
              </td>
              <td className={cn("py-2 pr-6", "whitespace-nowrap")}>
                {time(s.runStart)} – {time(s.runEnd)}
              </td>
              <td className={cn("py-2", "font-medium", RATE_TEXT[s.rate])}>{t(s.rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
