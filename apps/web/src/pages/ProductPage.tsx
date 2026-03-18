import { useState, useEffect, useRef } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useParams, useNavigate } from 'react-router-dom';
import { uzumApi, productsApi, sourcingApi } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';
import { logError } from '../utils/handleError';
import { formatDateTime, formatWeekdayDate } from '../utils/formatDate';
import { ScoreChart } from '../components/ScoreChart';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ArrowTrendingUpIcon } from '../components/icons';
import { CompetitorSection } from '../components/CompetitorSection';
import {
  ScoreRadial,
  StatCard,
  ScoreMeter,
  TrendBadge,
  GlobalPriceComparison,
} from '../components/product';
import type { ExternalItem } from '../components/product';
import type { AnalyzeResult, WeeklyTrend, Forecast, Snapshot, MlForecast, TrendAnalysis } from '../api/types';
import { glassTooltip, CHART_ANIMATION_MS } from '../utils/formatters';


export function ProductPage() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [snapshots, setSnapshots] = useState<{ date: string; score: number; orders: number }[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tracked, setTracked] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isMine, setIsMine] = useState(() => {
    try { return localStorage.getItem(`mine_${id}`) === '1'; } catch { return false; }
  });

  const [extItems, setExtItems] = useState<ExternalItem[]>([]);
  const [extLoading, setExtLoading] = useState(false);
  const [extSearched, setExtSearched] = useState(false);
  const [extJobId, setExtJobId] = useState<string | null>(null);
  const [extJobStatus, setExtJobStatus] = useState<string | null>(null);
  // TODO(T-370): Replace with dynamic rate from API config endpoint.
  // This fallback is only used while the live rate is being fetched.
  const FALLBACK_USD_RATE = 12_900;
  const [usdRate, setUsdRate] = useState(FALLBACK_USD_RATE);

  // ML Forecast state
  const [mlForecast, setMlForecast] = useState<MlForecast | null>(null);
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis | null>(null);
  const [mlLoading, setMlLoading] = useState(false);

  // Weekly trend state
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrend | null>(null);

  // UI collapse state
  const [showHistory, setShowHistory] = useState(false);
  const [showMlDetail, setShowMlDetail] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  async function loadData(showRefreshing = false) {
    if (!id) return;

    // Cancel previous in-flight request to prevent race condition (T-365)
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [analyzeRes, snapRes, forecastRes] = await Promise.all([
        uzumApi.analyzeById(id),
        productsApi.getSnapshots(id).catch(() => ({ data: [] })),
        productsApi.getForecast(id).catch(() => ({ data: null })),
      ]);
      if (controller.signal.aborted) return;
      setResult(analyzeRes.data);
      if (analyzeRes.data.is_tracked) setTracked(true);
      const snaps: Snapshot[] = snapRes.data;
      const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
      // Aggregate by day — keep latest snapshot per day to avoid zigzag (T-197)
      const byDay = new Map<string, { score: number; orders: number }>();
      for (const s of snaps.slice().reverse()) {
        const d = new Date(s.snapshot_at);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        byDay.set(key, {
          score: Number(Number(s.score).toFixed(4)),
          orders: s.weekly_bought ?? 0,
        });
      }
      setSnapshots(
        Array.from(byDay.entries()).map(([key, val]) => {
          const [, m, day] = key.split('-').map(Number);
          return { date: `${day} ${MONTHS[m]}`, score: val.score, orders: val.orders };
        }),
      );
      if (forecastRes.data) setForecast(forecastRes.data);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setError(getErrorMessage(err, "Uzumdan ma'lumot olib bo'lmadi"));
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    loadData();
    return () => { abortRef.current?.abort(); };
  }, [id]);

  // Fetch live USD rate
  useEffect(() => {
    sourcingApi.getCurrencyRates()
      .then((r) => { if (r.data?.USD) setUsdRate(r.data.USD); })
      .catch(logError);
  }, []);

  // Load ML forecast + weekly trend when product is loaded (fires once per product)
  const loadedProductId = result?.product_id;
  useEffect(() => {
    if (!loadedProductId) return;
    const pid = String(loadedProductId);
    setMlLoading(true);
    Promise.all([
      productsApi.getMlForecast(pid).catch(() => ({ data: null })),
      productsApi.getTrendAnalysis(pid).catch(() => ({ data: null })),
      productsApi.getWeeklyTrend(pid).catch(() => ({ data: null })),
    ]).then(([mlRes, trendRes, weeklyRes]) => {
      if (mlRes.data) setMlForecast(mlRes.data);
      if (trendRes.data) setTrendAnalysis(trendRes.data);
      if (weeklyRes.data) setWeeklyTrend(weeklyRes.data);
    }).finally(() => setMlLoading(false));
  }, [loadedProductId]);

  // useEffect 1 — job yaratish
  useEffect(() => {
    if (!result?.product_id || !result?.title || extSearched) return;
    setExtSearched(true);
    setExtLoading(true);
    sourcingApi
      .createJob({ product_id: result.product_id, product_title: result.title })
      .then((res) => {
        setExtJobId(res.data.job_id);
        setExtJobStatus(res.data.status);
      })
      .catch(() => setExtLoading(false));
  }, [result?.product_id]);

  // useEffect 2 — polling (har 3 soniyada natijani tekshirish)
  useEffect(() => {
    if (!extJobId) return;
    let active = true;

    async function poll() {
      while (active) {
        try {
          const res = await sourcingApi.getJob(extJobId!);
          if (!active) return;
          setExtJobStatus(res.data.status);
          if (res.data.status === 'DONE') {
            setExtItems(res.data.results ?? []);
            setExtLoading(false);
            return;
          }
          if (res.data.status === 'FAILED') {
            setExtLoading(false);
            return;
          }
        } catch { /* davom etish */ }
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    poll();
    return () => { active = false; };
  }, [extJobId]);

  // Reset external search state when product changes (T-125)
  useEffect(() => {
    setExtSearched(false);
    setExtItems([]);
    setExtJobId(null);
    setExtJobStatus(null);
    setMlForecast(null);
    setTrendAnalysis(null);
    setWeeklyTrend(null);
    try { setIsMine(localStorage.getItem(`mine_${id}`) === '1'); } catch { /* ignore */ }
  }, [id]);

  function toggleMine() {
    const next = !isMine;
    setIsMine(next);
    try { if (next) { localStorage.setItem(`mine_${id}`, '1'); } else { localStorage.removeItem(`mine_${id}`); } } catch { /* ignore */ }
  }

  async function handleTrack() {
    if (!id) return;
    try {
      await productsApi.track(id);
      setTracked(true);
    } catch (e) { logError(e); }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-4">
        <span className="loading loading-spinner loading-lg text-primary" />
        <div className="text-center">
          <p className="font-medium">{t('product.loading.fetching')}</p>
          <p className="text-xs text-base-content/40 mt-1">{t('product.loading.analyzing')}</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="w-full space-y-4">
        <div role="alert" className="alert alert-error">
          <span>{error || t('product.notFound')}</span>
        </div>
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm">{t('product.backBtn')}</button>
      </div>
    );
  }

  const uzumUrl = `https://uzum.uz/ru/product/${result.product_id}`;
  const scoreLevel =
    result.score >= 7 ? { text: t('product.scoreExcellent'), color: 'text-primary' }
    : result.score >= 5 ? { text: t('product.scoreGood'), color: 'text-success' }
    : result.score >= 3 ? { text: t('product.scoreAverage'), color: 'text-warning' }
    : { text: t('product.scorePoor'), color: 'text-error' };

  return (
    <div className="w-full space-y-4 lg:space-y-6">
      {/* Back + breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-base-content/50">
        <button onClick={() => navigate(-1)} className="hover:text-base-content transition-colors">
          {t('product.backBtn')}
        </button>
        <span>/</span>
        <span className="text-base-content truncate max-w-xs lg:max-w-md">{result.title}</span>
      </div>

      {/* Hero card */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6 space-y-5">
        <div className="flex items-start gap-4 lg:gap-6 flex-wrap sm:flex-nowrap">
          {/* Product image */}
          {result.photo_url && (
            <div className="shrink-0">
              <img
                src={result.photo_url}
                alt={result.title}
                className="w-20 h-20 lg:w-24 lg:h-24 rounded-xl object-cover bg-base-300/40"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge badge-outline text-xs font-mono">#{result.product_id}</span>
              <span className={`text-xs font-medium ${scoreLevel.color}`}>{scoreLevel.text}</span>
              {isMine && <span className="badge badge-secondary badge-sm">🏪 {t('product.markedMine')}</span>}
            </div>
            <h1 className="font-bold text-xl lg:text-2xl leading-snug">{result.title}</h1>
            <ScoreMeter score={result.score} />
          </div>
          <div className="shrink-0 text-center space-y-1">
            <ScoreRadial score={result.score} />
            <p className="text-xs text-base-content/40">Trend Score</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap pt-1 border-t border-base-300/50">
          <button onClick={handleTrack} disabled={tracked}
            className={`btn btn-sm gap-2 ${tracked ? 'btn-success' : 'btn-outline btn-success'}`}>
            {tracked ? t('product.tracking') : t('product.addTracking')}
          </button>
          <button onClick={toggleMine}
            className={`btn btn-sm gap-2 ${isMine ? 'btn-secondary' : 'btn-outline btn-secondary'}`}>
            🏪 {isMine ? t('product.markedMine') : t('product.markMine')}
          </button>
          <button onClick={() => loadData(true)} disabled={refreshing} className="btn btn-sm btn-outline gap-2">
            {refreshing ? <span className="loading loading-spinner loading-xs" /> : '↻'} {t('product.refresh')}
          </button>
          <a href={uzumUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost gap-1">
            {t('product.viewOnUzum')}
          </a>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label={t('product.totalOrders')}
          value={result.orders_quantity != null ? Number(result.orders_quantity).toLocaleString() : '—'}
          sub={t('product.allTime')} accent="text-primary"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
        />
        <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3 lg:p-4">
          <div className="flex items-start justify-between mb-1">
            <p className="text-xs text-base-content/50">{t('product.weeklySales')}</p>
            <svg className="w-4 h-4 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`font-bold text-lg tabular-nums leading-tight ${
              result.weekly_bought ? 'text-success' : 'text-base-content/30'
            }`}>
              {result.weekly_bought != null
                ? result.weekly_bought.toLocaleString()
                : '—'}
            </p>
            {weeklyTrend?.delta != null && weeklyTrend.delta !== 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                weeklyTrend.delta > 0
                  ? 'bg-success/20 text-success'
                  : 'bg-error/20 text-error'
              }`}>
                {weeklyTrend.delta > 0 ? '+' : ''}{weeklyTrend.delta} ta
              </span>
            )}
          </div>
          <p className="text-xs text-base-content/40 mt-0.5">
            {weeklyTrend?.delta_pct != null
              ? `7 kun ichida ${weeklyTrend.delta_pct > 0 ? '+' : ''}${weeklyTrend.delta_pct}%`
              : t('product.lastWeek')}
          </p>
        </div>
        <StatCard
          label={t('product.rating')}
          value={result.rating != null ? `${result.rating}` : '—'}
          sub={result.feedback_quantity ? `${result.feedback_quantity.toLocaleString()} ${t('product.reviews')}` : ''} accent="text-yellow-400"
          icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>}
        />
        {result.sell_price != null && (
          <StatCard
            label={t('product.price')}
            value={`${result.sell_price.toLocaleString()} ${t('sourcing.currency')}`}
            sub={t('product.minSkuPrice')} accent="text-accent"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>}
          />
        )}
        <StatCard
          label={t('product.inventory')}
          value={result.total_available_amount != null && result.total_available_amount > 0
            ? result.total_available_amount.toLocaleString() + ' ' + t('product.units')
            : '—'}
          sub={t('product.totalAvailable')} accent={result.total_available_amount && result.total_available_amount > 100 ? 'text-success' : 'text-warning'}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
        />
        <StatCard
          label={t('product.conversion')}
          value={
            result.orders_quantity && result.feedback_quantity && result.feedback_quantity > 0
              ? `${((result.feedback_quantity / Number(result.orders_quantity)) * 100).toFixed(1)}%`
              : '—'
          }
          sub={t('product.reviewsPerOrder')} accent="text-info"
        />
      </div>

      {/* AI Explanation — sotuvchi uchun eng muhim, metrics dan keyin */}
      {result.ai_explanation && result.ai_explanation.filter((b) => typeof b === 'string' && b.trim().length > 0).length > 0 && (() => {
        const bullets = result.ai_explanation!.filter((b) => typeof b === 'string' && b.trim().length > 0);
        const bulletMeta = [
          { icon: '📌', label: t('product.ai.bullet.1'), color: 'text-info' },
          { icon: '🎯', label: t('product.ai.bullet.2'), color: 'text-success' },
          { icon: '⚠️', label: t('product.ai.bullet.3'), color: 'text-warning' },
        ];
        return (
          <div className="rounded-2xl bg-base-200/60 border border-primary/20 p-4 lg:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <h2 className="font-bold text-base lg:text-lg">{t('product.aiAnalysis')}</h2>
              {isMine && <span className="badge badge-secondary badge-sm">🏪</span>}
              <span className="badge badge-primary badge-sm ml-auto">AI</span>
            </div>
            <ul className="space-y-3">
              {bullets.map((bullet, i) => {
                const meta = bulletMeta[i] ?? { icon: '💡', label: String(i + 1), color: '' };
                return (
                  <li key={i} className="flex items-start gap-3 text-sm bg-base-300/60 rounded-xl p-3">
                    <span className="text-lg shrink-0 mt-0.5">{meta.icon}</span>
                    <div className="flex-1">
                      <span className={`text-xs font-bold uppercase tracking-wide ${meta.color} mr-2`}>{meta.label}</span>
                      <span>{bullet}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })()}

      {/* Forecast */}
      {forecast && (
        <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6 space-y-4">
          <h2 className="font-bold text-base lg:text-lg flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-5 h-5 text-primary" />
            {t('product.forecast7d')}
          </h2>
          {(() => {
            // T-199: derive trend from actual values, not just slope
            const changePct = result.score > 0 ? (forecast.forecast_7d - result.score) / result.score : 0;
            const derivedTrend: 'up' | 'flat' | 'down' = changePct > 0.05 ? 'up' : changePct < -0.05 ? 'down' : 'flat';
            return (
              <div className="flex items-center gap-4 lg:gap-6 flex-wrap">
                <div className="text-center">
                  <p className="text-xs text-base-content/50 mb-1">{t('product.currentScore')}</p>
                  <p className="text-2xl font-bold tabular-nums">{result.score.toFixed(2)}</p>
                </div>
                <div className="text-2xl text-base-content/30">→</div>
                <div className="text-center">
                  <p className="text-xs text-base-content/50 mb-1">{t('product.scoreIn7Days')}</p>
                  <p className={`text-2xl font-bold tabular-nums ${
                    derivedTrend === 'up' ? 'text-success' : derivedTrend === 'down' ? 'text-error' : 'text-base-content'
                  }`}>{forecast.forecast_7d.toFixed(2)}</p>
                </div>
                <TrendBadge trend={derivedTrend} changePct={changePct !== 0 ? changePct : undefined} />
              </div>
            );
          })()}

          {snapshots.length > 1 && (
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart
                  data={[
                    ...snapshots.slice(-10),
                    { date: '7 kun', score: forecast.forecast_7d, orders: 0 },
                  ]}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip {...glassTooltip} />
                  <Area type="monotone" dataKey="score" stroke="#a78bfa" strokeWidth={2} fill="url(#scoreGrad)" dot={false} animationDuration={CHART_ANIMATION_MS} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Weekly Trend Card — Haftalik sotuv trendi + maslahat */}
      <ErrorBoundary variant="section" label="Haftalik trend">
      {weeklyTrend && (
        <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-bold text-base lg:text-lg flex items-center gap-2">
              <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              {t('product.weeklySalesTrend')}
            </h2>
            {weeklyTrend.last_updated && (
              <span className="text-xs text-base-content/40">
                Yangilangan: {formatDateTime(weeklyTrend.last_updated)}
              </span>
            )}
          </div>

          {/* Summary row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3 text-center">
              <p className="text-xs text-base-content/50">{t('product.thisWeek')}</p>
              <p className="font-bold text-xl tabular-nums text-success">
                {weeklyTrend.weekly_sold != null ? weeklyTrend.weekly_sold.toLocaleString() : '—'}
              </p>
              <p className="text-xs text-base-content/40">{t('product.sales')}</p>
            </div>
            <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3 text-center">
              <p className="text-xs text-base-content/50">{t('product.lastWeek')}</p>
              <p className="font-bold text-xl tabular-nums">
                {weeklyTrend.prev_weekly_sold != null ? weeklyTrend.prev_weekly_sold.toLocaleString() : '—'}
              </p>
              <p className="text-xs text-base-content/40">{t('product.sales')}</p>
            </div>
            <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3 text-center">
              <p className="text-xs text-base-content/50">{t('product.difference')}</p>
              <p className={`font-bold text-xl tabular-nums ${
                weeklyTrend.delta != null && weeklyTrend.delta > 0 ? 'text-success' :
                weeklyTrend.delta != null && weeklyTrend.delta < 0 ? 'text-error' : ''
              }`}>
                {weeklyTrend.delta != null
                  ? `${weeklyTrend.delta > 0 ? '+' : ''}${weeklyTrend.delta}`
                  : '—'}
              </p>
              <p className="text-xs text-base-content/40">
                {weeklyTrend.delta_pct != null ? `${weeklyTrend.delta_pct > 0 ? '+' : ''}${weeklyTrend.delta_pct}%` : t('product.sales')}
              </p>
            </div>
            <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3 text-center">
              <p className="text-xs text-base-content/50">{t('product.trend')}</p>
              <div className="flex justify-center mt-1">
                <TrendBadge trend={weeklyTrend.trend} />
              </div>
              {weeklyTrend.score_change != null && (
                <p className={`text-xs mt-1 ${weeklyTrend.score_change > 0 ? 'text-success' : weeklyTrend.score_change < 0 ? 'text-error' : 'text-base-content/40'}`}>
                  Score {weeklyTrend.score_change > 0 ? '+' : ''}{weeklyTrend.score_change.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* Daily sales chart */}
          {weeklyTrend.daily_breakdown.length > 1 && (
            <div>
              <p className="text-xs text-base-content/50 mb-2">{t('product.dailySales')} (taxminiy)</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={weeklyTrend.daily_breakdown} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'var(--chart-tick)' }}
                    tickFormatter={(v) => { const d = new Date(v); return `${d.getDate()}/${d.getMonth() + 1}`; }}
                    tickLine={false} axisLine={false}
                  />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    {...glassTooltip}
                    labelFormatter={(v: string) => formatWeekdayDate(v)}
                    formatter={(value: number) => [`${value} ta`, 'Kunlik sotuv']}
                  />
                  <Bar dataKey="daily_sold" radius={[4, 4, 0, 0]} name="Kunlik sotuv" animationDuration={CHART_ANIMATION_MS}>
                    {weeklyTrend.daily_breakdown.map((_entry, i) => (
                      <Cell key={i} fill={
                        i === weeklyTrend.daily_breakdown.length - 1 ? '#a78bfa' : '#34d399'
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Seller advice */}
          {weeklyTrend.advice && (
            <div className={`rounded-xl p-4 border ${
              weeklyTrend.advice.urgency === 'high'
                ? 'bg-error/10 border-error/30'
                : weeklyTrend.advice.urgency === 'medium'
                  ? 'bg-warning/10 border-warning/30'
                  : 'bg-info/10 border-info/30'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">
                  {weeklyTrend.advice.type === 'growth' ? '📈' :
                   weeklyTrend.advice.type === 'decline' ? '📉' :
                   weeklyTrend.advice.type === 'stable' ? '📊' :
                   weeklyTrend.advice.type === 'success' ? '✅' :
                   weeklyTrend.advice.type === 'low' ? '⚠️' : 'ℹ️'}
                </span>
                <h3 className="font-bold text-sm">{weeklyTrend.advice.title}</h3>
                {weeklyTrend.advice.urgency === 'high' && (
                  <span className="badge badge-error badge-xs">{t('product.urgent')}</span>
                )}
              </div>
              <p className="text-sm text-base-content/80">{weeklyTrend.advice.message}</p>
            </div>
          )}
        </div>
      )}
      </ErrorBoundary>

      {/* ML Forecast — Feature 11 (collapsible) */}
      <ErrorBoundary variant="section" label="ML Prognoz">
      {(mlForecast || mlLoading) && (
        <div className="rounded-2xl bg-base-200/60 border border-primary/20 p-4 lg:p-6 space-y-4">
          <button
            onClick={() => setShowMlDetail((v) => !v)}
            className="flex items-center gap-2 w-full text-left"
          >
            <span className="text-xl">🧠</span>
            <h2 className="font-bold text-base lg:text-lg">{t('product.mlForecast')}</h2>
            <span className="badge badge-primary badge-sm">AI+ML</span>
            <span className="ml-auto text-base-content/40 text-sm">{showMlDetail ? '▲' : '▼'}</span>
          </button>

          {showMlDetail && mlLoading && !mlForecast ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-dots loading-lg text-primary" />
            </div>
          ) : showMlDetail && mlForecast && (
            <>
              {/* Score & Sales forecast summaries */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3">
                  <p className="text-xs text-base-content/50">{t('product.score7d')}</p>
                  <p className={`font-bold text-lg tabular-nums ${
                    mlForecast.score_forecast.trend === 'up' ? 'text-success' :
                    mlForecast.score_forecast.trend === 'down' ? 'text-error' : ''
                  }`}>
                    {mlForecast.score_forecast.predictions?.[6]?.value?.toFixed(2) ?? '—'}
                  </p>
                  <TrendBadge trend={mlForecast.score_forecast.trend} />
                </div>
                <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3">
                  <p className="text-xs text-base-content/50">{t('product.sales7d')}</p>
                  <p className={`font-bold text-lg tabular-nums ${
                    mlForecast.sales_forecast.trend === 'up' ? 'text-success' :
                    mlForecast.sales_forecast.trend === 'down' ? 'text-error' : ''
                  }`}>
                    {mlForecast.sales_forecast.predictions?.[6]?.value?.toFixed(0) ?? '—'}
                  </p>
                  <TrendBadge trend={mlForecast.sales_forecast.trend} />
                </div>
                <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3">
                  <p className="text-xs text-base-content/50">{t('product.confidence')}</p>
                  <p className="font-bold text-lg tabular-nums">
                    {(mlForecast.score_forecast.confidence * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-base-content/40">{t('product.accuracy')}</p>
                </div>
                <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3">
                  <p className="text-xs text-base-content/50">{t('product.analysisCount')}</p>
                  <p className="font-bold text-lg tabular-nums">{mlForecast.data_points}</p>
                  <p className="text-xs text-base-content/40">{t('product.analyses')}</p>
                </div>
              </div>

              {/* Confidence interval chart */}
              {mlForecast.score_forecast.predictions?.length > 0 && (
                <div>
                  <p className="text-xs text-base-content/50 mb-2">Score prognoz (95% ishonch intervali)</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart
                      data={[
                        ...mlForecast.snapshots.slice(-10).map((s) => {
                          const d = new Date(s.date);
                          return { date: `${d.getDate()}/${d.getMonth() + 1}`, score: s.score };
                        }),
                        ...mlForecast.score_forecast.predictions.map((p) => {
                          const d = new Date(p.date);
                          return { date: `${d.getDate()}/${d.getMonth() + 1}`, predicted: p.value, lower: p.lower, upper: p.upper };
                        }),
                      ]}
                      margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                      <Tooltip {...glassTooltip} />
                      <Area type="monotone" dataKey="score" stroke="#a78bfa" strokeWidth={2} fill="none" dot={false} animationDuration={CHART_ANIMATION_MS} />
                      <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confGrad)" dot={false} animationDuration={CHART_ANIMATION_MS} />
                      <Area type="monotone" dataKey="lower" stroke="none" fill="none" dot={false} animationDuration={CHART_ANIMATION_MS} />
                      <Area type="monotone" dataKey="predicted" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" fill="none" dot={{ r: 3, fill: '#6366f1' }} animationDuration={CHART_ANIMATION_MS} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* AI Trend Analysis */}
              {trendAnalysis?.analysis && (
                <div className="bg-base-300/60 rounded-xl p-4 space-y-2">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <span>🤖</span> AI Trend Tahlili
                  </h3>
                  <p className="text-sm text-base-content/80">{trendAnalysis.analysis}</p>
                  {trendAnalysis.factors.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {trendAnalysis.factors.map((f, i) => (
                        <span key={i} className="badge badge-outline badge-sm">{f}</span>
                      ))}
                    </div>
                  )}
                  {trendAnalysis.recommendation && (
                    <p className="text-sm text-primary font-medium mt-1">
                      Tavsiya: {trendAnalysis.recommendation}
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-base-content/30">
                AI prognoz · O'rtacha xatolik: {mlForecast.score_forecast.metrics?.mae?.toFixed(2) ?? '—'}
              </p>
            </>
          )}
        </div>
      )}
      </ErrorBoundary>

      {/* Score + Orders history (collapsible) */}
      {snapshots.length > 1 && (
        <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-5">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-2 w-full text-left"
          >
            <h2 className="font-bold text-sm text-base-content/70">{t('product.scoreHistory')} / {t('product.salesHistory')}</h2>
            <span className="ml-auto text-base-content/40 text-sm">{showHistory ? '▲' : '▼'}</span>
          </button>
          {showHistory && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-xs text-base-content/50 mb-2">{t('product.scoreHistory')}</p>
                <ScoreChart data={snapshots} />
              </div>
              <div>
                <p className="text-xs text-base-content/50 mb-2">{t('product.salesHistory')}</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={snapshots.filter((s) => s.orders > 0).slice(-15)} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} />
                    <Tooltip {...glassTooltip} formatter={(value: number) => [`${value.toLocaleString()} dona/hafta`, 'Sotuv']} />
                    <Bar dataKey="orders" fill="#34d399" radius={[4, 4, 0, 0]} name="Haftalik sotuv" animationDuration={CHART_ANIMATION_MS} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Competitor Price Tracker — Feature 01 */}
      <ErrorBoundary variant="section" label="Raqiblar narxi">
        <CompetitorSection productId={String(result.product_id)} productPrice={result.sell_price} />
      </ErrorBoundary>

      {/* Global Market Price Comparison */}
      <ErrorBoundary variant="section" label="Xitoy narxlari">
        <GlobalPriceComparison
          items={extItems} loading={extLoading} jobStatus={extJobStatus}
          uzumPrice={result.sell_price}
          usdRate={usdRate}
        />
      </ErrorBoundary>

      {/* Score info */}
      <div className="alert alert-info alert-soft text-xs">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 stroke-current">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{t('product.scoreExplanation')}</span>
      </div>
    </div>
  );
}
