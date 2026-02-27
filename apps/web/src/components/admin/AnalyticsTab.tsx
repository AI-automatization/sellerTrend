// ─── AnalyticsTab ────────────────────────────────────────────────────────────

import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { StatCard } from './StatCard';

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6', '#14b8a6'];

export interface AnalyticsTabProps {
  topUsers: Record<string, unknown>[];
  popularProducts: Record<string, unknown>[];
  popularCategories: Record<string, unknown>[];
  revenue: Record<string, unknown> | null;
  growth: Record<string, unknown> | null;
  categoryTrends: Record<string, unknown>[];
  productHeatmap: Record<string, unknown>[];
}

export function AnalyticsTab({
  topUsers, popularProducts, popularCategories,
  revenue, growth, categoryTrends, productHeatmap,
}: AnalyticsTabProps) {
  // Revenue chart data
  const revenueData = ((revenue?.daily as Record<string, unknown>[]) || []).map((d) => ({
    date: new Date(d.date as string).toLocaleDateString('uz', { day: '2-digit', month: 'short' }),
    daromad: Number(d.amount || 0),
  }));

  // Growth chart data
  const growthData = ((growth?.daily_new_users as Record<string, unknown>[]) || []).map((d) => ({
    date: new Date(d.date as string).toLocaleDateString('uz', { day: '2-digit', month: 'short' }),
    yangi: d.count as number,
  }));

  // User activity top 8 bar chart
  const userActivityData = topUsers.slice(0, 8).map((u) => ({
    name: (u.email as string)?.split('@')[0] || '?',
    faollik: (u.activity_score as number) ?? 0,
    tracked: (u.tracked_products as number) ?? 0,
    discovery: (u.discovery_runs as number) ?? 0,
  }));

  // Score distribution pie
  const scoreRanges = [
    { name: '5+ A\'lo', range: [5, 99], fill: '#22c55e' },
    { name: '3-5 Yaxshi', range: [3, 5], fill: '#f59e0b' },
    { name: '1-3 O\'rta', range: [1, 3], fill: '#3b82f6' },
    { name: '0-1 Past', range: [0, 1], fill: '#94a3b8' },
  ];
  const scorePieData = scoreRanges.map((r) => ({
    name: r.name,
    value: popularProducts.filter((p) => {
      const s = Number(p.avg_score ?? 0);
      return s >= r.range[0] && s < r.range[1];
    }).length,
    fill: r.fill,
  })).filter((d) => d.value > 0);

  // Category heatmap bar
  const heatmapData = productHeatmap.slice(0, 10).map((h) => ({
    category: `#${h.category_id}`,
    mahsulotlar: h.count as number,
    score: Number(h.avg_score ?? 0),
  }));

  // Category trends line chart
  const trendLineData = (() => {
    if (!categoryTrends.length) return [];
    const reversed = [...categoryTrends].reverse();
    return reversed.map((w) => {
      const point: Record<string, unknown> = {
        hafta: new Date(w.week as string).toLocaleDateString('uz', { day: '2-digit', month: 'short' }),
      };
      if (w.categories) {
        Object.entries(w.categories as Record<string, Record<string, number>>).forEach(([catId, val]) => {
          point[`#${catId}`] = val.runs || 0;
        });
      }
      return point;
    });
  })();
  const trendCategoryIds = (() => {
    const ids = new Set<string>();
    categoryTrends.forEach((w) => {
      if (w.categories) Object.keys(w.categories as Record<string, unknown>).forEach((id) => ids.add(`#${id}`));
    });
    return Array.from(ids).slice(0, 6);
  })();

  return (
    <div className="space-y-5">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Top userlar" value={topUsers.length} />
        <StatCard label="Mashhur mahsulotlar" value={popularProducts.length} />
        <StatCard label="Kategoriyalar" value={popularCategories.length} />
        <StatCard label="Eng faol" value={(topUsers[0]?.email as string)?.split('@')[0] || '—'} sub={topUsers[0] ? `${(topUsers[0].activity_score as number) ?? 0} ball` : ''} color="text-primary" />
      </div>

      {/* CHARTS ROW 1: Revenue + Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue Area Chart */}
        <div className="bg-base-200 rounded-2xl border border-base-300/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-base-300/30 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Kunlik Daromad (30 kun)</h3>
            {revenue && (
              <span className="text-xs font-mono text-success">{Number(revenue.mrr || 0).toLocaleString()} so'm MRR</span>
            )}
          </div>
          <div className="p-4" style={{ height: 260 }}>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.7 0 0 / 0.1)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0 / 0.5)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0 / 0.5)" tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} formatter={(v: number) => [`${v.toLocaleString()} so'm`, 'Daromad']} />
                  <Area type="monotone" dataKey="daromad" stroke="#6366f1" strokeWidth={2} fill="url(#revenueGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-base-content/30 text-sm">Ma'lumot yo'q</div>
            )}
          </div>
        </div>

        {/* User Growth Bar Chart */}
        <div className="bg-base-200 rounded-2xl border border-base-300/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-base-300/30 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Yangi Foydalanuvchilar (30 kun)</h3>
            {growth && (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-success font-medium">Hafta: +{(growth.week_new as number) ?? 0}</span>
                <span className="text-primary font-medium">Oy: +{(growth.month_new as number) ?? 0}</span>
              </div>
            )}
          </div>
          <div className="p-4" style={{ height: 260 }}>
            {growthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.7 0 0 / 0.1)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0 / 0.5)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0 / 0.5)" />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} />
                  <Bar dataKey="yangi" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-base-content/30 text-sm">Ma'lumot yo'q</div>
            )}
          </div>
        </div>
      </div>

      {/* CHARTS ROW 2: User Activity + Score Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* User Activity Bar */}
        <div className="lg:col-span-2 bg-base-200 rounded-2xl border border-base-300/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-base-300/30">
            <h3 className="font-semibold text-sm">Top 8 — Foydalanuvchi Faolligi</h3>
          </div>
          <div className="p-4" style={{ height: 280 }}>
            {userActivityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userActivityData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.7 0 0 / 0.1)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0 / 0.5)" />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0 / 0.5)" />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="faollik" fill="#6366f1" radius={[0, 4, 4, 0]} name="Faollik" />
                  <Bar dataKey="tracked" fill="#22c55e" radius={[0, 4, 4, 0]} name="Tracked" />
                  <Bar dataKey="discovery" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Discovery" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-base-content/30 text-sm">Ma'lumot yo'q</div>
            )}
          </div>
        </div>

        {/* Score Distribution Donut */}
        <div className="bg-base-200 rounded-2xl border border-base-300/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-base-300/30">
            <h3 className="font-semibold text-sm">Score Taqsimoti</h3>
          </div>
          <div className="p-4 flex flex-col items-center" style={{ height: 280 }}>
            {scorePieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={scorePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {scorePieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
                  {scorePieData.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px]">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                      <span className="text-base-content/60">{d.name}</span>
                      <span className="font-bold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-base-content/30 text-sm">Ma'lumot yo'q</div>
            )}
          </div>
        </div>
      </div>

      {/* CHARTS ROW 3: Category Trends + Category Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category Trends Line Chart */}
        <div className="bg-base-200 rounded-2xl border border-base-300/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-base-300/30">
            <h3 className="font-semibold text-sm">Kategoriya Trendlari (8 hafta)</h3>
          </div>
          <div className="p-4" style={{ height: 280 }}>
            {trendLineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendLineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.7 0 0 / 0.1)" />
                  <XAxis dataKey="hafta" tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0 / 0.5)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0 / 0.5)" />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {trendCategoryIds.map((id, i) => (
                    <Line key={id} type="monotone" dataKey={id} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-base-content/30 text-sm">Ma'lumot yo'q</div>
            )}
          </div>
        </div>

        {/* Category Heatmap Bar */}
        <div className="bg-base-200 rounded-2xl border border-base-300/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-base-300/30">
            <h3 className="font-semibold text-sm">Kategoriya — Tracked Mahsulotlar</h3>
          </div>
          <div className="p-4" style={{ height: 280 }}>
            {heatmapData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={heatmapData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.7 0 0 / 0.1)" />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} stroke="oklch(0.6 0 0 / 0.5)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0 / 0.5)" />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} formatter={(v: number, name: string) => {
                    if (name === 'score') return [v.toFixed(2), 'Avg Score'];
                    return [v, 'Mahsulotlar'];
                  }} />
                  <Bar dataKey="mahsulotlar" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-base-content/30 text-sm">Ma'lumot yo'q</div>
            )}
          </div>
        </div>
      </div>

      {/* Top Foydalanuvchilar Table */}
      <div className="bg-base-200 rounded-2xl border border-base-300/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-base-300/30 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Top Foydalanuvchilar</h3>
          <span className="text-xs text-base-content/40">{topUsers.length} ta</span>
        </div>
        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead>
              <tr className="bg-base-300/40 text-xs uppercase tracking-wider text-base-content/50">
                <th className="w-12 text-center">#</th>
                <th>Foydalanuvchi</th>
                <th className="text-center">Tracked</th>
                <th className="text-center">Avg Score</th>
                <th className="text-center">Haftalik</th>
                <th className="text-center">Discovery</th>
                <th className="text-center">Faollik</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map((u, i) => (
                <tr key={(u.user_id as string) || i} className="hover:bg-base-300/30 transition-colors">
                  <td className="text-center">
                    {i < 3 ? (
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        i === 0 ? 'bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/20' :
                        i === 1 ? 'bg-base-content/10 text-base-content/60 ring-1 ring-base-content/10' :
                        'bg-orange-400/10 text-orange-400 ring-1 ring-orange-400/20'
                      }`}>
                        {i + 1}
                      </span>
                    ) : <span className="text-base-content/40 text-xs">{i + 1}</span>}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary uppercase">
                        {(u.email as string)?.[0] || '?'}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{u.email as string}</div>
                        <div className="text-[11px] text-base-content/35">{u.account_name as string}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center font-bold">{(u.tracked_products as number) ?? 0}</td>
                  <td className="text-center">
                    <span className={`text-sm font-mono ${Number(u.avg_score ?? 0) >= 4 ? 'text-success' : Number(u.avg_score ?? 0) >= 2 ? 'text-warning' : 'text-base-content/50'}`}>
                      {Number(u.avg_score ?? 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="text-center tabular-nums">{(u.total_weekly as number) ?? 0}</td>
                  <td className="text-center tabular-nums">{(u.discovery_runs as number) ?? 0}</td>
                  <td className="text-center">
                    <span className="inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-bold tabular-nums">
                      {(u.activity_score as number) ?? 0}
                    </span>
                  </td>
                </tr>
              ))}
              {!topUsers.length && <tr><td colSpan={7} className="text-center text-base-content/40 py-8">Ma'lumot yo'q</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Products + Categories side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Mahsulotlar */}
        <div className="bg-base-200 rounded-2xl border border-base-300/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-base-300/30 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Top Mahsulotlar</h3>
            <span className="text-xs text-base-content/40">{popularProducts.length} ta</span>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr className="bg-base-300/40 text-xs uppercase tracking-wider text-base-content/50">
                  <th className="w-10 text-center">#</th>
                  <th>Mahsulot</th>
                  <th className="text-center">Track</th>
                  <th className="text-center">Score</th>
                  <th className="text-right">Haftalik</th>
                </tr>
              </thead>
              <tbody>
                {popularProducts.map((p, i) => (
                  <tr key={(p.product_id as string) || i} className="hover:bg-base-300/30 transition-colors">
                    <td className="text-center text-xs text-base-content/40 font-mono">{i + 1}</td>
                    <td>
                      <div className="text-sm max-w-[260px] truncate" title={(p.title as string) || `Product #${p.product_id}`}>
                        {(p.title as string) || `Product #${p.product_id}`}
                      </div>
                    </td>
                    <td className="text-center">
                      <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                        {p.tracker_count as number}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={`text-sm font-mono ${Number(p.avg_score ?? 0) >= 5 ? 'text-success' : Number(p.avg_score ?? 0) >= 3 ? 'text-warning' : 'text-base-content/50'}`}>
                        {Number(p.avg_score ?? 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="text-right tabular-nums font-mono text-sm">{(p.weekly_bought as string) ?? '—'}</td>
                  </tr>
                ))}
                {!popularProducts.length && <tr><td colSpan={5} className="text-center text-base-content/40 py-8">Ma'lumot yo'q</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Kategoriyalar */}
        <div className="bg-base-200 rounded-2xl border border-base-300/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-base-300/30 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Top Kategoriyalar</h3>
            <span className="text-xs text-base-content/40">{popularCategories.length} ta</span>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr className="bg-base-300/40 text-xs uppercase tracking-wider text-base-content/50">
                  <th>Kategoriya ID</th>
                  <th className="text-center">Discovery</th>
                  <th className="text-center">Winnerlar</th>
                  <th className="text-right">Oxirgi run</th>
                </tr>
              </thead>
              <tbody>
                {popularCategories.map((c, i) => (
                  <tr key={(c.category_id as string) || i} className="hover:bg-base-300/30 transition-colors">
                    <td>
                      <span className="font-mono text-sm bg-base-300/50 px-2 py-0.5 rounded-md">{c.category_id as string}</span>
                    </td>
                    <td className="text-center font-bold">{c.run_count as number}</td>
                    <td className="text-center">
                      <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-lg bg-success/10 text-success text-xs font-bold">
                        {(c.winner_count as number) ?? 0}
                      </span>
                    </td>
                    <td className="text-right text-xs text-base-content/50">{c.last_run_at ? new Date(c.last_run_at as string).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
                {!popularCategories.length && <tr><td colSpan={4} className="text-center text-base-content/40 py-8">Ma'lumot yo'q</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
