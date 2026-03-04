// ─── Chart Design Tokens ─────────────────────────────────────────────────────
// Single source of truth for all Recharts styling across the app.
// Colors use plain hex (works in both light/dark), layout uses CSS variables.

/** Categorical palette — 8 distinct hues for multi-series charts */
export const CHART_COLORS = [
  '#6366f1', // indigo
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#14b8a6', // teal
] as const;

/** Score-based semantic colors */
export const SCORE_COLORS = {
  excellent: '#22c55e',
  good: '#f59e0b',
  average: '#6b7280',
  poor: '#ef4444',
  unknown: '#4b5563',
} as const;

/** Map numeric score → color */
export function scoreColor(score: number | null | undefined): string {
  if (score == null) return SCORE_COLORS.unknown;
  if (score >= 6) return SCORE_COLORS.excellent;
  if (score >= 4) return SCORE_COLORS.good;
  if (score >= 2) return SCORE_COLORS.average;
  return SCORE_COLORS.poor;
}

/** Glass-morphism tooltip (reads CSS variables set in index.css) */
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
} as const;

/** Standard axis tick props */
export const AXIS_TICK = { fontSize: 10, fill: 'var(--chart-tick)' } as const;
export const AXIS_TICK_11 = { fontSize: 11, fill: 'var(--chart-tick)' } as const;

/** Grid line stroke (CSS variable) */
export const GRID_STROKE = 'var(--chart-grid)';

/** Consistent animation duration for all Recharts elements */
export const CHART_ANIMATION_MS = 800;
