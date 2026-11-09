import { match } from "@formatjs/intl-localematcher";

export const LOCALES = ["cs", "en", "ru"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "cs";

/** Languages not offered, mapped to the closest one we have. */
const FALLBACKS: Record<string, Locale> = { sk: "cs", uk: "ru", be: "ru" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Best locale for the browser's preferred languages (navigator.languages). */
export function guessLocale(preferred: readonly string[]): Locale {
  const expanded = preferred.flatMap((tag) => {
    const base = tag.toLowerCase().split("-")[0];
    return FALLBACKS[base] ? [tag, FALLBACKS[base]] : [tag];
  });
  try {
    const result = match(expanded, LOCALES as unknown as string[], DEFAULT_LOCALE);
    return isLocale(result) ? result : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE; // invalid language tags
  }
}
