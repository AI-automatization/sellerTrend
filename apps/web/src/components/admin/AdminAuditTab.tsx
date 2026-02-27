import React from 'react';
import { RoleBadge } from './AdminComponents';
import { ROLES, PERMISSIONS } from './adminTypes';
import type { AuditEvent, DepositEntry } from './adminTypes';

// ─── Audit Log Tab ────────────────────────────────────────────────────────────

interface AuditProps {
  auditLog: AuditEvent[];
}

export function AdminAuditTab({ auditLog }: AuditProps) {
  return (
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
  );
}

// ─── Permissions Tab ──────────────────────────────────────────────────────────

export function AdminPermissionsTab() {
  return (
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
  );
}

// ─── Deposits Tab ─────────────────────────────────────────────────────────────

interface DepositsProps {
  depositLog: DepositEntry[];
  depositLogTotal: number;
  depositLogPage: number;
  setDepositLogPage: (page: number | ((prev: number) => number)) => void;
  onDeleteDeposit: (id: string) => void;
}

export function AdminDepositsTab({ depositLog, depositLogTotal, depositLogPage, setDepositLogPage, onDeleteDeposit }: DepositsProps) {
  return (
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
            {depositLog.map((d) => (
              <tr key={d.id} className="hover">
                <td className="text-xs whitespace-nowrap">{new Date(d.created_at).toLocaleString()}</td>
                <td className="text-sm">{d.account_name}</td>
                <td className="text-success font-bold tabular-nums">+{Number(d.amount).toLocaleString()}</td>
                <td className="text-xs tabular-nums text-base-content/50">{Number(d.balance_before).toLocaleString()}</td>
                <td className="text-xs tabular-nums text-base-content/50">{Number(d.balance_after).toLocaleString()}</td>
                <td className="text-xs text-base-content/40 max-w-xs truncate">{d.description || '—'}</td>
                <td>
                  <button className="btn btn-ghost btn-xs text-error" onClick={() => onDeleteDeposit(d.id)}>
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
  );
}
