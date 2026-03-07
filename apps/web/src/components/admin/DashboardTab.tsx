// ─── DashboardTab ────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { StatCard } from './StatCard';
import { glassTooltip, CHART_ANIMATION_MS } from '../../utils/chartTokens';
import type { RevenueStats, GrowthStats, OverviewStats, RealtimeStats } from './adminTypes';

const PLAN_COLORS: Record<string, string> = {
  FREE: '#9ca3af',    // gray
  PRO: '#3b82f6',     // blue
  MAX: '#8b5cf6',     // purple
  COMPANY: '#f59e0b', // gold/amber
};

export interface DashboardTabProps {
  accounts: { length: number };
  activeAccounts: number;
  dueAccounts: number;
  users: { length: number };
  activeUsers: number;
  totalBalance: number;
  overview: OverviewStats | null;
  revenue: RevenueStats | null;
  growth: GrowthStats | null;
  realtime: RealtimeStats | null;
}

export function DashboardTab({
  accounts, activeAccounts, dueAccounts,
  users, activeUsers, totalBalance,
  overview, revenue, growth, realtime,
}: DashboardTabProps) {
  const planPieData = useMemo(() => {
    const pb = growth?.plan_breakdown;
    if (!pb) return [];
    return (['FREE', 'PRO', 'MAX', 'COMPANY'] as const)
      .filter((plan) => pb[plan] > 0)
      .map((plan) => ({ name: plan, value: pb[plan], fill: PLAN_COLORS[plan] }));
  }, [growth?.plan_breakdown]);

  const planTotal = useMemo(
    () => planPieData.reduce((s, d) => s + d.value, 0),
    [planPieData],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Jami accountlar" value={accounts.length} sub={`${activeAccounts} faol / ${dueAccounts} to'lov`} />
        <StatCard label="Jami userlar" value={users.length} sub={`${activeUsers} faol`} />
        <StatCard label="Bugun aktiv" value={overview?.today_active_users ?? '-'} color="text-primary" />
        <StatCard label="Tracked products" value={overview?.total_tracked_products ?? '-'} />
        <StatCard label="Bugungi analyze" value={overview?.today_analyzes ?? '-'} color="text-info" />
        <StatCard label="Discovery runs" value={overview?.today_category_runs ?? '-'} />
      </div>

      {/* Revenue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card bg-base-200">
          <div className="card-body p-4">
            <h3 className="font-semibold text-sm">Daromad</h3>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <StatCard label="Bugungi daromad" value={Number(revenue?.today_revenue ?? 0).toLocaleString()} sub="so'm" color="text-success" />
              <StatCard label="Bu oylik (MRR)" value={Number(revenue?.mrr ?? 0).toLocaleString()} sub="so'm" color="text-primary" />
              <StatCard label="O'rtacha balance" value={Number(revenue?.avg_balance ?? 0).toLocaleString()} sub="so'm" />
              <StatCard label="To'lov kerak" value={revenue?.payment_due_count ?? 0} color="text-error" />
            </div>
          </div>
        </div>

        <div className="card bg-base-200">
          <div className="card-body p-4">
            <h3 className="font-semibold text-sm">O'sish</h3>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <StatCard label="Bu hafta yangi" value={growth?.week_new ?? '-'} color="text-success" />
              <StatCard label="Bu oy yangi" value={growth?.month_new ?? '-'} color="text-info" />
              <StatCard label="Churn rate" value={`${(growth?.churn_rate_pct ?? 0).toFixed(1)}%`} color="text-error" />
              <StatCard label="Churn bo'lgan" value={growth?.churned_accounts ?? 0} color="text-warning" />
              <StatCard label="O'rtacha yangilanish" value={growth?.avg_days_to_renewal != null ? `${growth.avg_days_to_renewal.toFixed(0)} kun` : '-'} color="text-info" />
              <StatCard label="Jami balance" value={totalBalance.toLocaleString()} sub="so'm" />
            </div>
          </div>
        </div>
      </div>

      {/* Plan Distribution */}
      {planPieData.length > 0 && (
        <div className="card bg-base-200">
          <div className="card-body p-4">
            <h3 className="font-semibold text-sm">Tarif taqsimoti</h3>
            <div className="flex flex-col md:flex-row items-center gap-4 mt-2">
              <div className="w-full md:w-1/2" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      animationDuration={CHART_ANIMATION_MS}
                    >
                      {planPieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip {...glassTooltip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center md:flex-col gap-3">
                {planPieData.map((d) => {
                  const pct = planTotal > 0 ? ((d.value / planTotal) * 100).toFixed(1) : '0';
                  return (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: d.fill }} />
                      <span className="font-semibold">{d.name}</span>
                      <span className="text-base-content/60">{d.value}</span>
                      <span className="text-base-content/40">({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Realtime activity */}
      {realtime && (
        <div className="card bg-base-200">
          <div className="card-body p-4">
            <h3 className="font-semibold text-sm">Real-time</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              <StatCard label="Aktiv sessionlar" value={realtime.active_sessions ?? 0} color="text-primary" />
              <StatCard label="Bugungi requestlar" value={realtime.today_requests ?? 0} />
              <StatCard label="Queue pending" value={realtime.queue_pending ?? 0} />
              <StatCard label="Xatolar" value={realtime.recent_errors ?? 0} color="text-error" />
            </div>
            {(realtime.activity_feed?.length ?? 0) > 0 && (
              <div className="mt-3">
                <p className="text-xs text-base-content/50 mb-1">So'nggi faoliyat</p>
                <div className="space-y-1">
                  {realtime.activity_feed!.slice(0, 5).map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="badge badge-xs badge-primary">{a.action}</span>
                      <span className="text-base-content/60">{a.user_email}</span>
                      <span className="text-base-content/30 ml-auto">{new Date(a.created_at).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
