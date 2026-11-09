import { Geist } from "next/font/google";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import "@/app/globals.css";

const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext", "cyrillic"],
});

/** <html>/<body> shared by both root layouts ("/" and "/[locale]"). */
export function RootHtml({ lang, children }: { lang: string; children: ReactNode }) {
  return (
    <html lang={lang} className={cn(geist.variable, "h-full", "antialiased")}>
      <body className={cn("min-h-full", "bg-slate-900")}>{children}</body>
    </html>
  );
}
