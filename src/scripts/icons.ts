// npm run icons — renders the app icon (lightning on the "idle" slate gradient) to every size
// the app needs. Outputs are committed; re-run only when the design changes.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = join(import.meta.dirname, "../..");
const APP = join(ROOT, "src/app");
const PUBLIC_ICONS = join(ROOT, "public/icons");

interface Variant {
  /** Rounded corners (transparent outside) vs. full-bleed square. */
  rounded: boolean;
  /** Bolt size relative to the canvas; maskable icons must keep it inside the central safe zone. */
  boltScale: number;
}

function svg({ rounded, boltScale }: Variant): string {
  const size = 512;
  const radius = rounded ? 112 : 0;
  // Bolt drawn in a 512 box, centred, then scaled around the centre.
  const bolt = "M292 28 L112 292 H236 L204 484 L400 204 H272 Z";
  const t = (1 - boltScale) * (size / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1e293b"/>
      <stop offset="1" stop-color="#0f172a"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.3" cy="0.25" r="0.75">
      <stop offset="0" stop-color="#475569" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#475569" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bolt" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fef08a"/>
      <stop offset="1" stop-color="#facc15"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bg)"/>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#glow)"/>
  <path d="${bolt}" fill="url(#bolt)" stroke="#fde047" stroke-width="6" stroke-linejoin="round"
    transform="translate(${t} ${t}) scale(${boltScale})"/>
</svg>
`;
}

const png = (variant: Variant, size: number) => sharp(Buffer.from(svg(variant))).resize(size, size).png().toBuffer();

/** ICO container holding PNG images (supported by every current browser). */
function ico(images: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const rounded: Variant = { rounded: true, boltScale: 0.86 };
const fullBleed: Variant = { rounded: false, boltScale: 0.86 };
const maskable: Variant = { rounded: false, boltScale: 0.62 };

mkdirSync(PUBLIC_ICONS, { recursive: true });

// Browser tab: SVG for modern browsers, ICO fallback.
writeFileSync(join(APP, "icon.svg"), svg(rounded));
writeFileSync(join(APP, "favicon.ico"), ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(rounded, size) })))));
// iOS home screen: full-bleed, iOS rounds the corners itself.
writeFileSync(join(APP, "apple-icon.png"), await png(fullBleed, 180));
// Web app manifest.
writeFileSync(join(PUBLIC_ICONS, "icon-192.png"), await png(rounded, 192));
writeFileSync(join(PUBLIC_ICONS, "icon-512.png"), await png(rounded, 512));
writeFileSync(join(PUBLIC_ICONS, "maskable-512.png"), await png(maskable, 512));

console.log("✔ icons written to src/app/ and public/icons/");
