// ─── Shared Formatters & Chart Config ────────────────────────────────────────
// Extracted from ProductPage, SourcingPage, CompetitorSection to avoid duplication.

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

export function scoreColor(score: number | null | undefined) {
  if (score == null) return '#4b5563';
  if (score >= 6) return '#22c55e';
  if (score >= 4) return '#f59e0b';
  return '#6b7280';
}

/** Recharts glass-morphism tooltip config */
export const glassTooltip = {
  contentStyle: {
    background: 'var(--chart-tooltip-bg)',
    backdropFilter: 'blur(8px)',
    border: '1px solid var(--chart-tooltip-border)',
    borderRadius: 12,
    fontSize: 12,
    color: 'var(--chart-tooltip-text)',
  },
  labelStyle: { color: 'var(--chart-tick)' },
};
