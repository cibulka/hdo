// npm run og — renders the Open Graph / Twitter image (public/og-image.png).
// Language-neutral on purpose: only colours, numbers and the app icon. Uses a real day from the
// PRE data for the 24-hour bar. The output is committed; re-run only when the design changes.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og.js";
import { createElement } from "react";
import type { DistributorData, Window } from "#/lib/hdo/schema.ts";

const ROOT = join(import.meta.dirname, "../..");
const FONTS = join(ROOT, "node_modules/geist/dist/fonts/geist-sans");
const W = 1200;
const H = 630;

// Example schedule: D57d, program 605, smart meter, Monday.
const pre: DistributorData = JSON.parse(readFileSync(join(ROOT, "output/pre.json"), "utf8"));
const variant = pre.periods[0].tariffs
  .find((t) => t.code === "D57d")!
  .programs.find((p) => p.command === "605")!
  .variants.find((v) => v.device === "amm")!;
const lows: Window[] = variant.week.mon;

// Diagonal seam through the centre; green (low) on the left, red (high) on the right.
const SEAM_TOP = 700;
const SEAM_BOTTOM = 500;

const BAR = { x: 80, y: 500, w: W - 160, h: 44, r: 12 };

function barRects(): string {
  const x = (minutes: number) => BAR.x + (minutes / 1440) * BAR.w;
  const parts: string[] = [`<rect x="${BAR.x}" y="${BAR.y}" width="${BAR.w}" height="${BAR.h}" fill="#b91c1c"/>`];
  for (const [start, end] of lows) {
    parts.push(`<rect x="${x(start)}" y="${BAR.y}" width="${x(end) - x(start)}" height="${BAR.h}" fill="#34d399"/>`);
  }
  const ticks = Array.from({ length: 9 }, (_, i) => i * 180).map(
    (m) => `<rect x="${x(m) - 1}" y="${BAR.y + BAR.h + 6}" width="2" height="10" fill="#ffffff" fill-opacity="0.6"/>`,
  );
  return parts.join("") + ticks.join("");
}

const bolt = "M292 28 L112 292 H236 L204 484 L400 204 H272 Z";
const ICON = 96;

const base = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="green" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#059669"/><stop offset="1" stop-color="#065f46"/>
    </linearGradient>
    <radialGradient id="greenGlow" cx="0.2" cy="0.2" r="0.7">
      <stop offset="0" stop-color="#4d7c0f" stop-opacity="0.7"/><stop offset="1" stop-color="#4d7c0f" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="red" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#b91c1c"/><stop offset="1" stop-color="#7f1d1d"/>
    </linearGradient>
    <radialGradient id="redGlow" cx="0.85" cy="0.25" r="0.7">
      <stop offset="0" stop-color="#be123c" stop-opacity="0.8"/><stop offset="1" stop-color="#be123c" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="iconBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1e293b"/><stop offset="1" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="boltFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fef08a"/><stop offset="1" stop-color="#facc15"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#000" flood-opacity="0.45"/>
    </filter>
    <clipPath id="barClip"><rect x="${BAR.x}" y="${BAR.y}" width="${BAR.w}" height="${BAR.h}" rx="${BAR.r}"/></clipPath>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#red)"/>
  <rect width="${W}" height="${H}" fill="url(#redGlow)"/>
  <g>
    <polygon points="0,0 ${SEAM_TOP},0 ${SEAM_BOTTOM},${H} 0,${H}" fill="url(#green)"/>
    <polygon points="0,0 ${SEAM_TOP},0 ${SEAM_BOTTOM},${H} 0,${H}" fill="url(#greenGlow)"/>
  </g>

  <!-- 24-hour bar on a dark band -->
  <rect x="0" y="${BAR.y - 40}" width="${W}" height="${H - BAR.y + 40}" fill="#000" fill-opacity="0.28"/>
  <g clip-path="url(#barClip)">${barRects()}</g>
  <rect x="${BAR.x}" y="${BAR.y}" width="${BAR.w}" height="${BAR.h}" rx="${BAR.r}" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="3"/>

  <!-- App icon, top left -->
  <g filter="url(#shadow)" transform="translate(${BAR.x} 64)">
    <rect width="${ICON}" height="${ICON}" rx="${ICON * 0.22}" fill="url(#iconBg)"/>
    <path d="${bolt}" transform="translate(${ICON * 0.07} ${ICON * 0.07}) scale(${(ICON * 0.86) / 512})" fill="url(#boltFill)" stroke="#fde047" stroke-width="6" stroke-linejoin="round"/>
  </g>
</svg>`;

// Text is laid out by satori (behind next/og), which embeds the Geist outlines – sharp's own text
// rendering ignores custom font files on macOS.
const h = createElement;
const font = (name: string) => readFileSync(join(FONTS, `Geist-${name}.ttf`));
const tickX = (i: number) => BAR.x + (i / 8) * BAR.w;
const abs = (style: Record<string, string | number>) => ({ style: { position: "absolute" as const, display: "flex", ...style } });

/** Text centred on `center` (satori can't centre in a zero-width box, so give it a wide one). */
const countdown = (center: number, top: number, size: number, main: string, seconds: string) =>
  h(
    "div",
    abs({ left: center - 450, top, width: 900, justifyContent: "center", alignItems: "baseline", color: "white", fontWeight: 900, fontSize: size, letterSpacing: -2 }),
    // satori's baseline alignment is off for mixed sizes: align bottoms and lift the smaller part by
    // the difference in descent (~0.21 em for Geist).
    h(
      "div",
      { style: { display: "flex", alignItems: "flex-end", lineHeight: 1 } },
      main,
      h("span", { style: { fontSize: size * 0.58, opacity: 0.75, marginBottom: size * 0.42 * 0.21 } }, seconds),
    ),
  );

const image = new ImageResponse(
  h(
    "div",
    { style: { position: "relative", display: "flex", width: W, height: H, fontFamily: "Geist" } },
    h("img", { src: `data:image/svg+xml;base64,${Buffer.from(base).toString("base64")}`, width: W, height: H, style: { position: "absolute", left: 0, top: 0 } }),
    // One timer centred on the seam, so the green/red split runs through it.
    countdown(W / 2, 175, 168, "0:00", ":00"),
    ...Array.from({ length: 9 }, (_, i) =>
      h(
        "div",
        abs({ left: tickX(i) - 40, top: BAR.y + BAR.h + 18, width: 80, justifyContent: "center", color: "rgba(255,255,255,0.75)", fontSize: 22, fontWeight: 500 }),
        String((i * 3) % 24).padStart(2, "0"),
      ),
    ),
    // Underline drawn as a border: satori has no text-underline-offset.
    h("div", abs({ right: BAR.x, top: BAR.y - 92, color: "rgba(255,255,255,0.85)", fontSize: 26, fontWeight: 600, paddingBottom: 3, borderBottom: "2px solid rgba(255,255,255,0.7)" }), "hdo.cibulka.codes"),
  ),
  {
    width: W,
    height: H,
    fonts: [
      { name: "Geist", data: font("Black"), weight: 900, style: "normal" },
      { name: "Geist", data: font("SemiBold"), weight: 600, style: "normal" },
      { name: "Geist", data: font("Medium"), weight: 500, style: "normal" },
    ],
  },
);

// Referenced explicitly from the page metadata (src/lib/i18n/metadata.ts) for Open Graph and Twitter.
writeFileSync(join(ROOT, "public/og-image.png"), Buffer.from(await image.arrayBuffer()));
console.log("✔ wrote public/og-image.png");
