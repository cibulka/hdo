"use client";

import { NextIntlClientProvider } from "next-intl";
import { useEffect, useSyncExternalStore } from "react";
import { useStored } from "@/hooks/use-stored";
import { DEFAULT_LOCALE, guessLocale, isLocale, type Locale } from "@/lib/i18n/locales";
import { TIME_ZONE } from "@/lib/hdo/prague";
import cs from "@/messages/cs.json";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import { RateBackground } from "./rate-background";
import { RateScreen } from "./rate-screen";

const MESSAGES = { cs, en, ru } satisfies Record<Locale, typeof cs>;
const LOCALE_KEY = "hdo.locale";

const subscribeNever = () => () => {};
const browserLanguages = () => navigator.languages.join(",");

/**
 * Client root. Locale = stored choice, else a guess from the browser languages.
 * During prerendering only the idle background is rendered (nothing here is known on the server).
 */
export function HdoApp({ aboutHtml }: { aboutHtml: string }) {
  const [stored, setStored] = useStored(LOCALE_KEY);
  const languages = useSyncExternalStore(subscribeNever, browserLanguages, () => null);

  const locale: Locale | null = stored === undefined || languages === null ? null : isLocale(stored) ? stored : guessLocale(languages.split(","));

  useEffect(() => {
    if (locale) document.documentElement.lang = locale;
  }, [locale]);

  if (!locale) return <RateBackground mode="idle" />;

  return (
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE]} timeZone={TIME_ZONE}>
      <RateScreen onLocaleChange={(next) => setStored(next)} aboutHtml={aboutHtml} />
    </NextIntlClientProvider>
  );
}
