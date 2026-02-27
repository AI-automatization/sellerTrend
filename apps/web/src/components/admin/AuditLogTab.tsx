// ─── AuditLogTab ─────────────────────────────────────────────────────────────

import type { AuditEvent } from './types';

export interface AuditLogTabProps {
  auditLog: AuditEvent[];
}

export function AuditLogTab({ auditLog }: AuditLogTabProps) {
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
