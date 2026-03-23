const PERIOD_HOURS: Record<string, number> = {
  '1h': 1,
  '6h': 6,
  '24h': 24,
  '7d': 7 * 24,
};

const DEFAULT_HOURS = 24;

/**
 * Parse a period string (e.g. '1h', '6h', '24h', '7d') into hours.
 */
export function parsePeriodHours(period: string): number {
  return PERIOD_HOURS[period] ?? DEFAULT_HOURS;
}

/**
 * Parse a period string into milliseconds.
 */
export function parsePeriodMs(period: string): number {
  return parsePeriodHours(period) * 60 * 60_000;
}
