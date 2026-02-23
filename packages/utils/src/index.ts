import type { ScoreInput } from '@uzum/types';

/**
 * Momentum-first scoring formula
 * score = 0.55*ln(1+wb) + 0.25*ln(1+oq) + 0.10*rating + 0.10*supply_pressure
 */
export function calculateScore(input: ScoreInput): number {
  const wb = input.weekly_bought ?? 0;
  return (
    0.55 * Math.log(1 + wb) +
    0.25 * Math.log(1 + input.orders_quantity) +
    0.10 * input.rating +
    0.10 * input.supply_pressure
  );
}

/**
 * Parse weekly_bought from Uzum product detail actions text
 * Supports: Russian "X человек купили на этой неделе"
 *           Uzbek "X kishi bu hafta sotib oldi"
 */
export function parseWeeklyBought(actionsText: string): number | null {
  const match = actionsText.match(/(\d[\d\s]*)\s*(человек|kishi|нафар)/i);
  if (!match) return null;
  return parseInt(match[1].replace(/\s/g, ''), 10);
}

/**
 * Extract product ID from Uzum URL
 * Supports:
 *   https://uzum.uz/product/12345
 *   https://uzum.uz/uz/product/12345
 *   https://uzum.uz/ru/product/molochnaya-smes-dlya-155927?skuId=232522
 */
export function parseUzumProductId(url: string): number | null {
  // Match the last numeric sequence in the product slug (before ? or end)
  const match = url.match(/\/product\/[^?/]*?(\d+)(?:[?/]|$)/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

/**
 * Supply pressure: FBO=1.0, FBS=0.5
 */
export function getSupplyPressure(stockType: 'FBO' | 'FBS'): number {
  return stockType === 'FBO' ? 1.0 : 0.5;
}

/**
 * Extract category ID from Uzum category URL
 * Supports:
 *   https://uzum.uz/ru/category/smartfony--879   (double dash)
 *   https://uzum.uz/ru/category/muzhskie-krossovki-13983  (single dash)
 *   https://uzum.uz/category/elektronika--123
 *   879 (plain number string)
 */
export function parseUzumCategoryId(input: string): number | null {
  const trimmed = input.trim();
  // Plain number
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  // Double-dash format: /category/smartfony--879
  const doubleDash = trimmed.match(/--(\d+)(?:[/?#]|$)/);
  if (doubleDash) return parseInt(doubleDash[1], 10);
  // Single-dash format: /category/slug-name-13983
  const singleDash = trimmed.match(/\/category\/[^/?#]+-(\d+)(?:[/?#]|$)/);
  if (singleDash) return parseInt(singleDash[1], 10);
  return null;
}

/**
 * Sleep utility for rate limiting
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// Feature 03 — Shop Trust Score
// ============================================================

export interface TrustScoreInput {
  orders_quantity: number;
  rating: number;        // 0–5
  feedback_quantity: number;
  fbo_ratio: number;     // 0–1 (FBO products / total products)
  age_months: number;
}

/**
 * Trust score for a shop (0–1).
 * trust = 0.30*norm(orders) + 0.25*(rating/5) + 0.20*norm(feedback)
 *       + 0.15*fbo_ratio + 0.10*min(age_months/24, 1)
 *
 * norm(x) = ln(1+x) / ln(1+100000)   (log-normalize to 0..1 range)
 */
export function calculateTrustScore(input: TrustScoreInput): number {
  const norm = (x: number) => Math.log(1 + x) / Math.log(1 + 100000);
  return (
    0.30 * norm(input.orders_quantity) +
    0.25 * (input.rating / 5) +
    0.20 * norm(input.feedback_quantity) +
    0.15 * input.fbo_ratio +
    0.10 * Math.min(input.age_months / 24, 1)
  );
}

// ============================================================
// Feature 04 — Niche Score
// ============================================================

export interface NicheScoreInput {
  demand: number;       // 0–1 normalized weekly_bought
  competition: number;  // 0–1 normalized seller_count
  growth: number;       // 0–1 normalized score growth %
  margin: number;       // 0–1 estimated margin ratio
}

/**
 * Niche opportunity score (0–1).
 * niche = 0.40*demand + 0.30*(1-competition) + 0.20*growth + 0.10*margin
 * >0.65 = opportunity
 */
export function calculateNicheScore(input: NicheScoreInput): number {
  return (
    0.40 * input.demand +
    0.30 * (1 - input.competition) +
    0.20 * input.growth +
    0.10 * input.margin
  );
}

// ============================================================
// Feature 09 — Profit Calculator 2.0
// ============================================================

export interface ProfitInput {
  sell_price_uzs: number;
  unit_cost_usd: number;
  usd_to_uzs: number;
  uzum_commission_pct: number;  // e.g. 10 for 10%
  fbo_cost_uzs?: number;
  ads_spend_uzs?: number;
  quantity: number;
}

export interface ProfitResult {
  revenue: number;
  unit_cost_uzs: number;
  commission: number;
  total_cost: number;
  gross_profit: number;
  net_profit: number;
  margin_pct: number;
  roi_pct: number;
  breakeven_qty: number;
  breakeven_price: number;
}

/**
 * Full profit calculation for Uzum sellers.
 */
export function calculateProfit(input: ProfitInput): ProfitResult {
  const {
    sell_price_uzs,
    unit_cost_usd,
    usd_to_uzs,
    uzum_commission_pct,
    fbo_cost_uzs = 0,
    ads_spend_uzs = 0,
    quantity,
  } = input;

  const unit_cost_uzs = unit_cost_usd * usd_to_uzs;
  const revenue = sell_price_uzs * quantity;
  const commission = revenue * (uzum_commission_pct / 100);
  const total_cost =
    (unit_cost_uzs + fbo_cost_uzs + ads_spend_uzs) * quantity + commission;
  const gross_profit = revenue - (unit_cost_uzs * quantity);
  const net_profit = revenue - total_cost;
  const margin_pct = revenue > 0 ? (net_profit / revenue) * 100 : 0;
  const roi_pct = total_cost > 0 ? (net_profit / total_cost) * 100 : 0;

  const per_unit_cost = unit_cost_uzs + fbo_cost_uzs + ads_spend_uzs;
  const per_unit_margin = sell_price_uzs * (1 - uzum_commission_pct / 100) - per_unit_cost;
  const breakeven_qty = per_unit_margin > 0 ? Math.ceil(commission / per_unit_margin) : Infinity;
  const breakeven_price =
    per_unit_cost > 0
      ? per_unit_cost / (1 - uzum_commission_pct / 100)
      : 0;

  return {
    revenue: Math.round(revenue),
    unit_cost_uzs: Math.round(unit_cost_uzs),
    commission: Math.round(commission),
    total_cost: Math.round(total_cost),
    gross_profit: Math.round(gross_profit),
    net_profit: Math.round(net_profit),
    margin_pct: Number(margin_pct.toFixed(2)),
    roi_pct: Number(roi_pct.toFixed(2)),
    breakeven_qty: breakeven_qty === Infinity ? -1 : breakeven_qty,
    breakeven_price: Math.round(breakeven_price),
  };
}
