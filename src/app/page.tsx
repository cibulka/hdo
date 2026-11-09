import { HdoApp } from "@/components/hdo/hdo-app";
import { ServiceWorker } from "@/components/hdo/service-worker";

export default function Page() {
  return (
    <>
      <HdoApp />
      <ServiceWorker />
    </>
  );
}
