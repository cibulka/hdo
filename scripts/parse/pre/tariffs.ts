/**
 * Extracts tariff codes from a PRE HDO command description.
 *   "Odblokování NT sazby D 57d"                     → ["D57d"]
 *   "Odblokování NT pro sazbu C/D 25d_26d"           → ["C25d", "C26d", "D25d", "D26d"]
 *   "Odblokování NT pro sazbu D35 a D36 dělené pásmo" → ["D35d", "D36d"]
 *   "Odblokování NT Sdílení 8"                       → ["Sdílení 8"]
 */
export function tariffsFromDescription(description: string): string[] {
  const sharing = description.match(/Sdílení\s+(\d+)/);
  if (sharing) return [`Sdílení ${sharing[1]}`];

  const segment = description.split(/sazb[ayu]\s+/i)[1];
  if (!segment) return [];

  const codes: string[] = [];
  let letters: string[] = [];
  for (const match of segment.matchAll(/(C\/D|C|D)?\s?(\d{2})d?/g)) {
    if (match[1]) letters = match[1].split("/");
    if (letters.length === 0) continue;
    for (const letter of letters) codes.push(`${letter}${match[2]}d`);
  }
  return [...new Set(codes)];
}

/** "AD57_001" / "TC25_003" → "D57d" / "C25d". */
export function tariffFromTouId(id: string): string | null {
  const match = id.match(/^[AT]([CD])(\d{2})_/);
  return match ? `${match[1]}${match[2]}d` : null;
}

/** AMM sheet name "D57D" → "D57d". */
export function tariffFromAmmSheet(sheet: string): string | null {
  const match = sheet.match(/^([CD])(\d{2})D$/);
  return match ? `${match[1]}${match[2]}d` : null;
}

/** Households (D) first, then businesses (C), then named products; numeric within each. */
export function compareTariffs(a: string, b: string): number {
  const rank = (code: string) => (code.startsWith("D") ? 0 : code.startsWith("C") ? 1 : 2);
  return rank(a) - rank(b) || a.localeCompare(b, "cs", { numeric: true });
}
