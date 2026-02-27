// ─── AccountsTab ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import type { Account, User, Role } from './types';
import { ROLES, ROLE_META } from './types';
import { StatCard } from './StatCard';
import { StatusBadge } from './StatusBadge';

export interface AccountsTabProps {
  accounts: Account[];
  users: User[];
  activeAccounts: number;
  dueAccounts: number;
  suspendedAccounts: number;
  totalBalance: number;
  globalFeeInput: string;
  savingGlobalFee: boolean;
  onGlobalFeeChange: (val: string) => void;
  onSaveGlobalFee: () => void;
  onShowCreateAccount: () => void;
  onDepositTarget: (account: Account) => void;
  onDrawerAccount: (account: Account) => void;
  onStatusChange: (accountId: string, status: string) => void;
  onRoleChange: (userId: string, role: Role) => void;
  onToggleActive: (userId: string) => void;
  onPasswordTarget: (user: { id: string; email: string }) => void;
  onSaveFee: (accountId: string) => void;
  editingFee: string | null;
  feeInput: string;
  onEditingFeeChange: (id: string | null) => void;
  onFeeInputChange: (val: string) => void;
  editingPhone: string | null;
  phoneInput: string;
  onEditingPhoneChange: (id: string | null) => void;
  onPhoneInputChange: (val: string) => void;
  onSavePhone: (accountId: string) => void;
}

export function AccountsTab({
  accounts, users, activeAccounts, dueAccounts, suspendedAccounts, totalBalance,
  globalFeeInput, savingGlobalFee, onGlobalFeeChange, onSaveGlobalFee,
  onShowCreateAccount, onDepositTarget, onDrawerAccount,
  onStatusChange, onRoleChange, onToggleActive, onPasswordTarget,
  onSaveFee, editingFee, feeInput, onEditingFeeChange, onFeeInputChange,
  editingPhone, phoneInput, onEditingPhoneChange, onPhoneInputChange, onSavePhone,
}: AccountsTabProps) {
  const [accountFilter, setAccountFilter] = useState<'all' | 'active' | 'due' | 'suspended'>('all');
  const [accountSearch, setAccountSearch] = useState('');
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);

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

  return (
    <div className="space-y-5">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Jami akkauntlar" value={accounts.length} />
        <StatCard label="Faol" value={activeAccounts} color="text-success" />
        <StatCard label="To'lov kerak" value={dueAccounts} color="text-error" />
        <StatCard label="Bloklangan" value={suspendedAccounts} />
        <StatCard label="Jami balans" value={totalBalance.toLocaleString()} sub="so'm" color="text-primary" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 bg-base-200 rounded-xl px-3 py-2 border border-base-300/50">
          <span className="text-xs text-base-content/40">Global to'lov:</span>
          <input className="input input-xs input-bordered w-20 text-right bg-transparent"
            value={globalFeeInput} onChange={(e) => onGlobalFeeChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSaveGlobalFee()} />
          <span className="text-xs text-base-content/40">so'm</span>
          <button onClick={onSaveGlobalFee} disabled={savingGlobalFee} className="btn btn-xs btn-primary">
            {savingGlobalFee ? <span className="loading loading-spinner loading-xs" /> : 'OK'}
          </button>
        </div>
        <button onClick={onShowCreateAccount} className="btn btn-primary btn-sm">+ Yangi Account</button>
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

      {/* Unified Accounts + Users Table */}
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
                  <React.Fragment key={a.id}>{/* Account Row */}
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
                            onChange={(e) => onPhoneInputChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSavePhone(a.id)} />
                          <button className="btn btn-xs btn-primary" onClick={() => onSavePhone(a.id)}>OK</button>
                          <button className="btn btn-xs btn-ghost" onClick={() => onEditingPhoneChange(null)}>X</button>
                        </div>
                      ) : (
                        <button className="btn btn-ghost btn-xs font-mono text-base-content/60" onClick={(e) => { e.stopPropagation(); onEditingPhoneChange(a.id); onPhoneInputChange(a.phone ?? ''); }}>
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
                            onChange={(e) => onFeeInputChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSaveFee(a.id)} />
                          <button className="btn btn-xs btn-primary" onClick={() => onSaveFee(a.id)}>OK</button>
                          <button className="btn btn-xs btn-ghost" onClick={() => onEditingFeeChange(null)}>X</button>
                        </div>
                      ) : (
                        <button className="btn btn-ghost btn-xs font-mono text-base-content/60" onClick={() => { onEditingFeeChange(a.id); onFeeInputChange(a.daily_fee ?? ''); }}>
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
                        <button className="btn btn-ghost btn-xs" onClick={() => onDepositTarget(a)}>Deposit</button>
                        <button className="btn btn-ghost btn-xs text-info" onClick={() => onDrawerAccount(a)}>Batafsil</button>
                        {a.status === 'ACTIVE' && (
                          <button className="btn btn-ghost btn-xs text-error" onClick={() => onStatusChange(a.id, 'SUSPENDED')}>Suspend</button>
                        )}
                        {a.status === 'SUSPENDED' && (
                          <button className="btn btn-ghost btn-xs text-success" onClick={() => onStatusChange(a.id, 'ACTIVE')}>Restore</button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {/* Expanded: Account Users */}
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
                          value={u.role} onChange={(e) => onRoleChange(u.id, e.target.value as Role)}>
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
                          <button className="btn btn-ghost btn-xs" onClick={() => onToggleActive(u.id)}>
                            {u.is_active ? 'Bloklash' : 'Faollashtirish'}
                          </button>
                          <button className="btn btn-ghost btn-xs text-warning" onClick={() => onPasswordTarget({ id: u.id, email: u.email })}>
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
        {/* Table footer */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-base-300/20 border-t border-base-300/30 text-xs text-base-content/40">
          <span>{filteredAccounts.length} akkaunt, {users.length} foydalanuvchi</span>
          <span>Qatorni bosib userlarni ko'ring</span>
        </div>
      </div>
    </div>
  );
}
