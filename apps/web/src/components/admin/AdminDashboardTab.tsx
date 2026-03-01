import { StatCard } from './AdminComponents';
import type { Account, User, OverviewStats, RevenueStats, GrowthStats, RealtimeStats } from './adminTypes';

interface Props {
  accounts: Account[];
  users: User[];
  overview: OverviewStats | null;
  revenue: RevenueStats | null;
  growth: GrowthStats | null;
  realtime: RealtimeStats | null;
}

export function AdminDashboardTab({ accounts, users, overview, revenue, growth, realtime }: Props) {
  const activeAccounts = accounts.filter((a) => a.status === 'ACTIVE').length;
  const dueAccounts = accounts.filter((a) => a.status === 'PAYMENT_DUE').length;
  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);
  const activeUsers = users.filter((u) => u.is_active).length;

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
              <StatCard label="Jami balance" value={totalBalance.toLocaleString()} sub="so'm" />
            </div>
          </div>
        </div>
      </div>

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
            {realtime.activity_feed && realtime.activity_feed.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-base-content/50 mb-1">So'nggi faoliyat</p>
                <div className="space-y-1">
                  {realtime.activity_feed.slice(0, 5).map((a, i) => (
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
