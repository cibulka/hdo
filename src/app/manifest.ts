import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/i18n/metadata";
import { THEME_COLORS } from "@/lib/theme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // Language-neutral: one manifest serves all languages (the start URL redirects to the right one).
    name: APP_NAME,
    short_name: APP_NAME,
    description: "Is it low rate right now? A live countdown to the next switch of your two-rate electricity tariff.",
    lang: "en",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: THEME_COLORS.idle,
    theme_color: THEME_COLORS.idle,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
