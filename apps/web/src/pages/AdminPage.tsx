import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';

interface Account {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAYMENT_DUE' | 'SUSPENDED';
  balance: string;
  daily_fee: string | null;
  created_at: string;
  users: { id: string; email: string; role: Role }[];
  transaction_count: number;
}

interface User {
  id: string;
  email: string;
  role: Role;
  is_active: boolean;
  account_id: string;
  account_name: string;
  created_at: string;
}

interface AuditEvent {
  id: string;
  action: string;
  account_name: string | null;
  user_email: string | null;
  old_value: any;
  new_value: any;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'];

const ROLE_META: Record<Role, { label: string; badge: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', badge: 'bg-error/15 text-error border-error/20' },
  ADMIN: { label: 'Admin', badge: 'bg-warning/15 text-warning border-warning/20' },
  MODERATOR: { label: 'Moderator', badge: 'bg-info/15 text-info border-info/20' },
  USER: { label: 'Foydalanuvchi', badge: 'bg-success/15 text-success border-success/20' },
};

const PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: ['manage_accounts', 'manage_all_users', 'manage_roles', 'manage_billing', 'manage_global_settings', 'view_audit_log', 'manage_discovery', 'analyze_products', 'manage_tracked', 'view_dashboard'],
  ADMIN: ['manage_account_users', 'view_audit_log', 'manage_discovery', 'analyze_products', 'manage_tracked', 'view_dashboard'],
  MODERATOR: ['manage_discovery', 'analyze_products', 'manage_tracked', 'view_dashboard'],
  USER: ['manage_discovery', 'analyze_products', 'manage_tracked', 'view_dashboard'],
};

// ─── Badges ───────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: Role }) {
  const m = ROLE_META[role] ?? ROLE_META.USER;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold border ${m.badge}`}>{m.label}</span>;
}

function StatusBadge({ status }: { status: Account['status'] }) {
  const map = {
    ACTIVE: 'bg-success/15 text-success border-success/20',
    PAYMENT_DUE: 'bg-error/15 text-error border-error/20',
    SUSPENDED: 'bg-base-300/50 text-base-content/40 border-base-300',
  };
  const labels = { ACTIVE: 'Faol', PAYMENT_DUE: "To'lov kerak", SUSPENDED: 'Bloklangan' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold border ${map[status]}`}>{labels[status]}</span>;
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-base-200 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-base-300/50" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-square">X</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CreateAccountModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ company_name: '', email: '', password: '', role: 'USER' as Role });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try { await adminApi.createAccount(form); onDone(); onClose(); }
    catch (err: any) { setError(err.response?.data?.message ?? 'Xato'); }
    finally { setLoading(false); }
  }

  return (
    <Modal title="Yangi Account" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input className="input input-bordered w-full" required value={form.company_name} onChange={(e) => set('company_name', e.target.value)} placeholder="Kompaniya nomi" />
        <input className="input input-bordered w-full" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Email" />
        <input className="input input-bordered w-full" type="password" required minLength={6} value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Parol" />
        <select className="select select-bordered w-full" value={form.role} onChange={(e) => set('role', e.target.value)}>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
        </select>
        {error && <p className="text-error text-sm">{error}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Bekor</button>
          <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
            {loading && <span className="loading loading-spinner loading-xs" />} Yaratish
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DepositModal({ account, onClose, onDone }: { account: Account; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseInt(amount.replace(/\s/g, ''));
    if (!num || num <= 0) { setError("Miqdor noto'g'ri"); return; }
    setLoading(true); setError('');
    try { await adminApi.deposit(account.id, num, desc || undefined); onDone(); onClose(); }
    catch (err: any) { setError(err.response?.data?.message ?? 'Xato'); }
    finally { setLoading(false); }
  }

  return (
    <Modal title={`Balans to'ldirish — ${account.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input className="input input-bordered w-full" placeholder="Miqdor (so'm)" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <input className="input input-bordered w-full" placeholder="Izoh (ixtiyoriy)" value={desc} onChange={(e) => setDesc(e.target.value)} />
        {error && <p className="text-error text-sm">{error}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Bekor</button>
          <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
            {loading && <span className="loading loading-spinner loading-xs" />} Qo'shish
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-base-200 rounded-xl p-4 border border-base-300/50">
      <p className="text-xs text-base-content/50">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color || 'text-base-content'}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-xs text-base-content/40 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'users' | 'accounts' | 'popular' | 'analytics' | 'system' | 'feedback' | 'notifications' | 'audit' | 'permissions';

// ─── Main page ────────────────────────────────────────────────────────────────

const VALID_TABS: Tab[] = ['dashboard', 'users', 'accounts', 'popular', 'analytics', 'system', 'feedback', 'notifications', 'audit', 'permissions'];

export function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as Tab | null;
  const initialTab = tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'dashboard';

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTabState] = useState<Tab>(initialTab);

  function setActiveTab(tab: Tab) {
    setActiveTabState(tab);
    setSearchParams(tab === 'dashboard' ? {} : { tab });
  }

  // Sync tab when URL changes (e.g., sidebar click)
  useEffect(() => {
    const t = searchParams.get('tab') as Tab | null;
    const resolved = t && VALID_TABS.includes(t) ? t : 'dashboard';
    if (resolved !== activeTab) setActiveTabState(resolved);
  }, [searchParams]);

  // Stats
  const [overview, setOverview] = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);
  const [growth, setGrowth] = useState<any>(null);
  const [popularProducts, setPopularProducts] = useState<any[]>([]);
  const [popularCategories, setPopularCategories] = useState<any[]>([]);
  const [realtime, setRealtime] = useState<any>(null);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [feedbackTickets, setFeedbackTickets] = useState<any[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);

  // Modals
  const [depositTarget, setDepositTarget] = useState<Account | null>(null);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [editingFee, setEditingFee] = useState<string | null>(null);
  const [feeInput, setFeeInput] = useState('');
  const [globalFeeInput, setGlobalFeeInput] = useState('');
  const [savingGlobalFee, setSavingGlobalFee] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<any>(null);

  // Notifications
  const [notifMsg, setNotifMsg] = useState('');
  const [notifType, setNotifType] = useState('info');
  const [notifSending, setNotifSending] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [accRes, feeRes, auditRes, usersRes] = await Promise.all([
        adminApi.listAccounts(), adminApi.getGlobalFee(), adminApi.getAuditLog(50), adminApi.listUsers(),
      ]);
      setAccounts(accRes.data); setGlobalFeeInput(feeRes.data.daily_fee_default);
      setAuditLog(auditRes.data); setUsers(usersRes.data);
    } catch { /* empty */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Load tab-specific data
  useEffect(() => {
    if (activeTab === 'dashboard') {
      adminApi.getStatsOverview().then((r) => setOverview(r.data)).catch(() => {});
      adminApi.getStatsRevenue().then((r) => setRevenue(r.data)).catch(() => {});
      adminApi.getStatsGrowth().then((r) => setGrowth(r.data)).catch(() => {});
      adminApi.getRealtimeStats().then((r) => setRealtime(r.data)).catch(() => {});
    } else if (activeTab === 'popular') {
      adminApi.getPopularProducts().then((r) => setPopularProducts(r.data || [])).catch(() => {});
      adminApi.getPopularCategories().then((r) => setPopularCategories(r.data || [])).catch(() => {});
    } else if (activeTab === 'analytics') {
      adminApi.getTopUsers().then((r) => setTopUsers(r.data || [])).catch(() => {});
    } else if (activeTab === 'system') {
      adminApi.getSystemHealth().then((r) => setHealth(r.data)).catch(() => {});
    } else if (activeTab === 'feedback') {
      adminApi.getAdminFeedback().then((r) => setFeedbackTickets(r.data?.items || r.data || [])).catch(() => {});
      adminApi.getFeedbackStats().then((r) => setFeedbackStats(r.data)).catch(() => {});
    }
  }, [activeTab]);

  async function saveFee(accountId: string) {
    const val = feeInput.trim();
    const fee = val === '' ? null : parseInt(val);
    try { await adminApi.setFee(accountId, fee); setEditingFee(null);
      setAccounts((prev) => prev.map((a) => a.id === accountId ? { ...a, daily_fee: fee?.toString() ?? null } : a));
    } catch { /* empty */ }
  }

  async function saveGlobalFee() {
    const fee = parseInt(globalFeeInput);
    if (!fee || fee <= 0) return;
    setSavingGlobalFee(true);
    try { await adminApi.setGlobalFee(fee); } finally { setSavingGlobalFee(false); }
  }

  async function handleRoleChange(userId: string, newRole: Role) {
    try { await adminApi.updateRole(userId, newRole);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    } catch { /* empty */ }
  }

  async function handleToggleActive(userId: string) {
    try { const res = await adminApi.toggleActive(userId);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active: res.data.is_active } : u));
    } catch { /* empty */ }
  }

  async function handleStatusChange(accountId: string, status: string) {
    try { await adminApi.updateAccountStatus(accountId, status);
      setAccounts((prev) => prev.map((a) => a.id === accountId ? { ...a, status: status as any } : a));
    } catch { /* empty */ }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    try { const r = await adminApi.globalSearch(searchQuery); setSearchResults(r.data); }
    catch { /* empty */ }
  }

  async function loadUserDetail(userId: string) {
    setSelectedUserId(userId);
    try {
      const [portfolio, activity, sessions] = await Promise.all([
        adminApi.getUserPortfolio(userId).catch(() => ({ data: null })),
        adminApi.getUserActivity(userId, 1, 10).catch(() => ({ data: { items: [] } })),
        adminApi.getUserSessions(userId, 5).catch(() => ({ data: [] })),
      ]);
      setUserDetail({ portfolio: portfolio.data, activity: activity.data, sessions: sessions.data });
    } catch { /* empty */ }
  }

  async function sendNotification() {
    if (!notifMsg.trim()) return;
    setNotifSending(true);
    try {
      await adminApi.sendNotification({ message: notifMsg, type: notifType, target: 'all' });
      setNotifMsg('');
    } catch { /* empty */ }
    setNotifSending(false);
  }

  async function handleFeedbackStatus(ticketId: string, status: string) {
    try {
      await adminApi.updateFeedbackStatus(ticketId, status);
      setFeedbackTickets((prev) => prev.map((t: any) => t.id === ticketId ? { ...t, status } : t));
    } catch { /* empty */ }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><span className="loading loading-ring loading-lg text-primary" /></div>;
  }

  const activeAccounts = accounts.filter((a) => a.status === 'ACTIVE').length;
  const dueAccounts = accounts.filter((a) => a.status === 'PAYMENT_DUE').length;
  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);
  const activeUsers = users.filter((u) => u.is_active).length;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'users', label: 'Userlar' },
    { key: 'accounts', label: 'Accountlar' },
    { key: 'popular', label: 'Mashhur' },
    { key: 'analytics', label: 'Analitika' },
    { key: 'system', label: 'Tizim' },
    { key: 'feedback', label: 'Feedback' },
    { key: 'notifications', label: 'Xabarlar' },
    { key: 'audit', label: 'Audit' },
    { key: 'permissions', label: 'Ruxsatlar' },
  ];

  return (
    <>
      <div className="space-y-5 w-full">
        {/* Header + Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-base-content/40 text-sm mt-0.5">Platformani to'liq boshqarish</p>
          </div>
          <div className="flex items-center gap-2">
            <input className="input input-bordered input-sm w-48" placeholder="Qidirish (Ctrl+K)..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
            <button onClick={handleSearch} className="btn btn-ghost btn-sm">Izlash</button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults && (
          <div className="card bg-base-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Qidiruv natijalari</h3>
              <button className="btn btn-ghost btn-xs" onClick={() => setSearchResults(null)}>X</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-base-content/50 mb-1">Userlar</p>
                {(searchResults.users || []).map((u: any) => (
                  <div key={u.id} className="py-1">{u.email} <RoleBadge role={u.role} /></div>
                ))}
                {!(searchResults.users?.length) && <p className="text-base-content/30 text-xs">Topilmadi</p>}
              </div>
              <div>
                <p className="text-xs text-base-content/50 mb-1">Accountlar</p>
                {(searchResults.accounts || []).map((a: any) => (
                  <div key={a.id} className="py-1">{a.name} <StatusBadge status={a.status} /></div>
                ))}
                {!(searchResults.accounts?.length) && <p className="text-base-content/30 text-xs">Topilmadi</p>}
              </div>
              <div>
                <p className="text-xs text-base-content/50 mb-1">Mahsulotlar</p>
                {(searchResults.products || []).map((p: any) => (
                  <div key={p.id} className="py-1 truncate">{p.title}</div>
                ))}
                {!(searchResults.products?.length) && <p className="text-base-content/30 text-xs">Topilmadi</p>}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs tabs-bordered overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`tab tab-sm whitespace-nowrap ${activeTab === t.key ? 'tab-active font-semibold' : ''}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══════════════ DASHBOARD TAB ═══════════════ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard label="Jami accountlar" value={accounts.length} sub={`${activeAccounts} faol / ${dueAccounts} to'lov`} />
              <StatCard label="Jami userlar" value={users.length} sub={`${activeUsers} faol`} />
              <StatCard label="Bugun aktiv" value={overview?.users?.today_active ?? '-'} color="text-primary" />
              <StatCard label="Tracked products" value={overview?.products?.tracked_total ?? '-'} />
              <StatCard label="Bugungi analyze" value={overview?.products?.analyzed_today ?? '-'} color="text-info" />
              <StatCard label="Discovery runs" value={overview?.discovery?.runs_today ?? '-'} />
            </div>

            {/* Revenue */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card bg-base-200">
                <div className="card-body p-4">
                  <h3 className="font-semibold text-sm">Daromad</h3>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <StatCard label="Bugungi daromad" value={Number(revenue?.today_revenue ?? 0).toLocaleString()} sub="so'm" color="text-success" />
                    <StatCard label="Bu oylik (MRR)" value={Number(revenue?.mrr ?? 0).toLocaleString()} sub="so'm" color="text-primary" />
                    <StatCard label="O'rtacha balance" value={Number(revenue?.avg_balance ?? 0).toLocaleString()} sub="so'm" />
                    <StatCard label="To'lov kerak" value={revenue?.payment_due_count ?? 0} color="text-error" />
                  </div>
                </div>
              </div>

              <div className="card bg-base-200">
                <div className="card-body p-4">
                  <h3 className="font-semibold text-sm">O'sish</h3>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <StatCard label="Bu hafta yangi" value={growth?.week_new ?? '-'} color="text-success" />
                    <StatCard label="Bu oy yangi" value={growth?.month_new ?? '-'} color="text-info" />
                    <StatCard label="Churn rate" value={`${(growth?.churn_rate_pct ?? 0).toFixed(1)}%`} color="text-error" />
                    <StatCard label="Jami balance" value={totalBalance.toLocaleString()} sub="so'm" />
                  </div>
                </div>
              </div>
            </div>

            {/* Realtime activity */}
            {realtime && (
              <div className="card bg-base-200">
                <div className="card-body p-4">
                  <h3 className="font-semibold text-sm">Real-time</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                    <StatCard label="Aktiv sessionlar" value={realtime.active_sessions ?? 0} color="text-primary" />
                    <StatCard label="Bugungi requestlar" value={realtime.today_requests ?? 0} />
                    <StatCard label="Queue pending" value={realtime.queue_pending ?? 0} />
                    <StatCard label="Xatolar" value={realtime.recent_errors ?? 0} color="text-error" />
                  </div>
                  {realtime.recent_activity?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-base-content/50 mb-1">So'nggi faoliyat</p>
                      <div className="space-y-1">
                        {realtime.recent_activity.slice(0, 5).map((a: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="badge badge-xs badge-primary">{a.action}</span>
                            <span className="text-base-content/60">{a.user_email}</span>
                            <span className="text-base-content/30 ml-auto">{a.time_ago}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ USERS TAB ═══════════════ */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-base-content/50">{users.length} foydalanuvchi, {activeUsers} faol</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Users list */}
              <div className="lg:col-span-2 overflow-x-auto">
                <table className="table table-sm">
                  <thead><tr><th>Email</th><th>Account</th><th>Rol</th><th>Holat</th><th>Amal</th></tr></thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className={`hover cursor-pointer ${selectedUserId === u.id ? 'bg-primary/10' : ''}`}
                        onClick={() => loadUserDetail(u.id)}>
                        <td className="text-sm">{u.email}</td>
                        <td className="text-xs text-base-content/50">{u.account_name}</td>
                        <td>
                          <select className="select select-bordered select-xs"
                            value={u.role} onChange={(e) => { e.stopPropagation(); handleRoleChange(u.id, e.target.value as Role); }}>
                            {ROLES.map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
                          </select>
                        </td>
                        <td>
                          <span className={`badge badge-xs ${u.is_active ? 'badge-success' : 'badge-error'}`}>
                            {u.is_active ? 'Faol' : 'Bloklangan'}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-xs" onClick={(e) => { e.stopPropagation(); handleToggleActive(u.id); }}>
                            {u.is_active ? 'Bloklash' : 'Faollashtirish'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* User detail sidebar */}
              <div className="space-y-3">
                {selectedUserId && userDetail ? (
                  <>
                    <div className="card bg-base-200 p-4">
                      <h3 className="font-semibold text-sm mb-2">Portfolio (D1)</h3>
                      {userDetail.portfolio ? (
                        <div className="grid grid-cols-2 gap-2">
                          <StatCard label="Tracked" value={userDetail.portfolio.tracked_count ?? 0} />
                          <StatCard label="O'rtacha score" value={(userDetail.portfolio.avg_score ?? 0).toFixed(2)} />
                          <StatCard label="Haftalik sotuv" value={userDetail.portfolio.total_weekly_sales ?? 0} />
                          <StatCard label="Trend" value={`${userDetail.portfolio.trends?.up ?? 0}/${userDetail.portfolio.trends?.flat ?? 0}/${userDetail.portfolio.trends?.down ?? 0}`} sub="up/flat/down" />
                        </div>
                      ) : <p className="text-xs text-base-content/40">Ma'lumot yo'q</p>}
                    </div>

                    <div className="card bg-base-200 p-4">
                      <h3 className="font-semibold text-sm mb-2">So'nggi faoliyat (B1)</h3>
                      <div className="space-y-1">
                        {(userDetail.activity?.items || []).slice(0, 8).map((a: any) => (
                          <div key={a.id} className="flex items-center gap-2 text-xs">
                            <span className="badge badge-xs badge-info">{a.action}</span>
                            <span className="text-base-content/40">{new Date(a.created_at).toLocaleString()}</span>
                          </div>
                        ))}
                        {!(userDetail.activity?.items?.length) && <p className="text-xs text-base-content/40">Faoliyat yo'q</p>}
                      </div>
                    </div>

                    <div className="card bg-base-200 p-4">
                      <h3 className="font-semibold text-sm mb-2">Sessionlar (B3)</h3>
                      <div className="space-y-1">
                        {(userDetail.sessions || []).slice(0, 5).map((s: any) => (
                          <div key={s.id} className="flex items-center gap-2 text-xs">
                            <span className="text-base-content/60">{s.ip || '-'}</span>
                            <span className="text-base-content/40">{s.device_type || '-'}</span>
                            <span className="text-base-content/30 ml-auto">{new Date(s.logged_in_at).toLocaleDateString()}</span>
                          </div>
                        ))}
                        {!(userDetail.sessions?.length) && <p className="text-xs text-base-content/40">Session yo'q</p>}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="card bg-base-200 p-8 text-center">
                    <p className="text-base-content/40 text-sm">User tanlang</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ ACCOUNTS TAB ═══════════════ */}
        {activeTab === 'accounts' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-base-200 rounded-xl px-3 py-2 border border-base-300/50">
                <span className="text-xs text-base-content/40">Global:</span>
                <input className="input input-xs input-bordered w-20 text-right bg-transparent"
                  value={globalFeeInput} onChange={(e) => setGlobalFeeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveGlobalFee()} />
                <span className="text-xs text-base-content/40">so'm</span>
                <button onClick={saveGlobalFee} disabled={savingGlobalFee} className="btn btn-xs btn-primary">
                  {savingGlobalFee ? <span className="loading loading-spinner loading-xs" /> : 'OK'}
                </button>
              </div>
              <button onClick={() => setShowCreateAccount(true)} className="btn btn-primary btn-sm">+ Account</button>
            </div>

            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr><th>Kompaniya</th><th>Holat</th><th>Balans</th><th>Kunlik</th><th>Userlar</th><th>Amal</th></tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.id} className="hover">
                      <td>
                        <div className="font-medium text-sm">{a.name}</div>
                        <div className="text-xs text-base-content/40">{new Date(a.created_at).toLocaleDateString()}</div>
                      </td>
                      <td><StatusBadge status={a.status} /></td>
                      <td className="font-mono text-sm">{Number(a.balance).toLocaleString()}</td>
                      <td>
                        {editingFee === a.id ? (
                          <div className="flex items-center gap-1">
                            <input className="input input-xs input-bordered w-20" value={feeInput}
                              onChange={(e) => setFeeInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveFee(a.id)} />
                            <button className="btn btn-xs btn-primary" onClick={() => saveFee(a.id)}>OK</button>
                            <button className="btn btn-xs btn-ghost" onClick={() => setEditingFee(null)}>X</button>
                          </div>
                        ) : (
                          <button className="btn btn-ghost btn-xs" onClick={() => { setEditingFee(a.id); setFeeInput(a.daily_fee ?? ''); }}>
                            {a.daily_fee ? `${Number(a.daily_fee).toLocaleString()}` : 'global'}
                          </button>
                        )}
                      </td>
                      <td className="text-xs">{a.users.map((u) => u.email).join(', ')}</td>
                      <td>
                        <div className="flex gap-1">
                          <button className="btn btn-ghost btn-xs" onClick={() => setDepositTarget(a)}>Deposit</button>
                          {a.status === 'ACTIVE' && (
                            <button className="btn btn-ghost btn-xs text-error" onClick={() => handleStatusChange(a.id, 'SUSPENDED')}>Suspend</button>
                          )}
                          {a.status === 'SUSPENDED' && (
                            <button className="btn btn-ghost btn-xs text-success" onClick={() => handleStatusChange(a.id, 'ACTIVE')}>Restore</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════ POPULAR TAB ═══════════════ */}
        {activeTab === 'popular' && (
          <div className="space-y-4">
            <div className="card bg-base-200">
              <div className="card-body p-4">
                <h3 className="font-semibold text-sm">Top-20 Mashhur Mahsulotlar (A4)</h3>
                <div className="overflow-x-auto mt-2">
                  <table className="table table-sm">
                    <thead><tr><th>#</th><th>Mahsulot</th><th>Track qilganlar</th><th>O'rtacha score</th><th>Haftalik sotuv</th></tr></thead>
                    <tbody>
                      {popularProducts.map((p: any, i: number) => (
                        <tr key={p.product_id || i}>
                          <td className="font-mono">{i + 1}</td>
                          <td className="text-sm max-w-xs truncate">{p.title || `Product #${p.product_id}`}</td>
                          <td className="font-bold text-primary">{p.tracker_count}</td>
                          <td>{(p.avg_score ?? 0).toFixed(2)}</td>
                          <td>{p.weekly_bought ?? '-'}</td>
                        </tr>
                      ))}
                      {!popularProducts.length && <tr><td colSpan={5} className="text-center text-base-content/40">Ma'lumot yo'q</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="card bg-base-200">
              <div className="card-body p-4">
                <h3 className="font-semibold text-sm">Top Kategoriyalar (A5)</h3>
                <div className="overflow-x-auto mt-2">
                  <table className="table table-sm">
                    <thead><tr><th>Kategoriya ID</th><th>Discovery runlar</th><th>Winnerlar</th><th>Oxirgi run</th></tr></thead>
                    <tbody>
                      {popularCategories.map((c: any, i: number) => (
                        <tr key={c.category_id || i}>
                          <td className="font-mono">{c.category_id}</td>
                          <td className="font-bold">{c.run_count}</td>
                          <td>{c.winner_count ?? '-'}</td>
                          <td className="text-xs text-base-content/50">{c.last_run_at ? new Date(c.last_run_at).toLocaleDateString() : '-'}</td>
                        </tr>
                      ))}
                      {!popularCategories.length && <tr><td colSpan={4} className="text-center text-base-content/40">Ma'lumot yo'q</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ ANALYTICS TAB ═══════════════ */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <div className="card bg-base-200">
              <div className="card-body p-4">
                <h3 className="font-semibold text-sm">Top Foydalanuvchilar (D5)</h3>
                <div className="overflow-x-auto mt-2">
                  <table className="table table-sm">
                    <thead><tr><th>#</th><th>Email</th><th>Account</th><th>Tracked</th><th>Avg Score</th><th>Haftalik</th><th>Discovery</th><th>Faollik</th></tr></thead>
                    <tbody>
                      {topUsers.map((u: any, i: number) => (
                        <tr key={u.user_id || i}>
                          <td>
                            {i < 3 ? (
                              <span className={`badge badge-sm ${i === 0 ? 'badge-warning' : i === 1 ? 'badge-ghost' : 'badge-info'}`}>
                                {i === 0 ? 'I' : i === 1 ? 'II' : 'III'}
                              </span>
                            ) : i + 1}
                          </td>
                          <td className="text-sm">{u.email}</td>
                          <td className="text-xs text-base-content/50">{u.account_name}</td>
                          <td className="font-bold">{u.tracked_count}</td>
                          <td>{(u.avg_score ?? 0).toFixed(2)}</td>
                          <td>{u.total_weekly ?? 0}</td>
                          <td>{u.discovery_runs ?? 0}</td>
                          <td className="font-mono text-primary">{u.activity_score ?? 0}</td>
                        </tr>
                      ))}
                      {!topUsers.length && <tr><td colSpan={8} className="text-center text-base-content/40">Ma'lumot yo'q</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ SYSTEM TAB ═══════════════ */}
        {activeTab === 'system' && (
          <div className="space-y-4">
            {health ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="API Status" value={health.api?.status || 'UP'} color="text-success" />
                <StatCard label="Uptime" value={`${Math.floor((health.api?.uptime_seconds || 0) / 3600)}h`} />
                <StatCard label="Database" value={health.db?.status || 'OK'} color={health.db?.status === 'connected' ? 'text-success' : 'text-error'} />
                <StatCard label="Log hajmi" value={`${(health.disk?.log_size_mb ?? 0).toFixed(1)} MB`} />
              </div>
            ) : (
              <div className="flex justify-center py-8"><span className="loading loading-spinner" /></div>
            )}

            {health?.recent_errors?.length > 0 && (
              <div className="card bg-base-200">
                <div className="card-body p-4">
                  <h3 className="font-semibold text-sm text-error">So'nggi xatolar</h3>
                  <div className="space-y-1 mt-2">
                    {health.recent_errors.map((e: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-base-content/40">{e.time}</span>
                        <span className="badge badge-xs badge-error">{e.endpoint}</span>
                        <span className="text-base-content/60">{e.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ FEEDBACK TAB ═══════════════ */}
        {activeTab === 'feedback' && (
          <div className="space-y-4">
            {feedbackStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Ochiq" value={feedbackStats.open ?? 0} color="text-info" />
                <StatCard label="Jarayonda" value={feedbackStats.in_progress ?? 0} color="text-warning" />
                <StatCard label="Hal qilindi" value={feedbackStats.resolved ?? 0} color="text-success" />
                <StatCard label="Yopildi" value={feedbackStats.closed ?? 0} />
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead><tr><th>User</th><th>Mavzu</th><th>Tur</th><th>Ustuvorlik</th><th>Status</th><th>Sana</th><th>Amal</th></tr></thead>
                <tbody>
                  {feedbackTickets.map((t: any) => (
                    <tr key={t.id} className="hover">
                      <td className="text-sm">{t.user_email || t.user?.email || '-'}</td>
                      <td className="text-sm max-w-xs truncate">{t.subject}</td>
                      <td><span className="badge badge-xs">{t.type}</span></td>
                      <td>
                        <span className={`badge badge-xs ${t.priority === 'HIGH' ? 'badge-error' : t.priority === 'MEDIUM' ? 'badge-warning' : 'badge-ghost'}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-xs ${t.status === 'OPEN' ? 'badge-info' : t.status === 'IN_PROGRESS' ? 'badge-warning' : t.status === 'RESOLVED' ? 'badge-success' : 'badge-ghost'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="text-xs text-base-content/50">{new Date(t.created_at).toLocaleDateString()}</td>
                      <td>
                        <select className="select select-bordered select-xs"
                          value={t.status} onChange={(e) => handleFeedbackStatus(t.id, e.target.value)}>
                          <option value="OPEN">OPEN</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="RESOLVED">RESOLVED</option>
                          <option value="CLOSED">CLOSED</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {!feedbackTickets.length && <tr><td colSpan={7} className="text-center text-base-content/40">Feedback yo'q</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════ NOTIFICATIONS TAB ═══════════════ */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <div className="card bg-base-200">
              <div className="card-body p-4">
                <h3 className="font-semibold text-sm">Xabar yuborish (E3)</h3>
                <div className="flex flex-col md:flex-row gap-3 mt-2">
                  <input className="input input-bordered input-sm flex-1" placeholder="Xabar matni..."
                    value={notifMsg} onChange={(e) => setNotifMsg(e.target.value)} />
                  <select className="select select-bordered select-sm w-32" value={notifType} onChange={(e) => setNotifType(e.target.value)}>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                  </select>
                  <button className="btn btn-primary btn-sm" onClick={sendNotification} disabled={notifSending}>
                    {notifSending ? <span className="loading loading-spinner loading-xs" /> : 'Barchaga yuborish'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ AUDIT TAB ═══════════════ */}
        {activeTab === 'audit' && (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead><tr><th>Vaqt</th><th>Amal</th><th>Account</th><th>Admin</th><th>O'zgarish</th></tr></thead>
              <tbody>
                {auditLog.map((e) => (
                  <tr key={e.id}>
                    <td className="text-xs whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-xs ${
                        e.action.includes('CREATED') ? 'badge-success' :
                        e.action.includes('DEACTIVATED') || e.action.includes('DELETED') ? 'badge-error' :
                        e.action.includes('CHANGED') || e.action.includes('ROLE') ? 'badge-warning' : 'badge-ghost'
                      }`}>{e.action}</span>
                    </td>
                    <td className="text-sm">{e.account_name ?? '-'}</td>
                    <td className="text-xs text-base-content/50">{e.user_email ?? '-'}</td>
                    <td className="text-xs">
                      {e.old_value && <span className="text-error/60">{JSON.stringify(e.old_value)}</span>}
                      {e.old_value && e.new_value && ' -> '}
                      {e.new_value && <span className="text-success/60">{JSON.stringify(e.new_value)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ═══════════════ PERMISSIONS TAB ═══════════════ */}
        {activeTab === 'permissions' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {ROLES.map((role) => (
                <div key={role} className="card bg-base-200 border border-base-300/50">
                  <div className="card-body p-4">
                    <RoleBadge role={role} />
                    <ul className="mt-2 space-y-1">
                      {PERMISSIONS[role].map((p) => (
                        <li key={p} className="flex items-center gap-2 text-xs">
                          <span className="text-success">&#10003;</span> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateAccount && <CreateAccountModal onClose={() => setShowCreateAccount(false)} onDone={load} />}
      {depositTarget && <DepositModal account={depositTarget} onClose={() => setDepositTarget(null)} onDone={load} />}
    </>
  );
}
