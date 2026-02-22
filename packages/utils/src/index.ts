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
 * Sleep utility for rate limiting
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
