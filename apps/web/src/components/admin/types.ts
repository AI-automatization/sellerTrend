// ─── Admin Types & Constants ─────────────────────────────────────────────────

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

export type Tab = 'dashboard' | 'accounts' | 'analytics' | 'system' | 'feedback' | 'notifications' | 'audit' | 'permissions' | 'deposits' | 'whitelabel';

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

export const VALID_TABS: Tab[] = ['dashboard', 'accounts', 'analytics', 'system', 'feedback', 'notifications', 'audit', 'permissions', 'deposits', 'whitelabel'];

export const TAB_TITLES: Record<Tab, { title: string; desc: string }> = {
  dashboard: { title: 'Dashboard', desc: 'Umumiy statistika va real-time ko\'rsatkichlar' },
  accounts: { title: 'Akkauntlar', desc: '' },
  analytics: { title: 'Analitika & Mashhur', desc: 'Top mahsulotlar, kategoriyalar va foydalanuvchilar' },
  system: { title: 'Tizim', desc: 'API, Database, AI xarajatlari, xatolar' },
  feedback: { title: 'Feedback Boshqaruv', desc: 'Foydalanuvchi murojatlari' },
  notifications: { title: 'Xabarnomalar', desc: 'Shablon yoki custom xabar yuborish' },
  audit: { title: 'Audit Log', desc: 'Admin amallar + foydalanuvchi faoliyati tarixi' },
  permissions: { title: 'Ruxsatlar', desc: 'Rol va huquqlar tizimi' },
  deposits: { title: 'Deposit Log', desc: 'Balans to\'ldirish tarixi' },
  whitelabel: { title: 'White-label', desc: 'Branding, logo, ranglar va custom domain' },
};
