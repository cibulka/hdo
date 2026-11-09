import { RootHtml } from "@/components/root-html";
import { pageMetadata } from "@/lib/i18n/metadata";

// "/" is redirected on the server (src/proxy.ts); this page is only a fallback. Its metadata is English.
export const metadata = pageMetadata("en", "/");
export { viewport } from "@/lib/i18n/metadata";

export default function AutoLayout({ children }: LayoutProps<"/">) {
  return <RootHtml lang="en">{children}</RootHtml>;
}
