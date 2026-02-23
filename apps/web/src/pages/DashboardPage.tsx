import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
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
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { productsApi, billingApi, exportApi } from '../api/client';
import {
  FireIcon,
  WalletIcon,
  ArrowTrendingUpIcon,
  MagnifyingGlassIcon,
} from '../components/icons';

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="badge badge-ghost badge-sm">—</span>;
  const cls = score >= 6 ? 'bg-success/15 text-success border-success/20' : score >= 4 ? 'bg-warning/15 text-warning border-warning/20' : 'bg-base-300 text-base-content/50 border-base-300';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold tabular-nums border ${cls}`}>{score.toFixed(2)}</span>;
}

function TrendArrow({ trend }: { trend: 'up' | 'flat' | 'down' | null }) {
  if (trend === 'up') return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-success/15 text-success text-xs font-bold">↗</span>;
  if (trend === 'down') return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-error/15 text-error text-xs font-bold">↘</span>;
  if (trend === 'flat') return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-base-300/50 text-base-content/30 text-xs">→</span>;
  return <span className="text-base-content/15">—</span>;
}

function scoreColor(score: number | null) {
  if (!score) return '#4b5563';
  if (score >= 6) return '#22c55e';
  if (score >= 4) return '#f59e0b';
  return '#6b7280';
}

const tooltipStyle = {
  background: 'rgba(15,23,42,0.95)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 12,
  fontSize: 12,
  backdropFilter: 'blur(8px)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [products, setProducts] = useState<TrackedProduct[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([
      productsApi.getTracked().then((r) => setProducts(r.data)),
      billingApi.getBalance().then((r) => setBalance(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <span className="loading loading-ring loading-lg text-primary" />
      </div>
    );
  }

  const paymentDue = balance?.status === 'PAYMENT_DUE';

  async function handleExportCsv() {
    setExporting(true);
    try {
      const res = await exportApi.exportProductsCsv();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {}
    finally { setExporting(false); }
  }

  // Computed stats
  const totalOrders = products.reduce((s, p) => s + (p.orders_quantity ? Number(p.orders_quantity) : 0), 0);
  const totalWeeklySales = products.reduce((s, p) => s + (p.weekly_bought ?? 0), 0);
  const avgScore = products.length > 0
    ? products.reduce((s, p) => s + (p.score ?? 0), 0) / products.length
    : 0;
  const rising = products.filter((p) => p.trend === 'up').length;
  const falling = products.filter((p) => p.trend === 'down').length;
  const flat = products.filter((p) => p.trend === 'flat').length;
  const bestProduct = [...products].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  const mostActive = [...products].sort((a, b) => (b.weekly_bought ?? 0) - (a.weekly_bought ?? 0))[0];

  // Chart data
  const scoreChartData = products
    .filter((p) => p.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 12)
    .map((p) => ({
      name: p.title.length > 22 ? p.title.slice(0, 22) + '…' : p.title,
      score: p.score ?? 0,
      prev: p.prev_score ?? 0,
      id: p.product_id,
    }));

  const activityChartData = products
    .filter((p) => p.weekly_bought !== null && p.weekly_bought > 0)
    .sort((a, b) => (b.weekly_bought ?? 0) - (a.weekly_bought ?? 0))
    .slice(0, 10)
    .map((p) => ({
      name: p.title.length > 16 ? p.title.slice(0, 16) + '…' : p.title,
      faollik: p.weekly_bought ?? 0,
      id: p.product_id,
    }));

  const trendPieData = [
    { name: "O'sayapti", value: rising, fill: '#22c55e' },
    { name: 'Barqaror', value: flat, fill: '#6b7280' },
    { name: 'Tushayapti', value: falling, fill: '#ef4444' },
  ].filter((d) => d.value > 0);

  // Score distribution for radial chart
  const scoreRadialData = [
    { name: 'Score', value: Math.round(avgScore * 10), fill: avgScore >= 6 ? '#22c55e' : avgScore >= 4 ? '#f59e0b' : '#6b7280' },
  ];

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-base-content/40 text-sm mt-0.5">Portfolio analitikasi va monitoring</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/discovery" className="btn btn-ghost btn-sm border border-base-300 gap-1.5">
            <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
            Discovery
          </Link>
          <button onClick={handleExportCsv} disabled={exporting || products.length === 0}
            className="btn btn-ghost btn-sm border border-base-300 gap-1.5">
            {exporting ? <span className="loading loading-spinner loading-xs" /> : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            )}
            CSV
          </button>
          <Link to="/analyze" className="btn btn-primary btn-sm gap-1.5">
            <MagnifyingGlassIcon className="w-3.5 h-3.5" />
            Tahlil
          </Link>
        </div>
      </div>

      {/* Payment alert */}
      {paymentDue && (
        <div className="bg-gradient-to-r from-error/10 via-error/5 to-transparent border border-error/20 rounded-2xl px-5 py-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-error/15 flex items-center justify-center shrink-0">
            <WalletIcon className="w-5 h-5 text-error" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm text-error">To'lov kerak!</p>
            <p className="text-xs text-base-content/50">Balansingiz yetarli emas. Hisobni to'ldiring.</p>
          </div>
          <button className="btn btn-error btn-sm">To'ldirish</button>
        </div>
      )}

      {/* Stats row — 4 col responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className={`rounded-2xl p-4 lg:p-5 transition-all ${paymentDue ? 'bg-gradient-to-br from-error/10 to-error/5 border border-error/20' : 'bg-base-200/60 border border-base-300/50'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-base-content/40 font-medium uppercase tracking-wider">Balans</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <WalletIcon className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className={`text-2xl lg:text-3xl font-bold tabular-nums ${paymentDue ? 'text-error' : ''}`}>
            {balance ? Number(balance.balance).toLocaleString() : '—'}
          </p>
          <p className="text-xs text-base-content/30 mt-1">so'm · {balance ? Number(balance.daily_fee).toLocaleString() : '—'}/kun</p>
        </div>

        <div className="rounded-2xl p-4 lg:p-5 bg-base-200/60 border border-base-300/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-base-content/40 font-medium uppercase tracking-wider">Kuzatuv</span>
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <ArrowTrendingUpIcon className="w-4 h-4 text-accent" />
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-bold">{products.length}</p>
          <p className="text-xs text-base-content/30 mt-1">mahsulot</p>
        </div>

        <div className="rounded-2xl p-4 lg:p-5 bg-base-200/60 border border-base-300/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-base-content/40 font-medium uppercase tracking-wider">Haftalik</span>
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-success">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-success">{totalWeeklySales.toLocaleString()}</p>
          <p className="text-xs text-base-content/30 mt-1">barcha mahsulot</p>
        </div>

        <div className="rounded-2xl p-4 lg:p-5 bg-base-200/60 border border-base-300/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-base-content/40 font-medium uppercase tracking-wider">O'rta Score</span>
            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-warning">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-warning">{avgScore.toFixed(2)}</p>
          <p className="text-xs text-base-content/30 mt-1">
            <span className="text-success">{rising}↗</span> · <span className="text-error">{falling}↘</span>
          </p>
        </div>
      </div>

      {/* Charts grid */}
      {products.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-5">

          {/* Score comparison — area chart */}
          <div className="xl:col-span-8 rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-sm">Score taqqoslama</h2>
                <p className="text-xs text-base-content/30">Top 12 mahsulot bo'yicha</p>
              </div>
              <span className="badge badge-sm bg-base-300/50 border-0 text-base-content/40">Recharts</span>
            </div>
            {scoreChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={scoreChartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.2)' }} tickLine={false} axisLine={false} domain={[0, 10]} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.45)' }} tickLine={false} axisLine={false} width={130} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v.toFixed(2), 'Score']} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={16}>
                    {scoreChartData.map((entry) => (
                      <Cell key={entry.id} fill={scoreColor(entry.score)} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-52 text-base-content/20 text-sm">Score ma'lumotlari yo'q</div>
            )}
          </div>

          {/* Right column: Trend pie + radial score + quick stats */}
          <div className="xl:col-span-4 flex flex-col gap-4 lg:gap-5">
            {/* Trend distribution — donut */}
            {trendPieData.length > 0 && (
              <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-5 flex-1">
                <h2 className="font-semibold text-sm mb-3">Trend taqsimoti</h2>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={trendPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value" strokeWidth={0}>
                      {trendPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2">
                  {trendPieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.fill }} />
                      <span className="text-base-content/50">{d.name}</span>
                      <span className="font-bold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Score gauge */}
            <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-5">
              <h2 className="font-semibold text-sm mb-2">O'rtacha score</h2>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={80} height={80}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" barSize={8} data={scoreRadialData} startAngle={180} endAngle={0}>
                    <RadialBar background={{ fill: 'rgba(255,255,255,0.04)' }} dataKey="value" cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div>
                  <p className={`text-3xl font-bold tabular-nums ${avgScore >= 6 ? 'text-success' : avgScore >= 4 ? 'text-warning' : 'text-base-content/50'}`}>
                    {avgScore.toFixed(2)}
                  </p>
                  <p className="text-xs text-base-content/30">/10.00</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity area chart — full width */}
      {activityChartData.length > 0 && (
        <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-sm">Haftalik faollik</h2>
              <p className="text-xs text-base-content/30">Top 10 mahsulot — so'nggi 7 kun</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={activityChartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v.toLocaleString(), 'Haftalik sotuvlar']} />
              <Area type="monotone" dataKey="faollik" stroke="#34d399" strokeWidth={2} fill="url(#activityGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top performers */}
      {products.length > 0 && (bestProduct || mostActive) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
          {bestProduct && (
            <div className="rounded-2xl bg-gradient-to-br from-primary/8 via-base-200/60 to-base-200/40 border border-primary/15 p-5 lg:p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-sm">🏆</div>
                <span className="text-xs text-base-content/40 font-medium uppercase tracking-wider">Eng yuqori score</span>
              </div>
              <Link to={`/products/${bestProduct.product_id}`} className="font-bold text-base leading-snug hover:text-primary transition-colors line-clamp-2">
                {bestProduct.title}
              </Link>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-3xl font-bold text-primary tabular-nums">
                  {bestProduct.score?.toFixed(2) ?? '—'}
                </span>
                <TrendArrow trend={bestProduct.trend} />
                {bestProduct.sell_price && (
                  <span className="text-xs text-base-content/40 ml-auto">
                    {bestProduct.sell_price.toLocaleString()} so'm
                  </span>
                )}
              </div>
            </div>
          )}
          {mostActive && (
            <div className="rounded-2xl bg-gradient-to-br from-success/8 via-base-200/60 to-base-200/40 border border-success/15 p-5 lg:p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center text-sm">🔥</div>
                <span className="text-xs text-base-content/40 font-medium uppercase tracking-wider">Eng faol</span>
              </div>
              <Link to={`/products/${mostActive.product_id}`} className="font-bold text-base leading-snug hover:text-success transition-colors line-clamp-2">
                {mostActive.title}
              </Link>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-3xl font-bold text-success tabular-nums">
                  {mostActive.weekly_bought?.toLocaleString() ?? '—'}
                </span>
                <span className="text-xs text-base-content/40">ta/hafta</span>
                <TrendArrow trend={mostActive.trend} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Products table */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-300/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <FireIcon className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Kuzatilayotgan mahsulotlar</h2>
              <p className="text-xs text-base-content/30">{products.length} ta mahsulot</p>
            </div>
          </div>
          <span className="badge badge-sm bg-base-300/50 border-0 tabular-nums">{products.length}</span>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <MagnifyingGlassIcon className="w-12 h-12 text-base-content/10" />
            <p className="text-base-content/40 text-sm">Hali mahsulot qo'shilmagan</p>
            <Link to="/analyze" className="btn btn-primary btn-sm">Birinchi tahlil</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr className="text-xs text-base-content/30 uppercase tracking-wider">
                  <th className="font-medium">Mahsulot</th>
                  <th className="font-medium text-center">Score</th>
                  <th className="font-medium text-center">Trend</th>
                  <th className="font-medium text-right">Haftalik</th>
                  <th className="font-medium text-right hidden md:table-cell">Buyurtma</th>
                  <th className="font-medium text-right">Narx</th>
                  <th className="font-medium text-right hidden sm:table-cell">Reyting</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products
                  .slice()
                  .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                  .map((p) => (
                    <tr key={p.product_id} className="hover:bg-base-300/20 transition-colors">
                      <td>
                        <div className="max-w-xs lg:max-w-md xl:max-w-lg">
                          <Link
                            to={`/products/${p.product_id}`}
                            className="font-medium text-sm truncate block hover:text-primary transition-colors"
                          >
                            {p.title}
                          </Link>
                          <p className="text-xs text-base-content/25 mt-0.5">
                            #{p.product_id}
                            {p.feedback_quantity ? ` · ${p.feedback_quantity.toLocaleString()} sharh` : ''}
                          </p>
                        </div>
                      </td>
                      <td className="text-center"><ScoreBadge score={p.score} /></td>
                      <td className="text-center"><TrendArrow trend={p.trend} /></td>
                      <td className="text-right tabular-nums">
                        {p.weekly_bought != null
                          ? <span className="text-success font-medium">{p.weekly_bought.toLocaleString()}</span>
                          : <span className="text-base-content/15">—</span>}
                      </td>
                      <td className="text-right tabular-nums text-sm hidden md:table-cell">
                        {p.orders_quantity ? Number(p.orders_quantity).toLocaleString() : '—'}
                      </td>
                      <td className="text-right tabular-nums text-sm">
                        {p.sell_price != null
                          ? <span className="text-accent font-medium">{p.sell_price.toLocaleString()}</span>
                          : <span className="text-base-content/15">—</span>}
                      </td>
                      <td className="text-right text-sm hidden sm:table-cell">
                        <span className="text-yellow-400/70">★</span>
                        <span className="ml-0.5 text-base-content/50">{p.rating ?? '—'}</span>
                      </td>
                      <td>
                        <Link to={`/products/${p.product_id}`} className="btn btn-ghost btn-xs opacity-50 hover:opacity-100 transition-opacity">
                          →
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
  );
}
