// Account / Auth types
export type AccountStatus = 'ACTIVE' | 'PAYMENT_DUE' | 'SUSPENDED';
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';
export type TransactionType = 'CHARGE' | 'DEPOSIT' | 'REFUND';

// Uzum types
export type StockType = 'FBO' | 'FBS';

/** Uzum REST API /api/v2/product/{id} response shape (payload.data) */
export interface UzumProductDetail {
  productId: number;
  title: string;
  ordersAmount: number;
  rating: number;
  reviewsAmount: number;
  totalAvailableAmount: number;
}

// Scoring
export interface ScoreInput {
  weekly_bought: number | null;
  orders_quantity: number;
  rating: number;
  supply_pressure: number;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================
// API Response Contracts (shared between backend and frontend)
// ============================================================

// Auth
export interface LoginResponse {
  access_token: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  account_id: string;
  is_active: boolean;
}

// Billing
export interface BalanceResponse {
  balance: string; // BigInt serialized as string
  status: AccountStatus;
  daily_fee: string | null;
}

// Products
export interface TrackedProductResponse {
  product_id: string; // BigInt serialized
  title: string;
  score: number;
  weekly_bought: number | null;
  orders_quantity: number;
  rating: number;
  feedback_quantity: number;
  sell_price: number;
  full_price: number;
  category_id: number | null;
  category_title: string | null;
  total_available_amount: number | null;
  is_active: boolean;
  tracked_at: string;
}

export interface ProductSnapshotResponse {
  id: string;
  product_id: string;
  score: number;
  weekly_bought: number | null;
  orders_amount: number;
  rating: number;
  sell_price: number;
  available_amount: number;
  snapshot_at: string;
}

export interface ForecastResponse {
  forecast_7d: number;
  trend: 'rising' | 'falling' | 'stable';
  slope: number;
  snapshots: ProductSnapshotResponse[];
}

// Discovery
export interface DiscoveryRunResponse {
  id: string;
  category_id: number;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';
  total_found: number;
  created_at: string;
}

export interface LeaderboardEntry {
  product_id: string;
  title: string;
  score: number;
  weekly_bought: number | null;
  orders_quantity: number;
  rating: number;
  sell_price: number;
  category_title: string | null;
}

// AI
export interface AiAttributesResponse {
  product_id: string;
  brand: string | null;
  model: string | null;
  type: string | null;
  color: string | null;
}

export interface AiUsageResponse {
  used_usd: number;
  limit_usd: number | null;
  remaining_usd: number | null;
  calls_this_month: number;
}

export interface SentimentResponse {
  overall: 'positive' | 'neutral' | 'negative' | 'mixed';
  score: number;
  summary: string;
  pros: string[];
  cons: string[];
  keywords: Array<{ word: string; sentiment: 'positive' | 'negative'; count: number }>;
}

// Sourcing
export interface CurrencyRateResponse {
  code: string;
  name: string;
  rate: number;
  updated_at: string;
}

export interface CargoProviderResponse {
  id: string;
  name: string;
  origin: string;
  cost_per_kg_usd: number;
  min_days: number;
  max_days: number;
}

export interface CargoCalculationResponse {
  item_cost_usd: number;
  cargo_cost_usd: number;
  customs_cost_usd: number;
  vat_cost_usd: number;
  landed_cost_usd: number;
  landed_cost_uzs: number;
  margin_pct: number | null;
}

// Signals
export interface SignalItem {
  product_id: string;
  title: string;
  score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

// Admin
export interface AdminAccountResponse {
  id: string;
  name: string;
  phone: string | null;
  status: AccountStatus;
  balance: string;
  daily_fee: string | null;
  ai_monthly_limit_usd: string | null;
  created_at: string;
  user_count: number;
}

export interface AdminStatsOverview {
  total_accounts: number;
  active_accounts: number;
  total_users: number;
  total_products: number;
  total_revenue: string;
}

// Notifications
export interface NotificationResponse {
  id: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

// Feedback
export interface FeedbackTicketResponse {
  id: string;
  subject: string;
  type: string;
  priority: string;
  status: string;
  created_at: string;
  messages: FeedbackMessageResponse[];
}

export interface FeedbackMessageResponse {
  id: string;
  content: string;
  sender_role: 'user' | 'admin';
  created_at: string;
}

// Health
export interface HealthResponse {
  status: 'ok' | 'degraded';
  db: boolean;
  redis: boolean;
  queues?: Record<string, number>;
  timestamp: string;
}

// Job types
export type JobName =
  | 'daily-billing'
  | 'category-discovery'
  | 'product-snapshot'
  | 'url-analyze'
  | 'competitor-snapshot'
  | 'import-batch'
  | 'reanalysis-6h'
  | 'sourcing-search';

export interface UrlAnalyzeJobData {
  url: string;
  accountId: string;
}

export interface CategoryDiscoveryJobData {
  categoryId: number;
  runId: string;
  accountId: string;
  categoryUrl?: string; // full Uzum category URL for Playwright scraping
}
