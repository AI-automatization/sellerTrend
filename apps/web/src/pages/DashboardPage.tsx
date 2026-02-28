import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { ArrowTrendingUpIcon, MagnifyingGlassIcon, WalletIcon } from '../components/icons';
import { useI18n } from '../i18n/I18nContext';
import {
  FadeIn, KPICards, HeroCards, ChartsSection, ActivityChart, ProductsTable,
} from '../components/dashboard';

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { products, balance, loading, isSuperAdmin, exporting, handleExportCsv } = useDashboardData();
  const [sortKey, setSortKey] = useState<'score' | 'weekly' | 'price'>('score');
  const { t } = useI18n();

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
    return { totalWeekly, avgScore, rising, falling, flat, best, mostActive, healthPct };
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

  const scoreSparkline = useMemo(() => products.slice(0, 8).map((p) => p.score ?? 0), [products]);
  const salesSparkline = useMemo(() => products.slice(0, 8).map((p) => p.weekly_bought ?? 0), [products]);
  const paymentDue = balance?.status === 'PAYMENT_DUE';
  const hour = new Date().getHours();
  const greeting = hour < 6 ? t('greeting.night') : hour < 12 ? t('greeting.morning') : hour < 18 ? t('greeting.day') : t('greeting.evening');

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
              <ArrowTrendingUpIcon className="w-3.5 h-3.5" /> {t('nav.discovery')}
            </Link>
            <button onClick={handleExportCsv} disabled={exporting || products.length === 0}
              className="btn btn-ghost btn-sm border border-base-300/40 gap-1.5 hover:border-primary/20 transition-all text-xs">
              {exporting ? <span className="loading loading-spinner loading-xs" /> : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              )} {t('common.csv')}
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
      <KPICards
        stats={stats}
        balance={balance}
        isSuperAdmin={isSuperAdmin}
        paymentDue={paymentDue}
        scoreSparkline={scoreSparkline}
        salesSparkline={salesSparkline}
        productsCount={products.length}
      />

      {/* ═══ HERO CARDS ═══ */}
      {products.length > 0 && <HeroCards best={stats.best} mostActive={stats.mostActive} />}

      {/* ═══ CHARTS ═══ */}
      {products.length > 0 && (
        <ChartsSection
          scoreChartData={scoreChartData}
          trendPieData={trendPieData}
          stats={stats}
          products={products}
        />
      )}

      {/* ═══ ACTIVITY CHART ═══ */}
      <ActivityChart activityData={activityData} totalWeekly={stats.totalWeekly} />

      {/* ═══ PRODUCTS TABLE ═══ */}
      <ProductsTable
        products={products}
        sortedProducts={sortedProducts}
        sortKey={sortKey}
        setSortKey={setSortKey}
      />

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
