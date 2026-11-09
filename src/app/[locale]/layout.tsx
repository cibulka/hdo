import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale } from "next/root-params";
import { RootHtml } from "@/components/root-html";
import { isLocale, LOCALES } from "@/lib/i18n/locales";
import { pageMetadata } from "@/lib/i18n/metadata";

// "/cs", "/en", "/ru": the URL sets the UI language and the link preview language.
export { viewport } from "@/lib/i18n/metadata";

export function generateStaticParams() {
  return LOCALES.map((l) => ({ locale: l }));
}

/** The URL's language; anything else (e.g. /xx) is a 404. */
async function currentLocale() {
  const value = await locale();
  if (!isLocale(value)) notFound();
  return value;
}

export async function generateMetadata(): Promise<Metadata> {
  const current = await currentLocale();
  return pageMetadata(current, `/${current}`);
}

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  return <RootHtml lang={await currentLocale()}>{children}</RootHtml>;
}
