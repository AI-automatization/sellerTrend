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

const ROLE_META: Record<Role, { label: string; badge: string; color: string }> = {
  SUPER_ADMIN: { label: 'Super Admin',  badge: 'badge-error',   color: 'text-error' },
  ADMIN:       { label: 'Admin',        badge: 'badge-warning', color: 'text-warning' },
  MODERATOR:   { label: 'Moderator',    badge: 'badge-info',    color: 'text-info' },
  USER:        { label: 'Foydalanuvchi', badge: 'badge-success', color: 'text-success' },
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
  return <span className={`badge badge-sm font-medium ${m.badge}`}>{m.label}</span>;
}

function StatusBadge({ status }: { status: Account['status'] }) {
  const map = { ACTIVE: 'badge-success', PAYMENT_DUE: 'badge-error', SUSPENDED: 'badge-neutral' };
  const labels = { ACTIVE: 'Faol', PAYMENT_DUE: 'To\'lov kerak', SUSPENDED: 'Bloklangan' };
  return <span className={`badge badge-sm ${map[status]}`}>{labels[status]}</span>;
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function CreateAccountModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ company_name: '', email: '', password: '', role: 'USER' as Role });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminApi.createAccount(form);
      onDone(); onClose();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Xato yuz berdi');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-base-200 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="font-bold text-lg mb-4">Yangi Account yaratish</h3>
        <form onSubmit={submit} className="space-y-3">
          <label className="fieldset">
            <span className="fieldset-legend">Kompaniya nomi</span>
            <input className="input input-bordered w-full" required value={form.company_name}
              onChange={(e) => set('company_name', e.target.value)} placeholder="TrendShop LLC" />
          </label>
          <label className="fieldset">
            <span className="fieldset-legend">Admin email</span>
            <input className="input input-bordered w-full" type="email" required value={form.email}
              onChange={(e) => set('email', e.target.value)} placeholder="admin@company.uz" />
          </label>
          <label className="fieldset">
            <span className="fieldset-legend">Parol</span>
            <input className="input input-bordered w-full" type="password" required minLength={6} value={form.password}
              onChange={(e) => set('password', e.target.value)} placeholder="Kamida 6 belgi" />
          </label>
          <label className="fieldset">
            <span className="fieldset-legend">Dastlabki rol</span>
            <select className="select select-bordered w-full" value={form.role}
              onChange={(e) => set('role', e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
            </select>
          </label>
          {error && <p className="text-error text-sm">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Bekor</button>
            <button type="submit" disabled={loading} className="btn btn-primary btn-sm gap-2">
              {loading && <span className="loading loading-spinner loading-xs" />}
              Yaratish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddUserModal({
  accounts, onClose, onDone,
}: { accounts: Account[]; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ account_id: accounts[0]?.id ?? '', email: '', password: '', role: 'USER' as Role });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminApi.createUser(form.account_id, { email: form.email, password: form.password, role: form.role });
      onDone(); onClose();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Xato yuz berdi');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-base-200 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="font-bold text-lg mb-4">Foydalanuvchi qo'shish</h3>
        <form onSubmit={submit} className="space-y-3">
          <label className="fieldset">
            <span className="fieldset-legend">Account</span>
            <select className="select select-bordered w-full" value={form.account_id}
              onChange={(e) => set('account_id', e.target.value)}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <label className="fieldset">
            <span className="fieldset-legend">Email</span>
            <input className="input input-bordered w-full" type="email" required value={form.email}
              onChange={(e) => set('email', e.target.value)} placeholder="user@company.uz" />
          </label>
          <label className="fieldset">
            <span className="fieldset-legend">Parol</span>
            <input className="input input-bordered w-full" type="password" required minLength={6} value={form.password}
              onChange={(e) => set('password', e.target.value)} placeholder="Kamida 6 belgi" />
          </label>
          <label className="fieldset">
            <span className="fieldset-legend">Rol</span>
            <select className="select select-bordered w-full" value={form.role}
              onChange={(e) => set('role', e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
            </select>
          </label>
          {error && <p className="text-error text-sm">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Bekor</button>
            <button type="submit" disabled={loading} className="btn btn-primary btn-sm gap-2">
              {loading && <span className="loading loading-spinner loading-xs" />}
              Qo'shish
            </button>
          </div>
        </form>
      </div>
    </div>
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
    try {
      await adminApi.deposit(account.id, num, desc || undefined);
      onDone(); onClose();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Xato');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-base-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="font-bold text-lg mb-1">Balans to'ldirish</h3>
        <p className="text-sm text-base-content/50 mb-4">{account.name}</p>
        <form onSubmit={submit} className="space-y-3">
          <label className="fieldset">
            <span className="fieldset-legend">Miqdor (so'm)</span>
            <input className="input input-bordered w-full" placeholder="100000" value={amount}
              onChange={(e) => setAmount(e.target.value)} required />
          </label>
          <label className="fieldset">
            <span className="fieldset-legend">Izoh (ixtiyoriy)</span>
            <input className="input input-bordered w-full" placeholder="To'lov uchun..."
              value={desc} onChange={(e) => setDesc(e.target.value)} />
          </label>
          {error && <p className="text-error text-sm">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Bekor</button>
            <button type="submit" disabled={loading} className="btn btn-primary btn-sm gap-2">
              {loading && <span className="loading loading-spinner loading-xs" />}
              Qo'shish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = 'accounts' | 'users' | 'permissions' | 'audit';

export function AdminPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [globalFee, setGlobalFee] = useState<GlobalFee | null>(null);
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
      adminApi.listAccounts(),
      adminApi.getGlobalFee(),
      adminApi.getAuditLog(30),
      adminApi.listUsers(),
    ]);
    setAccounts(accRes.data);
    setGlobalFee(feeRes.data);
    setGlobalFeeInput(feeRes.data.daily_fee_default);
    setAuditLog(auditRes.data);
    setUsers(usersRes.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function saveFee(accountId: string) {
    const val = feeInput.trim();
    const fee = val === '' ? null : parseInt(val);
    try {
      await adminApi.setFee(accountId, fee);
      setEditingFee(null);
      setAccounts((prev) => prev.map((a) => a.id === accountId ? { ...a, daily_fee: fee?.toString() ?? null } : a));
    } catch {}
  }

  async function saveGlobalFee() {
    const fee = parseInt(globalFeeInput);
    if (!fee || fee <= 0) return;
    setSavingGlobalFee(true);
    try {
      await adminApi.setGlobalFee(fee);
      setGlobalFee({ daily_fee_default: String(fee) });
    } finally { setSavingGlobalFee(false); }
  }

  async function handleRoleChange(userId: string, newRole: Role) {
    setUpdatingRole(userId);
    try {
      await adminApi.updateRole(userId, newRole);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    } catch {}
    setUpdatingRole(null);
  }

  async function handleToggleActive(userId: string) {
    setTogglingUser(userId);
    try {
      const res = await adminApi.toggleActive(userId);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active: res.data.is_active } : u));
    } catch {}
    setTogglingUser(null);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><span className="loading loading-dots loading-lg text-primary" /></div>;
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'accounts', label: 'Accountlar', count: accounts.length },
    { key: 'users',    label: 'Foydalanuvchilar', count: users.length },
    { key: 'permissions', label: 'Ruxsatlar' },
    { key: 'audit',    label: 'Audit Log', count: auditLog.length },
  ];

  return (
    <>
      <div className="space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-base-content/50 text-sm mt-0.5">Accounts, foydalanuvchilar va audit</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Global fee */}
            <div className="flex items-center gap-2 bg-base-200 rounded-xl px-3 py-2">
              <span className="text-xs text-base-content/50">Global to'lov:</span>
              <input
                className="input input-xs w-24 text-right tabular-nums"
                value={globalFeeInput}
                onChange={(e) => setGlobalFeeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveGlobalFee()}
              />
              <span className="text-xs text-base-content/50">so'm</span>
              <button onClick={saveGlobalFee} disabled={savingGlobalFee} className="btn btn-xs btn-primary">
                {savingGlobalFee ? <span className="loading loading-spinner loading-xs" /> : 'Saqlash'}
              </button>
            </div>
            <button onClick={() => setShowCreateAccount(true)} className="btn btn-primary btn-sm gap-2">
              + Account
            </button>
            <button onClick={() => setShowAddUser(true)} className="btn btn-outline btn-sm gap-2">
              + Foydalanuvchi
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-bordered">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`tab gap-2 ${activeTab === t.key ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
              {t.count !== undefined && (
                <span className="badge badge-sm badge-neutral">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Accounts tab ── */}
        {activeTab === 'accounts' && (
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body p-0">
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Kompaniya</th>
                      <th>Holat</th>
                      <th className="text-right">Balans</th>
                      <th className="text-right">Kunlik to'lov</th>
                      <th>Foydalanuvchilar</th>
                      <th className="text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((acc) => (
                      <tr key={acc.id} className="hover">
                        <td>
                          <div>
                            <p className="font-medium">{acc.name}</p>
                            <p className="text-xs text-base-content/40">{new Date(acc.created_at).toLocaleDateString('uz-UZ')}</p>
                          </div>
                        </td>
                        <td><StatusBadge status={acc.status} /></td>
                        <td className="text-right tabular-nums font-medium">
                          {Number(acc.balance).toLocaleString()}
                          <span className="text-xs text-base-content/40 ml-1">so'm</span>
                        </td>
                        <td className="text-right">
                          {editingFee === acc.id ? (
                            <div className="flex items-center gap-1 justify-end">
                              <input
                                autoFocus
                                className="input input-xs w-24 text-right"
                                value={feeInput}
                                placeholder="Global"
                                onChange={(e) => setFeeInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveFee(acc.id);
                                  if (e.key === 'Escape') setEditingFee(null);
                                }}
                              />
                              <button onClick={() => saveFee(acc.id)} className="btn btn-xs btn-success">✓</button>
                              <button onClick={() => setEditingFee(null)} className="btn btn-xs btn-ghost">✕</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingFee(acc.id); setFeeInput(acc.daily_fee ?? ''); }}
                              className="text-sm tabular-nums hover:text-primary cursor-pointer"
                              title="Tahrirlash uchun bosing"
                            >
                              {acc.daily_fee
                                ? `${Number(acc.daily_fee).toLocaleString()} so'm`
                                : <span className="text-base-content/30 italic">global</span>}
                            </button>
                          )}
                        </td>
                        <td>
                          <div className="space-y-0.5">
                            {acc.users.map((u) => (
                              <div key={u.id} className="flex items-center gap-1.5">
                                <span className="text-xs text-base-content/60">{u.email}</span>
                                <RoleBadge role={u.role} />
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="text-right">
                          <button onClick={() => setDepositTarget(acc)} className="btn btn-xs btn-outline btn-primary">
                            + Balans
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Users tab ── */}
        {activeTab === 'users' && (
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body p-0">
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Account</th>
                      <th>Rol</th>
                      <th className="text-center">Holat</th>
                      <th>Yaratilgan</th>
                      <th className="text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className={`hover ${!u.is_active ? 'opacity-50' : ''}`}>
                        <td>
                          <span className="font-medium text-sm">{u.email}</span>
                        </td>
                        <td className="text-sm text-base-content/60">{u.account_name}</td>
                        <td>
                          {updatingRole === u.id ? (
                            <span className="loading loading-spinner loading-xs" />
                          ) : (
                            <select
                              className="select select-xs select-bordered"
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r}>{ROLE_META[r].label}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="text-center">
                          {u.is_active
                            ? <span className="badge badge-success badge-sm">Faol</span>
                            : <span className="badge badge-neutral badge-sm">Bloklangan</span>}
                        </td>
                        <td className="text-xs text-base-content/50 whitespace-nowrap">
                          {new Date(u.created_at).toLocaleDateString('uz-UZ')}
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => handleToggleActive(u.id)}
                            disabled={togglingUser === u.id}
                            className={`btn btn-xs ${u.is_active ? 'btn-outline btn-error' : 'btn-outline btn-success'}`}
                          >
                            {togglingUser === u.id
                              ? <span className="loading loading-spinner loading-xs" />
                              : u.is_active ? 'Bloklash' : 'Faollashtirish'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Permissions tab ── */}
        {activeTab === 'permissions' && (
          <div className="space-y-4">
            <p className="text-sm text-base-content/50">
              Har bir rol uchun tizim ruxsatlari. Yuqori rol quyidagi rolning barcha ruxsatlarini o'z ichiga oladi.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ROLES.map((role) => {
                const meta = ROLE_META[role];
                const perms = PERMISSIONS[role];
                return (
                  <div key={role} className="card bg-base-200 shadow-sm">
                    <div className="card-body gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`badge ${meta.badge} badge-md font-bold`}>{meta.label}</span>
                        <span className="text-xs text-base-content/40">{perms.length} ta ruxsat</span>
                      </div>
                      <ul className="space-y-1.5">
                        {perms.map((p) => (
                          <li key={p.key} className="flex items-center gap-2 text-sm">
                            <span className="text-success shrink-0">✓</span>
                            <span>{p.label}</span>
                          </li>
                        ))}
                        {/* Inherited (not granted) */}
                        {ROLES.filter((r) => r !== role)
                          .filter((r) => PERMISSIONS[r].some((rp) => !perms.find((p) => p.key === rp.key)))
                          .length === 0 && null}
                      </ul>
                      {role !== 'SUPER_ADMIN' && (
                        <div className="text-xs text-base-content/30 border-t border-base-300 pt-2">
                          Mavjud bo'lmagan ruxsatlar:
                          {PERMISSIONS.SUPER_ADMIN
                            .filter((p) => !perms.find((rp) => rp.key === p.key))
                            .map((p) => (
                              <span key={p.key} className="ml-1 line-through">{p.label};</span>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Permission matrix table */}
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body">
                <h3 className="font-bold text-sm mb-3">Ruxsatlar matritsasi</h3>
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Ruxsat</th>
                        {ROLES.map((r) => (
                          <th key={r} className="text-center">
                            <span className={`text-xs font-bold ${ROLE_META[r].color}`}>
                              {ROLE_META[r].label}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PERMISSIONS.SUPER_ADMIN.map((perm) => (
                        <tr key={perm.key} className="hover">
                          <td className="text-sm">{perm.label}</td>
                          {ROLES.map((role) => (
                            <td key={role} className="text-center">
                              {PERMISSIONS[role].find((p) => p.key === perm.key)
                                ? <span className="text-success font-bold">✓</span>
                                : <span className="text-base-content/20">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Audit tab ── */}
        {activeTab === 'audit' && (
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body p-0">
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Vaqt</th>
                      <th>Amal</th>
                      <th>Account</th>
                      <th>Admin</th>
                      <th>O'zgarish</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLog.map((e) => (
                      <tr key={e.id} className="hover">
                        <td className="text-xs text-base-content/50 whitespace-nowrap">
                          {new Date(e.created_at).toLocaleString('uz-UZ')}
                        </td>
                        <td>
                          <span className={`badge badge-sm font-mono ${
                            e.action.includes('CREATED') ? 'badge-success' :
                            e.action.includes('DEACTIVATED') || e.action.includes('DELETED') ? 'badge-error' :
                            e.action.includes('CHANGED') || e.action.includes('ROLE') ? 'badge-warning' :
                            'badge-ghost'
                          }`}>
                            {e.action}
                          </span>
                        </td>
                        <td className="text-sm">{e.account_name ?? '—'}</td>
                        <td className="text-xs text-base-content/60">{e.user_email ?? '—'}</td>
                        <td className="text-xs font-mono text-base-content/60 max-w-xs truncate">
                          {e.new_value && JSON.stringify(e.new_value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateAccount && (
        <CreateAccountModal onClose={() => setShowCreateAccount(false)} onDone={load} />
      )}
      {showAddUser && (
        <AddUserModal accounts={accounts} onClose={() => setShowAddUser(false)} onDone={load} />
      )}
      {depositTarget && (
        <DepositModal account={depositTarget} onClose={() => setDepositTarget(null)} onDone={load} />
      )}
    </>
  );
}
