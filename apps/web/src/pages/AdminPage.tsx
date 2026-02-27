import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { adminApi } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';

interface Account {
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
  details: any;
  ip: string | null;
  source: 'admin' | 'user';
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

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className={`relative bg-base-200 rounded-2xl p-6 w-full ${wide ? 'max-w-lg' : 'max-w-md'} shadow-2xl border border-base-300/50 max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
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
    try { await adminApi.createAccount(form); toast.success('Yangi account yaratildi'); onDone(); onClose(); }
    catch (err: unknown) { const msg = getErrorMessage(err, 'Account yaratib bo\'lmadi'); setError(msg); toast.error(msg); }
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
    try { await adminApi.deposit(account.id, num, desc || undefined); toast.success(`${num.toLocaleString()} so'm balansga qo'shildi`); onDone(); onClose(); }
    catch (err: unknown) { const msg = getErrorMessage(err, 'Deposit amalga oshmadi'); setError(msg); toast.error(msg); }
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

function ChangePasswordModal({ user, onClose }: { user: { id: string; email: string }; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast.error('Parol kamida 6 ta belgidan iborat bo\'lishi kerak'); return; }
    if (password !== confirm) { toast.error('Parollar mos kelmadi'); return; }
    setLoading(true);
    try {
      await adminApi.changeUserPassword(user.id, password);
      toast.success(`${user.email} uchun parol o'zgartirildi`);
      onClose();
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Parolni o\'zgartirib bo\'lmadi')); }
    finally { setLoading(false); }
  }

  return (
    <Modal title={`Parol o'zgartirish — ${user.email}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="relative">
          <input className="input input-bordered w-full pr-12" type={show ? 'text' : 'password'}
            placeholder="Yangi parol (min 6)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <button type="button" className="btn btn-ghost btn-xs absolute right-2 top-1/2 -translate-y-1/2"
            onClick={() => setShow(!show)}>{show ? 'Yashirish' : 'Ko\'rish'}</button>
        </div>
        <input className="input input-bordered w-full" type={show ? 'text' : 'password'}
          placeholder="Parolni tasdiqlang" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        {password && confirm && password !== confirm && (
          <p className="text-error text-xs">Parollar mos kelmadi</p>
        )}
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Bekor</button>
          <button type="submit" disabled={loading || password !== confirm} className="btn btn-primary btn-sm">
            {loading && <span className="loading loading-spinner loading-xs" />} O'zgartirish
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Account Detail Drawer ──────────────────────────────────────────────────

function AccountDrawer({ account, users, onClose, onRefresh }: {
  account: Account;
  users: User[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ email: '', password: '', role: 'USER' });
  const [addingUser, setAddingUser] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<{ id: string; email: string } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const accountUsers = users.filter((u) => u.account_id === account.id);

  useEffect(() => {
    setTxLoading(true);
    adminApi.getAccountTransactions(account.id, 1, 10).then((r) => {
      setTransactions(r.data?.items ?? r.data ?? []);
    }).catch(() => {}).finally(() => setTxLoading(false));
  }, [account.id]);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setAddingUser(true);
    try {
      await adminApi.createUser(account.id, { email: newUserForm.email, password: newUserForm.password, role: newUserForm.role });
      toast.success('Foydalanuvchi qo\'shildi');
      setNewUserForm({ email: '', password: '', role: 'USER' });
      setShowAddUser(false);
      onRefresh();
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'User qo\'shib bo\'lmadi')); }
    finally { setAddingUser(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={(e) => e.target === overlayRef.current && onClose()}>
      <div ref={overlayRef} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-base-200 w-full max-w-xl h-full overflow-y-auto shadow-2xl border-l border-base-300/50 animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-base-200/95 backdrop-blur border-b border-base-300/50 p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-lg">{account.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={account.status} />
              <span className="text-xs text-base-content/40">ID: {account.id.slice(0, 8)}...</span>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-square">X</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-base-300/50 rounded-xl p-3 text-center">
              <p className="text-xs text-base-content/50">Balans</p>
              <p className="font-bold text-lg tabular-nums">{Number(account.balance).toLocaleString()}</p>
              <p className="text-[10px] text-base-content/40">so'm</p>
            </div>
            <div className="bg-base-300/50 rounded-xl p-3 text-center">
              <p className="text-xs text-base-content/50">Kunlik</p>
              <p className="font-bold text-lg tabular-nums">{account.daily_fee ? Number(account.daily_fee).toLocaleString() : 'global'}</p>
              <p className="text-[10px] text-base-content/40">so'm</p>
            </div>
            <div className="bg-base-300/50 rounded-xl p-3 text-center">
              <p className="text-xs text-base-content/50">Tranzaksiyalar</p>
              <p className="font-bold text-lg tabular-nums">{account.transaction_count}</p>
            </div>
          </div>

          {/* Account details */}
          <div className="bg-base-300/30 rounded-xl p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-base-content/50">Telefon</span>
              <span className="font-mono">{account.phone || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-base-content/50">Yaratilgan</span>
              <span>{new Date(account.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Users section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Foydalanuvchilar ({accountUsers.length})</h3>
              <button className="btn btn-xs btn-primary" onClick={() => setShowAddUser(!showAddUser)}>
                {showAddUser ? 'Bekor' : '+ User'}
              </button>
            </div>

            {showAddUser && (
              <form onSubmit={addUser} className="bg-base-300/50 rounded-xl p-3 mb-3 space-y-2">
                <input className="input input-bordered input-sm w-full" type="email" required
                  placeholder="Email" value={newUserForm.email} onChange={(e) => setNewUserForm((f) => ({ ...f, email: e.target.value }))} />
                <input className="input input-bordered input-sm w-full" type="password" required minLength={6}
                  placeholder="Parol (min 6)" value={newUserForm.password} onChange={(e) => setNewUserForm((f) => ({ ...f, password: e.target.value }))} />
                <div className="flex gap-2">
                  <select className="select select-bordered select-sm flex-1" value={newUserForm.role}
                    onChange={(e) => setNewUserForm((f) => ({ ...f, role: e.target.value }))}>
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
                  </select>
                  <button type="submit" disabled={addingUser} className="btn btn-sm btn-primary">
                    {addingUser ? <span className="loading loading-spinner loading-xs" /> : 'Qo\'shish'}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-1.5">
              {accountUsers.map((u) => (
                <div key={u.id} className="bg-base-300/40 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <RoleBadge role={u.role} />
                      <span className={`badge badge-xs ${u.is_active ? 'badge-success' : 'badge-error'}`}>
                        {u.is_active ? 'Faol' : 'Bloklangan'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button className="btn btn-ghost btn-xs text-warning" onClick={() => setPasswordTarget({ id: u.id, email: u.email })}>
                      Parol
                    </button>
                  </div>
                </div>
              ))}
              {accountUsers.length === 0 && (
                <p className="text-xs text-base-content/40 text-center py-3">User yo'q</p>
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          <div>
            <h3 className="font-semibold text-sm mb-2">So'nggi tranzaksiyalar</h3>
            {txLoading ? (
              <div className="flex justify-center py-4"><span className="loading loading-spinner loading-sm" /></div>
            ) : transactions.length > 0 ? (
              <div className="space-y-1">
                {transactions.slice(0, 8).map((tx: any) => (
                  <div key={tx.id} className="flex items-center gap-2 text-xs bg-base-300/30 rounded-lg px-2.5 py-1.5">
                    <span className={`badge badge-xs ${tx.type === 'DEPOSIT' ? 'badge-success' : tx.type === 'CHARGE' ? 'badge-error' : 'badge-info'}`}>
                      {tx.type}
                    </span>
                    <span className={`font-bold tabular-nums ${tx.type === 'DEPOSIT' ? 'text-success' : 'text-error'}`}>
                      {tx.type === 'DEPOSIT' ? '+' : '-'}{Number(tx.amount).toLocaleString()}
                    </span>
                    <span className="text-base-content/40 truncate flex-1">{tx.description || '—'}</span>
                    <span className="text-base-content/30 whitespace-nowrap">{new Date(tx.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-base-content/40 text-center py-3">Tranzaksiya yo'q</p>
            )}
          </div>
        </div>
      </div>

      {passwordTarget && (
        <ChangePasswordModal user={passwordTarget} onClose={() => setPasswordTarget(null)} />
      )}
    </div>
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

type Tab = 'dashboard' | 'accounts' | 'analytics' | 'system' | 'feedback' | 'notifications' | 'audit' | 'permissions' | 'deposits' | 'whitelabel';

// ─── Main page ────────────────────────────────────────────────────────────────

const VALID_TABS: Tab[] = ['dashboard', 'accounts', 'analytics', 'system', 'feedback', 'notifications', 'audit', 'permissions', 'deposits', 'whitelabel'];

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
  void setActiveTab;

  // Sync tab when URL changes
  useEffect(() => {
    const t = searchParams.get('tab') as Tab | null;
    // Backwards compat: redirect old tab names
    if (t === 'users' as any) { setSearchParams({ tab: 'accounts' }); return; }
    if (t === 'popular' as any) { setSearchParams({ tab: 'analytics' }); return; }
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
  const [depositLog, setDepositLog] = useState<any[]>([]);
  const [depositLogTotal, setDepositLogTotal] = useState(0);
  const [depositLogPage, setDepositLogPage] = useState(1);

  // Modals
  const [depositTarget, setDepositTarget] = useState<Account | null>(null);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [editingFee, setEditingFee] = useState<string | null>(null);
  const [feeInput, setFeeInput] = useState('');
  const [globalFeeInput, setGlobalFeeInput] = useState('');
  const [savingGlobalFee, setSavingGlobalFee] = useState(false);
  const [drawerAccount, setDrawerAccount] = useState<Account | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<{ id: string; email: string } | null>(null);

  // Notifications
  const [notifMsg, setNotifMsg] = useState('');
  const [notifType, setNotifType] = useState('info');
  const [notifSending, setNotifSending] = useState(false);
  const [notifTarget, setNotifTarget] = useState<'all' | 'selected'>('all');
  const [notifSelectedAccounts, setNotifSelectedAccounts] = useState<string[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [newTmplName, setNewTmplName] = useState('');
  const [newTmplMsg, setNewTmplMsg] = useState('');
  const [newTmplType, setNewTmplType] = useState('info');

  // Phone editing
  const [editingPhone, setEditingPhone] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState('');

  // AI Usage + System Errors (System tab v6)
  const [aiUsage, setAiUsage] = useState<any>(null);
  const [systemErrors, setSystemErrors] = useState<any>(null);
  const [errorsPage, setErrorsPage] = useState(1);

  // Analytics charts data
  const [categoryTrends, setCategoryTrends] = useState<any[]>([]);
  const [productHeatmap, setProductHeatmap] = useState<any[]>([]);

  // Accounts tab filter + search
  const [accountFilter, setAccountFilter] = useState<'all' | 'active' | 'due' | 'suspended'>('all');
  const [accountSearch, setAccountSearch] = useState('');
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [accRes, feeRes, auditRes, usersRes] = await Promise.all([
      adminApi.listAccounts().catch(() => null),
      adminApi.getGlobalFee().catch(() => null),
      adminApi.getAuditLog(50).catch(() => null),
      adminApi.listUsers().catch(() => null),
    ]);
    if (accRes) setAccounts(accRes.data);
    if (feeRes) setGlobalFeeInput(feeRes.data.daily_fee_default);
    if (auditRes) setAuditLog(auditRes.data);
    if (usersRes) setUsers(usersRes.data);
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
    } else if (activeTab === 'analytics') {
      adminApi.getPopularProducts().then((r) => setPopularProducts(r.data || [])).catch(() => {});
      adminApi.getPopularCategories().then((r) => setPopularCategories(r.data || [])).catch(() => {});
      adminApi.getTopUsers().then((r) => setTopUsers(r.data || [])).catch(() => {});
      adminApi.getStatsRevenue(30).then((r) => setRevenue(r.data)).catch(() => {});
      adminApi.getStatsGrowth(30).then((r) => setGrowth(r.data)).catch(() => {});
      adminApi.getCategoryTrends(8).then((r) => setCategoryTrends(r.data || [])).catch(() => {});
      adminApi.getProductHeatmap('30d').then((r) => setProductHeatmap(r.data || [])).catch(() => {});
    } else if (activeTab === 'system') {
      adminApi.getSystemHealth().then((r) => setHealth(r.data)).catch(() => {});
      adminApi.getAiUsageStats().then((r) => setAiUsage(r.data)).catch(() => {});
      adminApi.getSystemErrors({ page: 1, limit: 50, period: 7 }).then((r) => setSystemErrors(r.data)).catch(() => {});
    } else if (activeTab === 'notifications') {
      adminApi.listNotificationTemplates().then((r) => setTemplates(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    } else if (activeTab === 'feedback') {
      adminApi.getAdminFeedback().then((r) => {
        const items = r.data?.items ?? r.data;
        setFeedbackTickets(Array.isArray(items) ? items : []);
      }).catch(() => {});
      adminApi.getFeedbackStats().then((r) => setFeedbackStats(r.data)).catch(() => {});
    } else if (activeTab === 'deposits') {
      adminApi.getDepositLog(depositLogPage).then((r) => {
        setDepositLog(Array.isArray(r.data?.items) ? r.data.items : []);
        setDepositLogTotal(r.data?.total ?? 0);
      }).catch(() => {});
    }
  }, [activeTab]);

  async function saveFee(accountId: string) {
    const val = feeInput.trim();
    const fee = val === '' ? null : parseInt(val);
    try {
      await adminApi.setFee(accountId, fee); setEditingFee(null);
      setAccounts((prev) => prev.map((a) => a.id === accountId ? { ...a, daily_fee: fee?.toString() ?? null } : a));
      toast.success(fee ? `Kunlik to'lov ${fee.toLocaleString()} so'm qilindi` : 'Global kunlik to\'lovga qaytarildi');
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Kunlik to\'lovni o\'zgartirib bo\'lmadi')); }
  }

  async function saveGlobalFee() {
    const fee = parseInt(globalFeeInput);
    if (!fee || fee <= 0) return;
    setSavingGlobalFee(true);
    try { await adminApi.setGlobalFee(fee); toast.success(`Global kunlik to'lov ${fee.toLocaleString()} so'm`); }
    catch (err: unknown) { toast.error(getErrorMessage(err, 'Global to\'lovni o\'zgartirib bo\'lmadi')); }
    finally { setSavingGlobalFee(false); }
  }

  async function handleRoleChange(userId: string, newRole: Role) {
    try {
      await adminApi.updateRole(userId, newRole);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
      toast.success(`Rol ${ROLE_META[newRole].label} ga o'zgartirildi`);
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Rolni o\'zgartirib bo\'lmadi')); }
  }

  async function handleToggleActive(userId: string) {
    try {
      const res = await adminApi.toggleActive(userId);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active: res.data.is_active } : u));
      toast.success(res.data.is_active ? 'Foydalanuvchi faollashtirildi' : 'Foydalanuvchi bloklandi');
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Holatni o\'zgartirib bo\'lmadi')); }
  }

  async function handleStatusChange(accountId: string, status: string) {
    try {
      await adminApi.updateAccountStatus(accountId, status);
      setAccounts((prev) => prev.map((a) => a.id === accountId ? { ...a, status: status as any } : a));
      const labels: Record<string, string> = { ACTIVE: 'faollashtirildi', SUSPENDED: 'bloklandi', PAYMENT_DUE: 'to\'lov kerak' };
      toast.success(`Account ${labels[status] ?? status}`);
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Statusni o\'zgartirib bo\'lmadi')); }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    try {
      const r = await adminApi.globalSearch(searchQuery); setSearchResults(r.data);
      const count = (r.data.users?.length || 0) + (r.data.accounts?.length || 0) + (r.data.products?.length || 0);
      if (count === 0) toast.info('Hech narsa topilmadi');
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Qidiruvda xatolik')); }
  }

  async function sendNotification() {
    if (!notifMsg.trim()) return;
    setNotifSending(true);
    try {
      const target = notifTarget === 'all' ? 'all' as const : notifSelectedAccounts;
      if (notifTarget === 'selected' && notifSelectedAccounts.length === 0) {
        toast.error('Kamida bitta account tanlang'); setNotifSending(false); return;
      }
      await adminApi.sendNotificationAdvanced({ message: notifMsg, type: notifType, target });
      setNotifMsg(''); setNotifSelectedAccounts([]);
      toast.success('Xabar yuborildi');
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Xabar yuborib bo\'lmadi')); }
    setNotifSending(false);
  }

  async function savePhone(accountId: string) {
    const val = phoneInput.trim() || null;
    try {
      await adminApi.updateAccountPhone(accountId, val);
      setEditingPhone(null);
      setAccounts((prev) => prev.map((a) => a.id === accountId ? { ...a, phone: val } : a));
      toast.success(val ? `Telefon raqam saqlandi: ${val}` : 'Telefon raqam o\'chirildi');
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Telefon raqamni saqlab bo\'lmadi')); }
  }

  async function createTemplate() {
    if (!newTmplName.trim() || !newTmplMsg.trim()) return;
    try {
      const r = await adminApi.createNotificationTemplate({ name: newTmplName, message: newTmplMsg, type: newTmplType });
      setTemplates((prev) => [r.data, ...prev]);
      setNewTmplName(''); setNewTmplMsg(''); setNewTmplType('info');
      toast.success('Shablon yaratildi');
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Shablon yaratib bo\'lmadi')); }
  }

  async function deleteTemplate(id: string) {
    try {
      await adminApi.deleteNotificationTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success('Shablon o\'chirildi');
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Shablonni o\'chirib bo\'lmadi')); }
  }

  async function loadErrorsPage(page: number) {
    setErrorsPage(page);
    adminApi.getSystemErrors({ page, limit: 50, period: 7 }).then((r) => setSystemErrors(r.data)).catch(() => {});
  }

  async function handleDeleteDeposit(id: string) {
    if (!confirm('Bu tranzaksiyani o\'chirmoqchimisiz?')) return;
    try {
      await adminApi.deleteDeposit(id);
      setDepositLog((prev) => prev.filter((d: any) => d.id !== id));
      setDepositLogTotal((prev) => prev - 1);
      toast.success('Deposit yozuvi o\'chirildi');
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'O\'chirib bo\'lmadi')); }
  }

  async function handleFeedbackStatus(ticketId: string, status: string) {
    try {
      await adminApi.updateFeedbackStatus(ticketId, status);
      setFeedbackTickets((prev) => prev.map((t: any) => t.id === ticketId ? { ...t, status } : t));
      toast.success(`Feedback statusi ${status} ga o'zgartirildi`);
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Statusni o\'zgartirib bo\'lmadi')); }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><span className="loading loading-ring loading-lg text-primary" /></div>;
  }

  const activeAccounts = accounts.filter((a) => a.status === 'ACTIVE').length;
  const dueAccounts = accounts.filter((a) => a.status === 'PAYMENT_DUE').length;
  const suspendedAccounts = accounts.filter((a) => a.status === 'SUSPENDED').length;
  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);
  const activeUsers = users.filter((u) => u.is_active).length;

  // Filtered accounts
  const filteredAccounts = accounts.filter((a) => {
    if (accountFilter === 'active' && a.status !== 'ACTIVE') return false;
    if (accountFilter === 'due' && a.status !== 'PAYMENT_DUE') return false;
    if (accountFilter === 'suspended' && a.status !== 'SUSPENDED') return false;
    if (accountSearch) {
      const q = accountSearch.toLowerCase();
      return a.name.toLowerCase().includes(q) ||
        a.phone?.toLowerCase().includes(q) ||
        a.users.some((u) => u.email.toLowerCase().includes(q));
    }
    return true;
  });

  const TAB_TITLES: Record<Tab, { title: string; desc: string }> = {
    dashboard: { title: 'Dashboard', desc: 'Umumiy statistika va real-time ko\'rsatkichlar' },
    accounts: { title: 'Akkauntlar', desc: `${accounts.length} akkaunt, ${users.length} user, ${activeUsers} faol` },
    analytics: { title: 'Analitika & Mashhur', desc: 'Top mahsulotlar, kategoriyalar va foydalanuvchilar' },
    system: { title: 'Tizim', desc: 'API, Database, AI xarajatlari, xatolar' },
    feedback: { title: 'Feedback Boshqaruv', desc: 'Foydalanuvchi murojatlari' },
    notifications: { title: 'Xabarnomalar', desc: 'Shablon yoki custom xabar yuborish' },
    audit: { title: 'Audit Log', desc: 'Admin amallar + foydalanuvchi faoliyati tarixi' },
    permissions: { title: 'Ruxsatlar', desc: 'Rol va huquqlar tizimi' },
    deposits: { title: 'Deposit Log', desc: 'Balans to\'ldirish tarixi' },
    whitelabel: { title: 'White-label', desc: 'Branding, logo, ranglar va custom domain' },
  };

  const currentTab = TAB_TITLES[activeTab];

  return (
    <>
      <div className="space-y-5 w-full">
        {/* Header + Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{currentTab.title}</h1>
              <span className="badge badge-error badge-sm">Admin</span>
            </div>
            <p className="text-base-content/40 text-sm mt-0.5">{currentTab.desc}</p>
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

        {/* ═══════════════ DASHBOARD TAB ═══════════════ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard label="Jami accountlar" value={accounts.length} sub={`${activeAccounts} faol / ${dueAccounts} to'lov`} />
              <StatCard label="Jami userlar" value={users.length} sub={`${activeUsers} faol`} />
              <StatCard label="Bugun aktiv" value={overview?.today_active_users ?? '-'} color="text-primary" />
              <StatCard label="Tracked products" value={overview?.total_tracked_products ?? '-'} />
              <StatCard label="Bugungi analyze" value={overview?.today_analyzes ?? '-'} color="text-info" />
              <StatCard label="Discovery runs" value={overview?.today_category_runs ?? '-'} />
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
                  {realtime.activity_feed?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-base-content/50 mb-1">So'nggi faoliyat</p>
                      <div className="space-y-1">
                        {realtime.activity_feed.slice(0, 5).map((a: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="badge badge-xs badge-primary">{a.action}</span>
                            <span className="text-base-content/60">{a.user_email}</span>
                            <span className="text-base-content/30 ml-auto">{new Date(a.created_at).toLocaleTimeString()}</span>
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

        {/* ═══════════════ ACCOUNTS & USERS TAB (MERGED) ═══════════════ */}
        {activeTab === 'accounts' && (
          <div className="space-y-5">
            {/* ── Summary Stats ── */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatCard label="Jami akkauntlar" value={accounts.length} />
              <StatCard label="Faol" value={activeAccounts} color="text-success" />
              <StatCard label="To'lov kerak" value={dueAccounts} color="text-error" />
              <StatCard label="Bloklangan" value={suspendedAccounts} />
              <StatCard label="Jami balans" value={totalBalance.toLocaleString()} sub="so'm" color="text-primary" />
            </div>

            {/* ── Toolbar ── */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-base-200 rounded-xl px-3 py-2 border border-base-300/50">
                <span className="text-xs text-base-content/40">Global to'lov:</span>
                <input className="input input-xs input-bordered w-20 text-right bg-transparent"
                  value={globalFeeInput} onChange={(e) => setGlobalFeeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveGlobalFee()} />
                <span className="text-xs text-base-content/40">so'm</span>
                <button onClick={saveGlobalFee} disabled={savingGlobalFee} className="btn btn-xs btn-primary">
                  {savingGlobalFee ? <span className="loading loading-spinner loading-xs" /> : 'OK'}
                </button>
              </div>
              <button onClick={() => setShowCreateAccount(true)} className="btn btn-primary btn-sm">+ Yangi Account</button>
              <div className="flex-1" />
              <div className="join">
                {(['all', 'active', 'due', 'suspended'] as const).map((f) => (
                  <button key={f} className={`join-item btn btn-xs ${accountFilter === f ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setAccountFilter(f)}>
                    {{ all: 'Barchasi', active: 'Faol', due: "To'lov", suspended: 'Bloklangan' }[f]}
                  </button>
                ))}
              </div>
              <input className="input input-bordered input-xs w-40" placeholder="Qidirish..."
                value={accountSearch} onChange={(e) => setAccountSearch(e.target.value)} />
            </div>

            {/* ── Unified Accounts + Users Table ── */}
            <div className="bg-base-200 rounded-2xl border border-base-300/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table table-sm w-full">
                  <thead>
                    <tr className="bg-base-300/40 text-xs uppercase tracking-wider text-base-content/50">
                      <th className="w-8"></th>
                      <th>Kompaniya</th>
                      <th>Telefon</th>
                      <th>Holat</th>
                      <th className="text-right">Balans</th>
                      <th className="text-right">Kunlik</th>
                      <th className="text-center">Userlar</th>
                      <th className="text-center">Tranz.</th>
                      <th>Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.map((a) => {
                      const isExpanded = expandedAccountId === a.id;
                      const accountUsers = users.filter((u) => u.account_id === a.id);
                      return (
                        <React.Fragment key={a.id}>{/* ── Account Row ── */}
                        <tr
                          className={`cursor-pointer transition-colors duration-150 ${isExpanded ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-base-300/30 border-l-2 border-l-transparent'}`}
                          onClick={() => setExpandedAccountId(isExpanded ? null : a.id)}>
                          <td className="text-center">
                            <svg className={`w-4 h-4 text-base-content/40 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </td>
                          <td>
                            <div className="font-semibold text-sm">{a.name}</div>
                            <div className="text-[11px] text-base-content/35 font-mono">{new Date(a.created_at).toLocaleDateString()}</div>
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            {editingPhone === a.id ? (
                              <div className="flex items-center gap-1">
                                <input className="input input-xs input-bordered w-28" value={phoneInput} placeholder="+998..."
                                  onChange={(e) => setPhoneInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && savePhone(a.id)} />
                                <button className="btn btn-xs btn-primary" onClick={() => savePhone(a.id)}>OK</button>
                                <button className="btn btn-xs btn-ghost" onClick={() => setEditingPhone(null)}>X</button>
                              </div>
                            ) : (
                              <button className="btn btn-ghost btn-xs font-mono text-base-content/60" onClick={(e) => { e.stopPropagation(); setEditingPhone(a.id); setPhoneInput(a.phone ?? ''); }}>
                                {a.phone || '—'}
                              </button>
                            )}
                          </td>
                          <td><StatusBadge status={a.status} /></td>
                          <td className="text-right font-mono text-sm tabular-nums">{Number(a.balance).toLocaleString()}</td>
                          <td className="text-right" onClick={(e) => e.stopPropagation()}>
                            {editingFee === a.id ? (
                              <div className="flex items-center gap-1 justify-end">
                                <input className="input input-xs input-bordered w-20" value={feeInput}
                                  onChange={(e) => setFeeInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveFee(a.id)} />
                                <button className="btn btn-xs btn-primary" onClick={() => saveFee(a.id)}>OK</button>
                                <button className="btn btn-xs btn-ghost" onClick={() => setEditingFee(null)}>X</button>
                              </div>
                            ) : (
                              <button className="btn btn-ghost btn-xs font-mono text-base-content/60" onClick={() => { setEditingFee(a.id); setFeeInput(a.daily_fee ?? ''); }}>
                                {a.daily_fee ? `${Number(a.daily_fee).toLocaleString()}` : 'global'}
                              </button>
                            )}
                          </td>
                          <td className="text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-base-300/60 text-xs font-bold">{a.users.length}</span>
                          </td>
                          <td className="text-center text-xs tabular-nums text-base-content/50">{a.transaction_count}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1">
                              <button className="btn btn-ghost btn-xs" onClick={() => setDepositTarget(a)}>Deposit</button>
                              <button className="btn btn-ghost btn-xs text-info" onClick={() => setDrawerAccount(a)}>Batafsil</button>
                              {a.status === 'ACTIVE' && (
                                <button className="btn btn-ghost btn-xs text-error" onClick={() => handleStatusChange(a.id, 'SUSPENDED')}>Suspend</button>
                              )}
                              {a.status === 'SUSPENDED' && (
                                <button className="btn btn-ghost btn-xs text-success" onClick={() => handleStatusChange(a.id, 'ACTIVE')}>Restore</button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {/* ── Expanded: Account Users ── */}
                        {isExpanded && accountUsers.length > 0 && accountUsers.map((u) => (
                          <tr key={`user-${u.id}`} className="bg-base-300/20 border-l-2 border-l-primary/40">
                            <td></td>
                            <td colSpan={2}>
                              <div className="flex items-center gap-2 pl-3">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary uppercase">
                                  {u.email[0]}
                                </div>
                                <div>
                                  <div className="text-sm font-medium">{u.email}</div>
                                  <div className="text-[11px] text-base-content/35">{new Date(u.created_at).toLocaleDateString()}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <select className="select select-bordered select-xs bg-transparent"
                                value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}>
                                {ROLES.map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
                              </select>
                            </td>
                            <td className="text-right">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${u.is_active ? 'bg-success/10 text-success border-success/20' : 'bg-error/10 text-error border-error/20'}`}>
                                {u.is_active ? 'Faol' : 'Bloklangan'}
                              </span>
                            </td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td>
                              <div className="flex gap-1">
                                <button className="btn btn-ghost btn-xs" onClick={() => handleToggleActive(u.id)}>
                                  {u.is_active ? 'Bloklash' : 'Faollashtirish'}
                                </button>
                                <button className="btn btn-ghost btn-xs text-warning" onClick={() => setPasswordTarget({ id: u.id, email: u.email })}>
                                  Parol
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {isExpanded && accountUsers.length === 0 && (
                          <tr key={`empty-${a.id}`} className="bg-base-300/20 border-l-2 border-l-primary/40">
                            <td></td>
                            <td colSpan={8} className="text-center text-base-content/30 text-xs py-3">
                              Bu accountda foydalanuvchi yo'q
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      );
                    })}
                    {filteredAccounts.length === 0 && (
                      <tr><td colSpan={9} className="text-center text-base-content/40 py-12">
                        {accountSearch ? 'Qidiruvga mos account topilmadi' : 'Account yo\'q'}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* ── Table footer ── */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-base-300/20 border-t border-base-300/30 text-xs text-base-content/40">
                <span>{filteredAccounts.length} akkaunt, {users.length} foydalanuvchi</span>
                <span>Qatorni bosib userlarni ko'ring</span>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ ANALYTICS & POPULAR TAB (MERGED) ═══════════════ */}
        {activeTab === 'analytics' && (() => {
          const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6', '#14b8a6'];

          // Revenue chart data
          const revenueData = (revenue?.daily || []).map((d: any) => ({
            date: new Date(d.date).toLocaleDateString('uz', { day: '2-digit', month: 'short' }),
            daromad: Number(d.amount || 0),
          }));

          // Growth chart data
          const growthData = (growth?.daily_new_users || []).map((d: any) => ({
            date: new Date(d.date).toLocaleDateString('uz', { day: '2-digit', month: 'short' }),
            yangi: d.count,
          }));

          // User activity top 8 bar chart
          const userActivityData = topUsers.slice(0, 8).map((u: any) => ({
            name: u.email?.split('@')[0] || '?',
            faollik: u.activity_score ?? 0,
            tracked: u.tracked_products ?? 0,
            discovery: u.discovery_runs ?? 0,
          }));

          // Score distribution pie
          const scoreRanges = [
            { name: '5+ A\'lo', range: [5, 99], fill: '#22c55e' },
            { name: '3-5 Yaxshi', range: [3, 5], fill: '#f59e0b' },
            { name: '1-3 O\'rta', range: [1, 3], fill: '#3b82f6' },
            { name: '0-1 Past', range: [0, 1], fill: '#94a3b8' },
          ];
          const scorePieData = scoreRanges.map((r) => ({
            name: r.name,
            value: popularProducts.filter((p: any) => {
              const s = Number(p.avg_score ?? 0);
              return s >= r.range[0] && s < r.range[1];
            }).length,
            fill: r.fill,
          })).filter((d) => d.value > 0);

          // Category heatmap bar
          const heatmapData = productHeatmap.slice(0, 10).map((h: any) => ({
            category: `#${h.category_id}`,
            mahsulotlar: h.count,
            score: Number(h.avg_score ?? 0),
          }));

          // Category trends line chart
          const trendLineData = (() => {
            if (!categoryTrends.length) return [];
            const reversed = [...categoryTrends].reverse();
            return reversed.map((w: any) => {
              const point: any = {
                hafta: new Date(w.week).toLocaleDateString('uz', { day: '2-digit', month: 'short' }),
              };
              if (w.categories) {
                Object.entries(w.categories).forEach(([catId, val]: any) => {
                  point[`#${catId}`] = val.runs || 0;
                });
              }
              return point;
            });
          })();
          const trendCategoryIds = (() => {
            const ids = new Set<string>();
            categoryTrends.forEach((w: any) => {
              if (w.categories) Object.keys(w.categories).forEach((id) => ids.add(`#${id}`));
            });
            return Array.from(ids).slice(0, 6);
          })();

          return (
          <div className="space-y-5">
            {/* ── Summary Stats ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Top userlar" value={topUsers.length} />
              <StatCard label="Mashhur mahsulotlar" value={popularProducts.length} />
              <StatCard label="Kategoriyalar" value={popularCategories.length} />
              <StatCard label="Eng faol" value={topUsers[0]?.email?.split('@')[0] || '—'} sub={topUsers[0] ? `${topUsers[0].activity_score ?? 0} ball` : ''} color="text-primary" />
            </div>

            {/* ── CHARTS ROW 1: Revenue + Growth ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Revenue Area Chart */}
              <div className="bg-base-200 rounded-2xl border border-base-300/50 overflow-hidden">
                <div className="px-4 py-3 border-b border-base-300/30 flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Kunlik Daromad (30 kun)</h3>
                  {revenue && (
                    <span className="text-xs font-mono text-success">{Number(revenue.mrr || 0).toLocaleString()} so'm MRR</span>
                  )}
                </div>
                <div className="p-4" style={{ height: 260 }}>
                  {revenueData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData}>
                        <defs>
                          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.7 0 0 / 0.1)" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0 / 0.5)" />
                        <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0 / 0.5)" tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} formatter={(v: number) => [`${v.toLocaleString()} so'm`, 'Daromad']} />
                        <Area type="monotone" dataKey="daromad" stroke="#6366f1" strokeWidth={2} fill="url(#revenueGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-base-content/30 text-sm">Ma'lumot yo'q</div>
                  )}
                </div>
              </div>

              {/* User Growth Bar Chart */}
              <div className="bg-base-200 rounded-2xl border border-base-300/50 overflow-hidden">
                <div className="px-4 py-3 border-b border-base-300/30 flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Yangi Foydalanuvchilar (30 kun)</h3>
                  {growth && (
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-success font-medium">Hafta: +{growth.week_new ?? 0}</span>
                      <span className="text-primary font-medium">Oy: +{growth.month_new ?? 0}</span>
                    </div>
                  )}
                </div>
                <div className="p-4" style={{ height: 260 }}>
                  {growthData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={growthData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.7 0 0 / 0.1)" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0 / 0.5)" />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0 / 0.5)" />
                        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} />
                        <Bar dataKey="yangi" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-base-content/30 text-sm">Ma'lumot yo'q</div>
                  )}
                </div>
              </div>
            </div>

            {/* ── CHARTS ROW 2: User Activity + Score Distribution ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* User Activity Bar */}
              <div className="lg:col-span-2 bg-base-200 rounded-2xl border border-base-300/50 overflow-hidden">
                <div className="px-4 py-3 border-b border-base-300/30">
                  <h3 className="font-semibold text-sm">Top 8 — Foydalanuvchi Faolligi</h3>
                </div>
                <div className="p-4" style={{ height: 280 }}>
                  {userActivityData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={userActivityData} layout="vertical" margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.7 0 0 / 0.1)" />
                        <XAxis type="number" tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0 / 0.5)" />
                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0 / 0.5)" />
                        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="faollik" fill="#6366f1" radius={[0, 4, 4, 0]} name="Faollik" />
                        <Bar dataKey="tracked" fill="#22c55e" radius={[0, 4, 4, 0]} name="Tracked" />
                        <Bar dataKey="discovery" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Discovery" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-base-content/30 text-sm">Ma'lumot yo'q</div>
                  )}
                </div>
              </div>

              {/* Score Distribution Donut */}
              <div className="bg-base-200 rounded-2xl border border-base-300/50 overflow-hidden">
                <div className="px-4 py-3 border-b border-base-300/30">
                  <h3 className="font-semibold text-sm">Score Taqsimoti</h3>
                </div>
                <div className="p-4 flex flex-col items-center" style={{ height: 280 }}>
                  {scorePieData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={scorePieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {scorePieData.map((entry, idx) => (
                              <Cell key={idx} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
                        {scorePieData.map((d, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[11px]">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                            <span className="text-base-content/60">{d.name}</span>
                            <span className="font-bold">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-base-content/30 text-sm">Ma'lumot yo'q</div>
                  )}
                </div>
              </div>
            </div>

            {/* ── CHARTS ROW 3: Category Trends + Category Heatmap ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Category Trends Line Chart */}
              <div className="bg-base-200 rounded-2xl border border-base-300/50 overflow-hidden">
                <div className="px-4 py-3 border-b border-base-300/30">
                  <h3 className="font-semibold text-sm">Kategoriya Trendlari (8 hafta)</h3>
                </div>
                <div className="p-4" style={{ height: 280 }}>
                  {trendLineData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendLineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.7 0 0 / 0.1)" />
                        <XAxis dataKey="hafta" tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0 / 0.5)" />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0 / 0.5)" />
                        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {trendCategoryIds.map((id, i) => (
                          <Line key={id} type="monotone" dataKey={id} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-base-content/30 text-sm">Ma'lumot yo'q</div>
                  )}
                </div>
              </div>

              {/* Category Heatmap Bar */}
              <div className="bg-base-200 rounded-2xl border border-base-300/50 overflow-hidden">
                <div className="px-4 py-3 border-b border-base-300/30">
                  <h3 className="font-semibold text-sm">Kategoriya — Tracked Mahsulotlar</h3>
                </div>
                <div className="p-4" style={{ height: 280 }}>
                  {heatmapData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={heatmapData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.7 0 0 / 0.1)" />
                        <XAxis dataKey="category" tick={{ fontSize: 10 }} stroke="oklch(0.6 0 0 / 0.5)" />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0 / 0.5)" />
                        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} formatter={(v: number, name: string) => {
                          if (name === 'score') return [v.toFixed(2), 'Avg Score'];
                          return [v, 'Mahsulotlar'];
                        }} />
                        <Bar dataKey="mahsulotlar" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-base-content/30 text-sm">Ma'lumot yo'q</div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Top Foydalanuvchilar Table ── */}
            <div className="bg-base-200 rounded-2xl border border-base-300/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-base-300/30 flex items-center justify-between">
                <h3 className="font-semibold text-sm">Top Foydalanuvchilar</h3>
                <span className="text-xs text-base-content/40">{topUsers.length} ta</span>
              </div>
              <div className="overflow-x-auto">
                <table className="table table-sm w-full">
                  <thead>
                    <tr className="bg-base-300/40 text-xs uppercase tracking-wider text-base-content/50">
                      <th className="w-12 text-center">#</th>
                      <th>Foydalanuvchi</th>
                      <th className="text-center">Tracked</th>
                      <th className="text-center">Avg Score</th>
                      <th className="text-center">Haftalik</th>
                      <th className="text-center">Discovery</th>
                      <th className="text-center">Faollik</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUsers.map((u: any, i: number) => (
                      <tr key={u.user_id || i} className="hover:bg-base-300/30 transition-colors">
                        <td className="text-center">
                          {i < 3 ? (
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                              i === 0 ? 'bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/20' :
                              i === 1 ? 'bg-base-content/10 text-base-content/60 ring-1 ring-base-content/10' :
                              'bg-orange-400/10 text-orange-400 ring-1 ring-orange-400/20'
                            }`}>
                              {i + 1}
                            </span>
                          ) : <span className="text-base-content/40 text-xs">{i + 1}</span>}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary uppercase">
                              {u.email?.[0] || '?'}
                            </div>
                            <div>
                              <div className="text-sm font-medium">{u.email}</div>
                              <div className="text-[11px] text-base-content/35">{u.account_name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center font-bold">{u.tracked_products ?? 0}</td>
                        <td className="text-center">
                          <span className={`text-sm font-mono ${Number(u.avg_score ?? 0) >= 4 ? 'text-success' : Number(u.avg_score ?? 0) >= 2 ? 'text-warning' : 'text-base-content/50'}`}>
                            {Number(u.avg_score ?? 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="text-center tabular-nums">{u.total_weekly ?? 0}</td>
                        <td className="text-center tabular-nums">{u.discovery_runs ?? 0}</td>
                        <td className="text-center">
                          <span className="inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-bold tabular-nums">
                            {u.activity_score ?? 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!topUsers.length && <tr><td colSpan={7} className="text-center text-base-content/40 py-8">Ma'lumot yo'q</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Products + Categories side by side ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Top Mahsulotlar */}
              <div className="bg-base-200 rounded-2xl border border-base-300/50 overflow-hidden">
                <div className="px-4 py-3 border-b border-base-300/30 flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Top Mahsulotlar</h3>
                  <span className="text-xs text-base-content/40">{popularProducts.length} ta</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="table table-sm w-full">
                    <thead>
                      <tr className="bg-base-300/40 text-xs uppercase tracking-wider text-base-content/50">
                        <th className="w-10 text-center">#</th>
                        <th>Mahsulot</th>
                        <th className="text-center">Track</th>
                        <th className="text-center">Score</th>
                        <th className="text-right">Haftalik</th>
                      </tr>
                    </thead>
                    <tbody>
                      {popularProducts.map((p: any, i: number) => (
                        <tr key={p.product_id || i} className="hover:bg-base-300/30 transition-colors">
                          <td className="text-center text-xs text-base-content/40 font-mono">{i + 1}</td>
                          <td>
                            <div className="text-sm max-w-[260px] truncate" title={p.title || `Product #${p.product_id}`}>
                              {p.title || `Product #${p.product_id}`}
                            </div>
                          </td>
                          <td className="text-center">
                            <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                              {p.tracker_count}
                            </span>
                          </td>
                          <td className="text-center">
                            <span className={`text-sm font-mono ${Number(p.avg_score ?? 0) >= 5 ? 'text-success' : Number(p.avg_score ?? 0) >= 3 ? 'text-warning' : 'text-base-content/50'}`}>
                              {Number(p.avg_score ?? 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="text-right tabular-nums font-mono text-sm">{p.weekly_bought ?? '—'}</td>
                        </tr>
                      ))}
                      {!popularProducts.length && <tr><td colSpan={5} className="text-center text-base-content/40 py-8">Ma'lumot yo'q</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top Kategoriyalar */}
              <div className="bg-base-200 rounded-2xl border border-base-300/50 overflow-hidden">
                <div className="px-4 py-3 border-b border-base-300/30 flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Top Kategoriyalar</h3>
                  <span className="text-xs text-base-content/40">{popularCategories.length} ta</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="table table-sm w-full">
                    <thead>
                      <tr className="bg-base-300/40 text-xs uppercase tracking-wider text-base-content/50">
                        <th>Kategoriya ID</th>
                        <th className="text-center">Discovery</th>
                        <th className="text-center">Winnerlar</th>
                        <th className="text-right">Oxirgi run</th>
                      </tr>
                    </thead>
                    <tbody>
                      {popularCategories.map((c: any, i: number) => (
                        <tr key={c.category_id || i} className="hover:bg-base-300/30 transition-colors">
                          <td>
                            <span className="font-mono text-sm bg-base-300/50 px-2 py-0.5 rounded-md">{c.category_id}</span>
                          </td>
                          <td className="text-center font-bold">{c.run_count}</td>
                          <td className="text-center">
                            <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-lg bg-success/10 text-success text-xs font-bold">
                              {c.winner_count ?? 0}
                            </span>
                          </td>
                          <td className="text-right text-xs text-base-content/50">{c.last_run_at ? new Date(c.last_run_at).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                      {!popularCategories.length && <tr><td colSpan={4} className="text-center text-base-content/40 py-8">Ma'lumot yo'q</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          );
        })()}

        {/* ═══════════════ SYSTEM TAB ═══════════════ */}
        {activeTab === 'system' && (
          <div className="space-y-4">
            {/* System Health */}
            {health ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="API Status" value={health.status === 'healthy' ? 'Sog\'lom' : 'Muammo'} color={health.status === 'healthy' ? 'text-success' : 'text-error'} />
                <StatCard label="Uptime" value={`${Math.floor((health.uptime_seconds || 0) / 3600)}h ${Math.floor(((health.uptime_seconds || 0) % 3600) / 60)}m`} />
                <StatCard label="Database" value={health.db_connected ? 'Ulangan' : 'Uzilgan'} color={health.db_connected ? 'text-success' : 'text-error'} />
                <StatCard label="RAM (Heap)" value={`${health.memory?.heap_used_mb ?? 0} / ${health.memory?.heap_total_mb ?? 0} MB`} />
              </div>
            ) : (
              <div className="flex justify-center py-8"><span className="loading loading-spinner" /></div>
            )}

            {/* AI Usage Stats */}
            {aiUsage && (
              <div className="card bg-base-200">
                <div className="card-body p-4">
                  <h3 className="font-semibold text-sm">AI Xarajatlari (Anthropic Claude)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    <StatCard label="Bugungi chaqiruvlar" value={aiUsage.today?.calls ?? 0} color="text-primary" />
                    <StatCard label="Bugungi tokenlar" value={((aiUsage.today?.input_tokens ?? 0) + (aiUsage.today?.output_tokens ?? 0)).toLocaleString()} sub={`in: ${(aiUsage.today?.input_tokens ?? 0).toLocaleString()} / out: ${(aiUsage.today?.output_tokens ?? 0).toLocaleString()}`} />
                    <StatCard label="Bugungi xarajat" value={`$${aiUsage.today?.cost_usd ?? '0.0000'}`} color="text-warning" />
                    <StatCard label="30 kunlik xarajat" value={`$${aiUsage.period?.cost_usd ?? '0.0000'}`} sub={`${aiUsage.period?.calls ?? 0} chaqiruv`} color="text-error" />
                  </div>

                  {/* By Method */}
                  {aiUsage.by_method?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-base-content/50 mb-2">Metod bo'yicha</p>
                      <div className="overflow-x-auto">
                        <table className="table table-xs">
                          <thead><tr><th>Metod</th><th>Chaqiruvlar</th><th>Input tok.</th><th>Output tok.</th><th>Xarajat ($)</th><th>O'rt. vaqt</th></tr></thead>
                          <tbody>
                            {aiUsage.by_method.map((m: any) => (
                              <tr key={m.method}>
                                <td className="font-mono text-xs">{m.method}</td>
                                <td className="font-bold">{m.calls}</td>
                                <td className="tabular-nums">{m.input_tokens.toLocaleString()}</td>
                                <td className="tabular-nums">{m.output_tokens.toLocaleString()}</td>
                                <td className="text-warning tabular-nums">${m.cost_usd}</td>
                                <td className="text-base-content/50">{m.avg_duration_ms}ms</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* AI Errors */}
                  {aiUsage.recent_errors?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-error mb-1">AI xatolar</p>
                      <div className="space-y-1">
                        {aiUsage.recent_errors.slice(0, 10).map((e: any) => (
                          <div key={e.id} className="flex items-center gap-2 text-xs">
                            <span className="text-base-content/40">{new Date(e.created_at).toLocaleString()}</span>
                            <span className="badge badge-xs badge-error">{e.method}</span>
                            <span className="text-error/70 truncate max-w-xs">{e.error}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* System Errors */}
            {systemErrors && (
              <div className="card bg-base-200">
                <div className="card-body p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-error">Tizim xatolari (so'nggi 7 kun)</h3>
                    <span className="badge badge-sm badge-error">{systemErrors.total ?? 0} ta</span>
                  </div>

                  {/* Error summary by status and endpoint */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    {systemErrors.by_status?.length > 0 && (
                      <div>
                        <p className="text-xs text-base-content/50 mb-1">Status bo'yicha</p>
                        <div className="flex flex-wrap gap-2">
                          {systemErrors.by_status.map((s: any) => (
                            <span key={s.status} className={`badge badge-sm ${s.status >= 500 ? 'badge-error' : 'badge-warning'}`}>
                              {s.status}: {s.count}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {systemErrors.by_endpoint?.length > 0 && (
                      <div>
                        <p className="text-xs text-base-content/50 mb-1">Top endpointlar</p>
                        <div className="space-y-1">
                          {systemErrors.by_endpoint.slice(0, 5).map((e: any) => (
                            <div key={e.endpoint} className="flex items-center gap-2 text-xs">
                              <span className="badge badge-xs badge-error">{e.count}</span>
                              <span className="font-mono truncate">{e.endpoint}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Error list */}
                  {systemErrors.items?.length > 0 && (
                    <div className="overflow-x-auto mt-3">
                      <table className="table table-xs">
                        <thead><tr><th>Vaqt</th><th>Status</th><th>Metod</th><th>Endpoint</th><th>Xato</th><th>Account</th></tr></thead>
                        <tbody>
                          {systemErrors.items.map((e: any) => (
                            <tr key={e.id}>
                              <td className="text-xs whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                              <td><span className={`badge badge-xs ${e.status >= 500 ? 'badge-error' : 'badge-warning'}`}>{e.status}</span></td>
                              <td className="text-xs font-mono">{e.method}</td>
                              <td className="text-xs font-mono max-w-[200px] truncate">{e.endpoint}</td>
                              <td className="text-xs text-error/70 max-w-xs truncate">{e.message}</td>
                              <td className="text-xs text-base-content/40">{e.account_id ? e.account_id.slice(0, 8) + '...' : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination */}
                  {(systemErrors.pages ?? 1) > 1 && (
                    <div className="flex justify-center gap-2 mt-2">
                      <button className="btn btn-ghost btn-xs" disabled={errorsPage <= 1} onClick={() => loadErrorsPage(errorsPage - 1)}>Oldingi</button>
                      <span className="btn btn-ghost btn-xs no-animation">{errorsPage} / {systemErrors.pages}</span>
                      <button className="btn btn-ghost btn-xs" disabled={errorsPage >= (systemErrors.pages ?? 1)} onClick={() => loadErrorsPage(errorsPage + 1)}>Keyingi</button>
                    </div>
                  )}

                  {!systemErrors.items?.length && (
                    <p className="text-xs text-base-content/40 text-center mt-3">Xatolar yo'q</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ FEEDBACK TAB ═══════════════ */}
        {activeTab === 'feedback' && (
          <div className="space-y-4">
            {feedbackStats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <StatCard label="Jami" value={feedbackStats.total ?? 0} />
                <StatCard label="Ochiq" value={feedbackStats.by_status?.OPEN ?? 0} color="text-info" />
                <StatCard label="Jarayonda" value={feedbackStats.by_status?.IN_PROGRESS ?? 0} color="text-warning" />
                <StatCard label="Hal qilindi" value={feedbackStats.by_status?.RESOLVED ?? 0} color="text-success" />
                <StatCard label="Yopildi" value={feedbackStats.by_status?.CLOSED ?? 0} />
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
            {/* Xabar yuborish */}
            <div className="card bg-base-200">
              <div className="card-body p-4">
                <h3 className="font-semibold text-sm">Xabar yuborish</h3>
                <div className="space-y-3 mt-2">
                  <textarea className="textarea textarea-bordered w-full text-sm" rows={3} placeholder="Xabar matni..."
                    value={notifMsg} onChange={(e) => setNotifMsg(e.target.value)} />
                  <div className="flex flex-col md:flex-row gap-3">
                    <select className="select select-bordered select-sm w-32" value={notifType} onChange={(e) => setNotifType(e.target.value)}>
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="error">Error</option>
                      <option value="success">Success</option>
                    </select>
                    <select className="select select-bordered select-sm w-40" value={notifTarget} onChange={(e) => setNotifTarget(e.target.value as any)}>
                      <option value="all">Barchaga</option>
                      <option value="selected">Tanlangan accountlar</option>
                    </select>
                    <button className="btn btn-primary btn-sm" onClick={sendNotification} disabled={notifSending}>
                      {notifSending ? <span className="loading loading-spinner loading-xs" /> : 'Yuborish'}
                    </button>
                  </div>

                  {notifTarget === 'selected' && (
                    <div className="bg-base-300/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <p className="text-xs text-base-content/50 mb-2">Accountlarni tanlang:</p>
                      <div className="space-y-1">
                        {accounts.map((a) => (
                          <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" className="checkbox checkbox-xs checkbox-primary"
                              checked={notifSelectedAccounts.includes(a.id)}
                              onChange={(e) => {
                                if (e.target.checked) setNotifSelectedAccounts((p) => [...p, a.id]);
                                else setNotifSelectedAccounts((p) => p.filter((x) => x !== a.id));
                              }} />
                            <span>{a.name}</span>
                            {a.phone && <span className="text-xs text-base-content/40 font-mono">{a.phone}</span>}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Shablonlar */}
            <div className="card bg-base-200">
              <div className="card-body p-4">
                <h3 className="font-semibold text-sm">Xabar shablonlari</h3>

                {/* Yangi shablon yaratish */}
                <div className="flex flex-col md:flex-row gap-2 mt-2">
                  <input className="input input-bordered input-sm flex-1" placeholder="Shablon nomi"
                    value={newTmplName} onChange={(e) => setNewTmplName(e.target.value)} />
                  <input className="input input-bordered input-sm flex-[2]" placeholder="Xabar matni"
                    value={newTmplMsg} onChange={(e) => setNewTmplMsg(e.target.value)} />
                  <select className="select select-bordered select-sm w-24" value={newTmplType} onChange={(e) => setNewTmplType(e.target.value)}>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                    <option value="success">Success</option>
                  </select>
                  <button className="btn btn-sm btn-primary" onClick={createTemplate}>+ Shablon</button>
                </div>

                {/* Shablonlar ro'yxati */}
                {templates.length > 0 ? (
                  <div className="space-y-2 mt-3">
                    {templates.map((t: any) => (
                      <div key={t.id} className="flex items-center gap-2 bg-base-300/50 rounded-lg px-3 py-2">
                        <span className={`badge badge-xs ${t.type === 'error' ? 'badge-error' : t.type === 'warning' ? 'badge-warning' : t.type === 'success' ? 'badge-success' : 'badge-info'}`}>{t.type}</span>
                        <span className="font-semibold text-sm">{t.name}</span>
                        <span className="text-xs text-base-content/50 flex-1 truncate">{t.message}</span>
                        <button className="btn btn-ghost btn-xs text-primary" onClick={() => { setNotifMsg(t.message); setNotifType(t.type); }}>
                          Ishlat
                        </button>
                        <button className="btn btn-ghost btn-xs text-error" onClick={() => deleteTemplate(t.id)}>
                          X
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-base-content/40 mt-2">Shablonlar yo'q</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ AUDIT TAB ═══════════════ */}
        {activeTab === 'audit' && (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead><tr><th>Vaqt</th><th>Tur</th><th>Amal</th><th>User</th><th>Account</th><th>Tafsilotlar</th><th>IP</th></tr></thead>
              <tbody>
                {auditLog.map((e) => (
                  <tr key={`${e.source}-${e.id}`} className="hover">
                    <td className="text-xs whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-xs ${e.source === 'admin' ? 'badge-error' : 'badge-info'}`}>
                        {e.source === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-xs ${
                        e.action.includes('CREATED') || e.action === 'ANALYZE' || e.action === 'DISCOVERY' ? 'badge-success' :
                        e.action.includes('DEACTIVATED') || e.action.includes('DELETED') ? 'badge-error' :
                        e.action.includes('CHANGED') || e.action.includes('ROLE') || e.action.includes('PASSWORD') ? 'badge-warning' :
                        e.action === 'LOGIN' || e.action === 'REGISTER' ? 'badge-primary' : 'badge-ghost'
                      }`}>{e.action}</span>
                    </td>
                    <td className="text-xs text-base-content/60">{e.user_email ?? '-'}</td>
                    <td className="text-xs text-base-content/50">{e.account_name ?? '-'}</td>
                    <td className="text-xs max-w-xs truncate">
                      {e.source === 'admin' ? (
                        <>
                          {e.old_value && <span className="text-error/60">{JSON.stringify(e.old_value)}</span>}
                          {e.old_value && e.new_value && ' → '}
                          {e.new_value && <span className="text-success/60">{JSON.stringify(e.new_value)}</span>}
                        </>
                      ) : (
                        <span className="text-base-content/40">{e.details ? (typeof e.details === 'string' ? e.details : JSON.stringify(e.details)) : '—'}</span>
                      )}
                    </td>
                    <td className="text-xs text-base-content/30 font-mono">{e.ip ?? '—'}</td>
                  </tr>
                ))}
                {!auditLog.length && (
                  <tr><td colSpan={7} className="text-center text-base-content/40 py-8">Audit log bo'sh</td></tr>
                )}
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

        {activeTab === 'deposits' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-base-content/50">Jami: {depositLogTotal} ta deposit</p>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr><th>Sana</th><th>Kompaniya</th><th>Miqdor</th><th>Oldingi</th><th>Keyingi</th><th>Izoh</th><th>Amal</th></tr>
                </thead>
                <tbody>
                  {depositLog.map((d: any) => (
                    <tr key={d.id} className="hover">
                      <td className="text-xs whitespace-nowrap">{new Date(d.created_at).toLocaleString()}</td>
                      <td className="text-sm">{d.account_name}</td>
                      <td className="text-success font-bold tabular-nums">+{Number(d.amount).toLocaleString()}</td>
                      <td className="text-xs tabular-nums text-base-content/50">{Number(d.balance_before).toLocaleString()}</td>
                      <td className="text-xs tabular-nums text-base-content/50">{Number(d.balance_after).toLocaleString()}</td>
                      <td className="text-xs text-base-content/40 max-w-xs truncate">{d.description || '—'}</td>
                      <td>
                        <button className="btn btn-ghost btn-xs text-error" onClick={() => handleDeleteDeposit(d.id)}>
                          O'chirish
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!depositLog.length && (
                    <tr><td colSpan={7} className="text-center text-base-content/40 py-8">Deposit mavjud emas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {depositLogTotal > 20 && (
              <div className="flex justify-center gap-2">
                <button className="btn btn-ghost btn-sm" disabled={depositLogPage <= 1}
                  onClick={() => setDepositLogPage((p) => p - 1)}>Oldingi</button>
                <span className="btn btn-ghost btn-sm no-animation">{depositLogPage}</span>
                <button className="btn btn-ghost btn-sm" disabled={depositLog.length < 20}
                  onClick={() => setDepositLogPage((p) => p + 1)}>Keyingi</button>
              </div>
            )}
          </div>
        )}
      </div>

        {/* White-label — Feature 14 */}
        {activeTab === 'whitelabel' && <WhitelabelTab />}

      {/* Modals */}
      {showCreateAccount && <CreateAccountModal onClose={() => setShowCreateAccount(false)} onDone={load} />}
      {depositTarget && <DepositModal account={depositTarget} onClose={() => setDepositTarget(null)} onDone={load} />}
      {passwordTarget && <ChangePasswordModal user={passwordTarget} onClose={() => setPasswordTarget(null)} />}

      {/* Account Detail Drawer */}
      {drawerAccount && (
        <AccountDrawer
          account={drawerAccount}
          users={users}
          onClose={() => setDrawerAccount(null)}
          onRefresh={load}
        />
      )}

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.25s ease-out;
        }
      `}</style>
    </>
  );
}

// ─── White-label Tab ──────────────────────────────────────────────────────────

function WhitelabelTab() {
  const [config, setConfig] = useState({
    appName: 'VENTRA',
    logoText: 'V',
    logoSubtitle: 'Analytics Platform',
    primaryColor: '#4C7DFF',
    supportEmail: 'support@ventra.uz',
    marketplaceName: 'Uzum',
    marketplaceUrl: 'https://uzum.uz',
    customDomain: '',
  });
  const [saving, setSaving] = useState(false);

  function handleSave() {
    setSaving(true);
    // Store config locally (in real deployment this would be an API call)
    try {
      localStorage.setItem('whitelabel_config', JSON.stringify(config));
      toast.success('Branding sozlamalari saqlandi');
    } catch {
      toast.error('Saqlashda xato');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem('whitelabel_config');
      if (saved) setConfig(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6">
        <h3 className="font-bold text-sm mb-4">Ko'rinish</h3>
        <div className="flex items-center gap-4 bg-base-300/60 rounded-xl p-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl text-white"
            style={{ backgroundColor: config.primaryColor }}>
            {config.logoText}
          </div>
          <div>
            <p className="font-bold text-lg">{config.appName}</p>
            <p className="text-xs text-base-content/50">{config.logoSubtitle}</p>
          </div>
        </div>
      </div>

      {/* App Identity */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6 space-y-4">
        <h3 className="font-bold text-sm">Platforma identifikatsiyasi</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="form-control">
            <div className="label"><span className="label-text text-xs">Platforma nomi</span></div>
            <input className="input input-bordered input-sm" value={config.appName}
              onChange={(e) => setConfig({ ...config, appName: e.target.value })} />
          </label>
          <label className="form-control">
            <div className="label"><span className="label-text text-xs">Logo harfi</span></div>
            <input className="input input-bordered input-sm w-20" maxLength={2} value={config.logoText}
              onChange={(e) => setConfig({ ...config, logoText: e.target.value })} />
          </label>
          <label className="form-control">
            <div className="label"><span className="label-text text-xs">Logo taglavha</span></div>
            <input className="input input-bordered input-sm" value={config.logoSubtitle}
              onChange={(e) => setConfig({ ...config, logoSubtitle: e.target.value })} />
          </label>
          <label className="form-control">
            <div className="label"><span className="label-text text-xs">Support email</span></div>
            <input className="input input-bordered input-sm" type="email" value={config.supportEmail}
              onChange={(e) => setConfig({ ...config, supportEmail: e.target.value })} />
          </label>
        </div>
      </div>

      {/* Colors */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6 space-y-4">
        <h3 className="font-bold text-sm">Ranglar</h3>
        <div className="flex items-center gap-4">
          <label className="form-control">
            <div className="label"><span className="label-text text-xs">Asosiy rang</span></div>
            <div className="flex items-center gap-2">
              <input type="color" className="w-10 h-10 rounded-lg border border-base-300 cursor-pointer"
                value={config.primaryColor}
                onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })} />
              <input className="input input-bordered input-sm w-28 font-mono" value={config.primaryColor}
                onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })} />
            </div>
          </label>
          <div className="flex gap-2 mt-6">
            {['#4C7DFF', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map((c) => (
              <button key={c} className="w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110"
                style={{ backgroundColor: c, borderColor: config.primaryColor === c ? '#fff' : 'transparent' }}
                onClick={() => setConfig({ ...config, primaryColor: c })} />
            ))}
          </div>
        </div>
      </div>

      {/* Marketplace */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6 space-y-4">
        <h3 className="font-bold text-sm">Marketplace sozlamalari</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="form-control">
            <div className="label"><span className="label-text text-xs">Marketplace nomi</span></div>
            <input className="input input-bordered input-sm" value={config.marketplaceName}
              onChange={(e) => setConfig({ ...config, marketplaceName: e.target.value })} />
          </label>
          <label className="form-control">
            <div className="label"><span className="label-text text-xs">Marketplace URL</span></div>
            <input className="input input-bordered input-sm" value={config.marketplaceUrl}
              onChange={(e) => setConfig({ ...config, marketplaceUrl: e.target.value })} />
          </label>
          <label className="form-control sm:col-span-2">
            <div className="label"><span className="label-text text-xs">Custom domain (opsional)</span></div>
            <input className="input input-bordered input-sm" placeholder="analytics.yourdomain.com" value={config.customDomain}
              onChange={(e) => setConfig({ ...config, customDomain: e.target.value })} />
            <div className="label"><span className="label-text-alt text-xs text-base-content/40">CNAME rekordni sozlab, shu yerga domain kiriting</span></div>
          </label>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button className="btn btn-primary btn-sm gap-2" onClick={handleSave} disabled={saving}>
          {saving ? <span className="loading loading-spinner loading-xs" /> : null}
          Saqlash
        </button>
      </div>
    </div>
  );
}
