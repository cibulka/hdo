import { NextResponse, type NextRequest } from "next/server";
import { guessLocale, isLocale, languagesFromHeader, LOCALE_COOKIE } from "@/lib/i18n/locales";

/**
 * "/" → /cs, /en or /ru on the server: the language chosen earlier (cookie), else the best match
 * for the browser's Accept-Language (English for crawlers without one). Temporary redirect, as the
 * target depends on the visitor.
 */
export function proxy(request: NextRequest) {
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(saved) ? saved : guessLocale(languagesFromHeader(request.headers.get("accept-language")));
  return NextResponse.redirect(new URL(`/${locale}`, request.url), 307);
}

export const config = {
  matcher: "/",
};
