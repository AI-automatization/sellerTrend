// ─── Discovery shared types & constants ─────────────────────────────────────

export interface Run {
  id: string;
  category_id: string;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';
  total_products: number | null;
  processed: number | null;
  winner_count: number;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface Winner {
  rank: number;
  product_id: string;
  title: string;
  score: number | null;
  weekly_bought: number | null;
  orders_quantity: string | null;
  sell_price: string | null;
}

export interface RunDetail extends Omit<Run, 'winner_count'> {
  winners: Winner[];
}

export interface SeasonalEvent {
  id: string;
  season_name: string;
  season_start: number;
  season_end: number;
  avg_score_boost: number | null;
  peak_week: number | null;
}

export interface NicheItem {
  product_id: string;
  title: string;
  niche_score: number;
  weekly_bought: number | null;
  orders_quantity: number | null;
  sell_price: number | null;
}

export interface GapItem {
  product_id: string;
  title: string;
  weekly_bought: number | null;
  seller_count: number | null;
  gap_ratio: number;
}

export const POPULAR_CATEGORIES = [
  { id: 676, label: 'Elektronika' },
  { id: 879, label: 'Smartfonlar' },
  { id: 4830, label: 'Kiyim' },
  { id: 10012, label: "Go'zallik" },
  { id: 10091, label: 'Makiyaj' },
  { id: 3854, label: 'Maishiy texnika' },
  { id: 4073, label: "Uy-ro'zg'or" },
  { id: 6820, label: 'Bolalar' },
  { id: 5058, label: 'Sport' },
  { id: 10165, label: 'Soch parvarishi' },
];

export const MONTH_NAMES = [
  'Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn',
  'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek',
];
