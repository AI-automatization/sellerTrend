import { useState, useEffect } from 'react';
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

interface GlobalFee { daily_fee_default: string }

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

const ROLE_META: Record<Role, { label: string; badge: string; color: string; bg: string }> = {
  SUPER_ADMIN: { label: 'Super Admin',  badge: 'bg-error/15 text-error border-error/20',   color: 'text-error',   bg: 'bg-error/10' },
  ADMIN:       { label: 'Admin',        badge: 'bg-warning/15 text-warning border-warning/20', color: 'text-warning', bg: 'bg-warning/10' },
  MODERATOR:   { label: 'Moderator',    badge: 'bg-info/15 text-info border-info/20',    color: 'text-info',    bg: 'bg-info/10' },
  USER:        { label: 'Foydalanuvchi', badge: 'bg-success/15 text-success border-success/20', color: 'text-success', bg: 'bg-success/10' },
};

const PERMISSIONS: Record<Role, { label: string; key: string }[]> = {
  SUPER_ADMIN: [
    { key: 'manage_accounts',        label: 'Account yaratish/o\'chirish' },
    { key: 'manage_all_users',       label: 'Barcha foydalanuvchilarni boshqarish' },
    { key: 'manage_roles',           label: 'Rol o\'zgartirish (shu jumladan SUPER_ADMIN)' },
    { key: 'manage_billing',         label: 'Balans va kunlik to\'lov' },
    { key: 'manage_global_settings', label: 'Global sozlamalar' },
    { key: 'view_audit_log',         label: 'Audit logni ko\'rish' },
    { key: 'manage_discovery',       label: 'Discovery ishga tushirish' },
    { key: 'analyze_products',       label: 'Mahsulot tahlili' },
    { key: 'manage_tracked',         label: 'Kuzatuv ro\'yxatini boshqarish' },
    { key: 'view_dashboard',         label: 'Dashboard' },
  ],
  ADMIN: [
    { key: 'manage_account_users',   label: 'O\'z accounti foydalanuvchilarini boshqarish' },
    { key: 'view_audit_log',         label: 'Audit logni ko\'rish' },
    { key: 'manage_discovery',       label: 'Discovery ishga tushirish' },
    { key: 'analyze_products',       label: 'Mahsulot tahlili' },
    { key: 'manage_tracked',         label: 'Kuzatuv ro\'yxatini boshqarish' },
    { key: 'view_dashboard',         label: 'Dashboard' },
  ],
  MODERATOR: [
    { key: 'manage_discovery',       label: 'Discovery ishga tushirish' },
    { key: 'analyze_products',       label: 'Mahsulot tahlili' },
    { key: 'manage_tracked',         label: 'Kuzatuv ro\'yxatini boshqarish' },
    { key: 'view_dashboard',         label: 'Dashboard' },
  ],
  USER: [
    { key: 'manage_discovery',       label: 'Discovery ishga tushirish' },
    { key: 'analyze_products',       label: 'Mahsulot tahlili (URL)' },
    { key: 'manage_tracked',         label: 'O\'z kuzatuv ro\'yxati' },
    { key: 'view_dashboard',         label: 'Dashboard' },
  ],
};

// ─── Sub-components ───────────────────────────────────────────────────────────

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
  const labels = { ACTIVE: 'Faol', PAYMENT_DUE: 'To\'lov kerak', SUSPENDED: 'Bloklangan' };
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
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-square text-base-content/40">✕</button>
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
    catch (err: any) { setError(err.response?.data?.message ?? 'Xato yuz berdi'); }
    finally { setLoading(false); }
  }

  return (
    <Modal title="Yangi Account" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="fieldset"><span className="fieldset-legend text-xs">Kompaniya nomi</span>
          <input className="input input-bordered w-full" required value={form.company_name} onChange={(e) => set('company_name', e.target.value)} placeholder="TrendShop LLC" />
        </label>
        <label className="fieldset"><span className="fieldset-legend text-xs">Admin email</span>
          <input className="input input-bordered w-full" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="admin@company.uz" />
        </label>
        <label className="fieldset"><span className="fieldset-legend text-xs">Parol</span>
          <input className="input input-bordered w-full" type="password" required minLength={6} value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Kamida 6 belgi" />
        </label>
        <label className="fieldset"><span className="fieldset-legend text-xs">Dastlabki rol</span>
          <select className="select select-bordered w-full" value={form.role} onChange={(e) => set('role', e.target.value)}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
          </select>
        </label>
        {error && <p className="text-error text-sm">{error}</p>}
        <div className="flex gap-2 justify-end pt-3">
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Bekor</button>
          <button type="submit" disabled={loading} className="btn btn-primary btn-sm gap-2">
            {loading && <span className="loading loading-spinner loading-xs" />} Yaratish
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AddUserModal({ accounts, onClose, onDone }: { accounts: Account[]; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ account_id: accounts[0]?.id ?? '', email: '', password: '', role: 'USER' as Role });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try { await adminApi.createUser(form.account_id, { email: form.email, password: form.password, role: form.role }); onDone(); onClose(); }
    catch (err: any) { setError(err.response?.data?.message ?? 'Xato yuz berdi'); }
    finally { setLoading(false); }
  }

  return (
    <Modal title="Foydalanuvchi qo'shish" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="fieldset"><span className="fieldset-legend text-xs">Account</span>
          <select className="select select-bordered w-full" value={form.account_id} onChange={(e) => set('account_id', e.target.value)}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <label className="fieldset"><span className="fieldset-legend text-xs">Email</span>
          <input className="input input-bordered w-full" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="user@company.uz" />
        </label>
        <label className="fieldset"><span className="fieldset-legend text-xs">Parol</span>
          <input className="input input-bordered w-full" type="password" required minLength={6} value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Kamida 6 belgi" />
        </label>
        <label className="fieldset"><span className="fieldset-legend text-xs">Rol</span>
          <select className="select select-bordered w-full" value={form.role} onChange={(e) => set('role', e.target.value)}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
          </select>
        </label>
        {error && <p className="text-error text-sm">{error}</p>}
        <div className="flex gap-2 justify-end pt-3">
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Bekor</button>
          <button type="submit" disabled={loading} className="btn btn-primary btn-sm gap-2">
            {loading && <span className="loading loading-spinner loading-xs" />} Qo'shish
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
    <Modal title="Balans to'ldirish" onClose={onClose}>
      <p className="text-sm text-base-content/50 -mt-3 mb-4">{account.name}</p>
      <form onSubmit={submit} className="space-y-3">
        <label className="fieldset"><span className="fieldset-legend text-xs">Miqdor (so'm)</span>
          <input className="input input-bordered w-full" placeholder="100000" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
        <label className="fieldset"><span className="fieldset-legend text-xs">Izoh (ixtiyoriy)</span>
          <input className="input input-bordered w-full" placeholder="To'lov uchun..." value={desc} onChange={(e) => setDesc(e.target.value)} />
        </label>
        {error && <p className="text-error text-sm">{error}</p>}
        <div className="flex gap-2 justify-end pt-3">
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Bekor</button>
          <button type="submit" disabled={loading} className="btn btn-primary btn-sm gap-2">
            {loading && <span className="loading loading-spinner loading-xs" />} Qo'shish
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = 'accounts' | 'users' | 'permissions' | 'audit';

export function AdminPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [_globalFee, setGlobalFee] = useState<GlobalFee | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('accounts');

  const [depositTarget, setDepositTarget] = useState<Account | null>(null);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);

  const [editingFee, setEditingFee] = useState<string | null>(null);
  const [feeInput, setFeeInput] = useState('');
  const [globalFeeInput, setGlobalFeeInput] = useState('');
  const [savingGlobalFee, setSavingGlobalFee] = useState(false);

  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);

  async function load() {
    const [accRes, feeRes, auditRes, usersRes] = await Promise.all([
      adminApi.listAccounts(), adminApi.getGlobalFee(), adminApi.getAuditLog(30), adminApi.listUsers(),
    ]);
    setAccounts(accRes.data); setGlobalFee(feeRes.data); setGlobalFeeInput(feeRes.data.daily_fee_default);
    setAuditLog(auditRes.data); setUsers(usersRes.data); setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function saveFee(accountId: string) {
    const val = feeInput.trim();
    const fee = val === '' ? null : parseInt(val);
    try { await adminApi.setFee(accountId, fee); setEditingFee(null);
      setAccounts((prev) => prev.map((a) => a.id === accountId ? { ...a, daily_fee: fee?.toString() ?? null } : a));
    } catch {}
  }

  async function saveGlobalFee() {
    const fee = parseInt(globalFeeInput);
    if (!fee || fee <= 0) return;
    setSavingGlobalFee(true);
    try { await adminApi.setGlobalFee(fee); setGlobalFee({ daily_fee_default: String(fee) }); }
    finally { setSavingGlobalFee(false); }
  }

  async function handleRoleChange(userId: string, newRole: Role) {
    setUpdatingRole(userId);
    try { await adminApi.updateRole(userId, newRole);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    } catch {} setUpdatingRole(null);
  }

  async function handleToggleActive(userId: string) {
    setTogglingUser(userId);
    try { const res = await adminApi.toggleActive(userId);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active: res.data.is_active } : u));
    } catch {} setTogglingUser(null);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><span className="loading loading-ring loading-lg text-primary" /></div>;
  }

  // Summary stats
  const activeAccounts = accounts.filter((a) => a.status === 'ACTIVE').length;
  const dueAccounts = accounts.filter((a) => a.status === 'PAYMENT_DUE').length;
  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);
  const activeUsers = users.filter((u) => u.is_active).length;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'accounts', label: 'Accountlar', count: accounts.length },
    { key: 'users',    label: 'Foydalanuvchilar', count: users.length },
    { key: 'permissions', label: 'Ruxsatlar' },
    { key: 'audit',    label: 'Audit Log', count: auditLog.length },
  ];

  return (
    <>
      <div className="space-y-5 w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-base-content/40 text-sm mt-0.5">Accounts, foydalanuvchilar va audit</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Global fee */}
            <div className="flex items-center gap-2 rounded-xl bg-base-200/60 border border-base-300/50 px-3 py-2">
              <span className="text-xs text-base-content/40">Global:</span>
              <input className="input input-xs input-bordered w-20 text-right tabular-nums bg-transparent"
                value={globalFeeInput} onChange={(e) => setGlobalFeeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveGlobalFee()} />
              <span className="text-xs text-base-content/40">so'm</span>
              <button onClick={saveGlobalFee} disabled={savingGlobalFee} className="btn btn-xs btn-primary">
                {savingGlobalFee ? <span className="loading loading-spinner loading-xs" /> : 'Saqlash'}
              </button>
            </div>
            <button onClick={() => setShowCreateAccount(true)} className="btn btn-primary btn-sm gap-1.5">+ Account</button>
            <button onClick={() => setShowAddUser(true)} className="btn btn-ghost btn-sm border border-base-300/50 gap-1.5">+ Foydalanuvchi</button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <div className="rounded-2xl p-4 bg-base-200/60 border border-base-300/50">
            <span className="text-xs text-base-content/40 font-medium uppercase tracking-wider">Accountlar</span>
            <p className="text-2xl lg:text-3xl font-bold mt-2">{accounts.length}</p>
            <p className="text-xs text-base-content/30 mt-1"><span className="text-success">{activeAccounts} faol</span> · <span className="text-error">{dueAccounts} to'lov</span></p>
          </div>
          <div className="rounded-2xl p-4 bg-base-200/60 border border-base-300/50">
            <span className="text-xs text-base-content/40 font-medium uppercase tracking-wider">Foydalanuvchilar</span>
            <p className="text-2xl lg:text-3xl font-bold mt-2">{users.length}</p>
            <p className="text-xs text-base-content/30 mt-1"><span className="text-success">{activeUsers} faol</span></p>
          </div>
          <div className="rounded-2xl p-4 bg-base-200/60 border border-base-300/50">
            <span className="text-xs text-base-content/40 font-medium uppercase tracking-wider">Jami balans</span>
            <p className="text-2xl lg:text-3xl font-bold mt-2 tabular-nums">{totalBalance.toLocaleString()}</p>
            <p className="text-xs text-base-content/30 mt-1">so'm</p>
          </div>
          <div className="rounded-2xl p-4 bg-base-200/60 border border-base-300/50">
            <span className="text-xs text-base-content/40 font-medium uppercase tracking-wider">Audit</span>
            <p className="text-2xl lg:text-3xl font-bold mt-2">{auditLog.length}</p>
            <p className="text-xs text-base-content/30 mt-1">so'nggi hodisalar</p>
          </div>
        </div>

        {/* Tabs */}
        <div role="tablist" className="tabs tabs-boxed bg-base-200/60 w-fit border border-base-300/50">
          {tabs.map((t) => (
            <button key={t.key} role="tab" className={`tab gap-1.5 ${activeTab === t.key ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(t.key)}>
              {t.label}
              {t.count !== undefined && <span className="badge badge-xs bg-base-300/50 border-0 tabular-nums">{t.count}</span>}
            </button>
          ))}
        </div>

        {/* ── Accounts tab ── */}
        {activeTab === 'accounts' && (
          <div className="rounded-2xl bg-base-200/60 border border-base-300/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr className="text-xs text-base-content/30 uppercase tracking-wider">
                    <th className="font-medium">Kompaniya</th>
                    <th className="font-medium">Holat</th>
                    <th className="font-medium text-right">Balans</th>
                    <th className="font-medium text-right hidden md:table-cell">Kunlik to'lov</th>
                    <th className="font-medium hidden lg:table-cell">Foydalanuvchilar</th>
                    <th className="font-medium text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-base-300/20 transition-colors">
                      <td>
                        <p className="font-medium text-sm">{acc.name}</p>
                        <p className="text-xs text-base-content/25">{new Date(acc.created_at).toLocaleDateString('uz-UZ')}</p>
                      </td>
                      <td><StatusBadge status={acc.status} /></td>
                      <td className="text-right tabular-nums font-medium text-sm">
                        {Number(acc.balance).toLocaleString()}
                        <span className="text-xs text-base-content/25 ml-1">so'm</span>
                      </td>
                      <td className="text-right hidden md:table-cell">
                        {editingFee === acc.id ? (
                          <div className="flex items-center gap-1 justify-end">
                            <input autoFocus className="input input-xs input-bordered w-20 text-right bg-transparent"
                              value={feeInput} placeholder="Global"
                              onChange={(e) => setFeeInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveFee(acc.id); if (e.key === 'Escape') setEditingFee(null); }} />
                            <button onClick={() => saveFee(acc.id)} className="btn btn-xs btn-success">✓</button>
                            <button onClick={() => setEditingFee(null)} className="btn btn-xs btn-ghost">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingFee(acc.id); setFeeInput(acc.daily_fee ?? ''); }}
                            className="text-sm tabular-nums hover:text-primary cursor-pointer transition-colors" title="Tahrirlash">
                            {acc.daily_fee ? `${Number(acc.daily_fee).toLocaleString()} so'm` : <span className="text-base-content/20 italic">global</span>}
                          </button>
                        )}
                      </td>
                      <td className="hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {acc.users.map((u) => (
                            <div key={u.id} className="flex items-center gap-1">
                              <span className="text-xs text-base-content/50">{u.email}</span>
                              <RoleBadge role={u.role} />
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="text-right">
                        <button onClick={() => setDepositTarget(acc)} className="btn btn-xs btn-ghost border border-primary/20 text-primary hover:bg-primary/10">
                          + Balans
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Users tab ── */}
        {activeTab === 'users' && (
          <div className="rounded-2xl bg-base-200/60 border border-base-300/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr className="text-xs text-base-content/30 uppercase tracking-wider">
                    <th className="font-medium">Email</th>
                    <th className="font-medium hidden sm:table-cell">Account</th>
                    <th className="font-medium">Rol</th>
                    <th className="font-medium text-center">Holat</th>
                    <th className="font-medium hidden md:table-cell">Yaratilgan</th>
                    <th className="font-medium text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className={`hover:bg-base-300/20 transition-colors ${!u.is_active ? 'opacity-40' : ''}`}>
                      <td><span className="font-medium text-sm">{u.email}</span></td>
                      <td className="text-sm text-base-content/50 hidden sm:table-cell">{u.account_name}</td>
                      <td>
                        {updatingRole === u.id ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          <select className="select select-xs select-bordered bg-transparent"
                            value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}>
                            {ROLES.map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="text-center">
                        {u.is_active
                          ? <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-success/15 text-success border border-success/20">Faol</span>
                          : <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-base-300/50 text-base-content/40 border border-base-300">Blok</span>}
                      </td>
                      <td className="text-xs text-base-content/30 hidden md:table-cell">{new Date(u.created_at).toLocaleDateString('uz-UZ')}</td>
                      <td className="text-right">
                        <button onClick={() => handleToggleActive(u.id)} disabled={togglingUser === u.id}
                          className={`btn btn-xs btn-ghost border ${u.is_active ? 'border-error/20 text-error hover:bg-error/10' : 'border-success/20 text-success hover:bg-success/10'}`}>
                          {togglingUser === u.id ? <span className="loading loading-spinner loading-xs" /> : u.is_active ? 'Bloklash' : 'Faollashtirish'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Permissions tab ── */}
        {activeTab === 'permissions' && (
          <div className="space-y-5">
            <p className="text-sm text-base-content/40">
              Har bir rol uchun tizim ruxsatlari. Yuqori rol quyidagi rolning barcha ruxsatlarini o'z ichiga oladi.
            </p>

            {/* Role cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {ROLES.map((role) => {
                const meta = ROLE_META[role];
                const perms = PERMISSIONS[role];
                return (
                  <div key={role} className="rounded-2xl bg-base-200/60 border border-base-300/50 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <RoleBadge role={role} />
                      <span className="text-xs text-base-content/25">{perms.length} ta</span>
                    </div>
                    <ul className="space-y-2">
                      {perms.map((p) => (
                        <li key={p.key} className="flex items-start gap-2 text-sm">
                          <span className="text-success shrink-0 mt-0.5">✓</span>
                          <span className="text-base-content/60">{p.label}</span>
                        </li>
                      ))}
                    </ul>
                    {role !== 'SUPER_ADMIN' && (
                      <div className="text-xs text-base-content/20 border-t border-base-300/30 pt-3 mt-3 space-y-1">
                        {PERMISSIONS.SUPER_ADMIN
                          .filter((p) => !perms.find((rp) => rp.key === p.key))
                          .map((p) => (
                            <p key={p.key} className="line-through">{p.label}</p>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Permission matrix */}
            <div className="rounded-2xl bg-base-200/60 border border-base-300/50 overflow-hidden">
              <div className="px-5 py-4 border-b border-base-300/50">
                <h3 className="font-semibold text-sm">Ruxsatlar matritsasi</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="table table-sm w-full">
                  <thead>
                    <tr className="text-xs text-base-content/30 uppercase tracking-wider">
                      <th className="font-medium">Ruxsat</th>
                      {ROLES.map((r) => (
                        <th key={r} className="font-medium text-center">
                          <span className={ROLE_META[r].color}>{ROLE_META[r].label}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSIONS.SUPER_ADMIN.map((perm) => (
                      <tr key={perm.key} className="hover:bg-base-300/20 transition-colors">
                        <td className="text-sm text-base-content/60">{perm.label}</td>
                        {ROLES.map((role) => (
                          <td key={role} className="text-center">
                            {PERMISSIONS[role].find((p) => p.key === perm.key)
                              ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-success/15 text-success text-xs">✓</span>
                              : <span className="text-base-content/10">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Audit tab ── */}
        {activeTab === 'audit' && (
          <div className="rounded-2xl bg-base-200/60 border border-base-300/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr className="text-xs text-base-content/30 uppercase tracking-wider">
                    <th className="font-medium">Vaqt</th>
                    <th className="font-medium">Amal</th>
                    <th className="font-medium hidden sm:table-cell">Account</th>
                    <th className="font-medium hidden md:table-cell">Admin</th>
                    <th className="font-medium hidden lg:table-cell">O'zgarish</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map((e) => (
                    <tr key={e.id} className="hover:bg-base-300/20 transition-colors">
                      <td className="text-xs text-base-content/30 whitespace-nowrap tabular-nums">
                        {new Date(e.created_at).toLocaleString('uz-UZ')}
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-mono font-semibold border ${
                          e.action.includes('CREATED') ? 'bg-success/15 text-success border-success/20' :
                          e.action.includes('DEACTIVATED') || e.action.includes('DELETED') ? 'bg-error/15 text-error border-error/20' :
                          e.action.includes('CHANGED') || e.action.includes('ROLE') ? 'bg-warning/15 text-warning border-warning/20' :
                          'bg-base-300/50 text-base-content/40 border-base-300'
                        }`}>
                          {e.action}
                        </span>
                      </td>
                      <td className="text-sm text-base-content/50 hidden sm:table-cell">{e.account_name ?? '—'}</td>
                      <td className="text-xs text-base-content/40 hidden md:table-cell">{e.user_email ?? '—'}</td>
                      <td className="text-xs font-mono text-base-content/30 max-w-xs truncate hidden lg:table-cell">
                        {e.new_value && JSON.stringify(e.new_value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateAccount && <CreateAccountModal onClose={() => setShowCreateAccount(false)} onDone={load} />}
      {showAddUser && <AddUserModal accounts={accounts} onClose={() => setShowAddUser(false)} onDone={load} />}
      {depositTarget && <DepositModal account={depositTarget} onClose={() => setDepositTarget(null)} onDone={load} />}
    </>
  );
}
