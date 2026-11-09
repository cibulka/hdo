"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");

/** Remaining time as h:mm:ss (seconds smaller), with a day prefix beyond 24 h. */
export function Countdown({ ms, className }: { ms: number; className?: string }) {
  const t = useTranslations("status");
  const total = Math.max(0, Math.ceil(ms / 1000));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return (
    <span className={cn("inline-flex items-baseline", "font-semibold tabular-nums tracking-tight", className)}>
      {days > 0 && <span className={cn("mr-[0.3em]")}>{t("days", { count: days })}</span>}
      <span>
        {hours}:{pad(minutes)}
      </span>
      <span className={cn("text-[0.55em]", "opacity-75")}>:{pad(seconds)}</span>
    </span>
  );
}
