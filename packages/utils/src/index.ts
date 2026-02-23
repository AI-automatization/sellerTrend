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
  metrics: { mae: number; rmse: number };
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
      metrics: { mae: 0, rmse: 0 },
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

  const trend: 'up' | 'flat' | 'down' = slope > 0.01 ? 'up' : slope < -0.01 ? 'down' : 'flat';

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
    metrics: { mae: Number(mae.toFixed(4)), rmse: Number(std.toFixed(4)) },
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
