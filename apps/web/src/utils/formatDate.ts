// ─── Centralized date formatting ─────────────────────────────────────────────
// Avoids scattered toLocaleDateString/toLocaleString calls with inconsistent locales.

const DEFAULT_LOCALE = 'ru-RU';

/** Short date: "5 мар." / "12 янв." */
export function formatShortDate(date: string | Date): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(DEFAULT_LOCALE, { month: 'short', day: 'numeric' });
}

/** Full date-time: "05.03.2026, 14:30" */
export function formatDateTime(date: string | Date): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString(DEFAULT_LOCALE);
}

/** Date only: "05.03.2026" */
export function formatDate(date: string | Date): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(DEFAULT_LOCALE);
}

/** ISO date part: "2026-03-05" */
export function formatISODate(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Weekday + short date: "пн, 5 мар." */
export function formatWeekdayDate(date: string | Date): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(DEFAULT_LOCALE, { weekday: 'short', day: 'numeric', month: 'short' });
}
