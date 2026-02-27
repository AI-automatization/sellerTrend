import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import { productsApi, billingApi, exportApi, getTokenPayload } from '../api/client';
import { logError } from '../utils/handleError';
import type { TrackedProduct, Balance } from '../api/types';
import { scoreColor } from '../utils/formatters';
import {
  FireIcon, WalletIcon, ArrowTrendingUpIcon, MagnifyingGlassIcon,
} from '../components/icons';
import { useI18n } from '../i18n/I18nContext';
import {
  AnimatedNumber, MiniSparkline, ScorePill, TrendChip, GlassTooltip, FadeIn,
} from '../components/dashboard';

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [products, setProducts] = useState<TrackedProduct[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [sortKey, setSortKey] = useState<'score' | 'weekly' | 'price'>('score');
  const isSuperAdmin = getTokenPayload()?.role === 'SUPER_ADMIN';
  const { t } = useI18n();
  const location = useLocation();

  const fetchData = useCallback(() => {
    setLoading(true);
    const promises: Promise<unknown>[] = [productsApi.getTracked().then((r) => setProducts(r.data))];
    if (!isSuperAdmin) {
      promises.push(billingApi.getBalance().then((r) => setBalance(r.data)).catch(logError));
    }
    Promise.all(promises).finally(() => setLoading(false));
  }, [isSuperAdmin]);

  // Refetch when navigating to dashboard (location.key changes on each navigation)
  useEffect(() => {
    fetchData();
  }, [location.key, fetchData]);

  // ── Computed ──
  const stats = useMemo(() => {
    const totalWeekly = products.reduce((s, p) => s + (p.weekly_bought ?? 0), 0);
    const avgScore = products.length > 0 ? products.reduce((s, p) => s + (p.score ?? 0), 0) / products.length : 0;
    const rising = products.filter((p) => p.trend === 'up').length;
    const falling = products.filter((p) => p.trend === 'down').length;
    const flat = products.filter((p) => p.trend === 'flat').length;
    const best = [...products].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
    const mostActive = [...products].sort((a, b) => (b.weekly_bought ?? 0) - (a.weekly_bought ?? 0))[0];
    const healthPct = products.length > 0
      ? Math.round(((rising + flat * 0.5) / products.length) * 50 + (Math.min(avgScore, 10) / 10) * 50)
      : 0;
    const totalRevenue = products.reduce((s, p) => s + (p.weekly_bought ?? 0) * (p.sell_price ?? 0), 0);
    return { totalWeekly, avgScore, rising, falling, flat, best, mostActive, healthPct, totalRevenue };
  }, [products]);

  const sortedProducts = useMemo(() => {
    const sorted = [...products];
    if (sortKey === 'score') sorted.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    else if (sortKey === 'weekly') sorted.sort((a, b) => (b.weekly_bought ?? 0) - (a.weekly_bought ?? 0));
    else sorted.sort((a, b) => (b.sell_price ?? 0) - (a.sell_price ?? 0));
    return sorted;
  }, [products, sortKey]);

  const scoreChartData = useMemo(() =>
    products
      .filter((p) => p.score !== null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 12)
      .map((p) => ({
        name: p.title.length > 18 ? p.title.slice(0, 18) + '…' : p.title,
        score: p.score ?? 0,
        id: p.product_id,
      })),
    [products],
  );

  const activityData = useMemo(() =>
    products
      .filter((p) => p.weekly_bought != null && p.weekly_bought > 0)
      .sort((a, b) => (b.weekly_bought ?? 0) - (a.weekly_bought ?? 0))
      .slice(0, 10)
      .map((p) => ({
        name: p.title.length > 12 ? p.title.slice(0, 12) + '…' : p.title,
        sales: p.weekly_bought ?? 0,
      })),
    [products],
  );

  const trendPieData = useMemo(() =>
    [
      { name: t('dashboard.trendUp'), value: stats.rising, fill: '#22c55e' },
      { name: t('dashboard.trendStable'), value: stats.flat, fill: '#4b5563' },
      { name: t('dashboard.trendDown'), value: stats.falling, fill: '#ef4444' },
    ].filter((d) => d.value > 0),
    [stats, t],
  );

  // fake sparkline data from scores (just for visual)
  const scoreSparkline = products.slice(0, 8).map((p) => p.score ?? 0);
  const salesSparkline = products.slice(0, 8).map((p) => p.weekly_bought ?? 0);

  const paymentDue = balance?.status === 'PAYMENT_DUE';
  const hour = new Date().getHours();
  const greeting = hour < 6 ? t('greeting.night') : hour < 12 ? t('greeting.morning') : hour < 18 ? t('greeting.day') : t('greeting.evening');

  async function handleExportCsv() {
    setExporting(true);
    try {
      const res = await exportApi.exportProductsCsv();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `ventra-products-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {} finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <div className="relative">
          <span className="loading loading-ring loading-lg text-primary" />
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/10" />
        </div>
        <p className="text-xs text-base-content/30 animate-pulse">{t('dashboard.loadingPortfolio')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* ═══ HEADER ═══ */}
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs text-base-content/30 font-medium tracking-wide uppercase">{greeting}</p>
            <h1 className="text-2xl lg:text-[28px] font-bold tracking-tight font-heading mt-1 leading-tight">
              {t('dashboard.portfolioOverview')}
            </h1>
            <p className="text-sm text-base-content/35 mt-1.5">
              {products.length > 0 ? (
                <>
                  <span className="text-base-content/60 font-semibold">{products.length}</span> {t('dashboard.products')}
                  {stats.rising > 0 && <> · <span className="text-success">{stats.rising} {t('dashboard.rising')}</span></>}
                  {stats.falling > 0 && <> · <span className="text-error">{stats.falling} {t('dashboard.falling')}</span></>}
                </>
              ) : t('dashboard.analyticsCenter')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/discovery" className="btn btn-ghost btn-sm border border-base-300/40 gap-1.5 hover:border-primary/20 transition-all text-xs">
              <ArrowTrendingUpIcon className="w-3.5 h-3.5" /> Discovery
            </Link>
            <button onClick={handleExportCsv} disabled={exporting || products.length === 0}
              className="btn btn-ghost btn-sm border border-base-300/40 gap-1.5 hover:border-primary/20 transition-all text-xs">
              {exporting ? <span className="loading loading-spinner loading-xs" /> : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              )} CSV
            </button>
            <Link to="/analyze" className="btn btn-primary btn-sm gap-1.5 shadow-md shadow-primary/15 text-xs">
              <MagnifyingGlassIcon className="w-3.5 h-3.5" /> {t('analyze.button')}
            </Link>
          </div>
        </div>
      </FadeIn>

      {/* ═══ PAYMENT ALERT ═══ */}
      {paymentDue && !isSuperAdmin && (
        <FadeIn delay={50}>
          <div className="relative overflow-hidden bg-gradient-to-r from-error/8 via-error/4 to-transparent border border-error/15 rounded-2xl px-5 py-4 flex items-center gap-4">
            <div className="absolute -left-4 -top-4 w-24 h-24 bg-error/5 rounded-full blur-2xl" />
            <div className="w-11 h-11 rounded-xl bg-error/10 flex items-center justify-center shrink-0 relative">
              <WalletIcon className="w-5 h-5 text-error" />
            </div>
            <div className="flex-1 relative">
              <p className="font-bold text-sm text-error">{t('dashboard.paymentRequired')}</p>
              <p className="text-xs text-base-content/45 mt-0.5">{t('dashboard.paymentDesc')}</p>
            </div>
            <button className="btn btn-error btn-sm shadow-sm">{t('dashboard.topUp')}</button>
          </div>
        </FadeIn>
      )}

      {/* ═══ KPI CARDS ═══ */}
      <div className={`grid grid-cols-2 ${isSuperAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} gap-3 lg:gap-4`}>
        {/* Balans */}
        {!isSuperAdmin && (
          <FadeIn delay={80} className="group">
            <div className={`relative h-full rounded-2xl p-4 lg:p-5 overflow-hidden ventra-card ${
              paymentDue
                ? 'bg-gradient-to-br from-error/8 to-error/3 border border-error/15'
                : 'bg-base-200/50 border border-base-300/40'
            }`}>
              <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-primary via-primary/40 to-transparent" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] text-base-content/30 font-bold uppercase tracking-[0.15em]">{t('dashboard.balance')}</span>
                <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <WalletIcon className="w-3.5 h-3.5 text-primary/70" />
                </div>
              </div>
              <p className={`text-xl lg:text-2xl font-bold tabular-nums tracking-tight ${paymentDue ? 'text-error' : ''}`}>
                {balance ? <AnimatedNumber value={Number(balance.balance)} /> : '—'}
              </p>
              <p className="text-[10px] text-base-content/25 mt-2 tabular-nums">
                so'm · {balance ? Number(balance.daily_fee).toLocaleString() : '—'}/kun
              </p>
            </div>
          </FadeIn>
        )}

        {/* Kuzatuv */}
        <FadeIn delay={120} className="group">
          <div className="relative h-full rounded-2xl p-4 lg:p-5 bg-base-200/50 border border-base-300/40 overflow-hidden ventra-card">
            <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-accent via-accent/40 to-transparent" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] text-base-content/30 font-bold uppercase tracking-[0.15em]">{t('dashboard.productsCount')}</span>
              <div className="w-7 h-7 rounded-lg bg-accent/8 flex items-center justify-center group-hover:bg-accent/15 transition-colors">
                <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-accent/70" />
              </div>
            </div>
            <p className="text-xl lg:text-2xl font-bold tabular-nums tracking-tight">
              <AnimatedNumber value={products.length} />
            </p>
            <div className="mt-2 opacity-40">
              <MiniSparkline data={scoreSparkline} color="var(--color-accent)" height={24} />
            </div>
          </div>
        </FadeIn>

        {/* Haftalik */}
        <FadeIn delay={160} className="group">
          <div className="relative h-full rounded-2xl p-4 lg:p-5 bg-base-200/50 border border-base-300/40 overflow-hidden ventra-card">
            <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-success via-success/40 to-transparent" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] text-base-content/30 font-bold uppercase tracking-[0.15em]">{t('dashboard.weeklySales')}</span>
              <div className="w-7 h-7 rounded-lg bg-success/8 flex items-center justify-center group-hover:bg-success/15 transition-colors">
                <svg className="w-3.5 h-3.5 text-success/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
              </div>
            </div>
            <p className="text-xl lg:text-2xl font-bold tabular-nums tracking-tight text-success">
              <AnimatedNumber value={stats.totalWeekly} />
            </p>
            <div className="mt-2 opacity-40">
              <MiniSparkline data={salesSparkline} color="#22c55e" height={24} />
            </div>
          </div>
        </FadeIn>

        {/* O'rta Score */}
        <FadeIn delay={200} className="group">
          <div className="relative h-full rounded-2xl p-4 lg:p-5 bg-base-200/50 border border-base-300/40 overflow-hidden ventra-card">
            <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-warning via-warning/40 to-transparent" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] text-base-content/30 font-bold uppercase tracking-[0.15em]">{t('dashboard.avgScore')}</span>
              <div className="w-7 h-7 rounded-lg bg-warning/8 flex items-center justify-center group-hover:bg-warning/15 transition-colors">
                <svg className="w-3.5 h-3.5 text-warning/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </div>
            </div>
            <p className={`text-xl lg:text-2xl font-bold tabular-nums tracking-tight ${stats.avgScore >= 6 ? 'text-success' : stats.avgScore >= 4 ? 'text-warning' : 'text-base-content/40'}`}>
              <AnimatedNumber value={stats.avgScore} decimals={2} />
            </p>
            <p className="text-[10px] text-base-content/25 mt-2">
              <span className="text-success">{stats.rising}↗</span>{' '}
              <span className="text-error">{stats.falling}↘</span>{' '}
              <span className="text-base-content/20">{stats.flat}→</span>
            </p>
          </div>
        </FadeIn>

        {/* Portfolio salomatligi */}
        <FadeIn delay={240} className="group col-span-2 lg:col-span-1">
          <div className="relative h-full rounded-2xl p-4 lg:p-5 bg-base-200/50 border border-base-300/40 overflow-hidden ventra-card">
            <div className={`absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b ${
              stats.healthPct >= 70 ? 'from-success via-success/40 to-transparent'
              : stats.healthPct >= 40 ? 'from-warning via-warning/40 to-transparent'
              : 'from-error via-error/40 to-transparent'
            }`} />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] text-base-content/30 font-bold uppercase tracking-[0.15em]">{t('dashboard.health')}</span>
              <div className="w-7 h-7 rounded-lg bg-info/8 flex items-center justify-center group-hover:bg-info/15 transition-colors">
                <svg className="w-3.5 h-3.5 text-info/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
            </div>
            <p className={`text-xl lg:text-2xl font-bold tabular-nums tracking-tight ${
              stats.healthPct >= 70 ? 'text-success' : stats.healthPct >= 40 ? 'text-warning' : 'text-error'
            }`}>
              <AnimatedNumber value={stats.healthPct} />%
            </p>
            <div className="mt-2.5 h-1 rounded-full bg-base-300/30 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                  stats.healthPct >= 70 ? 'bg-success' : stats.healthPct >= 40 ? 'bg-warning' : 'bg-error'
                }`}
                style={{ width: `${stats.healthPct}%` }}
              />
            </div>
          </div>
        </FadeIn>
      </div>

      {/* ═══ HERO CARDS (best + most active) ═══ */}
      {products.length > 0 && (stats.best || stats.mostActive) && (
        <FadeIn delay={280}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.best && (
              <div className="group relative rounded-2xl overflow-hidden ventra-card border border-primary/10 bg-gradient-to-br from-primary/5 via-base-200/60 to-base-200/30">
                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/4 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl group-hover:scale-125 transition-transform duration-700" />
                <div className="relative p-5 lg:p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-sm">🏆</span>
                    <span className="text-[9px] text-base-content/30 font-bold uppercase tracking-[0.15em]">{t('dashboard.bestScore')}</span>
                  </div>
                  <Link to={`/products/${stats.best.product_id}`}
                    className="font-bold text-[15px] leading-snug hover:text-primary transition-colors line-clamp-2 block">
                    {stats.best.title}
                  </Link>
                  <div className="flex items-center gap-3 mt-4">
                    <span className="text-3xl font-bold text-primary tabular-nums tracking-tight font-heading">
                      {stats.best.score?.toFixed(2) ?? '—'}
                    </span>
                    <TrendChip trend={stats.best.trend} />
                    {stats.best.sell_price && (
                      <span className="text-xs text-base-content/30 ml-auto tabular-nums">
                        {stats.best.sell_price.toLocaleString()} so'm
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            {stats.mostActive && (
              <div className="group relative rounded-2xl overflow-hidden ventra-card border border-success/10 bg-gradient-to-br from-success/5 via-base-200/60 to-base-200/30">
                <div className="absolute top-0 right-0 w-40 h-40 bg-success/4 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl group-hover:scale-125 transition-transform duration-700" />
                <div className="relative p-5 lg:p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center text-sm">🔥</span>
                    <span className="text-[9px] text-base-content/30 font-bold uppercase tracking-[0.15em]">{t('dashboard.mostActive')}</span>
                  </div>
                  <Link to={`/products/${stats.mostActive.product_id}`}
                    className="font-bold text-[15px] leading-snug hover:text-success transition-colors line-clamp-2 block">
                    {stats.mostActive.title}
                  </Link>
                  <div className="flex items-center gap-3 mt-4">
                    <span className="text-3xl font-bold text-success tabular-nums tracking-tight font-heading">
                      {stats.mostActive.weekly_bought?.toLocaleString() ?? '—'}
                    </span>
                    <span className="text-xs text-base-content/30">{t('dashboard.perWeek')}</span>
                    <TrendChip trend={stats.mostActive.trend} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </FadeIn>
      )}

      {/* ═══ CHARTS SECTION ═══ */}
      {products.length > 0 && (
        <FadeIn delay={320}>
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            {/* Score comparison — horizontal bar */}
            <div className="xl:col-span-8 rounded-2xl bg-base-200/50 border border-base-300/40 overflow-hidden ventra-card">
              <div className="px-5 py-4 border-b border-base-300/20 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-sm font-heading">{t('dashboard.scoreRating')}</h2>
                  <p className="text-[10px] text-base-content/25 mt-0.5">Top {scoreChartData.length} {t('dashboard.products')}</p>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-base-content/25">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success/60" />6+</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning/60" />4-6</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-base-content/15" />&lt;4</span>
                </div>
              </div>
              <div className="p-4 lg:p-5">
                {scoreChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(260, scoreChartData.length * 30)}>
                    <BarChart data={scoreChartData} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} domain={[0, 10]} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} width={130} />
                      <Tooltip content={<GlassTooltip fmt={(v: number) => v.toFixed(2) + ' / 10'} />} cursor={{ fill: 'var(--chart-cursor)' }} />
                      <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={16} animationDuration={800}>
                        {scoreChartData.map((entry) => (
                          <Cell key={entry.id} fill={scoreColor(entry.score)} fillOpacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-48 text-base-content/15 text-sm">{t('common.noData')}</div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="xl:col-span-4 flex flex-col gap-4">
              {/* Trend donut */}
              <div className="rounded-2xl bg-base-200/50 border border-base-300/40 overflow-hidden ventra-card flex-1">
                <div className="px-5 py-4 border-b border-base-300/20">
                  <h2 className="font-semibold text-sm font-heading">{t('dashboard.trendDistribution')}</h2>
                  <p className="text-[10px] text-base-content/25 mt-0.5">{products.length} {t('dashboard.products')}</p>
                </div>
                <div className="p-4">
                  {trendPieData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={170}>
                        <PieChart>
                          <Pie data={trendPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70}
                            paddingAngle={3} dataKey="value" strokeWidth={0} animationDuration={800}>
                            {trendPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          </Pie>
                          <Tooltip content={<GlassTooltip />} />
                          <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central" className="fill-base-content text-2xl font-bold font-heading">
                            {products.length}
                          </text>
                          <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central" className="fill-base-content/25 text-[9px]">
                            {t('dashboard.products')}
                          </text>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex justify-center gap-4 mt-1">
                        {trendPieData.map((d) => (
                          <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                            <span className="w-2 h-2 rounded-full" style={{ background: d.fill }} />
                            <span className="text-base-content/40">{d.name}</span>
                            <span className="font-bold tabular-nums text-base-content/60">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-36 text-base-content/15 text-xs">{t('dashboard.trendNoData')}</div>
                  )}
                </div>
              </div>

              {/* Score ring */}
              <div className="rounded-2xl bg-base-200/50 border border-base-300/40 overflow-hidden ventra-card">
                <div className="px-5 py-4 border-b border-base-300/20">
                  <h2 className="font-semibold text-sm font-heading">{t('dashboard.scoreSummary')}</h2>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-5">
                    <div className="relative w-[72px] h-[72px] shrink-0">
                      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                        <circle cx="40" cy="40" r="32" fill="none" stroke="var(--chart-grid, oklch(0.7 0 0 / 0.12))" strokeWidth="7" />
                        <circle cx="40" cy="40" r="32" fill="none" stroke={scoreColor(stats.avgScore)}
                          strokeWidth="7" strokeLinecap="round"
                          strokeDasharray={`${(stats.avgScore / 10) * 201} 201`}
                          className="transition-all duration-1000 ease-out" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-base font-bold tabular-nums ${stats.avgScore >= 6 ? 'text-success' : stats.avgScore >= 4 ? 'text-warning' : 'text-base-content/40'}`}>
                          {stats.avgScore.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-base-content/35">{t('dashboard.highest')}</span>
                        <span className="font-bold text-success tabular-nums">{stats.best?.score?.toFixed(2) ?? '—'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-base-content/35">{t('dashboard.average')}</span>
                        <span className="font-bold tabular-nums">{stats.avgScore.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-base-content/35">{t('dashboard.lowest')}</span>
                        <span className="font-bold text-base-content/30 tabular-nums">
                          {products.length > 0 ? Math.min(...products.map((p) => p.score ?? 0)).toFixed(2) : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      )}

      {/* ═══ ACTIVITY CHART ═══ */}
      {activityData.length > 0 && (
        <FadeIn delay={360}>
          <div className="rounded-2xl bg-base-200/50 border border-base-300/40 overflow-hidden ventra-card">
            <div className="px-5 py-4 border-b border-base-300/20 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-sm font-heading">{t('dashboard.weeklySalesChart')}</h2>
                <p className="text-[10px] text-base-content/25 mt-0.5">Top {activityData.length} — {t('dashboard.last7days')}</p>
              </div>
              <span className="text-xs font-mono text-success/80 font-semibold tabular-nums">{stats.totalWeekly.toLocaleString()} ta</span>
            </div>
            <div className="p-4 lg:p-5">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={activityData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<GlassTooltip fmt={(v: number) => v.toLocaleString() + ' ' + t('dashboard.perWeek')} />} />
                  <Area type="monotone" dataKey="sales" stroke="#22c55e" strokeWidth={2} fill="url(#salesGrad)"
                    dot={{ r: 3, fill: '#22c55e', strokeWidth: 2, stroke: 'var(--color-base-100)' }}
                    activeDot={{ r: 5 }} animationDuration={800} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </FadeIn>
      )}

      {/* ═══ PRODUCTS TABLE ═══ */}
      <FadeIn delay={400}>
        <div className="rounded-2xl bg-base-200/50 border border-base-300/40 overflow-hidden ventra-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-base-300/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-500/8 flex items-center justify-center">
                <FireIcon className="w-4 h-4 text-orange-400/80" />
              </div>
              <div>
                <h2 className="font-semibold text-sm font-heading">{t('dashboard.trackedProducts')}</h2>
                <p className="text-[10px] text-base-content/25">{products.length} ta {t('dashboard.products')}</p>
              </div>
            </div>
            {/* Sort controls */}
            {products.length > 0 && (
              <div className="flex gap-1">
                {([['score', t('dashboard.sortScore')], ['weekly', t('dashboard.sortSales')], ['price', t('dashboard.sortPrice')]] as [string, string][]).map(([key, label]) => (
                  <button key={key}
                    onClick={() => setSortKey(key as 'score' | 'weekly' | 'price')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                      sortKey === key
                        ? 'bg-primary/10 text-primary border border-primary/15'
                        : 'text-base-content/30 hover:text-base-content/50 border border-transparent'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-base-300/20 flex items-center justify-center">
                  <MagnifyingGlassIcon className="w-10 h-10 text-base-content/10" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="text-sm">+</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-base-content/50 text-sm font-medium">{t('dashboard.emptyPortfolio')}</p>
                <p className="text-base-content/20 text-xs mt-1 max-w-xs">{t('dashboard.emptyDesc')}</p>
              </div>
              <Link to="/analyze" className="btn btn-primary btn-sm gap-1.5 shadow-md shadow-primary/15">
                <MagnifyingGlassIcon className="w-3.5 h-3.5" /> {t('dashboard.firstAnalysis')}
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr className="bg-base-300/10 text-[9px] text-base-content/30 uppercase tracking-[0.12em]">
                    <th className="font-bold pl-5">{t('dashboard.product')}</th>
                    <th className="font-bold text-center">{t('dashboard.score')}</th>
                    <th className="font-bold text-center">{t('dashboard.trend')}</th>
                    <th className="font-bold text-right">{t('dashboard.weekly')}</th>
                    <th className="font-bold text-right hidden md:table-cell">{t('dashboard.orders')}</th>
                    <th className="font-bold text-right">{t('dashboard.price')}</th>
                    <th className="font-bold text-right hidden sm:table-cell">{t('dashboard.rating')}</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProducts.map((p, idx) => (
                    <tr key={p.product_id}
                      className="hover:bg-base-300/15 transition-colors group/row border-b border-base-300/10 last:border-0"
                      style={{ animationDelay: `${idx * 20}ms` }}>
                      <td className="pl-5">
                        <div className="max-w-xs lg:max-w-sm xl:max-w-md">
                          <Link to={`/products/${p.product_id}`}
                            className="font-medium text-sm truncate block hover:text-primary transition-colors">
                            {p.title}
                          </Link>
                          <p className="text-[10px] text-base-content/20 mt-0.5 tabular-nums">
                            #{p.product_id}
                            {p.feedback_quantity ? ` · ${p.feedback_quantity.toLocaleString()} ${t('dashboard.review')}` : ''}
                          </p>
                        </div>
                      </td>
                      <td className="text-center"><ScorePill score={p.score} /></td>
                      <td className="text-center"><TrendChip trend={p.trend} /></td>
                      <td className="text-right tabular-nums text-sm">
                        {p.weekly_bought != null
                          ? <span className="text-success font-medium">{p.weekly_bought.toLocaleString()}</span>
                          : <span className="text-base-content/10">—</span>
                        }
                      </td>
                      <td className="text-right tabular-nums text-sm text-base-content/50 hidden md:table-cell">
                        {p.orders_quantity ? Number(p.orders_quantity).toLocaleString() : '—'}
                      </td>
                      <td className="text-right tabular-nums text-sm">
                        {p.sell_price != null
                          ? <span className="text-accent font-medium">{p.sell_price.toLocaleString()}</span>
                          : <span className="text-base-content/10">—</span>
                        }
                      </td>
                      <td className="text-right text-sm hidden sm:table-cell">
                        <span className="text-yellow-400/60">★</span>
                        <span className="ml-0.5 text-base-content/40 tabular-nums">{p.rating ?? '—'}</span>
                      </td>
                      <td>
                        <Link to={`/products/${p.product_id}`}
                          className="btn btn-ghost btn-xs opacity-0 group-hover/row:opacity-100 transition-opacity">
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
      </FadeIn>

      {/* ═══ KEYFRAME ═══ */}
      <style>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
