// ─── MonitoringTab ───────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { adminApi } from '../../api/admin';
import type { MetricsSnapshot, UserHealthRow, CapacityEstimate, CapacityBaseline, SystemAlert } from '../../api/admin';
import { logError } from '../../utils/handleError';
import { StatCard } from './StatCard';

// ── Refresh interval (ms) ──
const METRICS_REFRESH_MS = 15_000;

// ── Helper: memory percentage color ──
function memoryColor(pct: number): string {
  if (pct >= 80) return 'text-error';
  if (pct >= 60) return 'text-warning';
  return 'text-success';
}

function memoryProgressClass(pct: number): string {
  if (pct >= 80) return 'progress-error';
  if (pct >= 60) return 'progress-warning';
  return 'progress-success';
}

// ── Helper: event loop lag badge ──
function lagBadge(ms: number): { cls: string; label: string } {
  if (ms > 200) return { cls: 'badge-error', label: `${ms.toFixed(0)}ms` };
  if (ms >= 50) return { cls: 'badge-warning', label: `${ms.toFixed(0)}ms` };
  return { cls: 'badge-success', label: `${ms.toFixed(0)}ms` };
}

// ── Helper: bottleneck badge ──
function bottleneckBadge(b: CapacityEstimate['bottleneck']): { cls: string; label: string } {
  const map: Record<CapacityEstimate['bottleneck'], { cls: string; label: string }> = {
    none: { cls: 'badge-success', label: 'Muammo yo\'q' },
    memory: { cls: 'badge-error', label: 'Xotira' },
    cpu: { cls: 'badge-warning', label: 'CPU' },
    db_pool: { cls: 'badge-error', label: 'DB Pool' },
    event_loop: { cls: 'badge-warning', label: 'Event Loop' },
  };
  return map[b] ?? { cls: 'badge-ghost', label: b };
}

// ── Helper: format relative time ──
function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'hozirgina';
  if (mins < 60) return `${mins} min oldin`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} soat oldin`;
  return `${Math.floor(hrs / 24)} kun oldin`;
}

// ── Helper: alert level badge ──
function alertBadgeClass(level: SystemAlert['level']): string {
  if (level === 'critical') return 'badge-error';
  if (level === 'warning') return 'badge-warning';
  return 'badge-success';
}

// ── Sort key type ──
type UserSortKey = 'errors' | 'requests' | 'slow' | 'rate_limits';

export function MonitoringTab() {
  // ── State ──
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const [userHealth, setUserHealth] = useState<UserHealthRow[]>([]);
  const [userHealthLoading, setUserHealthLoading] = useState(true);
  const [userHealthError, setUserHealthError] = useState<string | null>(null);
  const [userSort, setUserSort] = useState<UserSortKey>('errors');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const [capacity, setCapacity] = useState<CapacityEstimate | null>(null);

  const [baselines, setBaselines] = useState<CapacityBaseline[]>([]);
  const [baselinesLoading, setBaselinesLoading] = useState(true);
  const [baselineLabel, setBaselineLabel] = useState('');
  const [capturingBaseline, setCapturingBaseline] = useState(false);

  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch metrics ──
  const fetchMetrics = useCallback(async () => {
    try {
      const [metricsRes, capacityRes] = await Promise.all([
        adminApi.getMonitoringMetrics('1h'),
        adminApi.getCapacityEstimate(),
      ]);
      setMetrics(metricsRes.data.latest);
      setCapacity(capacityRes.data);
      setMetricsError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Metrikalarni yuklashda xatolik';
      setMetricsError(msg);
      logError(err);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // ── Fetch user health ──
  const fetchUserHealth = useCallback(async (sort: UserSortKey) => {
    setUserHealthLoading(true);
    try {
      const res = await adminApi.getUserHealth({ sort, limit: 50 });
      const data = Array.isArray(res.data) ? res.data : [];
      setUserHealth(data);
      setUserHealthError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Foydalanuvchi ma\'lumotlarini yuklashda xatolik';
      setUserHealthError(msg);
      logError(err);
    } finally {
      setUserHealthLoading(false);
    }
  }, []);

  // ── Fetch baselines + alerts ──
  const fetchHistory = useCallback(async () => {
    try {
      const [baselinesRes, alertsRes] = await Promise.all([
        adminApi.getCapacityBaselines(),
        adminApi.getSystemAlerts(50),
      ]);
      setBaselines(Array.isArray(baselinesRes.data) ? baselinesRes.data : []);
      setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
    } catch (err: unknown) {
      logError(err);
    } finally {
      setBaselinesLoading(false);
      setAlertsLoading(false);
    }
  }, []);

  // ── Auto-refresh metrics every 15s ──
  useEffect(() => {
    fetchMetrics();
    intervalRef.current = setInterval(fetchMetrics, METRICS_REFRESH_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchMetrics]);

  // ── Load user health on mount & when sort changes ──
  useEffect(() => {
    fetchUserHealth(userSort);
  }, [userSort, fetchUserHealth]);

  // ── Load history on mount ──
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ── Capture baseline ──
  async function handleCaptureBaseline() {
    if (!baselineLabel.trim()) return;
    setCapturingBaseline(true);
    try {
      const res = await adminApi.captureBaseline(baselineLabel.trim());
      setBaselines((prev) => [res.data, ...prev]);
      setBaselineLabel('');
    } catch (err: unknown) {
      logError(err);
    } finally {
      setCapturingBaseline(false);
    }
  }

  // ── Derived values ──
  const heapPct = metrics
    ? Math.round((metrics.heap_used_mb / (metrics.heap_total_mb || 1)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* ────────────────── Section 1: System Overview ────────────────── */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h3 className="card-title text-base">Tizim Holati</h3>
            <span className="text-xs text-base-content/40">
              Har {METRICS_REFRESH_MS / 1000}s yangilanadi
            </span>
          </div>

          {metricsError && (
            <div role="alert" className="alert alert-error alert-sm mt-2">
              <span className="text-sm">{metricsError}</span>
            </div>
          )}

          {metricsLoading && !metrics ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner" />
            </div>
          ) : metrics ? (
            <div className="space-y-4 mt-3">
              {/* Memory Gauge */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-base-content/60">Xotira (Heap)</span>
                  <span className={`text-sm font-bold ${memoryColor(heapPct)}`}>
                    {metrics.heap_used_mb.toFixed(0)} MB / {metrics.heap_total_mb.toFixed(0)} MB ({heapPct}%)
                  </span>
                </div>
                <progress
                  className={`progress w-full ${memoryProgressClass(heapPct)}`}
                  value={heapPct}
                  max={100}
                />
                <p className="text-xs text-base-content/40 mt-0.5">
                  RSS: {metrics.rss_mb.toFixed(0)} MB | External: {metrics.external_mb.toFixed(1)} MB
                </p>
              </div>

              {/* Stat badges grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard
                  label="CPU"
                  value={`${metrics.cpu_pct.toFixed(1)}%`}
                  color={metrics.cpu_pct > 80 ? 'text-error' : metrics.cpu_pct > 50 ? 'text-warning' : 'text-success'}
                />
                <div className="bg-base-200 rounded-xl p-4 border border-base-300/50">
                  <p className="text-xs text-base-content/50">Event Loop Lag</p>
                  <div className="mt-1">
                    <span className={`badge ${lagBadge(metrics.event_loop_lag_ms).cls}`}>
                      {lagBadge(metrics.event_loop_lag_ms).label}
                    </span>
                  </div>
                </div>
                <StatCard
                  label="Faol ulanishlar"
                  value={metrics.active_requests}
                  color="text-info"
                />
                <StatCard
                  label="Pik (1 min)"
                  value={metrics.peak_concurrent}
                  color="text-primary"
                />
                <StatCard
                  label="DB Pool"
                  value={metrics.db_pool_active}
                  color={metrics.db_pool_active > 15 ? 'text-warning' : 'text-success'}
                />
                {capacity && (
                  <div className="bg-base-200 rounded-xl p-4 border border-base-300/50">
                    <p className="text-xs text-base-content/50">Max foydalanuvchi</p>
                    <p className="text-2xl font-bold mt-1 text-primary">
                      ~{capacity.estimated_max_concurrent_users}
                    </p>
                    <span className={`badge badge-xs mt-1 ${bottleneckBadge(capacity.bottleneck).cls}`}>
                      {bottleneckBadge(capacity.bottleneck).label}
                    </span>
                  </div>
                )}
              </div>

              {/* Queue depths */}
              {metrics.queue_depths && Object.keys(metrics.queue_depths).length > 0 && (
                <div>
                  <p className="text-xs text-base-content/50 mb-1">Navbat chuqurliklari</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(metrics.queue_depths).map(([name, depth]) => (
                      <span
                        key={name}
                        className={`badge badge-sm ${depth > 10 ? 'badge-warning' : 'badge-ghost'}`}
                      >
                        {name}: {depth}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Capacity recommendations */}
              {capacity && capacity.recommendations.length > 0 && (
                <div>
                  <p className="text-xs text-base-content/50 mb-1">Tavsiyalar</p>
                  <div className="space-y-1">
                    {capacity.recommendations.map((rec, i) => (
                      <div key={i} className="text-xs text-warning flex items-start gap-1.5">
                        <span className="mt-0.5 shrink-0">&#9888;</span>
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* ────────────────── Section 2: Per-User Health ────────────────── */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="card-title text-base">Foydalanuvchi Salomatligi</h3>
            <div className="flex flex-wrap gap-1">
              {([
                { key: 'errors' as const, label: 'Xatolar' },
                { key: 'requests' as const, label: 'So\'rovlar' },
                { key: 'slow' as const, label: 'Sekin' },
                { key: 'rate_limits' as const, label: 'Rate limit' },
              ]).map((s) => (
                <button
                  key={s.key}
                  className={`btn btn-xs ${userSort === s.key ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setUserSort(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {userHealthError && (
            <div role="alert" className="alert alert-error alert-sm mt-2">
              <span className="text-sm">{userHealthError}</span>
            </div>
          )}

          {userHealthLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner" />
            </div>
          ) : userHealth.length === 0 ? (
            <p className="text-xs text-base-content/40 text-center py-6">
              Ma'lumot yo'q
            </p>
          ) : (
            <div className="overflow-x-auto mt-3">
              <table className="table table-xs">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Account</th>
                    <th>So'rov 1h</th>
                    <th>So'rov 24h</th>
                    <th>Xato 24h</th>
                    <th>Xato %</th>
                    <th>Sekin</th>
                    <th>Rate Limit</th>
                    <th>Oxirgi faollik</th>
                    <th>Sessiyalar</th>
                  </tr>
                </thead>
                <tbody>
                  {userHealth.map((u) => {
                    const isHighError = u.error_rate_pct > 10;
                    const isExpanded = expandedUser === u.user_id;
                    return (
                      <>
                        <tr
                          key={u.user_id}
                          className={`cursor-pointer hover:bg-base-200 ${isHighError ? 'bg-error/5' : ''}`}
                          onClick={() => setExpandedUser(isExpanded ? null : u.user_id)}
                        >
                          <td className="font-mono text-xs max-w-[160px] truncate">{u.email}</td>
                          <td className="text-xs max-w-[120px] truncate">{u.account_name}</td>
                          <td className="tabular-nums">{u.requests_1h}</td>
                          <td className="tabular-nums">{u.requests_24h}</td>
                          <td className={`tabular-nums font-bold ${u.errors_24h > 0 ? 'text-error' : ''}`}>{u.errors_24h}</td>
                          <td>
                            <span className={`badge badge-xs ${u.error_rate_pct > 10 ? 'badge-error' : u.error_rate_pct > 5 ? 'badge-warning' : 'badge-ghost'}`}>
                              {u.error_rate_pct.toFixed(1)}%
                            </span>
                          </td>
                          <td className={`tabular-nums ${u.slow_requests_24h > 5 ? 'text-warning font-bold' : ''}`}>{u.slow_requests_24h}</td>
                          <td className={`tabular-nums ${u.rate_limit_hits_24h > 0 ? 'text-error' : ''}`}>{u.rate_limit_hits_24h}</td>
                          <td className="text-xs text-base-content/50 whitespace-nowrap">{relativeTime(u.last_active)}</td>
                          <td className="tabular-nums">{u.active_sessions}</td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${u.user_id}-detail`}>
                            <td colSpan={10}>
                              <div className="bg-base-200 rounded-lg p-3 my-1 space-y-1">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                  <div>
                                    <span className="text-base-content/50">O'rt. javob vaqti:</span>
                                    <span className="ml-1 font-bold">{u.avg_response_ms.toFixed(0)}ms</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/50">Top xato endpoint:</span>
                                    <span className="ml-1 font-mono text-error">{u.top_error_endpoint ?? '—'}</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/50">Sessiyalar:</span>
                                    <span className="ml-1 font-bold">{u.active_sessions}</span>
                                  </div>
                                  <div>
                                    <span className="text-base-content/50">User ID:</span>
                                    <span className="ml-1 font-mono">{u.user_id.slice(0, 12)}...</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ────────────────── Section 3: Capacity History & Alerts ────────────────── */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h3 className="card-title text-base">Sig'im Tarixi</h3>

          {/* Capture Baseline */}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              className="input input-bordered input-sm w-60"
              placeholder="Baseline nomi (masalan: deploy-v5.4)"
              value={baselineLabel}
              onChange={(e) => setBaselineLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCaptureBaseline()}
            />
            <button
              className="btn btn-primary btn-sm"
              disabled={capturingBaseline || !baselineLabel.trim()}
              onClick={handleCaptureBaseline}
            >
              {capturingBaseline ? <span className="loading loading-spinner loading-xs" /> : null}
              Baseline olish
            </button>
          </div>

          {/* Baselines table */}
          {baselinesLoading ? (
            <div className="flex justify-center py-6">
              <span className="loading loading-spinner" />
            </div>
          ) : baselines.length === 0 ? (
            <p className="text-xs text-base-content/40 text-center py-4">
              Baseline'lar hali olinmagan
            </p>
          ) : (
            <div className="overflow-x-auto mt-3">
              <table className="table table-xs">
                <thead>
                  <tr>
                    <th>Nomi</th>
                    <th>Sana</th>
                    <th>Heap Idle</th>
                    <th>Heap Loaded</th>
                    <th>RSS</th>
                    <th>Max Users</th>
                    <th>Event Loop</th>
                  </tr>
                </thead>
                <tbody>
                  {baselines.map((b, idx) => {
                    const prev = baselines[idx + 1] ?? null;
                    return (
                      <tr key={b.id}>
                        <td className="font-semibold text-xs">{b.label}</td>
                        <td className="text-xs text-base-content/50 whitespace-nowrap">
                          {new Date(b.created_at).toLocaleDateString()}
                        </td>
                        <td className="tabular-nums text-xs">
                          {b.heap_idle_mb.toFixed(0)} MB
                          {prev && <DiffBadge current={b.heap_idle_mb} previous={prev.heap_idle_mb} unit="MB" />}
                        </td>
                        <td className="tabular-nums text-xs">
                          {b.heap_loaded_mb.toFixed(0)} MB
                          {prev && <DiffBadge current={b.heap_loaded_mb} previous={prev.heap_loaded_mb} unit="MB" />}
                        </td>
                        <td className="tabular-nums text-xs">
                          {b.rss_mb.toFixed(0)} MB
                          {prev && <DiffBadge current={b.rss_mb} previous={prev.rss_mb} unit="MB" />}
                        </td>
                        <td className="tabular-nums text-xs font-bold">
                          ~{b.estimated_max_users}
                          {prev && <DiffBadge current={b.estimated_max_users} previous={prev.estimated_max_users} unit="" invertColor />}
                        </td>
                        <td className="tabular-nums text-xs">
                          {b.event_loop_lag_ms.toFixed(0)}ms
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Alerts history */}
          <div className="mt-6">
            <h4 className="font-semibold text-sm mb-2">Tizim ogohlantirishlari</h4>
            {alertsLoading ? (
              <div className="flex justify-center py-4">
                <span className="loading loading-spinner loading-sm" />
              </div>
            ) : alerts.length === 0 ? (
              <p className="text-xs text-base-content/40 text-center py-3">
                Ogohlantirish yo'q
              </p>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {alerts.map((a) => (
                  <div
                    key={a.id}
                    className={`flex items-start gap-2 text-xs p-2 rounded-lg ${
                      a.level === 'critical' ? 'bg-error/10' :
                      a.level === 'warning' ? 'bg-warning/10' :
                      'bg-success/10'
                    }`}
                  >
                    <span className={`badge badge-xs mt-0.5 shrink-0 ${alertBadgeClass(a.level)}`}>
                      {a.level}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold">{a.type}</span>
                      <span className="text-base-content/60 ml-1.5">{a.message}</span>
                      <div className="text-base-content/40 mt-0.5">
                        Qiymat: {a.value.toFixed(1)} | Chegara: {a.threshold.toFixed(1)}
                        {a.resolved_at && (
                          <span className="text-success ml-2">
                            Hal qilindi: {new Date(a.resolved_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-base-content/30 whitespace-nowrap shrink-0">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DiffBadge: show difference from previous baseline ──
function DiffBadge({
  current,
  previous,
  unit,
  invertColor = false,
}: {
  current: number;
  previous: number;
  unit: string;
  invertColor?: boolean;
}) {
  const diff = current - previous;
  if (Math.abs(diff) < 0.5) return null;

  // For memory: increase = bad (red), decrease = good (green)
  // For max users (invertColor): increase = good (green), decrease = bad (red)
  const isPositive = diff > 0;
  const isGood = invertColor ? isPositive : !isPositive;
  const color = isGood ? 'text-success' : 'text-error';
  const sign = isPositive ? '+' : '';

  return (
    <span className={`ml-1 text-[10px] font-bold ${color}`}>
      {sign}{diff.toFixed(0)}{unit ? ` ${unit}` : ''}
    </span>
  );
}
