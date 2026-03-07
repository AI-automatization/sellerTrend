/**
 * Parse a period string (e.g. '1h', '6h', '24h', '7d') into milliseconds.
 * Returns 1 hour in ms as default for unrecognized periods.
 */
export function parsePeriodMs(period: string): number {
  switch (period) {
    case '1h':
      return 60 * 60_000;
    case '6h':
      return 6 * 60 * 60_000;
    case '24h':
      return 24 * 60 * 60_000;
    case '7d':
      return 7 * 24 * 60 * 60_000;
    default:
      return 60 * 60_000;
  }
}

/**
 * Parse a period string into hours.
 * Returns 24 as default for unrecognized periods.
 */
export function parsePeriodHours(period: string): number {
  switch (period) {
    case '1h':
      return 1;
    case '6h':
      return 6;
    case '24h':
      return 24;
    case '7d':
      return 7 * 24;
    default:
      return 24;
  }
}
