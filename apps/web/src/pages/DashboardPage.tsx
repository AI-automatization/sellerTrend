import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { productsApi, billingApi } from '../api/client';
import {
  FireIcon,
  WalletIcon,
  ArrowTrendingUpIcon,
  MagnifyingGlassIcon,
} from '../components/icons';
import { SkeletonStat, SkeletonCard, SkeletonTable } from '../components/ui/Skeleton';

interface TrackedProduct {
  product_id: string;
  title: string;
  rating: number | string | null;
  feedback_quantity: number | null;
  orders_quantity: string | null;
  score: number | null;
  prev_score: number | null;
  trend: 'up' | 'flat' | 'down' | null;
  weekly_bought: number | null;
  sell_price: number | null;
  tracked_since: string;
}

interface Balance {
  balance: string;
  status: string;
  daily_fee: string;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="badge badge-ghost text-xs">—</span>;
  if (score >= 6) return <span className="badge badge-success text-xs">{score.toFixed(2)}</span>;
  if (score >= 4) return <span className="badge badge-warning text-xs">{score.toFixed(2)}</span>;
  return <span className="badge badge-ghost text-xs">{score.toFixed(2)}</span>;
}

function TrendArrow({ trend }: { trend: 'up' | 'flat' | 'down' | null }) {
  if (trend === 'up') return <span className="text-success font-bold text-base">↗</span>;
  if (trend === 'down') return <span className="text-error font-bold text-base">↘</span>;
  if (trend === 'flat') return <span className="text-base-content/30 text-base">→</span>;
  return <span className="text-base-content/20">—</span>;
}

function scoreColor(score: number | null) {
  if (!score) return '#4b5563';
  if (score >= 6) return '#22c55e';
  if (score >= 4) return '#f59e0b';
  return '#6b7280';
}

export function DashboardPage() {
  const [products, setProducts] = useState<TrackedProduct[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      productsApi.getTracked().then((r) => setProducts(r.data)),
      billingApi.getBalance().then((r) => setBalance(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="skeleton w-32 h-7 rounded" />
            <div className="skeleton w-52 h-4 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="skeleton w-28 h-8 rounded" />
            <div className="skeleton w-28 h-8 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SkeletonStat /><SkeletonStat /><SkeletonStat /><SkeletonStat />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><SkeletonCard lines={7} height="h-5" /></div>
          <SkeletonCard lines={5} />
        </div>
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body p-0">
            <div className="px-4 pt-4 pb-3 border-b border-base-300">
              <div className="skeleton w-52 h-5 rounded" />
            </div>
            <SkeletonTable rows={6} cols={8} />
          </div>
        </div>
      </div>
    );
  }

  const paymentDue = balance?.status === 'PAYMENT_DUE';

  // Computed stats
  const totalOrders = products.reduce((s, p) => s + (p.orders_quantity ? Number(p.orders_quantity) : 0), 0);
  const totalWeeklySales = products.reduce((s, p) => s + (p.weekly_bought ?? 0), 0);
  const avgScore = products.length > 0
    ? products.reduce((s, p) => s + (p.score ?? 0), 0) / products.length
    : 0;
  const rising = products.filter((p) => p.trend === 'up').length;
  const falling = products.filter((p) => p.trend === 'down').length;
  const bestProduct = [...products].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  const mostActive = [...products].sort((a, b) => (b.weekly_bought ?? 0) - (a.weekly_bought ?? 0))[0];

  // Chart data
  const scoreChartData = products
    .filter((p) => p.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 10)
    .map((p) => ({
      name: p.title.length > 18 ? p.title.slice(0, 18) + '…' : p.title,
      score: p.score ?? 0,
      id: p.product_id,
    }));

  const activityChartData = products
    .filter((p) => p.weekly_bought !== null && p.weekly_bought > 0)
    .sort((a, b) => (b.weekly_bought ?? 0) - (a.weekly_bought ?? 0))
    .slice(0, 8)
    .map((p) => ({
      name: p.title.length > 14 ? p.title.slice(0, 14) + '…' : p.title,
      faollik: p.weekly_bought ?? 0,
      id: p.product_id,
    }));

  const trendPieData = [
    { name: "O'sayapti", value: rising, fill: '#22c55e' },
    { name: 'Barqaror', value: products.filter((p) => p.trend === 'flat').length, fill: '#6b7280' },
    { name: 'Tushayapti', value: falling, fill: '#ef4444' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-base-content/50 text-sm mt-0.5">Portfolio analitikasi va monitoring</p>
        </div>
        <div className="flex gap-2">
          <Link to="/discovery" className="btn btn-outline btn-sm gap-2">
            <ArrowTrendingUpIcon className="w-4 h-4" />
            Discovery
          </Link>
          <Link to="/analyze" className="btn btn-primary btn-sm gap-2">
            <MagnifyingGlassIcon className="w-4 h-4" />
            URL Tahlil
          </Link>
        </div>
      </div>

      {/* Payment alert */}
      {paymentDue && (
        <div role="alert" className="alert alert-error alert-soft">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <h3 className="font-bold">Balans yetarli emas!</h3>
            <div className="text-xs opacity-80">
              Joriy balans:{' '}
              <span className="font-semibold">
                {balance ? Number(balance.balance).toLocaleString() : '0'} so'm
              </span>
              {' · '}Kunlik to'lov:{' '}
              <span className="font-semibold">
                {balance ? Number(balance.daily_fee).toLocaleString() : '0'} so'm/kun
              </span>
            </div>
          </div>
          <Link to="/billing" className="btn btn-sm btn-error">
            Hisobni to'ldirish →
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`stat rounded-2xl ${paymentDue ? 'bg-error/10 border border-error/30' : 'bg-base-200'}`}>
          <div className="stat-figure text-primary"><WalletIcon className="w-8 h-8" /></div>
          <div className="stat-title text-xs">Balans</div>
          <div className={`stat-value text-xl ${paymentDue ? 'text-error' : ''}`}>
            {balance ? Number(balance.balance).toLocaleString() : '—'}
          </div>
          <div className="stat-desc">so'm · {balance ? Number(balance.daily_fee).toLocaleString() : '—'}/kun</div>
        </div>

        <div className="stat bg-base-200 rounded-2xl">
          <div className="stat-figure text-accent"><ArrowTrendingUpIcon className="w-8 h-8" /></div>
          <div className="stat-title text-xs">Kuzatilmoqda</div>
          <div className="stat-value text-xl">{products.length}</div>
          <div className="stat-desc">mahsulot</div>
        </div>

        <div className="stat bg-base-200 rounded-2xl">
          <div className="stat-figure text-success">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          </div>
          <div className="stat-title text-xs">Haftalik sotuvlar</div>
          <div className="stat-value text-xl text-success">{totalWeeklySales.toLocaleString()}</div>
          <div className="stat-desc">barcha mahsulot</div>
        </div>

        <div className="stat bg-base-200 rounded-2xl">
          <div className="stat-figure text-warning">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </div>
          <div className="stat-title text-xs">O'rtacha score</div>
          <div className="stat-value text-xl text-warning">{avgScore.toFixed(2)}</div>
          <div className="stat-desc">{rising} o'sayapti · {falling} tushayapti</div>
        </div>
      </div>

      {/* Charts + top performers row */}
      {products.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Score bar chart */}
          <div className="lg:col-span-2 card bg-base-200 shadow-sm">
            <div className="card-body">
              <h2 className="card-title text-sm text-base-content/70">Portfolio Score taqqoslama</h2>
              {scoreChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={scoreChartData} margin={{ top: 4, right: 8, left: -20, bottom: 40 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} domain={[0, 10]} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} tickLine={false} axisLine={false} width={90} />
                    <Tooltip
                      contentStyle={{ background: '#1d232a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [v.toFixed(2), 'Score']}
                    />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {scoreChartData.map((entry) => (
                        <Cell key={entry.id} fill={scoreColor(entry.score)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-40 text-base-content/30 text-sm">
                  Score ma'lumotlari yo'q
                </div>
              )}
            </div>
          </div>

          {/* Trend pie + top stats */}
          <div className="flex flex-col gap-4">
            {/* Trend pie */}
            {trendPieData.length > 0 && (
              <div className="card bg-base-200 shadow-sm flex-1">
                <div className="card-body p-4">
                  <h2 className="text-sm font-semibold text-base-content/70 mb-1">Trend taqsimoti</h2>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={trendPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {trendPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#1d232a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                      />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Quick stats */}
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body p-4 gap-3">
                <h2 className="text-sm font-semibold text-base-content/70">Umumiy ko'rsatkichlar</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-base-content/50">Jami buyurtmalar</span>
                    <span className="font-bold tabular-nums">{totalOrders.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/50">Haftalik jami</span>
                    <span className="font-bold tabular-nums text-success">{totalWeeklySales.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/50">O'sayotgan</span>
                    <span className="font-bold text-success">{rising} ta</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/50">Tushayotgan</span>
                    <span className="font-bold text-error">{falling} ta</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity chart */}
      {activityChartData.length > 0 && (
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-sm text-base-content/70">Haftalik faollik reytingi (so'nggi 7 kun)</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={activityChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1d232a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [v.toLocaleString(), 'Haftalik sotuvlar']}
                />
                <Bar dataKey="faollik" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top performers */}
      {products.length > 0 && (bestProduct || mostActive) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {bestProduct && (
            <div className="card bg-gradient-to-br from-primary/10 to-base-200 border border-primary/20 shadow-sm">
              <div className="card-body p-4 gap-2">
                <p className="text-xs text-base-content/50 flex items-center gap-1">🏆 Eng yuqori score</p>
                <Link to={`/products/${bestProduct.product_id}`} className="font-bold text-sm leading-snug hover:text-primary transition-colors line-clamp-2">
                  {bestProduct.title}
                </Link>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-2xl font-bold text-primary tabular-nums">
                    {bestProduct.score?.toFixed(2) ?? '—'}
                  </span>
                  <TrendArrow trend={bestProduct.trend} />
                  {bestProduct.sell_price && (
                    <span className="text-xs text-base-content/50 ml-auto">
                      {bestProduct.sell_price.toLocaleString()} so'm
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          {mostActive && (
            <div className="card bg-gradient-to-br from-success/10 to-base-200 border border-success/20 shadow-sm">
              <div className="card-body p-4 gap-2">
                <p className="text-xs text-base-content/50 flex items-center gap-1">🔥 Eng faol mahsulot</p>
                <Link to={`/products/${mostActive.product_id}`} className="font-bold text-sm leading-snug hover:text-success transition-colors line-clamp-2">
                  {mostActive.title}
                </Link>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-2xl font-bold text-success tabular-nums">
                    {mostActive.weekly_bought?.toLocaleString() ?? '—'}
                  </span>
                  <span className="text-xs text-base-content/50">ta/hafta</span>
                  <TrendArrow trend={mostActive.trend} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Products table */}
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body p-0">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-base-300">
            <h2 className="card-title text-base gap-2">
              <FireIcon className="w-5 h-5 text-orange-400" />
              Kuzatilayotgan mahsulotlar
            </h2>
            <span className="badge badge-neutral">{products.length}</span>
          </div>

          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 px-4">
              <div className="w-16 h-16 rounded-full bg-base-300 flex items-center justify-center">
                <MagnifyingGlassIcon className="w-8 h-8 text-base-content/30" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-base-content/70">Hali mahsulot kuzatilmayapti</p>
                <p className="text-sm text-base-content/40 mt-1 max-w-xs">
                  Uzum mahsulot havolasini tahlil qiling — u avtomatik kuzatuvga qo'shiladi
                </p>
              </div>
              <div className="flex gap-2">
                <Link to="/analyze" className="btn btn-primary btn-sm">
                  <MagnifyingGlassIcon className="w-4 h-4" />
                  URL Tahlil
                </Link>
                <Link to="/discovery" className="btn btn-outline btn-sm">
                  <ArrowTrendingUpIcon className="w-4 h-4" />
                  Discovery
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra table-sm">
                <thead>
                  <tr>
                    <th>Mahsulot</th>
                    <th className="text-center">Score</th>
                    <th className="text-center">Trend</th>
                    <th className="text-right">Faollik/hafta</th>
                    <th className="text-right">Jami buyurtma</th>
                    <th className="text-right">Narx</th>
                    <th className="text-right">★</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {products
                    .slice()
                    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                    .map((p) => (
                      <tr key={p.product_id} className="hover">
                        <td>
                          <div className="max-w-sm">
                            <Link
                              to={`/products/${p.product_id}`}
                              className="font-medium truncate block hover:text-primary transition-colors"
                            >
                              {p.title}
                            </Link>
                            <p className="text-xs text-base-content/40">
                              #{p.product_id}
                              {p.feedback_quantity ? ` · ${p.feedback_quantity.toLocaleString()} sharh` : ''}
                            </p>
                          </div>
                        </td>
                        <td className="text-center"><ScoreBadge score={p.score} /></td>
                        <td className="text-center"><TrendArrow trend={p.trend} /></td>
                        <td className="text-right tabular-nums">
                          {p.weekly_bought != null ? (
                            <span className="text-success font-medium">{p.weekly_bought.toLocaleString()}</span>
                          ) : <span className="text-base-content/20">—</span>}
                        </td>
                        <td className="text-right tabular-nums text-sm">
                          {p.orders_quantity ? Number(p.orders_quantity).toLocaleString() : '—'}
                        </td>
                        <td className="text-right tabular-nums text-sm">
                          {p.sell_price != null ? (
                            <span className="text-accent font-medium">{p.sell_price.toLocaleString()}</span>
                          ) : <span className="text-base-content/20">—</span>}
                        </td>
                        <td className="text-right text-sm">
                          <span className="text-yellow-400">★</span>
                          <span className="ml-1">{p.rating ?? '—'}</span>
                        </td>
                        <td>
                          <Link to={`/products/${p.product_id}`} className="btn btn-ghost btn-xs whitespace-nowrap">
                            Ko'rish →
                          </Link>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
