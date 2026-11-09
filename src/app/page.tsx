import { HdoApp } from "@/components/hdo/hdo-app";
import { ServiceWorker } from "@/components/hdo/service-worker";
import { ABOUT_HTML } from "@/lib/about";

export default function Page() {
  return (
    <>
      <HdoApp aboutHtml={ABOUT_HTML} />
      <ServiceWorker />
    </>
  );
}
