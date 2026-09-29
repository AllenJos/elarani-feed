// Copy of src/content/validate.ts in AllenJos/elarani. Keep the two in sync.
import { CENTRES, SPICES } from './types.ts';
import type { Feed } from './types.ts';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const KINDS = ['news', 'article', 'alert'];
const ALERT_TYPES = ['weather', 'pest', 'scheme', 'market'];

/** Returns a list of problems; empty means the feed is safe to publish. */
export function validateFeed(input: unknown): string[] {
  const errors: string[] = [];
  const feed = input as Partial<Feed>;
  if (!feed || typeof feed !== 'object') return ['feed is not an object'];
  if (feed.version !== 1) errors.push('version must be 1');
  if (typeof feed.updatedAt !== 'string' || isNaN(Date.parse(feed.updatedAt))) errors.push('updatedAt must be an ISO date');
  if (!Array.isArray(feed.prices)) errors.push('prices must be an array');
  if (!Array.isArray(feed.posts)) errors.push('posts must be an array');
  if (feed.sample != null && typeof feed.sample !== 'object') errors.push('sample must be an object like { "prices": true }');

  (feed.prices ?? []).forEach((p, i) => {
    const at = `prices[${i}]`;
    if (!DATE.test(p.date)) errors.push(`${at}.date must be YYYY-MM-DD`);
    if (p.centre != null && !CENTRES.includes(p.centre)) errors.push(`${at}.centre must be one of ${CENTRES.join(', ')}`);
    if (!(p.avgPrice > 0)) errors.push(`${at}.avgPrice must be > 0`);
    if (!(p.maxPrice > 0)) errors.push(`${at}.maxPrice must be > 0`);
    if (p.maxPrice < p.avgPrice) errors.push(`${at}.maxPrice is below avgPrice`);
    if (p.minPrice != null && !(p.minPrice > 0 && p.minPrice <= p.avgPrice)) errors.push(`${at}.minPrice must be > 0 and not above avgPrice`);
    if (p.soldKg != null && p.arrivedKg != null && p.soldKg > p.arrivedKg) errors.push(`${at}.soldKg exceeds arrivedKg`);
  });

  const ids = new Set<string>();
  (feed.posts ?? []).forEach((p, i) => {
    const at = `posts[${i}]`;
    if (!p.id) errors.push(`${at}.id is required`);
    else if (ids.has(p.id)) errors.push(`${at}.id "${p.id}" is duplicated`);
    else ids.add(p.id);
    if (!KINDS.includes(p.kind)) errors.push(`${at}.kind must be one of ${KINDS.join(', ')}`);
    if (p.kind === 'alert' && !ALERT_TYPES.includes(p.alertType as string)) errors.push(`${at}.alertType is required for alerts`);
    if (!Array.isArray(p.spices) || p.spices.length === 0 || p.spices.some((s) => !SPICES.includes(s))) errors.push(`${at}.spices must list ${SPICES.join('/')}`);
    if (isNaN(Date.parse(p.publishedAt))) errors.push(`${at}.publishedAt must be an ISO date`);
    if (!p.title?.en) errors.push(`${at}.title.en is required`);
    if (!p.summary?.en) errors.push(`${at}.summary.en is required`);
    if (p.source?.url && !/^https:\/\//.test(p.source.url)) errors.push(`${at}.source.url must be https`);
  });
  return errors;
}
