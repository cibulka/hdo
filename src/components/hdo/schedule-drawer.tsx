"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { Selection } from "@/lib/hdo/schedule";
import type { DistributorData } from "@/lib/hdo/schema";
import { hourTicks, timeline, type Segment } from "@/lib/hdo/timeline";
import { cn } from "@/lib/utils";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "../ui/drawer";
import { DrawerCloseButton } from "./drawer-close-button";

const HOURS = 24;
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
        <DrawerCloseButton label={t("close")} />
        <div className={cn("overflow-y-auto", "px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]")}>
          <DrawerHeader className={cn("px-0")}>
            <DrawerTitle>{t("title")}</DrawerTitle>
            <DrawerDescription>{t("description")}</DrawerDescription>
          </DrawerHeader>
          <Timeline segments={timeline(data, selection, now, HOURS)} from={now} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function Timeline({ segments, from }: { segments: Segment[]; from: number }) {
  const t = useTranslations("schedule");
  const format = useFormatter();
  const to = from + HOURS * 3_600_000;
  const position = (instant: number) => `${((instant - from) / (to - from)) * 100}%`;
  const time = (instant: number) => format.dateTime(instant, { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={cn("flex flex-col gap-6")}>
      {/* Bar: one coloured block per segment, hour ticks below. */}
      <div>
        <div className={cn("relative flex h-10 overflow-hidden", "rounded-lg")}>
          {segments.map((s) => (
            <div key={s.start} className={cn("h-full", RATE_BG[s.rate])} style={{ width: position(from + (s.end - s.start)) }} />
          ))}
        </div>
        <div className={cn("relative h-5", "mt-1", "text-xs text-muted-foreground tabular-nums")}>
          {/* The bar starts now; label it with the current hour like the other ticks. */}
          <span className={cn("absolute left-0")}>{format.dateTime(from, { hour: "2-digit" })}</span>
          {hourTicks(from, to)
            // keep labels clear of the first label on the left and of the right edge
            .filter((tick) => (tick - from) / (to - from) > 0.14 && (tick - from) / (to - from) < 0.95)
            .map((tick) => (
              <span key={tick} className={cn("absolute -translate-x-1/2")} style={{ left: position(tick) }}>
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
