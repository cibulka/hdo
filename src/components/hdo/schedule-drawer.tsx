"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { Selection } from "@/lib/hdo/schedule";
import type { DistributorData } from "@/lib/hdo/schema";
import { hourTicks, timeline, type Segment } from "@/lib/hdo/timeline";
import { cn } from "@/lib/utils";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "../ui/drawer";

const HOURS = 24;
const RATE_COLORS = { low: "bg-emerald-600", high: "bg-red-700" } as const;

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
        <div className={cn("mx-auto w-full max-w-lg", "px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]")}>
          <DrawerHeader className={cn("px-0")}>
            <DrawerTitle>{t("title")}</DrawerTitle>
            <DrawerDescription>{t("description")}</DrawerDescription>
          </DrawerHeader>
          <Timeline segments={timeline(data, selection, now, HOURS)} from={now} />
          <DrawerClose className={cn("mt-6 w-full", "rounded-lg border py-2", "text-sm font-medium", "cursor-pointer hover:bg-muted")}>
            {t("close")}
          </DrawerClose>
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
            <div key={s.start} className={cn("h-full", RATE_COLORS[s.rate])} style={{ width: position(from + (s.end - s.start)) }} />
          ))}
        </div>
        <div className={cn("relative h-5", "mt-1", "text-xs text-muted-foreground tabular-nums")}>
          <span className={cn("absolute left-0", "font-medium text-foreground")}>{t("now")}</span>
          {hourTicks(from, to)
            // keep labels clear of "now" on the left and of the right edge
            .filter((tick) => (tick - from) / (to - from) > 0.14 && (tick - from) / (to - from) < 0.95)
            .map((tick) => (
              <span key={tick} className={cn("absolute -translate-x-1/2")} style={{ left: position(tick) }}>
                {format.dateTime(tick, { hour: "2-digit" })}
              </span>
            ))}
        </div>
      </div>

      {/* List of the same segments with exact times. */}
      <ol className={cn("flex flex-col gap-1", "text-sm tabular-nums")}>
        {segments.map((s) => (
          <li key={s.start} className={cn("flex items-center gap-3")}>
            <span className={cn("size-3 shrink-0 rounded-full", RATE_COLORS[s.rate])} />
            <span className={cn("w-32")}>
              {time(s.start)} – {time(s.end)}
            </span>
            <span className={cn(s.rate === "low" ? "text-emerald-700" : "text-red-700", "font-medium")}>{t(s.rate)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
