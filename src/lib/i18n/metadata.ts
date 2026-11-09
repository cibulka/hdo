import type { Metadata, Viewport } from "next";
import cs from "@/messages/cs.json";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import { THEME_COLORS } from "../theme";
import { LOCALES, type Locale } from "./locales";

/** Name of the installed app (home screen) and site name in link previews – the same in every language. */
export const APP_NAME = "HDO";

/** Language-neutral link-preview image (npm run og). */
const OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "Green and red halves with a countdown, the lightning app icon and a 24-hour schedule bar",
};

const META: Record<Locale, { title: string; description: string; ogLocale: string }> = { cs: cs.meta, en: en.meta, ru: ru.meta };

/**
 * Title, description and link-preview metadata in one language.
 * `path` is the page's own URL: "/" (auto language, English metadata) or "/cs", "/en", "/ru".
 */
export function pageMetadata(locale: Locale, path: string): Metadata {
  const { title, description, ogLocale } = META[locale];
  return {
    // Absolute URLs for the Open Graph / Twitter images (opengraph-image.png, twitter-image.png).
    metadataBase: new URL("https://hdo.cibulka.codes"),
    title,
    description,
    alternates: {
      canonical: path,
      languages: { ...Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])), "x-default": "/" },
    },
    openGraph: {
      title,
      description,
      siteName: APP_NAME,
      type: "website",
      url: path,
      locale: ogLocale,
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => META[l].ogLocale),
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE] },
    appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black-translucent" },
  };
}

export const viewport: Viewport = {
  themeColor: THEME_COLORS.idle,
  viewportFit: "cover",
};
