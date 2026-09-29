// Usage: npm run import-prices [feed.json] [--days=400]
// Pulls small cardamom auction results from the Spices Board's public price
// table into the feed's prices, keeping the last `days` of history. Runs on a
// schedule in .github/workflows/prices.yml.
import { readFileSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

import type { AuctionPrice, Feed } from '../src/types.ts';
import { validateFeed } from '../src/validate.ts';
import { DAILY_PRICE_URL, parseDailyPriceTable } from './spices-board.ts';

const MAX_PAGES = 120;
const PAGE_DELAY_MS = 700; // be gentle with a government server

const args = process.argv.slice(2);
const path = args.find((a) => !a.startsWith('--')) ?? 'feed.json';
const days = Number(args.find((a) => a.startsWith('--days='))?.slice(7) ?? 400);
const addDays = (date: string, n: number) => new Date(Date.parse(date) + n * 86_400_000).toISOString().slice(0, 10);
const cutoff = addDays(new Date().toISOString().slice(0, 10), -days);

async function fetchPage(page: number): Promise<AuctionPrice[]> {
  // Pages are numbered from 1; the table's own "next" link from page one is ?page=2.
  const url = page === 1 ? DAILY_PRICE_URL : `${DAILY_PRICE_URL}?page=${page}`;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Elarani price importer (cardamom growers app)' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return parseDailyPriceTable(await res.text());
    } catch (err) {
      if (attempt >= 3) throw new Error(`${url}: ${(err as Error).message}`);
      await sleep(attempt * 3000);
    }
  }
}

const key = (p: AuctionPrice) => `${p.date}|${(p.auctioneer ?? '').toUpperCase()}`;

const feed = JSON.parse(readFileSync(path, 'utf8')) as Feed;
const real = feed.sample?.prices ? [] : feed.prices;
const known = new Set(real.map(key));
// Only stop early at known rows once the feed already reaches back to the cutoff.
const historyComplete = real.some((p) => p.date <= addDays(cutoff, 7));
const fetched = new Map<string, AuctionPrice>();
let seenPageKey = '';
for (let page = 1; page <= MAX_PAGES; page++) {
  const rows = await fetchPage(page);
  if (page === 1 && rows.length === 0) throw new Error('No rows on the first page; the table layout may have changed.');
  // Guard against a server that ignores ?page and keeps returning page one.
  const pageKey = rows.map(key).join();
  if (pageKey === seenPageKey) break;
  console.log(`page ${page}: ${rows.length} auctions, ${rows[rows.length - 1]?.date ?? '-'} to ${rows[0]?.date ?? '-'}`);
  seenPageKey = pageKey;
  for (const row of rows) if (row.date >= cutoff) fetched.set(key(row), row);
  // A page can hold fewer usable rows than it shows (an auction with no sales), so only an empty page ends it.
  if (rows.length === 0 || rows.some((r) => r.date < cutoff)) break;
  // Rows already in the feed mean the rest is history we have; corrections land within days.
  if (historyComplete && page >= 3 && rows.every((r) => known.has(key(r)))) break;
  await sleep(PAGE_DELAY_MS);
}

// Keep earlier real rows the table no longer shows; drop placeholder prices.
const kept = feed.sample?.prices ? [] : feed.prices.filter((p) => p.date >= cutoff && !fetched.has(key(p)));
feed.prices = [...kept, ...fetched.values()].sort((a, b) => a.date.localeCompare(b.date) || key(a).localeCompare(key(b)));
feed.sample = { ...feed.sample, prices: false };
feed.updatedAt = new Date().toISOString();

const errors = validateFeed(feed);
if (errors.length) {
  console.error(`Imported feed is invalid:\n  - ${errors.slice(0, 10).join('\n  - ')}`);
  process.exit(1);
}
writeFileSync(path, JSON.stringify(feed, null, 2) + '\n');
const latest = feed.prices[feed.prices.length - 1];
console.log(`${path}: ${feed.prices.length} auctions since ${cutoff} (${fetched.size} fetched), latest ${latest?.date}`);
