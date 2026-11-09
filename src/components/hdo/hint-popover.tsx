"use client";

import { InfoIcon } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

/** ⓘ button with a popover: opens on tap/click, and on hover when using a mouse. */
export function HintPopover({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hover = (next: boolean) => (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (next) setOpen(true);
    else closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={label}
        onPointerEnter={hover(true)}
        onPointerLeave={hover(false)}
        className={cn(
          "inline-flex size-7 items-center justify-center",
          "rounded-full",
          "text-white/70",
          "cursor-pointer outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white/70",
          "transition-colors",
          className,
        )}
      >
        <InfoIcon className={cn("size-5")} />
      </PopoverTrigger>
      <PopoverContent
        collisionPadding={16}
        onPointerEnter={hover(true)}
        onPointerLeave={hover(false)}
        className={cn("w-[min(20rem,calc(100vw-2rem))]", "text-sm leading-relaxed")}
      >
        <p className={cn("font-semibold")}>{label}</p>
        <p>{children}</p>
      </PopoverContent>
    </Popover>
  );
}
