"use client";

import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DrawerClose } from "../ui/drawer";

/** ✕ in the top-right corner of a bottom drawer. */
export function DrawerCloseButton({ label }: { label: string }) {
  return (
    <DrawerClose
      aria-label={label}
      className={cn(
        "absolute top-3 right-3 z-10",
        "inline-flex size-9 items-center justify-center rounded-full",
        "text-muted-foreground",
        "cursor-pointer outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <XIcon className={cn("size-5")} />
    </DrawerClose>
  );
}
