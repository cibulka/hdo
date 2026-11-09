import { HdoApp } from "@/components/hdo/hdo-app";
import { ServiceWorker } from "@/components/hdo/service-worker";
import { ABOUT_HTML } from "@/lib/about";
import { isLocale } from "@/lib/i18n/locales";
import { notFound } from "next/navigation";

export default async function LocalePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <>
      <HdoApp aboutHtml={ABOUT_HTML} routeLocale={locale} />
      <ServiceWorker />
    </>
  );
}
