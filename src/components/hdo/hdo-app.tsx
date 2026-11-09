"use client";

import { NextIntlClientProvider } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { useStored } from "@/hooks/use-stored";
import { guessLocale, isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/locales";
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
 * Client root.
 * - /cs, /en, /ru: the URL sets the language and the page is prerendered with placeholders for
 *   everything that depends on the clock or on localStorage, so the HTML has real content.
 * - "/": normally redirected on the server (src/proxy.ts); if it is ever rendered, redirect here.
 */
export function HdoApp({ aboutHtml, routeLocale }: { aboutHtml: string; routeLocale?: Locale }) {
  const [, setStored] = useStored(LOCALE_KEY);
  if (!routeLocale) return <RedirectToLocale />;

  const rememberLocale = (locale: Locale) => {
    setStored(locale);
    // Cookie: lets the server redirect "/" (the installed app's start URL) to this language.
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <NextIntlClientProvider locale={routeLocale} messages={MESSAGES[routeLocale]} timeZone={TIME_ZONE}>
      <RateScreen onLocaleChange={rememberLocale} aboutHtml={aboutHtml} />
    </NextIntlClientProvider>
  );
}

/** Fallback for "/" without the server redirect: saved language, else the browser's. */
function RedirectToLocale() {
  const router = useRouter();
  const [stored] = useStored(LOCALE_KEY);
  const languages = useSyncExternalStore(subscribeNever, browserLanguages, () => null);

  useEffect(() => {
    if (stored === undefined || languages === null) return;
    router.replace(`/${isLocale(stored) ? stored : guessLocale(languages.split(","))}`);
  }, [stored, languages, router]);

  return <RateBackground mode="idle" />;
}
