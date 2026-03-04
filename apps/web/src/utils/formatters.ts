// ─── Shared Formatters & Chart Config ────────────────────────────────────────
// Extracted from ProductPage, SourcingPage, CompetitorSection to avoid duplication.

// Re-export chart tokens so existing imports keep working
export { scoreColor, glassTooltip, CHART_COLORS, SCORE_COLORS, AXIS_TICK, GRID_STROKE, CHART_ANIMATION_MS } from './chartTokens';

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
