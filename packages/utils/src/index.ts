import type { ScoreInput } from '@uzum/types';

/** Minimum gap between snapshots for the same product (T-267: dedup guard). */
export const SNAPSHOT_MIN_GAP_MS = 5 * 60 * 1000; // 5 minutes

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
// Weekly Bought Banner Parser (Playwright scraping)
// ============================================================

/**
 * Parse Uzum product page banner label to extract weekly buyers count.
 * Handles formats:
 *   "115 человек купили на этой неделе" → 115
 *   "1,2 тыс. человек купили"          → 1200
 *   "12 тыс. человек купили"           → 12000
 *   null / unrecognized                 → null
 */
export function parseWeeklyBoughtBanner(label: string): number | null {
  if (!label) return null;

  // Format: "1,2 тыс." or "12 тыс."
  const tysMatch = label.match(/([\d]+[,.]?\d*)\s*тыс/i);
  if (tysMatch) {
    const numStr = tysMatch[1].replace(',', '.');
    return Math.round(parseFloat(numStr) * 1000);
  }

  // Format: "115 человек" — plain number before "человек"
  const plainMatch = label.match(/(\d+)\s*человек/i);
  if (plainMatch) {
    return parseInt(plainMatch[1], 10);
  }

  return null;
}

// ============================================================
// Centralized weekly_bought calculation (T-207)
// ============================================================

/**
 * @deprecated Use stored scraped weekly_bought from ProductSnapshot.weekly_bought_source='scraped'.
 * Kept as transitional fallback for products not yet scraped.
 *
 * Fallback for weekly_bought when calcWeeklyBought returns null (T-268).
 * Prevents score instability: without this, null weekly_bought → 55% of score = 0.
 * Returns calculated value if non-null, otherwise last valid snapshot weekly_bought.
 */
export function weeklyBoughtWithFallback(
  calculated: number | null,
  snapshots: Array<{ weekly_bought?: number | null }>,
): number | null {
  if (calculated != null) return calculated;
  for (const snap of snapshots) {
    if (snap.weekly_bought != null && snap.weekly_bought > 0) {
      return snap.weekly_bought;
    }
  }
  return null;
}

/**
 * @deprecated Use stored scraped weekly_bought from ProductSnapshot.weekly_bought_source='scraped'.
 * Kept as transitional fallback for products not yet scraped.
 *
 * Central weekly_bought calculator — 7-day lookback, 24h minimum gap.
 * Replaces all scattered inline calculations across the codebase.
 *
 * @param snapshots Ordered by snapshot_at DESC
 * @param currentOrders Current total orders count
 * @param currentTime Timestamp to measure from (default: Date.now()).
 *        Write path: Date.now() (fresh API data).
 *        Read path: latest snapshot_at.getTime() (historical data).
 * @returns weekly_bought or null if insufficient data
 */
export function calcWeeklyBought(
  snapshots: Array<{ orders_quantity: bigint | number | null; snapshot_at: Date }>,
  currentOrders: number,
  currentTime?: number,
): number | null {
  const MAX_REASONABLE = 5000;
  const now = currentTime ?? Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  // 1. Prefer snapshot closest to 7 days before currentTime (best accuracy, ~×1.0 extrapolation)
  const sevenDaysAgo = now - SEVEN_DAYS_MS;
  let ref: (typeof snapshots)[0] | null = null;

  for (const snap of snapshots) {
    if (snap.orders_quantity != null && snap.snapshot_at.getTime() <= sevenDaysAgo) {
      ref = snap;
      break; // DESC: first match is closest to 7 days ago
    }
  }

  // 2. Fallback: any snapshot >= 24h before currentTime (prevent 6h ×28 extrapolation)
  if (!ref) {
    const oneDayAgo = now - ONE_DAY_MS;
    for (const snap of snapshots) {
      if (snap.orders_quantity != null && snap.snapshot_at.getTime() <= oneDayAgo) {
        ref = snap;
        break;
      }
    }
  }

  if (!ref || ref.orders_quantity == null) return null;

  const daysDiff = (now - ref.snapshot_at.getTime()) / (1000 * 60 * 60 * 24);
  const ordersDiff = currentOrders - Number(ref.orders_quantity);

  if (daysDiff < 0.5 || ordersDiff < 0) return null;

  const wb = Math.round((ordersDiff * 7) / daysDiff);
  return wb <= MAX_REASONABLE ? wb : null;
}

/**
 * @deprecated Use stored scraped weekly_bought from ProductSnapshot.weekly_bought_source='scraped'.
 * Kept as transitional fallback for products not yet scraped.
 *
 * Recalculate weekly_bought for a time series of snapshots.
 * Uses wider lookback (not just consecutive) with 7-day target and 24h minimum gap.
 * Replaces the old consecutive-delta approach that caused extrapolation errors.
 *
 * @param snapshots Ordered by snapshot_at ASC
 * @returns Array of weekly_bought values (same length as input)
 */
export function recalcWeeklyBoughtSeries(
  snapshots: Array<{
    orders_quantity: bigint | number | null;
    weekly_bought?: number | null;
    snapshot_at: Date;
  }>,
): number[] {
  const MAX_REASONABLE = 5000;
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

  return snapshots.map((snap, i) => {
    const stored = snap.weekly_bought ?? 0;
    if (i === 0 || snap.orders_quantity == null) {
      return stored > MAX_REASONABLE ? 0 : stored;
    }

    const snapTime = snap.snapshot_at.getTime();

    // Find best reference: closest to 7 days before this snapshot (search backwards in ASC array)
    const targetTime = snapTime - SEVEN_DAYS_MS;
    let ref: (typeof snapshots)[0] | null = null;

    for (let j = i - 1; j >= 0; j--) {
      if (snapshots[j].orders_quantity != null && snapshots[j].snapshot_at.getTime() <= targetTime) {
        ref = snapshots[j];
        break;
      }
    }

    // Fallback: any snapshot >= 24h before this one
    if (!ref) {
      const minTime = snapTime - ONE_DAY_MS;
      for (let j = i - 1; j >= 0; j--) {
        if (snapshots[j].orders_quantity != null && snapshots[j].snapshot_at.getTime() <= minTime) {
          ref = snapshots[j];
          break;
        }
      }
    }

    if (!ref || ref.orders_quantity == null) {
      return stored > MAX_REASONABLE ? 0 : stored;
    }

    const daysDiff = (snapTime - ref.snapshot_at.getTime()) / (1000 * 60 * 60 * 24);
    const curr = Number(snap.orders_quantity);
    const prevVal = Number(ref.orders_quantity);

    if (daysDiff < 0.5 || curr < prevVal) {
      return stored > MAX_REASONABLE ? 0 : stored;
    }

    const calculated = Math.round(((curr - prevVal) * 7) / daysDiff);
    return calculated <= MAX_REASONABLE ? calculated : (stored > MAX_REASONABLE ? 0 : stored);
  });
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

  // Breakeven analysis (variable-cost model, no fixed costs):
  // per_unit_margin = revenue_per_unit_after_commission - variable_costs_per_unit
  // breakeven_qty = total_commission / per_unit_margin (units needed to cover commission)
  // breakeven_price = minimum sell price to cover costs at 0% profit
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

// ============================================================
// Feature 11 — Trend Prediction ML (Ensemble Forecasting)
// ============================================================

export interface ForecastPoint {
  date: string;
  value: number;
  lower: number;
  upper: number;
}

export interface ForecastResult {
  method: string;
  predictions: ForecastPoint[];
  trend: 'up' | 'flat' | 'down';
  confidence: number;
  slope: number;
  metrics: { mae: number; std_dev: number };
}

/** Weighted Moving Average forecast */
export function forecastWMA(values: number[], horizon: number, window = 7): number[] {
  if (values.length < 2) return Array(horizon).fill(values[0] ?? 0);
  const w = Math.min(window, values.length);
  const weights = Array.from({ length: w }, (_, i) => i + 1);
  const weightSum = weights.reduce((a, b) => a + b, 0);

  const series = [...values];
  for (let h = 0; h < horizon; h++) {
    const slice = series.slice(-w);
    const wma = slice.reduce((acc, v, i) => acc + v * weights[i], 0) / weightSum;
    series.push(wma);
  }
  return series.slice(-horizon);
}

/** Double Exponential Smoothing (Holt's method) */
export function forecastHolt(values: number[], horizon: number, alpha = 0.3, beta = 0.1): number[] {
  if (values.length < 2) return Array(horizon).fill(values[0] ?? 0);

  let level = values[0];
  let trend = values[1] - values[0];

  for (let i = 1; i < values.length; i++) {
    const prevLevel = level;
    level = alpha * values[i] + (1 - alpha) * (prevLevel + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  return Array.from({ length: horizon }, (_, h) =>
    Math.max(0, level + (h + 1) * trend),
  );
}

/** Linear Regression forecast */
export function forecastLinear(values: number[], horizon: number): number[] {
  const n = values.length;
  if (n < 2) return Array(horizon).fill(values[0] ?? 0);

  const xs = values.map((_, i) => i);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * values[i], 0);
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;

  return Array.from({ length: horizon }, (_, h) =>
    Math.max(0, intercept + slope * (n + h)),
  );
}

/** Ensemble: average of WMA, Holt, and Linear with confidence intervals */
export function forecastEnsemble(
  values: number[],
  dates: string[],
  horizon = 7,
): ForecastResult {
  if (values.length < 2) {
    const v = values[0] ?? 0;
    const lastDate = new Date(dates[dates.length - 1] || new Date());
    return {
      method: 'ensemble',
      predictions: Array.from({ length: horizon }, (_, i) => {
        const d = new Date(lastDate);
        d.setDate(d.getDate() + i + 1);
        return { date: d.toISOString(), value: v, lower: v, upper: v };
      }),
      trend: 'flat',
      confidence: 0,
      slope: 0,
      metrics: { mae: 0, std_dev: 0 },
    };
  }

  const wma = forecastWMA(values, horizon);
  const holt = forecastHolt(values, horizon);
  const linear = forecastLinear(values, horizon);
  const ensemble = wma.map((_, i) => (wma[i] + holt[i] + linear[i]) / 3);

  // Residual std for confidence intervals
  const residuals = values.slice(1).map((v, i) => v - values[i]);
  const rMean = residuals.reduce((a, b) => a + b, 0) / (residuals.length || 1);
  const variance = residuals.reduce((s, r) => s + (r - rMean) ** 2, 0) / (residuals.length || 1);
  const std = Math.sqrt(variance);

  // Generate future dates
  const lastDate = new Date(dates[dates.length - 1] || new Date());
  const predictions: ForecastPoint[] = ensemble.map((val, i) => {
    const d = new Date(lastDate);
    d.setDate(d.getDate() + i + 1);
    const spread = 1.96 * std * Math.sqrt(i + 1);
    return {
      date: d.toISOString(),
      value: Number(val.toFixed(4)),
      lower: Number(Math.max(0, val - spread).toFixed(4)),
      upper: Number((val + spread).toFixed(4)),
    };
  });

  // Slope from linear regression
  const n = values.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((acc, v, i) => acc + i * v, 0);
  const sumX2 = values.reduce((acc, _, i) => acc + i * i, 0);
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;

  // Prediction-based trend: compare first vs last predicted value
  const firstPred = ensemble[0] ?? 0;
  const lastPred = ensemble[ensemble.length - 1] ?? 0;
  const changePct = firstPred !== 0 ? (lastPred - firstPred) / Math.abs(firstPred) : 0;
  const trend: 'up' | 'flat' | 'down' = changePct > 0.05 ? 'up' : changePct < -0.05 ? 'down' : 'flat';

  // Cross-validation MAE (last 3 points)
  const cvLen = Math.min(3, values.length - 2);
  let mae = 0;
  if (cvLen > 0) {
    for (let i = 0; i < cvLen; i++) {
      const idx = values.length - cvLen + i;
      const pred = forecastLinear(values.slice(0, idx), 1)[0];
      mae += Math.abs(values[idx] - pred);
    }
    mae /= cvLen;
  }

  const avgVal = sumY / n;
  const confidence = avgVal !== 0 ? Math.max(0, Math.min(1, 1 - std / Math.abs(avgVal))) : 0;

  return {
    method: 'ensemble',
    predictions,
    trend,
    confidence: Number(confidence.toFixed(3)),
    slope: Number(slope.toFixed(6)),
    metrics: { mae: Number(mae.toFixed(4)), std_dev: Number(std.toFixed(4)) },
  };
}

// ============================================================
// Feature 20 — Price Elasticity Calculator
// ============================================================

export interface ElasticityInput {
  price_old: number;
  price_new: number;
  qty_old: number;
  qty_new: number;
}

export interface ElasticityResult {
  elasticity: number;
  type: 'elastic' | 'inelastic' | 'unitary';
  revenue_old: number;
  revenue_new: number;
  revenue_change_pct: number;
  optimal_direction: 'raise' | 'lower' | 'keep';
  interpretation: string;
}

// ============================================================
// Feature 21 — Cannibalization Detection
// ============================================================

export interface CannibalizationPair {
  product_a_id: string;
  product_b_id: string;
  product_a_title: string;
  product_b_title: string;
  overlap_score: number; // 0-1
  reason: string;
}

export function detectCannibalization(
  products: Array<{
    id: string;
    title: string;
    category_id: number | null;
    score: number;
    weekly_bought: number;
    shop_id: string | null;
  }>,
): CannibalizationPair[] {
  const pairs: CannibalizationPair[] = [];
  for (let i = 0; i < products.length; i++) {
    for (let j = i + 1; j < products.length; j++) {
      const a = products[i];
      const b = products[j];
      if (a.shop_id !== b.shop_id || !a.shop_id) continue;

      let overlap = 0;
      const reasons: string[] = [];

      // Same category
      if (a.category_id && a.category_id === b.category_id) {
        overlap += 0.4;
        reasons.push('Bir xil kategoriya');
      }

      // Title similarity (simple word overlap)
      const wordsA = new Set(a.title.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
      const wordsB = new Set(b.title.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
      const common = [...wordsA].filter((w) => wordsB.has(w)).length;
      const totalUnique = new Set([...wordsA, ...wordsB]).size;
      const titleSim = totalUnique > 0 ? common / totalUnique : 0;
      if (titleSim > 0.3) {
        overlap += 0.3 * titleSim;
        reasons.push(`Nom o'xshashligi ${(titleSim * 100).toFixed(0)}%`);
      }

      // Similar score range
      const scoreDiff = Math.abs(a.score - b.score);
      if (scoreDiff < 0.5) {
        overlap += 0.2 * (1 - scoreDiff / 0.5);
        reasons.push('Yaqin score darajasi');
      }

      // Similar sales
      const maxSales = Math.max(a.weekly_bought, b.weekly_bought, 1);
      const salesSim = 1 - Math.abs(a.weekly_bought - b.weekly_bought) / maxSales;
      if (salesSim > 0.7) {
        overlap += 0.1 * salesSim;
        reasons.push('Yaqin sotuv hajmi');
      }

      if (overlap >= 0.4) {
        pairs.push({
          product_a_id: a.id,
          product_b_id: b.id,
          product_a_title: a.title,
          product_b_title: b.title,
          overlap_score: Number(Math.min(1, overlap).toFixed(3)),
          reason: reasons.join('; '),
        });
      }
    }
  }
  return pairs.sort((a, b) => b.overlap_score - a.overlap_score);
}

// ============================================================
// Feature 22 — Dead Stock Predictor
// ============================================================

export interface DeadStockResult {
  product_id: string;
  title: string;
  risk_level: 'high' | 'medium' | 'low';
  risk_score: number; // 0-1
  days_to_dead: number;
  factors: string[];
}

/**
 * Predict dead stock risk based on sales velocity decline and score trajectory.
 * `days_to_dead` = estimated days until sales velocity reaches zero
 *   (based on linear extrapolation of recent vs older avg weekly sales).
 * Returns 999 when no decline trend detected.
 */
export function predictDeadStock(
  snapshots: Array<{ score: number; weekly_bought: number; date: string }>,
  productId: string,
  title: string,
): DeadStockResult {
  const factors: string[] = [];
  let risk = 0;

  if (snapshots.length < 2) {
    return { product_id: productId, title, risk_level: 'low', risk_score: 0, days_to_dead: 999, factors: ['Yetarli data yo\'q'] };
  }

  // Recent sales trend
  const recentSales = snapshots.slice(-7).map((s) => s.weekly_bought);
  const avgRecent = recentSales.reduce((a, b) => a + b, 0) / recentSales.length;
  const olderSales = snapshots.slice(0, -7).map((s) => s.weekly_bought);
  const avgOlder = olderSales.length > 0 ? olderSales.reduce((a, b) => a + b, 0) / olderSales.length : avgRecent;

  if (avgRecent < 1) {
    risk += 0.4;
    factors.push('Haftalik sotuv deyarli 0');
  } else if (avgOlder > 0 && avgRecent / avgOlder < 0.3) {
    risk += 0.3;
    factors.push(`Sotuv ${((1 - avgRecent / avgOlder) * 100).toFixed(0)}% tushgan`);
  }

  // Score trend
  const scores = snapshots.map((s) => s.score);
  const recentScoreAvg = scores.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, scores.length);
  const olderScoreAvg = scores.slice(0, -7).length > 0
    ? scores.slice(0, -7).reduce((a, b) => a + b, 0) / scores.slice(0, -7).length
    : recentScoreAvg;

  if (recentScoreAvg < 1.0) {
    risk += 0.3;
    factors.push('Score juda past (<1.0)');
  } else if (olderScoreAvg > 0 && recentScoreAvg / olderScoreAvg < 0.5) {
    risk += 0.2;
    factors.push('Score keskin tushgan');
  }

  // Velocity decline
  if (recentSales.length >= 3) {
    const declining = recentSales.every((v, i) => i === 0 || v <= recentSales[i - 1]);
    if (declining) {
      risk += 0.15;
      factors.push('Doimiy sotuv pasayishi');
    }
  }

  // Estimate days to dead stock (guard against NaN: 0/0 or Infinity)
  const salesDeclineRate = avgOlder > 0 ? (avgOlder - avgRecent) / avgOlder : 0;
  const dailyDecline = salesDeclineRate > 0 && avgOlder > 0 ? (salesDeclineRate * avgOlder) / 7 : 0;
  const daysEstimate = dailyDecline > 0 ? Math.round(avgRecent / dailyDecline) : 999;

  const riskLevel: DeadStockResult['risk_level'] =
    risk >= 0.6 ? 'high' : risk >= 0.3 ? 'medium' : 'low';

  return {
    product_id: productId,
    title,
    risk_level: riskLevel,
    risk_score: Number(Math.min(1, risk).toFixed(3)),
    days_to_dead: Math.max(0, Math.min(daysEstimate, 999)),
    factors: factors.length > 0 ? factors : ['Xavf belgilari aniqlanmadi'],
  };
}

// ============================================================
// Feature 23 — Category Saturation Index
// ============================================================

export interface SaturationResult {
  category_id: number;
  saturation_index: number; // 0-1
  level: 'oversaturated' | 'saturated' | 'moderate' | 'underserved';
  seller_count: number;
  avg_score: number;
  avg_weekly_sales: number;
  top10_share_pct: number;
}

export function calculateSaturation(
  products: Array<{ score: number; weekly_bought: number; shop_id: string | null }>,
  categoryId: number,
): SaturationResult {
  const n = products.length;
  if (n === 0) {
    return {
      category_id: categoryId, saturation_index: 0, level: 'underserved',
      seller_count: 0, avg_score: 0, avg_weekly_sales: 0, top10_share_pct: 0,
    };
  }

  const uniqueSellers = new Set(products.map((p) => p.shop_id).filter(Boolean)).size;
  const totalSales = products.reduce((s, p) => s + p.weekly_bought, 0);
  const avgScore = products.reduce((s, p) => s + p.score, 0) / n;
  const avgSales = totalSales / n;

  // Top 10% market share
  const sorted = [...products].sort((a, b) => b.weekly_bought - a.weekly_bought);
  const top10Count = Math.max(1, Math.ceil(n * 0.1));
  const top10Sales = sorted.slice(0, top10Count).reduce((s, p) => s + p.weekly_bought, 0);
  const top10Share = totalSales > 0 ? top10Sales / totalSales : 0;

  // Saturation = f(seller_density, competition, concentration)
  const sellerDensity = Math.min(1, uniqueSellers / 50); // normalized: 50+ sellers = max
  const competitionIntensity = Math.min(1, n / 200);     // 200+ products = max
  const concentration = 1 - top10Share; // low concentration = more saturation

  const saturation = 0.40 * sellerDensity + 0.35 * competitionIntensity + 0.25 * concentration;

  const level: SaturationResult['level'] =
    saturation > 0.75 ? 'oversaturated' : saturation > 0.50 ? 'saturated' :
    saturation > 0.25 ? 'moderate' : 'underserved';

  return {
    category_id: categoryId,
    saturation_index: Number(saturation.toFixed(3)),
    level,
    seller_count: uniqueSellers,
    avg_score: Number(avgScore.toFixed(2)),
    avg_weekly_sales: Number(avgSales.toFixed(1)),
    top10_share_pct: Number((top10Share * 100).toFixed(1)),
  };
}

// ============================================================
// Feature 24 — Flash Sale Detection
// ============================================================

export interface FlashSaleResult {
  product_id: string;
  title: string;
  price_drop_pct: number;
  old_price: number;
  new_price: number;
  detected_at: string;
}

export function detectFlashSales(
  priceHistory: Array<{
    product_id: string;
    title: string;
    prices: Array<{ price: number; date: string }>;
  }>,
  threshold = 15,
): FlashSaleResult[] {
  const results: FlashSaleResult[] = [];
  for (const item of priceHistory) {
    if (item.prices.length < 2) continue;
    const sorted = [...item.prices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const prev = sorted[sorted.length - 2];
    const latest = sorted[sorted.length - 1];
    if (prev.price > 0 && latest.price < prev.price) {
      const dropPct = ((prev.price - latest.price) / prev.price) * 100;
      if (dropPct >= threshold) {
        results.push({
          product_id: item.product_id,
          title: item.title,
          price_drop_pct: Number(dropPct.toFixed(1)),
          old_price: prev.price,
          new_price: latest.price,
          detected_at: latest.date,
        });
      }
    }
  }
  return results.sort((a, b) => b.price_drop_pct - a.price_drop_pct);
}

// ============================================================
// Feature 25 — New Product Early Signal
// ============================================================

export interface EarlySignalResult {
  product_id: string;
  title: string;
  momentum_score: number;
  days_since_first: number;
  sales_velocity: number;
  score_growth: number;
}

export function detectEarlySignals(
  products: Array<{
    product_id: string;
    title: string;
    created_at: string;
    snapshots: Array<{ score: number; weekly_bought: number; date: string }>;
  }>,
  maxAgeDays = 30,
): EarlySignalResult[] {
  const now = Date.now();
  const results: EarlySignalResult[] = [];

  for (const p of products) {
    const ageMs = now - new Date(p.created_at).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays > maxAgeDays || p.snapshots.length < 2) continue;

    const scores = p.snapshots.map((s) => s.score);
    const sales = p.snapshots.map((s) => s.weekly_bought);
    const firstScore = scores[0] || 0;
    const lastScore = scores[scores.length - 1] || 0;
    const scoreGrowth = firstScore > 0 ? (lastScore - firstScore) / firstScore : lastScore > 0 ? 1 : 0;

    // weekly_bought is already a WEEKLY rate (ordersAmount snapshot delta * 7 / daysDiff)
    // salesVelocity = latest weekly rate (most recent snapshot), NOT divided by ageDays
    const latestSales = sales[sales.length - 1] || 0;
    const salesVelocity = latestSales;

    // Momentum = weighted combo of growth + velocity
    // Normalize velocity: 500/week = strong signal for Uzum products
    const momentum = 0.5 * Math.min(1, scoreGrowth) + 0.5 * Math.min(1, salesVelocity / 500);

    if (momentum > 0.2) {
      results.push({
        product_id: p.product_id,
        title: p.title,
        momentum_score: Number(momentum.toFixed(3)),
        days_since_first: Math.round(ageDays),
        sales_velocity: Number(salesVelocity.toFixed(1)),
        score_growth: Number((scoreGrowth * 100).toFixed(1)),
      });
    }
  }

  return results.sort((a, b) => b.momentum_score - a.momentum_score);
}

// ============================================================
// Feature 26 — Stock Cliff Alert
// ============================================================

export interface StockCliffResult {
  product_id: string;
  title: string;
  current_velocity: number; // units per day
  estimated_days_left: number;
  severity: 'critical' | 'warning' | 'ok';
}

export function detectStockCliff(
  products: Array<{
    product_id: string;
    title: string;
    weekly_bought: number;
    orders_quantity: number;
    total_available_amount?: number;
    snapshots: Array<{ weekly_bought: number; date: string }>;
  }>,
): StockCliffResult[] {
  const results: StockCliffResult[] = [];
  for (const p of products) {
    const recentSales = p.snapshots.slice(-7);
    if (recentSales.length < 2) continue;

    // weekly_bought is already weekly rate — average across recent snapshots, then /7 for daily
    const avgWeekly = recentSales.reduce((s, snap) => s + snap.weekly_bought, 0) / recentSales.length;
    const velocity = avgWeekly / 7; // per day

    if (velocity <= 0) continue;

    // Use real stock if available, otherwise estimate from orders_quantity heuristic
    const stock = p.total_available_amount ?? Math.max(0, p.orders_quantity * 0.1);
    const estDaysLeft = stock > 0 ? Math.round(stock / velocity) : 999;

    let severity: StockCliffResult['severity'] = 'ok';
    if (estDaysLeft < 7) {
      severity = 'critical';
    } else if (estDaysLeft < 14) {
      severity = 'warning';
    }

    if (severity !== 'ok') {
      results.push({
        product_id: p.product_id,
        title: p.title,
        current_velocity: Number(velocity.toFixed(2)),
        estimated_days_left: estDaysLeft,
        severity,
      });
    }
  }
  return results.sort((a, b) => a.estimated_days_left - b.estimated_days_left);
}

// ============================================================
// Feature 30 — Replenishment Planner
// ============================================================

export interface ReplenishmentPlan {
  product_id: string;
  title: string;
  avg_daily_sales: number;
  lead_time_days: number;
  safety_stock_days: number;
  reorder_point: number;
  suggested_order_qty: number;
  next_order_date: string;
}

export function planReplenishment(
  products: Array<{
    product_id: string;
    title: string;
    weekly_bought: number;
    current_stock?: number;
  }>,
  leadTimeDays = 14,
  safetyStockDays = 7,
  orderCycleDays = 30,
): ReplenishmentPlan[] {
  const now = new Date();
  return products.map((p) => {
    const dailySales = p.weekly_bought / 7;
    const reorderPoint = Math.ceil(dailySales * (leadTimeDays + safetyStockDays));
    const suggestedQty = Math.ceil(dailySales * orderCycleDays);
    const stock = p.current_stock ?? suggestedQty;
    const daysUntilReorder = dailySales > 0 ? Math.max(0, Math.floor((stock - reorderPoint) / dailySales)) : 999;
    const nextOrderDate = new Date(now);
    nextOrderDate.setDate(nextOrderDate.getDate() + daysUntilReorder);

    return {
      product_id: p.product_id,
      title: p.title,
      avg_daily_sales: Number(dailySales.toFixed(2)),
      lead_time_days: leadTimeDays,
      safety_stock_days: safetyStockDays,
      reorder_point: reorderPoint,
      suggested_order_qty: suggestedQty,
      next_order_date: nextOrderDate.toISOString().split('T')[0],
    };
  }).sort((a, b) => new Date(a.next_order_date).getTime() - new Date(b.next_order_date).getTime());
}

export function calculateElasticity(input: ElasticityInput): ElasticityResult {
  const { price_old, price_new, qty_old, qty_new } = input;

  const pctPriceChange = ((price_new - price_old) / price_old) * 100;
  const pctQtyChange = ((qty_new - qty_old) / qty_old) * 100;

  const elasticity = pctPriceChange !== 0 ? Math.abs(pctQtyChange / pctPriceChange) : 0;

  const type: ElasticityResult['type'] =
    elasticity > 1 ? 'elastic' : elasticity < 1 ? 'inelastic' : 'unitary';

  const revenue_old = price_old * qty_old;
  const revenue_new = price_new * qty_new;
  const revenue_change_pct = revenue_old !== 0 ? ((revenue_new - revenue_old) / revenue_old) * 100 : 0;

  let optimal_direction: ElasticityResult['optimal_direction'] = 'keep';
  let interpretation = '';

  if (type === 'elastic') {
    optimal_direction = 'lower';
    interpretation = "Talab elastik — narx pasaytirish sotuv hajmini ko'paytiradi va daromadni oshiradi";
  } else if (type === 'inelastic') {
    optimal_direction = 'raise';
    interpretation = "Talab noelastik — narx oshirish daromadni oshiradi, sotuv kam tushadi";
  } else {
    optimal_direction = 'keep';
    interpretation = "Birlik elastiklik — narx o'zgarishi daromadni deyarli o'zgartirmaydi";
  }

  return {
    elasticity: Number(elasticity.toFixed(3)),
    type,
    revenue_old: Math.round(revenue_old),
    revenue_new: Math.round(revenue_new),
    revenue_change_pct: Number(revenue_change_pct.toFixed(2)),
    optimal_direction,
    interpretation,
  };
}
