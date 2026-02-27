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

export interface Transaction {
  id: string;
  type: string;
  amount: string | number;
  description?: string | null;
  created_at: string;
}

export interface OverviewStats {
  today_active_users: number;
  total_tracked_products: number;
  today_analyzes: number;
  today_category_runs: number;
}

export interface DailyRevenue { date: string; amount: number | string; }
export interface RevenueStats {
  today_revenue: number | string;
  mrr: number | string;
  avg_balance: number | string;
  payment_due_count: number;
  daily?: DailyRevenue[];
}

export interface DailyGrowth { date: string; count: number; }
export interface GrowthStats {
  week_new: number;
  month_new: number;
  churn_rate_pct: number;
  daily_new_users?: DailyGrowth[];
}

export interface ActivityFeedItem { action: string; user_email: string; created_at: string; }
export interface RealtimeStats {
  active_sessions: number;
  today_requests: number;
  queue_pending: number;
  recent_errors: number;
  activity_feed?: ActivityFeedItem[];
}

export interface TopUser {
  user_id?: string;
  email: string;
  account_name?: string;
  tracked_products: number;
  avg_score?: number;
  total_weekly?: number;
  discovery_runs?: number;
  activity_score?: number;
}

export interface PopularProduct {
  product_id: number | string;
  title?: string;
  tracker_count: number;
  avg_score?: number;
  weekly_bought?: number;
}

export interface PopularCategory {
  category_id: number | string;
  run_count: number;
  winner_count?: number;
  last_run_at?: string | null;
}

export interface MemoryStats { heap_used_mb: number; heap_total_mb: number; }
export interface SystemHealth {
  status: string;
  uptime_seconds: number;
  db_connected: boolean;
  memory?: MemoryStats;
}

export interface AiUsageDay { calls: number; input_tokens: number; output_tokens: number; cost_usd: string | number; }
export interface AiUsageMethod { method: string; calls: number; input_tokens: number; output_tokens: number; cost_usd: string; avg_duration_ms: number; }
export interface AiUsageError { id: string; created_at: string; method: string; error: string; }
export interface AiUsage {
  today?: AiUsageDay;
  period?: AiUsageDay;
  by_method?: AiUsageMethod[];
  recent_errors?: AiUsageError[];
}

export interface ErrorByStatus { status: number; count: number; }
export interface ErrorByEndpoint { endpoint: string; count: number; }
export interface SystemErrorItem { id: string; created_at: string; status: number; method: string; endpoint: string; message: string; account_id?: string | null; }
export interface SystemErrors {
  total: number;
  pages?: number;
  by_status?: ErrorByStatus[];
  by_endpoint?: ErrorByEndpoint[];
  items?: SystemErrorItem[];
}

export interface FeedbackTicket { id: string; user_email?: string; user?: { email: string }; subject: string; type: string; priority: string; status: string; created_at: string; }
export interface FeedbackStats { total?: number; by_status?: { OPEN?: number; IN_PROGRESS?: number; RESOLVED?: number; CLOSED?: number }; }

export interface SearchUser { id: string; email: string; role: Role; }
export interface SearchAccount { id: string; name: string; status: Account['status']; }
export interface SearchProduct { id: string; title: string; }
export interface SearchResults { users?: SearchUser[]; accounts?: SearchAccount[]; products?: SearchProduct[]; }

export interface DepositEntry { id: string; created_at: string; account_name: string; amount: string | number; balance_before: string | number; balance_after: string | number; description?: string | null; }
export interface NotificationTemplate { id: string; name: string; message: string; type: string; }
export interface CategoryTrend { week: string; categories?: Record<string, { runs?: number }>; }
export interface HeatmapEntry { category_id: number | string; count: number; avg_score?: number | string; }

export const ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'];

export const ROLE_META: Record<Role, { label: string; badge: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', badge: 'bg-error/15 text-error border-error/20' },
  ADMIN: { label: 'Admin', badge: 'bg-warning/15 text-warning border-warning/20' },
  MODERATOR: { label: 'Moderator', badge: 'bg-info/15 text-info border-info/20' },
  USER: { label: 'Foydalanuvchi', badge: 'bg-success/15 text-success border-success/20' },
};

export const PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: ['manage_accounts', 'manage_all_users', 'manage_roles', 'manage_billing', 'manage_global_settings', 'view_audit_log', 'manage_discovery', 'analyze_products', 'manage_tracked', 'view_dashboard'],
  ADMIN: ['manage_account_users', 'view_audit_log', 'manage_discovery', 'analyze_products', 'manage_tracked', 'view_dashboard'],
  MODERATOR: ['manage_discovery', 'analyze_products', 'manage_tracked', 'view_dashboard'],
  USER: ['manage_discovery', 'analyze_products', 'manage_tracked', 'view_dashboard'],
};

export type Tab = 'dashboard' | 'accounts' | 'analytics' | 'system' | 'feedback' | 'notifications' | 'audit' | 'permissions' | 'deposits' | 'whitelabel';
export const VALID_TABS: Tab[] = ['dashboard', 'accounts', 'analytics', 'system', 'feedback', 'notifications', 'audit', 'permissions', 'deposits', 'whitelabel'];
