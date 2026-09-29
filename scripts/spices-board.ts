// Parsers for the Spices Board's public small cardamom auction pages. The
// Board has no API, so these read the same HTML table people see at
// https://www.indianspices.com/marketing/price/domestic/daily-price-small.html
import type { AuctionPrice } from '../src/types.ts';

export const DAILY_PRICE_URL = 'https://www.indianspices.com/marketing/price/domestic/daily-price-small.html';

const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

/** "29-Sep-2026" → "2026-09-29"; undefined for anything else. */
export function parseBoardDate(text: string): string | undefined {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(text.trim());
  const month = m && MONTHS[m[2].toLowerCase()];
  return m && month ? `${m[3]}-${month}-${m[1].padStart(2, '0')}` : undefined;
}

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', apos: "'", nbsp: ' ', lt: '<', gt: '>' };

function cellText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&(\w+);/g, (m, name) => ENTITIES[name] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Rows of the daily price table: Sno, date, auctioneer, lots, kg arrived,
 * kg sold, max, min, avg. Header and malformed rows are skipped.
 */
export function parseDailyPriceTable(html: string): AuctionPrice[] {
  const out: AuctionPrice[] = [];
  for (const [, row] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(([, c]) => cellText(c));
    if (cells.length !== 9) continue;
    const date = parseBoardDate(cells[1]);
    const [lots, arrivedKg, soldKg, maxPrice, minPrice, avgPrice] = cells.slice(3).map(num);
    if (!date || !cells[2] || !(avgPrice > 0) || !(maxPrice > 0)) continue;
    out.push({
      date,
      auctioneer: cells[2],
      lots: lots || undefined,
      arrivedKg: arrivedKg || undefined,
      soldKg: soldKg || undefined,
      maxPrice,
      minPrice: minPrice || undefined,
      avgPrice,
    });
  }
  return out;
}
