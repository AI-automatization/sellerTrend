// ─── AccountDrawer ───────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { adminApi } from '../../api/client';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { logError } from '../../utils/handleError';
import type { Account, User, Role } from './types';
import { ROLES, ROLE_META } from './types';
import { RoleBadge } from './RoleBadge';
import { StatusBadge } from './StatusBadge';
import { ChangePasswordModal } from './ChangePasswordModal';

export interface AccountDrawerProps {
  account: Account;
  users: User[];
  onClose: () => void;
  onRefresh: () => void;
}

export function AccountDrawer({ account, users, onClose, onRefresh }: AccountDrawerProps) {
  const [transactions, setTransactions] = useState<Record<string, unknown>[]>([]);
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
    }).catch(logError).finally(() => setTxLoading(false));
  }, [account.id]);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setAddingUser(true);
    try {
      await adminApi.createUser(account.id, { email: newUserForm.email, password: newUserForm.password, role: newUserForm.role as Role });
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
                {transactions.slice(0, 8).map((tx: Record<string, unknown>) => (
                  <div key={tx.id as string} className="flex items-center gap-2 text-xs bg-base-300/30 rounded-lg px-2.5 py-1.5">
                    <span className={`badge badge-xs ${tx.type === 'DEPOSIT' ? 'badge-success' : tx.type === 'CHARGE' ? 'badge-error' : 'badge-info'}`}>
                      {tx.type as string}
                    </span>
                    <span className={`font-bold tabular-nums ${tx.type === 'DEPOSIT' ? 'text-success' : 'text-error'}`}>
                      {tx.type === 'DEPOSIT' ? '+' : '-'}{Number(tx.amount).toLocaleString()}
                    </span>
                    <span className="text-base-content/40 truncate flex-1">{(tx.description as string) || '—'}</span>
                    <span className="text-base-content/30 whitespace-nowrap">{new Date(tx.created_at as string).toLocaleDateString()}</span>
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
