// ─── Discovery shared types & constants ─────────────────────────────────────

export interface Run {
  id: string;
  category_id: string;
  category_name?: string | null;
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
  rating?: number | null;
  feedback_quantity?: number | null;
  photo_url?: string | null;
  total_available_amount?: string | null;
  shop_title?: string | null;
  shop_rating?: number | null;
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
  { id: 10020, labelKey: 'discovery.cat.electronics', title: 'Электроника' },
  { id: 879,   labelKey: 'discovery.cat.smartphones', title: 'Смартфоны' },
  { id: 10014, labelKey: 'discovery.cat.clothing',    title: 'Одежда' },
  { id: 10012, labelKey: 'discovery.cat.beauty',      title: 'Красота и уход' },
  { id: 10004, labelKey: 'discovery.cat.appliances',  title: 'Бытовая техника' },
  { id: 10018, labelKey: 'discovery.cat.household',   title: 'Товары для дома' },
  { id: 10007, labelKey: 'discovery.cat.kids',        title: 'Детские товары' },
  { id: 10015, labelKey: 'discovery.cat.sports',      title: 'Спорт и отдых' },
];

export const MONTH_NAMES = [
  'Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn',
  'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek',
];
