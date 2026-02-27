// ─── SystemTab ───────────────────────────────────────────────────────────────

import { StatCard } from './StatCard';

export interface SystemTabProps {
  health: Record<string, unknown> | null;
  aiUsage: Record<string, unknown> | null;
  systemErrors: Record<string, unknown> | null;
  errorsPage: number;
  onLoadErrorsPage: (page: number) => void;
}

export function SystemTab({ health, aiUsage, systemErrors, errorsPage, onLoadErrorsPage }: SystemTabProps) {
  return (
    <div className="space-y-4">
      {/* System Health */}
      {health ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="API Status" value={health.status === 'healthy' ? 'Sog\'lom' : 'Muammo'} color={health.status === 'healthy' ? 'text-success' : 'text-error'} />
          <StatCard label="Uptime" value={`${Math.floor(((health.uptime_seconds as number) || 0) / 3600)}h ${Math.floor((((health.uptime_seconds as number) || 0) % 3600) / 60)}m`} />
          <StatCard label="Database" value={health.db_connected ? 'Ulangan' : 'Uzilgan'} color={health.db_connected ? 'text-success' : 'text-error'} />
          <StatCard label="RAM (Heap)" value={`${(health.memory as Record<string, unknown>)?.heap_used_mb ?? 0} / ${(health.memory as Record<string, unknown>)?.heap_total_mb ?? 0} MB`} />
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
              <StatCard label="Bugungi chaqiruvlar" value={((aiUsage.today as Record<string, unknown>)?.calls as number) ?? 0} color="text-primary" />
              <StatCard label="Bugungi tokenlar" value={(((aiUsage.today as Record<string, unknown>)?.input_tokens as number ?? 0) + ((aiUsage.today as Record<string, unknown>)?.output_tokens as number ?? 0)).toLocaleString()} sub={`in: ${((aiUsage.today as Record<string, unknown>)?.input_tokens as number ?? 0).toLocaleString()} / out: ${((aiUsage.today as Record<string, unknown>)?.output_tokens as number ?? 0).toLocaleString()}`} />
              <StatCard label="Bugungi xarajat" value={`$${(aiUsage.today as Record<string, unknown>)?.cost_usd ?? '0.0000'}`} color="text-warning" />
              <StatCard label="30 kunlik xarajat" value={`$${(aiUsage.period as Record<string, unknown>)?.cost_usd ?? '0.0000'}`} sub={`${(aiUsage.period as Record<string, unknown>)?.calls ?? 0} chaqiruv`} color="text-error" />
            </div>

            {/* By Method */}
            {((aiUsage.by_method as Record<string, unknown>[])?.length ?? 0) > 0 && (
              <div className="mt-3">
                <p className="text-xs text-base-content/50 mb-2">Metod bo'yicha</p>
                <div className="overflow-x-auto">
                  <table className="table table-xs">
                    <thead><tr><th>Metod</th><th>Chaqiruvlar</th><th>Input tok.</th><th>Output tok.</th><th>Xarajat ($)</th><th>O'rt. vaqt</th></tr></thead>
                    <tbody>
                      {(aiUsage.by_method as Record<string, unknown>[]).map((m) => (
                        <tr key={m.method as string}>
                          <td className="font-mono text-xs">{m.method as string}</td>
                          <td className="font-bold">{m.calls as number}</td>
                          <td className="tabular-nums">{(m.input_tokens as number).toLocaleString()}</td>
                          <td className="tabular-nums">{(m.output_tokens as number).toLocaleString()}</td>
                          <td className="text-warning tabular-nums">${m.cost_usd as string}</td>
                          <td className="text-base-content/50">{m.avg_duration_ms as number}ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* AI Errors */}
            {((aiUsage.recent_errors as Record<string, unknown>[])?.length ?? 0) > 0 && (
              <div className="mt-3">
                <p className="text-xs text-error mb-1">AI xatolar</p>
                <div className="space-y-1">
                  {(aiUsage.recent_errors as Record<string, unknown>[]).slice(0, 10).map((e) => (
                    <div key={e.id as string} className="flex items-center gap-2 text-xs">
                      <span className="text-base-content/40">{new Date(e.created_at as string).toLocaleString()}</span>
                      <span className="badge badge-xs badge-error">{e.method as string}</span>
                      <span className="text-error/70 truncate max-w-xs">{e.error as string}</span>
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
              <span className="badge badge-sm badge-error">{(systemErrors.total as number) ?? 0} ta</span>
            </div>

            {/* Error summary by status and endpoint */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {((systemErrors.by_status as Record<string, unknown>[])?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs text-base-content/50 mb-1">Status bo'yicha</p>
                  <div className="flex flex-wrap gap-2">
                    {(systemErrors.by_status as Record<string, unknown>[]).map((s) => (
                      <span key={s.status as number} className={`badge badge-sm ${(s.status as number) >= 500 ? 'badge-error' : 'badge-warning'}`}>
                        {s.status as number}: {s.count as number}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {((systemErrors.by_endpoint as Record<string, unknown>[])?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs text-base-content/50 mb-1">Top endpointlar</p>
                  <div className="space-y-1">
                    {(systemErrors.by_endpoint as Record<string, unknown>[]).slice(0, 5).map((e) => (
                      <div key={e.endpoint as string} className="flex items-center gap-2 text-xs">
                        <span className="badge badge-xs badge-error">{e.count as number}</span>
                        <span className="font-mono truncate">{e.endpoint as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Error list */}
            {((systemErrors.items as Record<string, unknown>[])?.length ?? 0) > 0 && (
              <div className="overflow-x-auto mt-3">
                <table className="table table-xs">
                  <thead><tr><th>Vaqt</th><th>Status</th><th>Metod</th><th>Endpoint</th><th>Xato</th><th>Account</th></tr></thead>
                  <tbody>
                    {(systemErrors.items as Record<string, unknown>[]).map((e) => (
                      <tr key={e.id as string}>
                        <td className="text-xs whitespace-nowrap">{new Date(e.created_at as string).toLocaleString()}</td>
                        <td><span className={`badge badge-xs ${(e.status as number) >= 500 ? 'badge-error' : 'badge-warning'}`}>{e.status as number}</span></td>
                        <td className="text-xs font-mono">{e.method as string}</td>
                        <td className="text-xs font-mono max-w-[200px] truncate">{e.endpoint as string}</td>
                        <td className="text-xs text-error/70 max-w-xs truncate">{e.message as string}</td>
                        <td className="text-xs text-base-content/40">{e.account_id ? (e.account_id as string).slice(0, 8) + '...' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {((systemErrors.pages as number) ?? 1) > 1 && (
              <div className="flex justify-center gap-2 mt-2">
                <button className="btn btn-ghost btn-xs" disabled={errorsPage <= 1} onClick={() => onLoadErrorsPage(errorsPage - 1)}>Oldingi</button>
                <span className="btn btn-ghost btn-xs no-animation">{errorsPage} / {systemErrors.pages as number}</span>
                <button className="btn btn-ghost btn-xs" disabled={errorsPage >= ((systemErrors.pages as number) ?? 1)} onClick={() => onLoadErrorsPage(errorsPage + 1)}>Keyingi</button>
              </div>
            )}

            {!((systemErrors.items as Record<string, unknown>[])?.length) && (
              <p className="text-xs text-base-content/40 text-center mt-3">Xatolar yo'q</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
