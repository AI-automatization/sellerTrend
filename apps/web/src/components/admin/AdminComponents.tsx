import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { adminApi } from '../../api/client';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { ROLES, ROLE_META } from './adminTypes';
import type { Account, User, Transaction, Role } from './adminTypes';

export function RoleBadge({ role }: { role: Role }) {
  const m = ROLE_META[role] ?? ROLE_META.USER;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold border ${m.badge}`}>{m.label}</span>;
}

export function StatusBadge({ status }: { status: Account['status'] }) {
  const map = { ACTIVE: 'bg-success/15 text-success border-success/20', PAYMENT_DUE: 'bg-error/15 text-error border-error/20', SUSPENDED: 'bg-base-300/50 text-base-content/40 border-base-300' };
  const labels = { ACTIVE: 'Faol', PAYMENT_DUE: "To'lov kerak", SUSPENDED: 'Bloklangan' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold border ${map[status]}`}>{labels[status]}</span>;
}

export function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-base-200 rounded-xl p-4 border border-base-300/50">
      <p className="text-xs text-base-content/50">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color || 'text-base-content'}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-xs text-base-content/40 mt-0.5">{sub}</p>}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
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

export function CreateAccountModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ company_name: '', email: '', password: '', role: 'USER' as Role });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try { await adminApi.createAccount(form); toast.success('Yangi account yaratildi'); onDone(); onClose(); }
    catch (err: unknown) { const msg = getErrorMessage(err, "Account yaratib bo'lmadi"); setError(msg); toast.error(msg); }
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
          <button type="submit" disabled={loading} className="btn btn-primary btn-sm">{loading && <span className="loading loading-spinner loading-xs" />} Yaratish</button>
        </div>
      </form>
    </Modal>
  );
}

export function DepositModal({ account, onClose, onDone }: { account: Account; onClose: () => void; onDone: () => void }) {
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
          <button type="submit" disabled={loading} className="btn btn-primary btn-sm">{loading && <span className="loading loading-spinner loading-xs" />} Qo'shish</button>
        </div>
      </form>
    </Modal>
  );
}

export function ChangePasswordModal({ user, onClose }: { user: { id: string; email: string }; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast.error("Parol kamida 6 ta belgidan iborat bo'lishi kerak"); return; }
    if (password !== confirm) { toast.error('Parollar mos kelmadi'); return; }
    setLoading(true);
    try { await adminApi.changeUserPassword(user.id, password); toast.success(`${user.email} uchun parol o'zgartirildi`); onClose(); }
    catch (err: unknown) { toast.error(getErrorMessage(err, "Parolni o'zgartirib bo'lmadi")); }
    finally { setLoading(false); }
  }

  return (
    <Modal title={`Parol o'zgartirish — ${user.email}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="relative">
          <input className="input input-bordered w-full pr-12" type={show ? 'text' : 'password'} placeholder="Yangi parol (min 6)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <button type="button" className="btn btn-ghost btn-xs absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setShow(!show)}>{show ? 'Yashirish' : "Ko'rish"}</button>
        </div>
        <input className="input input-bordered w-full" type={show ? 'text' : 'password'} placeholder="Parolni tasdiqlang" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        {password && confirm && password !== confirm && <p className="text-error text-xs">Parollar mos kelmadi</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Bekor</button>
          <button type="submit" disabled={loading || password !== confirm} className="btn btn-primary btn-sm">{loading && <span className="loading loading-spinner loading-xs" />} O'zgartirish</button>
        </div>
      </form>
    </Modal>
  );
}

export function AccountDrawer({ account, users, onClose, onRefresh }: { account: Account; users: User[]; onClose: () => void; onRefresh: () => void }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ email: '', password: '', role: 'USER' });
  const [addingUser, setAddingUser] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<{ id: string; email: string } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const accountUsers = users.filter((u) => u.account_id === account.id);

  useEffect(() => {
    setTxLoading(true);
    adminApi.getAccountTransactions(account.id, 1, 10)
      .then((r) => setTransactions(r.data?.items ?? r.data ?? []))
      .catch(() => {}).finally(() => setTxLoading(false));
  }, [account.id]);

  async function addUser(e: React.FormEvent) {
    e.preventDefault(); setAddingUser(true);
    try {
      await adminApi.createUser(account.id, { email: newUserForm.email, password: newUserForm.password, role: newUserForm.role });
      toast.success("Foydalanuvchi qo'shildi");
      setNewUserForm({ email: '', password: '', role: 'USER' }); setShowAddUser(false); onRefresh();
    } catch (err: unknown) { toast.error(getErrorMessage(err, "User qo'shib bo'lmadi")); }
    finally { setAddingUser(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={(e) => e.target === overlayRef.current && onClose()}>
      <div ref={overlayRef} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-base-200 w-full max-w-xl h-full overflow-y-auto shadow-2xl border-l border-base-300/50 animate-slide-in-right">
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
          <div className="bg-base-300/30 rounded-xl p-3 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-base-content/50">Telefon</span><span className="font-mono">{account.phone || '—'}</span></div>
            <div className="flex justify-between"><span className="text-base-content/50">Yaratilgan</span><span>{new Date(account.created_at).toLocaleDateString()}</span></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Foydalanuvchilar ({accountUsers.length})</h3>
              <button className="btn btn-xs btn-primary" onClick={() => setShowAddUser(!showAddUser)}>{showAddUser ? 'Bekor' : '+ User'}</button>
            </div>
            {showAddUser && (
              <form onSubmit={addUser} className="bg-base-300/50 rounded-xl p-3 mb-3 space-y-2">
                <input className="input input-bordered input-sm w-full" type="email" required placeholder="Email" value={newUserForm.email} onChange={(e) => setNewUserForm((f) => ({ ...f, email: e.target.value }))} />
                <input className="input input-bordered input-sm w-full" type="password" required minLength={6} placeholder="Parol (min 6)" value={newUserForm.password} onChange={(e) => setNewUserForm((f) => ({ ...f, password: e.target.value }))} />
                <div className="flex gap-2">
                  <select className="select select-bordered select-sm flex-1" value={newUserForm.role} onChange={(e) => setNewUserForm((f) => ({ ...f, role: e.target.value }))}>
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
                  </select>
                  <button type="submit" disabled={addingUser} className="btn btn-sm btn-primary">{addingUser ? <span className="loading loading-spinner loading-xs" /> : "Qo'shish"}</button>
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
                      <span className={`badge badge-xs ${u.is_active ? 'badge-success' : 'badge-error'}`}>{u.is_active ? 'Faol' : 'Bloklangan'}</span>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-xs text-warning" onClick={() => setPasswordTarget({ id: u.id, email: u.email })}>Parol</button>
                </div>
              ))}
              {accountUsers.length === 0 && <p className="text-xs text-base-content/40 text-center py-3">User yo'q</p>}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-sm mb-2">So'nggi tranzaksiyalar</h3>
            {txLoading ? <div className="flex justify-center py-4"><span className="loading loading-spinner loading-sm" /></div>
              : transactions.length > 0 ? (
                <div className="space-y-1">
                  {transactions.slice(0, 8).map((tx) => (
                    <div key={tx.id} className="flex items-center gap-2 text-xs bg-base-300/30 rounded-lg px-2.5 py-1.5">
                      <span className={`badge badge-xs ${tx.type === 'DEPOSIT' ? 'badge-success' : tx.type === 'CHARGE' ? 'badge-error' : 'badge-info'}`}>{tx.type}</span>
                      <span className={`font-bold tabular-nums ${tx.type === 'DEPOSIT' ? 'text-success' : 'text-error'}`}>{tx.type === 'DEPOSIT' ? '+' : '-'}{Number(tx.amount).toLocaleString()}</span>
                      <span className="text-base-content/40 truncate flex-1">{tx.description || '—'}</span>
                      <span className="text-base-content/30 whitespace-nowrap">{new Date(tx.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-base-content/40 text-center py-3">Tranzaksiya yo'q</p>}
          </div>
        </div>
      </div>
      {passwordTarget && <ChangePasswordModal user={passwordTarget} onClose={() => setPasswordTarget(null)} />}
    </div>
  );
}

export function WhitelabelTab() {
  const [config, setConfig] = useState({
    appName: 'VENTRA', logoText: 'V', logoSubtitle: 'Analytics Platform',
    primaryColor: '#4C7DFF', supportEmail: 'support@ventra.uz',
    marketplaceName: 'Uzum', marketplaceUrl: 'https://uzum.uz', customDomain: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try { const s = localStorage.getItem('whitelabel_config'); if (s) setConfig(JSON.parse(s)); } catch { /* ignore */ }
  }, []);

  function handleSave() {
    setSaving(true);
    try { localStorage.setItem('whitelabel_config', JSON.stringify(config)); toast.success('Branding sozlamalari saqlandi'); }
    catch { toast.error('Saqlashda xato'); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6">
        <h3 className="font-bold text-sm mb-4">Ko'rinish</h3>
        <div className="flex items-center gap-4 bg-base-300/60 rounded-xl p-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl text-white" style={{ backgroundColor: config.primaryColor }}>{config.logoText}</div>
          <div><p className="font-bold text-lg">{config.appName}</p><p className="text-xs text-base-content/50">{config.logoSubtitle}</p></div>
        </div>
      </div>
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6 space-y-4">
        <h3 className="font-bold text-sm">Platforma identifikatsiyasi</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="form-control"><div className="label"><span className="label-text text-xs">Platforma nomi</span></div><input className="input input-bordered input-sm" value={config.appName} onChange={(e) => setConfig({ ...config, appName: e.target.value })} /></label>
          <label className="form-control"><div className="label"><span className="label-text text-xs">Logo harfi</span></div><input className="input input-bordered input-sm w-20" maxLength={2} value={config.logoText} onChange={(e) => setConfig({ ...config, logoText: e.target.value })} /></label>
          <label className="form-control"><div className="label"><span className="label-text text-xs">Logo taglavha</span></div><input className="input input-bordered input-sm" value={config.logoSubtitle} onChange={(e) => setConfig({ ...config, logoSubtitle: e.target.value })} /></label>
          <label className="form-control"><div className="label"><span className="label-text text-xs">Support email</span></div><input className="input input-bordered input-sm" type="email" value={config.supportEmail} onChange={(e) => setConfig({ ...config, supportEmail: e.target.value })} /></label>
        </div>
      </div>
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6 space-y-4">
        <h3 className="font-bold text-sm">Ranglar</h3>
        <div className="flex items-center gap-4">
          <label className="form-control">
            <div className="label"><span className="label-text text-xs">Asosiy rang</span></div>
            <div className="flex items-center gap-2">
              <input type="color" className="w-10 h-10 rounded-lg border border-base-300 cursor-pointer" value={config.primaryColor} onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })} />
              <input className="input input-bordered input-sm w-28 font-mono" value={config.primaryColor} onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })} />
            </div>
          </label>
          <div className="flex gap-2 mt-6">
            {['#4C7DFF', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map((c) => (
              <button key={c} className="w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110" style={{ backgroundColor: c, borderColor: config.primaryColor === c ? '#fff' : 'transparent' }} onClick={() => setConfig({ ...config, primaryColor: c })} />
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6 space-y-4">
        <h3 className="font-bold text-sm">Marketplace sozlamalari</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="form-control"><div className="label"><span className="label-text text-xs">Marketplace nomi</span></div><input className="input input-bordered input-sm" value={config.marketplaceName} onChange={(e) => setConfig({ ...config, marketplaceName: e.target.value })} /></label>
          <label className="form-control"><div className="label"><span className="label-text text-xs">Marketplace URL</span></div><input className="input input-bordered input-sm" value={config.marketplaceUrl} onChange={(e) => setConfig({ ...config, marketplaceUrl: e.target.value })} /></label>
          <label className="form-control sm:col-span-2">
            <div className="label"><span className="label-text text-xs">Custom domain (opsional)</span></div>
            <input className="input input-bordered input-sm" placeholder="analytics.yourdomain.com" value={config.customDomain} onChange={(e) => setConfig({ ...config, customDomain: e.target.value })} />
            <div className="label"><span className="label-text-alt text-xs text-base-content/40">CNAME rekordni sozlab, shu yerga domain kiriting</span></div>
          </label>
        </div>
      </div>
      <div className="flex justify-end">
        <button className="btn btn-primary btn-sm gap-2" onClick={handleSave} disabled={saving}>
          {saving && <span className="loading loading-spinner loading-xs" />} Saqlash
        </button>
      </div>
    </div>
  );
}
