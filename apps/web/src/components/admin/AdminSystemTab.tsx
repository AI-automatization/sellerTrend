import React from 'react';
import { StatCard } from './AdminComponents';
import type { SystemHealth, AiUsage, SystemErrors } from './adminTypes';

interface Props {
  health: SystemHealth | null;
  aiUsage: AiUsage | null;
  systemErrors: SystemErrors | null;
  errorsPage: number;
  onLoadErrorsPage: (page: number) => void;
}

export function AdminSystemTab({ health, aiUsage, systemErrors, errorsPage, onLoadErrorsPage }: Props) {
  return (
    <div className="space-y-4">
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

      {aiUsage && (
        <div className="card bg-base-200">
          <div className="card-body p-4">
            <h3 className="font-semibold text-sm">AI Xarajatlari (Anthropic Claude)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <StatCard label="Bugungi chaqiruvlar" value={aiUsage.today?.calls ?? 0} color="text-primary" />
              <StatCard
                label="Bugungi tokenlar"
                value={((aiUsage.today?.input_tokens ?? 0) + (aiUsage.today?.output_tokens ?? 0)).toLocaleString()}
                sub={`in: ${(aiUsage.today?.input_tokens ?? 0).toLocaleString()} / out: ${(aiUsage.today?.output_tokens ?? 0).toLocaleString()}`}
              />
              <StatCard label="Bugungi xarajat" value={`$${aiUsage.today?.cost_usd ?? '0.0000'}`} color="text-warning" />
              <StatCard label="30 kunlik xarajat" value={`$${aiUsage.period?.cost_usd ?? '0.0000'}`} sub={`${aiUsage.period?.calls ?? 0} chaqiruv`} color="text-error" />
            </div>

            {aiUsage.by_method && aiUsage.by_method.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-base-content/50 mb-2">Metod bo'yicha</p>
                <div className="overflow-x-auto">
                  <table className="table table-xs">
                    <thead><tr><th>Metod</th><th>Chaqiruvlar</th><th>Input tok.</th><th>Output tok.</th><th>Xarajat ($)</th><th>O'rt. vaqt</th></tr></thead>
                    <tbody>
                      {aiUsage.by_method.map((m) => (
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

            {aiUsage.recent_errors && aiUsage.recent_errors.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-error mb-1">AI xatolar</p>
                <div className="space-y-1">
                  {aiUsage.recent_errors.slice(0, 10).map((e) => (
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

      {systemErrors && (
        <div className="card bg-base-200">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-error">Tizim xatolari (so'nggi 7 kun)</h3>
              <span className="badge badge-sm badge-error">{systemErrors.total ?? 0} ta</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {systemErrors.by_status && systemErrors.by_status.length > 0 && (
                <div>
                  <p className="text-xs text-base-content/50 mb-1">Status bo'yicha</p>
                  <div className="flex flex-wrap gap-2">
                    {systemErrors.by_status.map((s) => (
                      <span key={s.status} className={`badge badge-sm ${s.status >= 500 ? 'badge-error' : 'badge-warning'}`}>
                        {s.status}: {s.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {systemErrors.by_endpoint && systemErrors.by_endpoint.length > 0 && (
                <div>
                  <p className="text-xs text-base-content/50 mb-1">Top endpointlar</p>
                  <div className="space-y-1">
                    {systemErrors.by_endpoint.slice(0, 5).map((e) => (
                      <div key={e.endpoint} className="flex items-center gap-2 text-xs">
                        <span className="badge badge-xs badge-error">{e.count}</span>
                        <span className="font-mono truncate">{e.endpoint}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {systemErrors.items && systemErrors.items.length > 0 && (
              <div className="overflow-x-auto mt-3">
                <table className="table table-xs">
                  <thead><tr><th>Vaqt</th><th>Status</th><th>Metod</th><th>Endpoint</th><th>Xato</th><th>Account</th></tr></thead>
                  <tbody>
                    {systemErrors.items.map((e) => (
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

            {(systemErrors.pages ?? 1) > 1 && (
              <div className="flex justify-center gap-2 mt-2">
                <button className="btn btn-ghost btn-xs" disabled={errorsPage <= 1} onClick={() => onLoadErrorsPage(errorsPage - 1)}>Oldingi</button>
                <span className="btn btn-ghost btn-xs no-animation">{errorsPage} / {systemErrors.pages}</span>
                <button className="btn btn-ghost btn-xs" disabled={errorsPage >= (systemErrors.pages ?? 1)} onClick={() => onLoadErrorsPage(errorsPage + 1)}>Keyingi</button>
              </div>
            )}

            {!systemErrors.items?.length && (
              <p className="text-xs text-base-content/40 text-center mt-3">Xatolar yo'q</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
