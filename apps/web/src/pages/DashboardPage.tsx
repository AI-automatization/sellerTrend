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
} from 'recharts';
import { productsApi, billingApi, exportApi, getTokenPayload } from '../api/client';
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
  const cls =
    score >= 6
      ? 'bg-success/15 text-success border-success/20'
      : score >= 4
        ? 'bg-warning/15 text-warning border-warning/20'
        : 'bg-base-300 text-base-content/50 border-base-300';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold tabular-nums border ${cls}`}>
      {score.toFixed(2)}
    </span>
  );
}

function TrendArrow({ trend }: { trend: 'up' | 'flat' | 'down' | null }) {
  if (trend === 'up')
    return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-success/15 text-success text-xs font-bold">↗</span>;
  if (trend === 'down')
    return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-error/15 text-error text-xs font-bold">↘</span>;
  if (trend === 'flat')
    return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-base-300/50 text-base-content/30 text-xs">→</span>;
  return <span className="text-base-content/15">—</span>;
}

function scoreColor(score: number | null) {
  if (!score) return '#4b5563';
  if (score >= 6) return '#22c55e';
  if (score >= 4) return '#f59e0b';
  return '#6b7280';
}

// Custom tooltip matching card design
function ChartTooltipContent({ active, payload, label, fmt }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-base-100/95 backdrop-blur-md border border-base-300/50 rounded-xl px-3.5 py-2.5 shadow-2xl min-w-[120px]">
      {label && <p className="text-[11px] text-base-content/40 mb-1.5 font-medium">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color || p.fill }} />
          <span className="text-sm font-bold tabular-nums">
            {fmt ? fmt(p.value, p.name) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [products, setProducts] = useState<TrackedProduct[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const isSuperAdmin = getTokenPayload()?.role === 'SUPER_ADMIN';

  useEffect(() => {
    const promises: Promise<any>[] = [productsApi.getTracked().then((r) => setProducts(r.data))];
    if (!isSuperAdmin) {
      promises.push(billingApi.getBalance().then((r) => setBalance(r.data)).catch(() => {}));
    }
    Promise.all(promises).finally(() => setLoading(false));
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
    } catch {} finally {
      setExporting(false);
    }
  }

  // ── Computed stats ──
  const totalWeeklySales = products.reduce((s, p) => s + (p.weekly_bought ?? 0), 0);
  const avgScore = products.length > 0 ? products.reduce((s, p) => s + (p.score ?? 0), 0) / products.length : 0;
  const rising = products.filter((p) => p.trend === 'up').length;
  const falling = products.filter((p) => p.trend === 'down').length;
  const flat = products.filter((p) => p.trend === 'flat').length;
  const bestProduct = [...products].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  const mostActive = [...products].sort((a, b) => (b.weekly_bought ?? 0) - (a.weekly_bought ?? 0))[0];

  // Portfolio health: 0-100
  const healthPct = products.length > 0
    ? Math.round(
        ((rising + flat * 0.5) / products.length) * 50 +
        (Math.min(avgScore, 10) / 10) * 50,
      )
    : 0;
  const healthColor = healthPct >= 70 ? 'text-success' : healthPct >= 40 ? 'text-warning' : 'text-error';
  const healthBg = healthPct >= 70 ? 'bg-success' : healthPct >= 40 ? 'bg-warning' : 'bg-error';

  // ── Chart data ──
  const scoreChartData = products
    .filter((p) => p.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 10)
    .map((p) => ({
      name: p.title.length > 20 ? p.title.slice(0, 20) + '…' : p.title,
      score: p.score ?? 0,
      id: p.product_id,
    }));

  const activityChartData = products
    .filter((p) => p.weekly_bought !== null && p.weekly_bought > 0)
    .sort((a, b) => (b.weekly_bought ?? 0) - (a.weekly_bought ?? 0))
    .slice(0, 10)
    .map((p) => ({
      name: p.title.length > 14 ? p.title.slice(0, 14) + '…' : p.title,
      sotuvlar: p.weekly_bought ?? 0,
      id: p.product_id,
    }));

  const trendPieData = [
    { name: "O'sayapti", value: rising, fill: '#22c55e' },
    { name: 'Barqaror', value: flat, fill: '#6b7280' },
    { name: 'Tushayapti', value: falling, fill: '#ef4444' },
  ].filter((d) => d.value > 0);

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 6 ? 'Xayrli tun' : hour < 12 ? 'Xayrli tong' : hour < 18 ? 'Xayrli kun' : 'Xayrli kech';

  return (
    <div className="space-y-5 w-full">

      {/* ═══════════════ HEADER ═══════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-base-content/35 font-medium">{greeting}</p>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight font-heading mt-0.5">Dashboard</h1>
          <p className="text-base-content/35 text-sm mt-1">
            {products.length > 0 ? (
              <>
                <span className="text-base-content/60 font-medium">{products.length}</span> ta mahsulot kuzatilmoqda
                {rising > 0 && <> · <span className="text-success font-medium">{rising} ta o'sishda</span></>}
                {falling > 0 && <> · <span className="text-error font-medium">{falling} ta tushishda</span></>}
              </>
            ) : (
              'Portfolio analitikasi va monitoring'
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/discovery" className="btn btn-ghost btn-sm border border-base-300/60 gap-1.5 hover:border-primary/30 transition-colors">
            <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
            Discovery
          </Link>
          <button
            onClick={handleExportCsv}
            disabled={exporting || products.length === 0}
            className="btn btn-ghost btn-sm border border-base-300/60 gap-1.5 hover:border-primary/30 transition-colors"
          >
            {exporting ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            )}
            CSV
          </button>
          <Link to="/analyze" className="btn btn-primary btn-sm gap-1.5 shadow-sm shadow-primary/20">
            <MagnifyingGlassIcon className="w-3.5 h-3.5" />
            Tahlil
          </Link>
        </div>
      </div>

      {/* ═══════════════ PAYMENT ALERT ═══════════════ */}
      {paymentDue && !isSuperAdmin && (
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

      {/* ═══════════════ KPI CARDS ═══════════════ */}
      <div className={`grid grid-cols-2 ${isSuperAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} gap-3`}>
        {/* Balans */}
        {!isSuperAdmin && (
          <div className={`relative rounded-2xl p-4 lg:p-5 overflow-hidden transition-all duration-300 ${
            paymentDue
              ? 'bg-gradient-to-br from-error/10 to-error/5 border border-error/20 hover:border-error/40'
              : 'bg-base-200/60 border border-base-300/50 hover:border-primary/30'
          }`}>
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary via-primary/60 to-primary/10" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-base-content/40 font-bold uppercase tracking-widest">Balans</span>
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <WalletIcon className="w-3.5 h-3.5 text-primary" />
              </div>
            </div>
            <p className={`text-xl lg:text-2xl font-bold tabular-nums tracking-tight ${paymentDue ? 'text-error' : ''}`}>
              {balance ? Number(balance.balance).toLocaleString() : '—'}
            </p>
            <p className="text-[11px] text-base-content/30 mt-1.5 tabular-nums">
              so'm · <span className="text-base-content/50">{balance ? Number(balance.daily_fee).toLocaleString() : '—'}</span>/kun
            </p>
          </div>
        )}

        {/* Kuzatuv */}
        <div className="relative rounded-2xl p-4 lg:p-5 bg-base-200/60 border border-base-300/50 overflow-hidden hover:border-accent/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-accent via-accent/60 to-accent/10" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-base-content/40 font-bold uppercase tracking-widest">Kuzatuv</span>
            <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
              <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-accent" />
            </div>
          </div>
          <p className="text-xl lg:text-2xl font-bold tabular-nums tracking-tight">{products.length}</p>
          <p className="text-[11px] text-base-content/30 mt-1.5">mahsulot</p>
        </div>

        {/* Haftalik */}
        <div className="relative rounded-2xl p-4 lg:p-5 bg-base-200/60 border border-base-300/50 overflow-hidden hover:border-success/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-success via-success/60 to-success/10" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-base-content/40 font-bold uppercase tracking-widest">Haftalik</span>
            <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-success">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </div>
          </div>
          <p className="text-xl lg:text-2xl font-bold tabular-nums tracking-tight text-success">{totalWeeklySales.toLocaleString()}</p>
          <p className="text-[11px] text-base-content/30 mt-1.5">ta/hafta barcha mahsulot</p>
        </div>

        {/* O'rta Score */}
        <div className="relative rounded-2xl p-4 lg:p-5 bg-base-200/60 border border-base-300/50 overflow-hidden hover:border-warning/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-warning via-warning/60 to-warning/10" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-base-content/40 font-bold uppercase tracking-widest">O'rta Score</span>
            <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-warning">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </div>
          </div>
          <p className={`text-xl lg:text-2xl font-bold tabular-nums tracking-tight ${avgScore >= 6 ? 'text-success' : avgScore >= 4 ? 'text-warning' : 'text-base-content/50'}`}>
            {avgScore.toFixed(2)}
          </p>
          <p className="text-[11px] text-base-content/30 mt-1.5">
            <span className="text-success font-medium">{rising}↗</span> · <span className="text-error font-medium">{falling}↘</span>
          </p>
        </div>

        {/* Portfolio Salomatligi */}
        <div className="relative rounded-2xl p-4 lg:p-5 bg-base-200/60 border border-base-300/50 overflow-hidden hover:border-info/30 transition-all duration-300 col-span-2 lg:col-span-1">
          <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${healthPct >= 70 ? 'from-success via-success/60 to-success/10' : healthPct >= 40 ? 'from-warning via-warning/60 to-warning/10' : 'from-error via-error/60 to-error/10'}`} />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-base-content/40 font-bold uppercase tracking-widest">Salomatlik</span>
            <div className="w-7 h-7 rounded-lg bg-info/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-info">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </div>
          </div>
          <p className={`text-xl lg:text-2xl font-bold tabular-nums tracking-tight ${healthColor}`}>
            {healthPct}%
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-base-300/50 overflow-hidden">
            <div
              className={`h-full rounded-full ${healthBg} transition-all duration-700 ease-out`}
              style={{ width: `${healthPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ═══════════════ CHARTS ═══════════════ */}
      {products.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-5">

          {/* Score comparison — horizontal bar */}
          <div className="xl:col-span-8 rounded-2xl bg-base-200/60 border border-base-300/50 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-base-300/30 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-sm">Score taqqoslama</h2>
                <p className="text-[11px] text-base-content/30 mt-0.5">Top {scoreChartData.length} mahsulot bo'yicha</p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-base-content/30">
                <span className="w-2 h-2 rounded-full bg-success/60" /> 6+
                <span className="w-2 h-2 rounded-full bg-warning/60 ml-1" /> 4-6
                <span className="w-2 h-2 rounded-full bg-base-content/20 ml-1" /> &lt;4
              </div>
            </div>
            <div className="p-4 lg:p-5">
              {scoreChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={scoreChartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} domain={[0, 10]} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} width={140} />
                    <Tooltip content={<ChartTooltipContent fmt={(v: number) => v.toFixed(2) + ' / 10.00'} />} cursor={{ fill: 'var(--chart-cursor)' }} />
                    <Bar dataKey="score" radius={[0, 8, 8, 0]} barSize={18} animationDuration={800}>
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
          </div>

          {/* Right column: Trend donut + Score summary */}
          <div className="xl:col-span-4 flex flex-col gap-4 lg:gap-5">
            {/* Trend distribution donut */}
            <div className="rounded-2xl bg-base-200/60 border border-base-300/50 overflow-hidden flex-1">
              <div className="px-5 py-3.5 border-b border-base-300/30">
                <h2 className="font-semibold text-sm">Trend taqsimoti</h2>
                <p className="text-[11px] text-base-content/30 mt-0.5">{products.length} ta mahsulot</p>
              </div>
              <div className="p-4">
                {trendPieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={trendPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={72}
                          paddingAngle={4}
                          dataKey="value"
                          strokeWidth={0}
                          animationDuration={800}
                        >
                          {trendPieData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltipContent />} />
                        {/* Center label */}
                        <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central" className="fill-base-content text-2xl font-bold">
                          {products.length}
                        </text>
                        <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central" className="fill-base-content/30 text-[10px]">
                          mahsulot
                        </text>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-1">
                      {trendPieData.map((d) => (
                        <div key={d.name} className="flex items-center gap-1.5 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                          <span className="text-base-content/50">{d.name}</span>
                          <span className="font-bold tabular-nums">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-40 text-base-content/20 text-sm">Trend ma'lumoti yo'q</div>
                )}
              </div>
            </div>

            {/* Average score card */}
            <div className="rounded-2xl bg-base-200/60 border border-base-300/50 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-base-300/30">
                <h2 className="font-semibold text-sm">O'rtacha score</h2>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-5">
                  {/* Score ring */}
                  <div className="relative w-20 h-20 shrink-0">
                    <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                      <circle cx="40" cy="40" r="32" fill="none" stroke="var(--chart-grid, oklch(0.7 0 0 / 0.12))" strokeWidth="8" />
                      <circle
                        cx="40" cy="40" r="32"
                        fill="none"
                        stroke={scoreColor(avgScore)}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${(avgScore / 10) * 201} 201`}
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-lg font-bold tabular-nums ${avgScore >= 6 ? 'text-success' : avgScore >= 4 ? 'text-warning' : 'text-base-content/50'}`}>
                        {avgScore.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-base-content/40">Eng yuqori</span>
                      <span className="font-bold text-success tabular-nums">{bestProduct?.score?.toFixed(2) ?? '—'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-base-content/40">O'rtacha</span>
                      <span className="font-bold tabular-nums">{avgScore.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-base-content/40">Eng past</span>
                      <span className="font-bold text-base-content/40 tabular-nums">
                        {products.length > 0 ? Math.min(...products.map((p) => p.score ?? 0)).toFixed(2) : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ ACTIVITY AREA CHART ═══════════════ */}
      {activityChartData.length > 0 && (
        <div className="rounded-2xl bg-base-200/60 border border-base-300/50 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-base-300/30 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm">Haftalik sotuvlar</h2>
              <p className="text-[11px] text-base-content/30 mt-0.5">Top {activityChartData.length} mahsulot — so'nggi 7 kun</p>
            </div>
            <span className="text-xs font-mono text-success font-medium tabular-nums">{totalWeeklySales.toLocaleString()} ta jami</span>
          </div>
          <div className="p-4 lg:p-5">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={activityChartData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltipContent fmt={(v: number) => v.toLocaleString() + ' ta/hafta'} />} />
                <Area
                  type="monotone"
                  dataKey="sotuvlar"
                  stroke="#22c55e"
                  strokeWidth={2.5}
                  fill="url(#actGrad)"
                  dot={{ r: 4, fill: '#22c55e', strokeWidth: 2, stroke: 'var(--fallback-b1, oklch(0.253267 0.015896 252.418))' }}
                  activeDot={{ r: 6, fill: '#22c55e', strokeWidth: 2 }}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══════════════ HERO PRODUCT CARDS ═══════════════ */}
      {products.length > 0 && (bestProduct || mostActive) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
          {bestProduct && (
            <div className="group relative rounded-2xl bg-gradient-to-br from-primary/8 via-base-200/60 to-base-200/40 border border-primary/15 p-5 lg:p-6 overflow-hidden hover:border-primary/30 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
              <div className="relative">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center text-sm shadow-sm">🏆</div>
                  <span className="text-[10px] text-base-content/40 font-bold uppercase tracking-widest">Eng yuqori score</span>
                </div>
                <Link to={`/products/${bestProduct.product_id}`} className="font-bold text-base leading-snug hover:text-primary transition-colors line-clamp-2">
                  {bestProduct.title}
                </Link>
                <div className="flex items-center gap-3 mt-3.5">
                  <span className="text-3xl font-bold text-primary tabular-nums tracking-tight">
                    {bestProduct.score?.toFixed(2) ?? '—'}
                  </span>
                  <TrendArrow trend={bestProduct.trend} />
                  {bestProduct.sell_price && (
                    <span className="text-xs text-base-content/35 ml-auto tabular-nums font-medium">
                      {bestProduct.sell_price.toLocaleString()} so'm
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          {mostActive && (
            <div className="group relative rounded-2xl bg-gradient-to-br from-success/8 via-base-200/60 to-base-200/40 border border-success/15 p-5 lg:p-6 overflow-hidden hover:border-success/30 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-success/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
              <div className="relative">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-success/15 flex items-center justify-center text-sm shadow-sm">🔥</div>
                  <span className="text-[10px] text-base-content/40 font-bold uppercase tracking-widest">Eng faol</span>
                </div>
                <Link to={`/products/${mostActive.product_id}`} className="font-bold text-base leading-snug hover:text-success transition-colors line-clamp-2">
                  {mostActive.title}
                </Link>
                <div className="flex items-center gap-3 mt-3.5">
                  <span className="text-3xl font-bold text-success tabular-nums tracking-tight">
                    {mostActive.weekly_bought?.toLocaleString() ?? '—'}
                  </span>
                  <span className="text-xs text-base-content/40">ta/hafta</span>
                  <TrendArrow trend={mostActive.trend} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ PRODUCTS TABLE ═══════════════ */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-base-300/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <FireIcon className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Kuzatilayotgan mahsulotlar</h2>
              <p className="text-[11px] text-base-content/30">{products.length} ta mahsulot</p>
            </div>
          </div>
          <span className="inline-flex items-center justify-center min-w-[1.5rem] px-2 py-0.5 rounded-lg bg-base-300/50 text-xs font-bold tabular-nums text-base-content/50">
            {products.length}
          </span>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-base-300/30 flex items-center justify-center">
              <MagnifyingGlassIcon className="w-8 h-8 text-base-content/15" />
            </div>
            <div className="text-center">
              <p className="text-base-content/50 text-sm font-medium">Hali mahsulot qo'shilmagan</p>
              <p className="text-base-content/25 text-xs mt-1">Uzum URL'ni tahlil qilib birinchi mahsulotingizni qo'shing</p>
            </div>
            <Link to="/analyze" className="btn btn-primary btn-sm gap-1.5 mt-1">
              <MagnifyingGlassIcon className="w-3.5 h-3.5" />
              Birinchi tahlil
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr className="bg-base-300/20 text-[10px] text-base-content/35 uppercase tracking-widest">
                  <th className="font-bold">Mahsulot</th>
                  <th className="font-bold text-center">Score</th>
                  <th className="font-bold text-center">Trend</th>
                  <th className="font-bold text-right">Haftalik</th>
                  <th className="font-bold text-right hidden md:table-cell">Buyurtma</th>
                  <th className="font-bold text-right">Narx</th>
                  <th className="font-bold text-right hidden sm:table-cell">Reyting</th>
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
                          <p className="text-[11px] text-base-content/25 mt-0.5 tabular-nums">
                            #{p.product_id}
                            {p.feedback_quantity ? ` · ${p.feedback_quantity.toLocaleString()} sharh` : ''}
                          </p>
                        </div>
                      </td>
                      <td className="text-center">
                        <ScoreBadge score={p.score} />
                      </td>
                      <td className="text-center">
                        <TrendArrow trend={p.trend} />
                      </td>
                      <td className="text-right tabular-nums">
                        {p.weekly_bought != null ? (
                          <span className="text-success font-medium">{p.weekly_bought.toLocaleString()}</span>
                        ) : (
                          <span className="text-base-content/15">—</span>
                        )}
                      </td>
                      <td className="text-right tabular-nums text-sm hidden md:table-cell">
                        {p.orders_quantity ? Number(p.orders_quantity).toLocaleString() : '—'}
                      </td>
                      <td className="text-right tabular-nums text-sm">
                        {p.sell_price != null ? (
                          <span className="text-accent font-medium">{p.sell_price.toLocaleString()}</span>
                        ) : (
                          <span className="text-base-content/15">—</span>
                        )}
                      </td>
                      <td className="text-right text-sm hidden sm:table-cell">
                        <span className="text-yellow-400/70">★</span>
                        <span className="ml-0.5 text-base-content/50">{p.rating ?? '—'}</span>
                      </td>
                      <td>
                        <Link to={`/products/${p.product_id}`} className="btn btn-ghost btn-xs opacity-40 hover:opacity-100 transition-opacity">
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
