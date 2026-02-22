import { useState, useEffect } from 'react';
import { adminApi } from '../api/client';

interface Account {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAYMENT_DUE' | 'SUSPENDED';
  balance: string;
  daily_fee: string | null;
  created_at: string;
  users: { email: string; role: string }[];
  transaction_count: number;
}

interface GlobalFee {
  daily_fee_default: string;
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

function StatusBadge({ status }: { status: Account['status'] }) {
  const map = {
    ACTIVE: 'badge-success',
    PAYMENT_DUE: 'badge-error',
    SUSPENDED: 'badge-neutral',
  };
  return <span className={`badge badge-sm ${map[status]}`}>{status}</span>;
}

function DepositModal({
  account,
  onClose,
  onDone,
}: {
  account: Account;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseInt(amount.replace(/\s/g, ''));
    if (!num || num <= 0) { setError("Miqdor noto'g'ri"); return; }
    setLoading(true);
    setError('');
    try {
      await adminApi.deposit(account.id, num, desc || undefined);
      onDone();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Xato');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-base-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="font-bold text-lg mb-1">Balans to'ldirish</h3>
        <p className="text-sm text-base-content/50 mb-4">{account.name}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="fieldset">
            <span className="fieldset-legend">Miqdor (so'm)</span>
            <input
              className="input input-bordered w-full"
              placeholder="100000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>
          <label className="fieldset">
            <span className="fieldset-legend">Izoh (ixtiyoriy)</span>
            <input
              className="input input-bordered w-full"
              placeholder="To'lov uchun..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </label>
          {error && <p className="text-error text-sm">{error}</p>}
          <div className="flex gap-2 justify-end mt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
              Bekor
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
              {loading ? <span className="loading loading-spinner loading-xs" /> : null}
              Qo'shish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [globalFee, setGlobalFee] = useState<GlobalFee | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositTarget, setDepositTarget] = useState<Account | null>(null);
  const [editingFee, setEditingFee] = useState<string | null>(null); // account id
  const [feeInput, setFeeInput] = useState('');
  const [globalFeeInput, setGlobalFeeInput] = useState('');
  const [savingGlobalFee, setSavingGlobalFee] = useState(false);
  const [activeTab, setActiveTab] = useState<'accounts' | 'audit'>('accounts');

  async function load() {
    const [accRes, feeRes, auditRes] = await Promise.all([
      adminApi.listAccounts(),
      adminApi.getGlobalFee(),
      adminApi.getAuditLog(30),
    ]);
    setAccounts(accRes.data);
    setGlobalFee(feeRes.data);
    setGlobalFeeInput(feeRes.data.daily_fee_default);
    setAuditLog(auditRes.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function saveFee(accountId: string) {
    const val = feeInput.trim();
    const fee = val === '' ? null : parseInt(val);
    try {
      await adminApi.setFee(accountId, fee);
      setEditingFee(null);
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === accountId ? { ...a, daily_fee: fee?.toString() ?? null } : a
        )
      );
    } catch {}
  }

  async function saveGlobalFee() {
    const fee = parseInt(globalFeeInput);
    if (!fee || fee <= 0) return;
    setSavingGlobalFee(true);
    try {
      await adminApi.setGlobalFee(fee);
      setGlobalFee({ daily_fee_default: String(fee) });
    } finally {
      setSavingGlobalFee(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-dots loading-lg text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-base-content/50 text-sm mt-0.5">
              Accounts, billing va audit
            </p>
          </div>

          {/* Global fee */}
          <div className="flex items-center gap-2 bg-base-200 rounded-xl px-4 py-2">
            <span className="text-xs text-base-content/50">Global kunlik to'lov:</span>
            <input
              className="input input-xs w-28 text-right tabular-nums"
              value={globalFeeInput}
              onChange={(e) => setGlobalFeeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveGlobalFee()}
            />
            <span className="text-xs text-base-content/50">so'm</span>
            <button
              onClick={saveGlobalFee}
              disabled={savingGlobalFee}
              className="btn btn-xs btn-primary"
            >
              {savingGlobalFee ? <span className="loading loading-spinner loading-xs" /> : 'Saqlash'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-bordered">
          <button
            className={`tab ${activeTab === 'accounts' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('accounts')}
          >
            Accountlar ({accounts.length})
          </button>
          <button
            className={`tab ${activeTab === 'audit' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            Audit Log
          </button>
        </div>

        {/* Accounts tab */}
        {activeTab === 'accounts' && (
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body p-0">
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Kompaniya</th>
                      <th>Status</th>
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
                            <p className="text-xs text-base-content/40">
                              {new Date(acc.created_at).toLocaleDateString('uz-UZ')}
                            </p>
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={acc.status} />
                        </td>
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
                              <button
                                onClick={() => saveFee(acc.id)}
                                className="btn btn-xs btn-success"
                              >✓</button>
                              <button
                                onClick={() => setEditingFee(null)}
                                className="btn btn-xs btn-ghost"
                              >✕</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingFee(acc.id);
                                setFeeInput(acc.daily_fee ?? '');
                              }}
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
                          <div className="text-xs text-base-content/60">
                            {acc.users.map((u) => (
                              <div key={u.email}>{u.email}</div>
                            ))}
                          </div>
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => setDepositTarget(acc)}
                            className="btn btn-xs btn-outline btn-primary"
                          >
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

        {/* Audit tab */}
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
                          <span className="badge badge-ghost badge-sm font-mono">
                            {e.action}
                          </span>
                        </td>
                        <td className="text-sm">{e.account_name ?? '—'}</td>
                        <td className="text-xs text-base-content/60">{e.user_email ?? '—'}</td>
                        <td className="text-xs font-mono text-base-content/60">
                          {e.old_value && e.new_value && (
                            <span>
                              {JSON.stringify(e.old_value)} → {JSON.stringify(e.new_value)}
                            </span>
                          )}
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

      {/* Deposit modal */}
      {depositTarget && (
        <DepositModal
          account={depositTarget}
          onClose={() => setDepositTarget(null)}
          onDone={load}
        />
      )}
    </>
  );
}
