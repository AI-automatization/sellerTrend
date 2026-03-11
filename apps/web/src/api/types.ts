// ─── Centralized API Response Types ──────────────────────────────────────────
// All interfaces used across pages. Import from here instead of defining inline.

// ─── Common ──────────────────────────────────────────────────────────────────

export type Trend = 'up' | 'flat' | 'down';

// ─── Product Domain ──────────────────────────────────────────────────────────

export interface AnalyzeResult {
  product_id: number;
  title: string;
  rating: number | null;
  feedback_quantity: number | null;
  orders_quantity: number | null;
  weekly_bought: number | null;
  score: number;
  sell_price: number | null;
  total_available_amount?: number;
  ai_explanation: string[] | null;
  snapshot_id?: string;
  photo_url?: string | null;
}

export interface WeeklyTrend {
  weekly_sold: number | null;
  prev_weekly_sold: number | null;
  delta: number | null;
  delta_pct: number | null;
  trend: Trend;
  daily_breakdown: Array<{ date: string; orders: number; daily_sold: number }>;
  advice: { type: string; title: string; message: string; urgency: 'high' | 'medium' | 'low' };
  score_change: number | null;
  last_updated: string | null;
}

export interface Forecast {
  forecast_7d: number;
  trend: Trend;
  slope: number;
}

export interface Snapshot {
  score: number;
  weekly_bought: number | null;
  orders_quantity: string;
  snapshot_at: string;
}

export interface ChartPoint {
  date: string;
  score: number;
}

export interface ForecastPrediction {
  date: string;
  value: number;
  lower: number;
  upper: number;
}

export interface ForecastMetrics {
  mae: number;
  rmse: number;
}

export interface ForecastDetail {
  trend: Trend;
  predictions: ForecastPrediction[];
  confidence: number;
  metrics?: ForecastMetrics;
}

export interface MlForecast {
  score_forecast: ForecastDetail;
  sales_forecast: ForecastDetail;
  data_points: number;
  snapshots: Array<{ date: string; score: number }>;
}

export interface TrendAnalysis {
  analysis: string;
  factors: string[];
  recommendation: string;
}

export interface TrackedProduct {
  product_id: string;
  title: string;
  rating: number | string | null;
  feedback_quantity: number | null;
  orders_quantity: string | null;
  score: number | null;
  prev_score: number | null;
  trend: Trend | null;
  weekly_bought: number | null;
  sell_price: number | null;
  tracked_since: string;
  photo_url?: string | null;
}

// ─── Search Domain ──────────────────────────────────────────────────────────

export interface SearchProduct {
  id: number;
  productId?: number;
  title: string;
  sellPrice?: number;
  minSellPrice?: number;
  rating: number;
  ordersQuantity?: number;
  ordersAmount?: number;
  reviewsAmount?: number;
  photoUrl?: string;
}

// ─── Revenue Estimator Domain ────────────────────────────────────────────────

export type CompetitionLevel = 'low' | 'medium' | 'high';

export interface RevenueEstimate {
  product_id: string;
  product_title: string;
  sell_price: number;
  weekly_bought: number;
  estimated_monthly_revenue: number;
  estimated_margin_30pct: number;
  competition_level: CompetitionLevel;
  recommendation: string;
}

// ─── Achievement Domain ─────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  code: string;
  title_key: string;
  description_key: string;
  icon: string;
  earned: boolean;
  earned_at: string | null;
}

// ─── Admin Domain ────────────────────────────────────────────────────────────

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';

export interface Account {
  id: string;
  name: string;
  phone: string | null;
  status: 'ACTIVE' | 'PAYMENT_DUE' | 'SUSPENDED';
  balance: string;
  daily_fee: string | null;
  created_at: string;
  users: { id: string; email: string; role: Role }[];
  transaction_count: number;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  is_active: boolean;
  account_id: string;
  account_name: string;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  account_name: string | null;
  user_email: string | null;
  old_value: unknown;
  new_value: unknown;
  details: unknown;
  ip: string | null;
  source: 'admin' | 'user';
  created_at: string;
}

// ─── Billing Domain ──────────────────────────────────────────────────────────

export interface Balance {
  balance: string;
  status: string;
  daily_fee: string;
}

// ─── Leaderboard Domain ──────────────────────────────────────────────────────

export interface LeaderItem {
  rank: number;
  product_id: string;
  title: string;
  score: number | null;
  weekly_bought: number | null;
  orders_quantity: string | null;
  sell_price: number | null;
}

export interface CategoryLeader {
  category_id: string;
  category_name: string;
  leaders: LeaderItem[];
}

// ─── Feedback Domain ─────────────────────────────────────────────────────────

export interface Ticket {
  id: string;
  subject: string;
  type: string;
  priority: string;
  status: string;
  created_at: string;
  message_count?: number;
  last_message?: string;
}

export interface TicketMessage {
  id: string;
  content: string;
  is_admin: boolean;
  sender_email?: string;
  created_at: string;
}

// ─── Sourcing Domain ─────────────────────────────────────────────────────────

export type SourcingPlatform = 'aliexpress' | '1688' | 'taobao';

export interface BrightDataProduct {
  platform: SourcingPlatform;
  title: string;
  price: number;
  currency: string;
  priceUsd: number;
  imageUrl: string;
  productUrl: string;
  rating?: number;
  orders?: number;
  shippingCost?: number;
}

export interface SourcingComparison {
  productId: string;
  query: string;
  platforms: {
    aliexpress: BrightDataProduct[];
    taobao: BrightDataProduct[];
    '1688': BrightDataProduct[];
  };
  searchedAt: string;
}

// ─── Consultation Domain ─────────────────────────────────────────────────────

export interface ConsultationItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  price_uzs: string;
  duration_min: number;
  consultant_name?: string;
  client_name?: string;
  status?: string;
  scheduled_at?: string;
  rating?: number;
  created_at: string;
}
