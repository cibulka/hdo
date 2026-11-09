import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { THEME_COLORS } from "@/components/hdo/rate-background";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Nízký tarif",
  description: "Je teď nízký tarif? Kolik zbývá? Podle rozvrhu HDO distributora.",
  appleWebApp: { title: "Nízký tarif", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: THEME_COLORS.idle,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="cs" className={cn(geist.variable, "h-full", "antialiased")}>
      <body className={cn("min-h-full", "bg-slate-900")}>{children}</body>
    </html>
  );
}
