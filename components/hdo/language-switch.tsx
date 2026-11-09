"use client";

import { useLocale, useTranslations } from "next-intl";
import { LOCALES, type Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

/** "CS · EN · RU" – the active language is emphasised. */
export function LanguageSwitch({ onChange, className }: { onChange: (locale: Locale) => void; className?: string }) {
  const active = useLocale();
  const t = useTranslations();

  return (
    <nav aria-label={t("language")} className={cn("flex items-center gap-1", "text-sm", className)}>
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          aria-pressed={locale === active}
          onClick={() => onChange(locale)}
          className={cn(
            "rounded-md px-2 py-1",
            "font-semibold uppercase tracking-wide",
            locale === active ? "bg-white/20 text-white" : "text-white/60",
            "cursor-pointer outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white/70",
            "transition-colors",
          )}
        >
          {locale}
        </button>
      ))}
    </nav>
  );
}
