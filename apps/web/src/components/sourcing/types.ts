// ─── Sourcing shared types ───────────────────────────────────────────────────

export interface CurrencyRates {
  USD: number;
  CNY: number;
  EUR: number;
}

export interface CargoProvider {
  id: string;
  name: string;
  origin: string;
  method: string;
  rate_per_kg: number;
  delivery_days: number;
  min_weight_kg: number | null;
}

export interface CalcResult {
  item_cost_usd: number;
  total_item_cost_usd: number;
  cargo_cost_usd: number;
  customs_usd: number;
  vat_usd: number;
  landed_cost_usd: number;
  landed_cost_uzs: number;
  usd_rate: number;
  delivery_days: number;
  provider_name: string;
  sell_price_uzs?: number;
  profit_uzs?: number;
  gross_margin_pct?: number;
  roi_pct?: number;
}

export interface SearchItem {
  title: string;
  price: string;
  source: string;
  link: string;
  image: string;
  store: string;
}

export interface HistoryItem {
  id: string;
  item_name: string | null;
  item_cost_usd: number;
  weight_kg: number;
  quantity: number;
  landed_cost_usd: number;
  landed_cost_uzs: number;
  gross_margin_pct: number | null;
  roi_pct: number | null;
  provider: string | null;
  created_at: string;
}

export interface SourcingJob {
  id: string;
  status: string;
  query: string;
  platforms: string[];
  product_id: string;
  result_count: number;
  created_at: string;
  finished_at: string | null;
}

export interface SourcingJobDetail {
  id: string;
  status: string;
  query: string;
  platforms: string[];
  product_id: string;
  created_at: string;
  finished_at: string | null;
  results: SourcingResult[];
}

export interface SourcingResult {
  id: string;
  platform: string;
  platform_name: string;
  country: string;
  title: string;
  price_usd: number;
  price_local: number | null;
  currency: string;
  url: string;
  image_url: string | null;
  seller_name: string | null;
  seller_rating: number | null;
  min_order_qty: number | null;
  shipping_days: number | null;
  ai_match_score: number | null;
  ai_notes: string | null;
  rank: number | null;
  cargo: {
    landed_cost_usd: number;
    landed_cost_uzs: number;
    cargo_cost_usd: number;
    customs_usd: number;
    vat_usd: number;
    margin_pct: number | null;
    roi_pct: number | null;
    provider: string | null;
  } | null;
}

export type Tab = 'calculator' | 'search' | 'import' | 'jobs' | 'history';

// ─── Shared constants ────────────────────────────────────────────────────────

export const METHOD_ICONS: Record<string, string> = {
  AVIA: '\u2708\uFE0F',
  CARGO: '\uD83D\uDEA2',
  RAIL: '\uD83D\uDE82',
  AUTO: '\uD83D\uDE9B',
  TURKEY: '\uD83C\uDF09',
};

export const COUNTRY_FLAGS: Record<string, string> = {
  CN: '\uD83C\uDDE8\uD83C\uDDF3',
  DE: '\uD83C\uDDE9\uD83C\uDDEA',
  US: '\uD83C\uDDFA\uD83C\uDDF8',
};

// ─── Shared formatters ───────────────────────────────────────────────────────

export function fmt(n: number, digits = 0) {
  return n.toLocaleString('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtUSD(n: number) {
  return '$' + fmt(n, 2);
}

export function fmtUZS(n: number) {
  return fmt(Math.round(n)) + ' so\'m';
}

export function matchColor(score: number | null) {
  if (score == null) return 'text-base-content/50';
  if (score >= 0.8) return 'text-success';
  if (score >= 0.5) return 'text-warning';
  return 'text-error';
}

export function marginColor(margin: number | null) {
  if (margin == null) return '';
  if (margin >= 30) return 'text-success';
  if (margin >= 15) return 'text-warning';
  return 'text-error';
}
