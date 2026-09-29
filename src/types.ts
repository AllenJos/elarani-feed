// Copy of src/content/types.ts in AllenJos/elarani. Keep the two in sync:
// the app rejects a feed its own validator does not accept.

export type Lang = 'en' | 'ml' | 'ta';
export type Localized = { en: string; ml?: string; ta?: string };

export type Spice = 'cardamom' | 'pepper' | 'coffee';
export const SPICES: Spice[] = ['cardamom', 'pepper', 'coffee'];

export type Centre = 'puttady' | 'bodinayakanur';
export const CENTRES: Centre[] = ['puttady', 'bodinayakanur'];

/** One e-auction session for small (green) cardamom. Prices in ₹/kg. */
export type AuctionPrice = {
  date: string; // YYYY-MM-DD
  /** The Spices Board's price table does not say which centre ran an auction. */
  centre?: Centre;
  auctioneer?: string;
  lots?: number;
  arrivedKg?: number;
  soldKg?: number;
  avgPrice: number;
  maxPrice: number;
  minPrice?: number;
};

export type PostKind = 'news' | 'article' | 'alert';
export type AlertType = 'weather' | 'pest' | 'scheme' | 'market';

export type Post = {
  id: string;
  kind: PostKind;
  alertType?: AlertType;
  spices: Spice[];
  publishedAt: string; // ISO 8601
  title: Localized;
  summary: Localized;
  /** Our own write-up. We summarise and link out; never republish articles. */
  body?: Localized;
  source?: { name: string; url?: string };
  /** Alerts stop showing after this time. */
  expiresAt?: string;
};

export type Feed = {
  version: 1;
  /** Marks placeholder content that must never be read as real prices or news. */
  sample?: { prices?: boolean; posts?: boolean };
  updatedAt: string;
  prices: AuctionPrice[];
  posts: Post[];
};
