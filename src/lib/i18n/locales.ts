import { match } from "@formatjs/intl-localematcher";

export const LOCALES = ["cs", "en", "ru"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "cs";
/** For visitors whose languages we don't offer (e.g. German): the international one. */
export const FALLBACK_LOCALE: Locale = "en";

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
    const result = match(expanded, LOCALES as unknown as string[], FALLBACK_LOCALE);
    return isLocale(result) ? result : FALLBACK_LOCALE;
  } catch {
    return FALLBACK_LOCALE; // invalid language tags
  }
}

/** Language tags from an Accept-Language header, most preferred first ("cs-CZ,cs;q=0.9,en;q=0.8" → ["cs-CZ", "cs", "en"]). */
export function languagesFromHeader(header: string | null): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { tag: tag.trim(), q: q ? Number(q.slice(2)) : 1 };
    })
    .filter(({ tag, q }) => tag && tag !== "*" && q > 0)
    .sort((a, b) => b.q - a.q)
    .map(({ tag }) => tag);
}

/** Cookie holding the chosen language, so the server can redirect "/" (localStorage is browser-only). */
export const LOCALE_COOKIE = "hdo.locale";
