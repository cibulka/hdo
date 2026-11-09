"use client";

import { DownloadIcon, ShareIcon, SquarePlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useInstall } from "@/hooks/use-install";
import { cn } from "@/lib/utils";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "../ui/drawer";

/**
 * "Install" in the footer chip. Chromium: opens the native install dialog. iOS: a drawer with the
 * manual steps (iOS has no install API). Renders nothing when installed already or not possible.
 */
export function InstallButton({ className }: { className?: string }) {
  const t = useTranslations("install");
  const { kind, install } = useInstall();

  if (!kind) return null;

  const label = (
    <>
      <DownloadIcon aria-hidden className={cn("size-3.5 shrink-0")} />
      {t("button")}
    </>
  );
  const triggerClass = cn("inline-flex items-center gap-1", "cursor-pointer underline underline-offset-2", className);

  if (kind === "prompt") {
    return (
      <button type="button" onClick={install} className={triggerClass}>
        {label}
      </button>
    );
  }

  return (
    <Drawer>
      <DrawerTrigger className={triggerClass}>{label}</DrawerTrigger>
      <DrawerContent className={cn("mx-auto w-full max-w-xl")}>
        <div className={cn("px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]")}>
          <DrawerHeader className={cn("px-0")}>
            <DrawerTitle>{t("title")}</DrawerTitle>
            <DrawerDescription>{t("description")}</DrawerDescription>
          </DrawerHeader>
          <ol className={cn("mx-auto flex w-fit flex-col gap-3", "pb-2", "text-base")}>
            {(["step1", "step2"] as const).map((step, i) => (
              <li key={step} className={cn("flex items-center gap-3")}>
                <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", "bg-muted", "text-sm font-semibold")}>
                  {i + 1}
                </span>
                <span>
                  {t.rich(step, {
                    b: (chunks) => <strong className={cn("font-semibold")}>{chunks}</strong>,
                    share: () => <ShareIcon aria-hidden className={cn("ml-1 inline size-5 align-text-bottom", "text-blue-500")} />,
                    add: () => <SquarePlusIcon aria-hidden className={cn("ml-1 inline size-5 align-text-bottom")} />,
                  })}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
