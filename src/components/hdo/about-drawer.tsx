"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Drawer, DrawerClose, DrawerContent, DrawerTitle, DrawerTrigger } from "../ui/drawer";

/** "What is this?" button opening the README (user part, rendered at build time) in a bottom drawer. */
export function AboutDrawer({ html, triggerClassName }: { html: string; triggerClassName?: string }) {
  const t = useTranslations("about");

  return (
    <Drawer>
      <DrawerTrigger className={cn("cursor-pointer underline underline-offset-2", triggerClassName)}>{t("button")}</DrawerTrigger>
      <DrawerContent className={cn("mx-auto w-full max-w-xl", "data-[vaul-drawer-direction=bottom]:max-h-[90dvh]")}>
        <DrawerTitle className={cn("sr-only")}>{t("title")}</DrawerTitle>
        <div className={cn("overflow-y-auto", "px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]")}>
          <article
            lang="en"
            className={cn("mx-auto max-w-lg", "pt-2", "prose prose-sm prose-neutral", "prose-table:text-xs prose-th:py-1 prose-td:py-1", "prose-code:before:content-none prose-code:after:content-none")}
            // Our own README, rendered with marked at build time.
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <DrawerClose className={cn("mx-auto mt-6 block w-full max-w-lg", "rounded-lg border py-2", "text-sm font-medium", "cursor-pointer hover:bg-muted")}>
            {t("close")}
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
