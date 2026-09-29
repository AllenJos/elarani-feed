import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { parseBoardDate, parseDailyPriceTable } from '../scripts/spices-board.ts';

// Trimmed copy of the Spices Board's daily price page as served on 29 Sep 2026.
const html = readFileSync(new URL('./fixtures/daily-price-small.html', import.meta.url), 'utf8');

test('parseDailyPriceTable reads every auction row and skips the header', () => {
  const rows = parseDailyPriceTable(html);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[1], {
    date: '2026-09-29',
    auctioneer: 'CARDAMOM GROWERSFOREVER PRIVATE LIMITED',
    lots: 165,
    arrivedKg: 31118,
    soldKg: 25170.8,
    maxPrice: 3837,
    minPrice: 2302,
    avgPrice: 3145.11,
  });
  assert.equal(rows[2].auctioneer, "Cardamom Planters' Association, Santhanpara", 'HTML entities are decoded');
});

test('parseDailyPriceTable returns nothing for a page without the table', () => {
  assert.deepEqual(parseDailyPriceTable('<html><body>Maintenance</body></html>'), []);
});

test('parseBoardDate converts the Board date format', () => {
  assert.equal(parseBoardDate('29-Sep-2026'), '2026-09-29');
  assert.equal(parseBoardDate(' 3-jan-2025 '), '2025-01-03');
  assert.equal(parseBoardDate('2026-09-29'), undefined);
});

