"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { LOCALES, type Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

/** "CS · EN · RU" – links to /cs, /en, /ru; the active language is emphasised. */
export function LanguageSwitch({ onChange, className }: { onChange: (locale: Locale) => void; className?: string }) {
  const active = useLocale();
  const t = useTranslations();

  return (
    <nav aria-label={t("language")} className={cn("flex items-center gap-1", "text-sm", className)}>
      {LOCALES.map((locale) => (
        <Link
          key={locale}
          href={`/${locale}`}
          hrefLang={locale}
          lang={locale}
          aria-current={locale === active ? "page" : undefined}
          // Remembered so that "/" (e.g. the installed app) opens in this language next time.
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
        </Link>
      ))}
    </nav>
  );
}
