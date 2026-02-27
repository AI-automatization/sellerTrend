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
