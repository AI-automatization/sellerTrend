export type Tab =
  | 'cannibalization'
  | 'dead-stock'
  | 'saturation'
  | 'flash-sales'
  | 'early-signals'
  | 'stock-cliffs'
  | 'ranking'
  | 'checklist'
  | 'price-test'
  | 'replenishment';

export interface TabConfig {
  key: Tab;
  label: string;
  emoji: string;
  shortLabel: string;
}

export const TABS: TabConfig[] = [
  { key: 'cannibalization', label: 'Kannibalizatsiya', emoji: '\u{1F500}', shortLabel: 'Kannibal.' },
  { key: 'dead-stock', label: 'Dead Stock', emoji: '\u{1F480}', shortLabel: 'Dead Stock' },
  { key: 'saturation', label: 'Saturatsiya', emoji: '\u{1F4CA}', shortLabel: 'Saturats.' },
  { key: 'flash-sales', label: 'Flash Sale', emoji: '\u26A1', shortLabel: 'Flash' },
  { key: 'early-signals', label: 'Erta Signal', emoji: '\u{1F331}', shortLabel: 'Erta' },
  { key: 'stock-cliffs', label: 'Stock Alert', emoji: '\u{1F4E6}', shortLabel: 'Stock' },
  { key: 'ranking', label: 'Ranking', emoji: '\u{1F4C8}', shortLabel: 'Ranking' },
  { key: 'checklist', label: 'Checklist', emoji: '\u2705', shortLabel: 'Check' },
  { key: 'price-test', label: 'Narx Test', emoji: '\u{1F9EA}', shortLabel: 'A/B Test' },
  { key: 'replenishment', label: 'Zahira', emoji: '\u{1F504}', shortLabel: 'Zahira' },
];
