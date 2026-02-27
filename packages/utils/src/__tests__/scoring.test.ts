import { describe, it, expect } from 'vitest';
import {
  calculateScore,
  parseUzumProductId,
  parseUzumCategoryId,
  getSupplyPressure,
  calculateTrustScore,
  calculateNicheScore,
  calculateProfit,
  calculateElasticity,
  forecastWMA,
  forecastHolt,
  forecastLinear,
  detectFlashSales,
  calculateSaturation,
  detectCannibalization,
} from '../index';

// ============================================================
// calculateScore
// ============================================================
describe('calculateScore', () => {
  it('returns 0 when all inputs are zero', () => {
    const result = calculateScore({
      weekly_bought: 0,
      orders_quantity: 0,
      rating: 0,
      supply_pressure: 0,
    });
    expect(result).toBe(0);
  });

  it('handles null weekly_bought as 0', () => {
    const result = calculateScore({
      weekly_bought: null,
      orders_quantity: 100,
      rating: 4.5,
      supply_pressure: 1,
    });
    const expected =
      0.55 * Math.log(1) +
      0.25 * Math.log(1 + 100) +
      0.10 * 4.5 +
      0.10 * 1;
    expect(result).toBeCloseTo(expected, 6);
  });

  it('computes correct score for typical product', () => {
    const result = calculateScore({
      weekly_bought: 50,
      orders_quantity: 1000,
      rating: 4.8,
      supply_pressure: 1.0,
    });
    const expected =
      0.55 * Math.log(51) +
      0.25 * Math.log(1001) +
      0.10 * 4.8 +
      0.10 * 1.0;
    expect(result).toBeCloseTo(expected, 6);
  });

  it('higher weekly_bought yields higher score (dominant weight)', () => {
    const low = calculateScore({ weekly_bought: 10, orders_quantity: 100, rating: 4, supply_pressure: 0.5 });
    const high = calculateScore({ weekly_bought: 500, orders_quantity: 100, rating: 4, supply_pressure: 0.5 });
    expect(high).toBeGreaterThan(low);
  });

  it('FBO supply pressure increases score vs FBS', () => {
    const fbo = calculateScore({ weekly_bought: 50, orders_quantity: 200, rating: 4.0, supply_pressure: 1.0 });
    const fbs = calculateScore({ weekly_bought: 50, orders_quantity: 200, rating: 4.0, supply_pressure: 0.5 });
    expect(fbo).toBeGreaterThan(fbs);
  });
});

// ============================================================
// parseUzumProductId
// ============================================================
describe('parseUzumProductId', () => {
  it('parses simple product URL', () => {
    expect(parseUzumProductId('https://uzum.uz/product/12345')).toBe(12345);
  });

  it('parses URL with locale prefix', () => {
    expect(parseUzumProductId('https://uzum.uz/ru/product/molochnaya-smes-155927')).toBe(155927);
  });

  it('parses URL with skuId query param', () => {
    expect(parseUzumProductId('https://uzum.uz/ru/product/molochnaya-smes-dlya-155927?skuId=232522')).toBe(155927);
  });

  it('returns null for non-product URL', () => {
    expect(parseUzumProductId('https://uzum.uz/ru/category/electronics')).toBeNull();
  });
});

// ============================================================
// parseUzumCategoryId
// ============================================================
describe('parseUzumCategoryId', () => {
  it('parses plain number string', () => {
    expect(parseUzumCategoryId('879')).toBe(879);
  });

  it('parses double-dash URL format', () => {
    expect(parseUzumCategoryId('https://uzum.uz/ru/category/smartfony--879')).toBe(879);
  });

  it('parses single-dash URL format', () => {
    expect(parseUzumCategoryId('https://uzum.uz/ru/category/muzhskie-krossovki-13983')).toBe(13983);
  });

  it('trims whitespace from input', () => {
    expect(parseUzumCategoryId('  879  ')).toBe(879);
  });

  it('returns null for non-category URL', () => {
    expect(parseUzumCategoryId('https://uzum.uz/ru/product/something-123')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseUzumCategoryId('')).toBeNull();
  });

  it('handles URL with trailing query params', () => {
    expect(parseUzumCategoryId('https://uzum.uz/ru/category/smartfony--879?page=2')).toBe(879);
  });
});

// ============================================================
// getSupplyPressure
// ============================================================
describe('getSupplyPressure', () => {
  it('returns 1.0 for FBO', () => {
    expect(getSupplyPressure('FBO')).toBe(1.0);
  });

  it('returns 0.5 for FBS', () => {
    expect(getSupplyPressure('FBS')).toBe(0.5);
  });
});

// ============================================================
// calculateTrustScore
// ============================================================
describe('calculateTrustScore', () => {
  it('returns 0 when all inputs are zero', () => {
    const result = calculateTrustScore({
      orders_quantity: 0,
      rating: 0,
      feedback_quantity: 0,
      fbo_ratio: 0,
      age_months: 0,
    });
    expect(result).toBe(0);
  });

  it('returns value between 0 and 1 for typical shop', () => {
    const result = calculateTrustScore({
      orders_quantity: 5000,
      rating: 4.5,
      feedback_quantity: 200,
      fbo_ratio: 0.8,
      age_months: 12,
    });
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('caps age contribution at 24 months', () => {
    const at24 = calculateTrustScore({ orders_quantity: 0, rating: 0, feedback_quantity: 0, fbo_ratio: 0, age_months: 24 });
    const at48 = calculateTrustScore({ orders_quantity: 0, rating: 0, feedback_quantity: 0, fbo_ratio: 0, age_months: 48 });
    expect(at24).toBeCloseTo(at48, 6);
  });

  it('higher rating increases trust score', () => {
    const low = calculateTrustScore({ orders_quantity: 100, rating: 2.0, feedback_quantity: 10, fbo_ratio: 0.5, age_months: 6 });
    const high = calculateTrustScore({ orders_quantity: 100, rating: 5.0, feedback_quantity: 10, fbo_ratio: 0.5, age_months: 6 });
    expect(high).toBeGreaterThan(low);
  });
});

// ============================================================
// calculateNicheScore
// ============================================================
describe('calculateNicheScore', () => {
  it('returns max score when demand=1, competition=0, growth=1, margin=1', () => {
    const result = calculateNicheScore({ demand: 1, competition: 0, growth: 1, margin: 1 });
    // 0.40*1 + 0.30*(1-0) + 0.20*1 + 0.10*1 = 1.0
    expect(result).toBeCloseTo(1.0, 6);
  });

  it('returns 0.30 when all inputs are zero (because 1-competition=1)', () => {
    const result = calculateNicheScore({ demand: 0, competition: 0, growth: 0, margin: 0 });
    // 0 + 0.30*(1-0) + 0 + 0 = 0.30
    expect(result).toBeCloseTo(0.30, 6);
  });

  it('high competition reduces niche score', () => {
    const lowComp = calculateNicheScore({ demand: 0.5, competition: 0.2, growth: 0.5, margin: 0.5 });
    const highComp = calculateNicheScore({ demand: 0.5, competition: 0.9, growth: 0.5, margin: 0.5 });
    expect(lowComp).toBeGreaterThan(highComp);
  });
});

// ============================================================
// calculateProfit
// ============================================================
describe('calculateProfit', () => {
  it('computes correct profit for a typical scenario', () => {
    const result = calculateProfit({
      sell_price_uzs: 100000,
      unit_cost_usd: 5,
      usd_to_uzs: 12800,
      uzum_commission_pct: 10,
      fbo_cost_uzs: 2000,
      ads_spend_uzs: 1000,
      quantity: 10,
    });
    // revenue = 100000 * 10 = 1_000_000
    expect(result.revenue).toBe(1000000);
    // unit_cost_uzs = 5 * 12800 = 64000
    expect(result.unit_cost_uzs).toBe(64000);
    // commission = 1000000 * 0.10 = 100000
    expect(result.commission).toBe(100000);
    // net_profit should be revenue - total_cost
    expect(result.net_profit).toBe(result.revenue - result.total_cost);
  });

  it('handles zero quantity', () => {
    const result = calculateProfit({
      sell_price_uzs: 50000,
      unit_cost_usd: 3,
      usd_to_uzs: 12800,
      uzum_commission_pct: 10,
      quantity: 0,
    });
    expect(result.revenue).toBe(0);
    expect(result.margin_pct).toBe(0);
  });

  it('returns negative net_profit when cost exceeds revenue', () => {
    const result = calculateProfit({
      sell_price_uzs: 10000,
      unit_cost_usd: 10,
      usd_to_uzs: 12800,
      uzum_commission_pct: 15,
      quantity: 1,
    });
    expect(result.net_profit).toBeLessThan(0);
  });

  it('returns breakeven_qty = -1 when margin per unit is non-positive', () => {
    const result = calculateProfit({
      sell_price_uzs: 1000,
      unit_cost_usd: 10,
      usd_to_uzs: 12800,
      uzum_commission_pct: 50,
      quantity: 1,
    });
    // per_unit_margin = 1000*(1-0.5) - 128000 = 500 - 128000 < 0
    expect(result.breakeven_qty).toBe(-1);
  });
});

// ============================================================
// calculateElasticity
// ============================================================
describe('calculateElasticity', () => {
  it('detects elastic demand (|E| > 1)', () => {
    const result = calculateElasticity({
      price_old: 100,
      price_new: 90,   // -10%
      qty_old: 100,
      qty_new: 130,    // +30%
    });
    expect(result.type).toBe('elastic');
    expect(result.elasticity).toBeGreaterThan(1);
    expect(result.optimal_direction).toBe('lower');
  });

  it('detects inelastic demand (|E| < 1)', () => {
    const result = calculateElasticity({
      price_old: 100,
      price_new: 80,    // -20%
      qty_old: 100,
      qty_new: 105,     // +5%
    });
    expect(result.type).toBe('inelastic');
    expect(result.elasticity).toBeLessThan(1);
    expect(result.optimal_direction).toBe('raise');
  });

  it('returns elasticity 0 when price does not change', () => {
    const result = calculateElasticity({
      price_old: 100,
      price_new: 100,
      qty_old: 50,
      qty_new: 60,
    });
    expect(result.elasticity).toBe(0);
  });

  it('computes revenue change correctly', () => {
    const result = calculateElasticity({
      price_old: 200,
      price_new: 150,
      qty_old: 10,
      qty_new: 20,
    });
    expect(result.revenue_old).toBe(2000);
    expect(result.revenue_new).toBe(3000);
    expect(result.revenue_change_pct).toBeCloseTo(50, 1);
  });
});

// ============================================================
// forecastWMA / forecastHolt / forecastLinear
// ============================================================
describe('forecast functions', () => {
  it('forecastWMA returns correct number of points', () => {
    const result = forecastWMA([10, 20, 30, 40, 50], 3);
    expect(result).toHaveLength(3);
  });

  it('forecastWMA handles single value', () => {
    const result = forecastWMA([42], 5);
    expect(result).toHaveLength(5);
    expect(result.every((v) => v === 42)).toBe(true);
  });

  it('forecastHolt returns non-negative values', () => {
    const result = forecastHolt([100, 90, 80, 70, 60], 5);
    expect(result).toHaveLength(5);
    result.forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
  });

  it('forecastLinear predicts upward trend', () => {
    const result = forecastLinear([10, 20, 30, 40, 50], 3);
    expect(result).toHaveLength(3);
    // Linear trend continues: ~60, ~70, ~80
    expect(result[0]).toBeCloseTo(60, 0);
    expect(result[1]).toBeCloseTo(70, 0);
  });

  it('forecastLinear handles empty values', () => {
    const result = forecastLinear([], 3);
    expect(result).toHaveLength(3);
    expect(result.every((v) => v === 0)).toBe(true);
  });
});

// ============================================================
// detectFlashSales
// ============================================================
describe('detectFlashSales', () => {
  it('detects a 20% price drop as flash sale (default threshold 15%)', () => {
    const results = detectFlashSales([
      {
        product_id: 'p1',
        title: 'Test Product',
        prices: [
          { price: 100000, date: '2026-02-01' },
          { price: 80000, date: '2026-02-02' },
        ],
      },
    ]);
    expect(results).toHaveLength(1);
    expect(results[0].price_drop_pct).toBe(20);
  });

  it('ignores drops below threshold', () => {
    const results = detectFlashSales([
      {
        product_id: 'p1',
        title: 'Test',
        prices: [
          { price: 100000, date: '2026-02-01' },
          { price: 90000, date: '2026-02-02' },
        ],
      },
    ]);
    expect(results).toHaveLength(0);
  });

  it('ignores price increases', () => {
    const results = detectFlashSales([
      {
        product_id: 'p1',
        title: 'Test',
        prices: [
          { price: 80000, date: '2026-02-01' },
          { price: 100000, date: '2026-02-02' },
        ],
      },
    ]);
    expect(results).toHaveLength(0);
  });

  it('skips products with less than 2 price points', () => {
    const results = detectFlashSales([
      { product_id: 'p1', title: 'Test', prices: [{ price: 100000, date: '2026-02-01' }] },
    ]);
    expect(results).toHaveLength(0);
  });
});

// ============================================================
// calculateSaturation
// ============================================================
describe('calculateSaturation', () => {
  it('returns underserved for empty product list', () => {
    const result = calculateSaturation([], 123);
    expect(result.level).toBe('underserved');
    expect(result.saturation_index).toBe(0);
    expect(result.seller_count).toBe(0);
  });

  it('increases saturation with more unique sellers', () => {
    const fewSellers = calculateSaturation(
      Array.from({ length: 10 }, (_, i) => ({ score: 3, weekly_bought: 10, shop_id: `s${i % 3}` })),
      1,
    );
    const manySellers = calculateSaturation(
      Array.from({ length: 10 }, (_, i) => ({ score: 3, weekly_bought: 10, shop_id: `s${i}` })),
      1,
    );
    expect(manySellers.saturation_index).toBeGreaterThan(fewSellers.saturation_index);
  });
});

// ============================================================
// detectCannibalization
// ============================================================
describe('detectCannibalization', () => {
  it('detects cannibalization between same-shop same-category products', () => {
    const pairs = detectCannibalization([
      { id: '1', title: 'Samsung Galaxy S24 telefon', category_id: 100, score: 4.0, weekly_bought: 50, shop_id: 'shop1' },
      { id: '2', title: 'Samsung Galaxy S24 Ultra telefon', category_id: 100, score: 4.1, weekly_bought: 48, shop_id: 'shop1' },
    ]);
    expect(pairs.length).toBeGreaterThanOrEqual(1);
    expect(pairs[0].overlap_score).toBeGreaterThan(0);
  });

  it('does not detect cannibalization across different shops', () => {
    const pairs = detectCannibalization([
      { id: '1', title: 'Same Product Name', category_id: 100, score: 4.0, weekly_bought: 50, shop_id: 'shopA' },
      { id: '2', title: 'Same Product Name', category_id: 100, score: 4.0, weekly_bought: 50, shop_id: 'shopB' },
    ]);
    expect(pairs).toHaveLength(0);
  });

  it('does not detect cannibalization when shop_id is null', () => {
    const pairs = detectCannibalization([
      { id: '1', title: 'Product A', category_id: 100, score: 4.0, weekly_bought: 50, shop_id: null },
      { id: '2', title: 'Product A', category_id: 100, score: 4.0, weekly_bought: 50, shop_id: null },
    ]);
    expect(pairs).toHaveLength(0);
  });
});
