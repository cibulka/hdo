"use client";

import { InfoIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useHoverPopover } from "@/hooks/use-hover-popover";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

/** ⓘ button with a popover: opens on tap/click, and on hover when using a mouse. */
export function HintPopover({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  const { open, setOpen, hoverProps } = useHoverPopover();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={label}
        {...hoverProps}
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
        {...hoverProps}
        className={cn("w-[min(20rem,calc(100vw-2rem))]", "text-sm leading-relaxed")}
      >
        <p className={cn("font-semibold")}>{label}</p>
        <p>{children}</p>
      </PopoverContent>
    </Popover>
  );
}
