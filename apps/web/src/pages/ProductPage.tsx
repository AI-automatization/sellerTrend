import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useParams, useNavigate } from 'react-router-dom';
import { uzumApi, productsApi, sourcingApi, predictionsApi } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';
import { logError } from '../utils/handleError';
import { formatDateTime, formatWeekdayDate } from '../utils/formatDate';

const ScoreChart = lazy(() => import('../components/ScoreChart'));
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
import type { AnalyzeResult, WeeklyTrend, Forecast, Snapshot, MlForecast, TrendAnalysis, ProductDetail, DailySalesPoint, PredictionResult, RiskResult } from '../api/types';
import { glassTooltip, CHART_ANIMATION_MS } from '../utils/formatters';


export function ProductPage() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [productDetail, setProductDetail] = useState<ProductDetail | null>(null);
  const [snapshots, setSnapshots] = useState<{ date: string; score: number; orders: number }[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tracked, setTracked] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isMine, setIsMine] = useState(false);
  const [todaySold, setTodaySold] = useState<number | null>(null);

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

  // Claude AI analysis — only triggered when "Bu mening mahsulotim" is clicked
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRequested, setAiRequested] = useState(false);

  // Weekly trend state
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrend | null>(null);

  // Kunlik sotuv tarixi (T-497)
  const [dailySales, setDailySales] = useState<DailySalesPoint[]>([]);

  // ML predictions (T-483) — ensemble fallback
  const [mlPrediction, setMlPrediction] = useState<PredictionResult | null>(null);

  // ML risk score (T-496)
  const [riskData, setRiskData] = useState<RiskResult | null>(null);

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
      const [analyzeRes, snapRes, forecastRes, detailRes] = await Promise.all([
        uzumApi.analyzeById(id),
        productsApi.getSnapshots(id).catch(() => ({ data: [] })),
        productsApi.getForecast(id).catch(() => ({ data: null })),
        productsApi.getProduct(id).catch(() => ({ data: null })),
      ]);
      if (controller.signal.aborted) return;
      // T-507: analyzeProduct Uzum fresh datani to'g'ri keltiradi (orders, narx, reyting),
      // lekin weekly_bought/daily_sold ni noto'g'ri hisoblaydi.
      // getProductById (detailRes) trackedDays logikasini to'g'ri bajaradi → shu manbadan olish.
      const baseResult = analyzeRes.data;
      // T-509: bugungi sotuv — live delta (analyzeProduct dan, har Yangilashda o'zgaradi)
      setTodaySold(analyzeRes.data.today_sold ?? analyzeRes.data.daily_sold ?? null);
      if (detailRes.data) {
        baseResult.weekly_bought = detailRes.data.weekly_bought ?? baseResult.weekly_bought;
        // T-509: kechagi sotuv — productSnapshotDaily dan (fixed calendar-day delta)
        baseResult.daily_sold = detailRes.data.daily_sold ?? baseResult.daily_sold;
      }
      setResult(baseResult);
      if (detailRes.data) setProductDetail(detailRes.data);
      if (analyzeRes.data.is_tracked) setTracked(true);
      if (typeof analyzeRes.data.is_mine === 'boolean') setIsMine(analyzeRes.data.is_mine);
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
          const parts = key.split('-').map(Number);
          const [year, m, day] = parts;
          return { date: `${day} ${MONTHS[m]} '${String(year).slice(2)}`, score: val.score, orders: val.orders };
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
      productsApi.getWeeklyTrend(pid).catch(() => ({ data: null })),
      productsApi.getDailySales(pid).catch(() => ({ data: [] })),
      predictionsApi.getPrediction(pid).catch(() => ({ data: null })),
      predictionsApi.getRisk(pid).catch(() => ({ data: null })),
    ]).then(([mlRes, weeklyRes, dailyRes, predRes, riskRes]) => {
      if (mlRes.data) setMlForecast(mlRes.data);
      if (weeklyRes.data) setWeeklyTrend(weeklyRes.data);
      if (Array.isArray(dailyRes.data) && dailyRes.data.length > 0) setDailySales(dailyRes.data);
      if (predRes.data?.predictions) setMlPrediction(predRes.data);
      if (riskRes.data) setRiskData(riskRes.data);
    }).finally(() => setMlLoading(false));
  }, [loadedProductId]);

  // Load Claude AI trend analysis only when user clicks "Bu mening mahsulotim"
  useEffect(() => {
    if (!aiRequested || !loadedProductId || trendAnalysis) return;
    const pid = String(loadedProductId);
    setAiLoading(true);
    productsApi.getTrendAnalysis(pid)
      .then((res) => { if (res.data) setTrendAnalysis(res.data); })
      .catch(() => {})
      .finally(() => setAiLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiRequested, loadedProductId]);

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
    setMlPrediction(null);
    setTrendAnalysis(null);
    setWeeklyTrend(null);
    setProductDetail(null);
    setTodaySold(null);
    setAiLoading(false);
    try {
      const savedMine = localStorage.getItem(`mine_${id}`) === '1';
      setIsMine(savedMine);
      // Avval "mening mahsulotim" deb belgilangan bo'lsa — AI tahlilni auto-trigger qilish
      setAiRequested(savedMine);
    } catch {
      setAiRequested(false);
    }
  }, [id]);

  async function toggleMine() {
    if (!tracked) return; // Kuzatuvda bo'lmasa toggle qilish mumkin emas
    const next = !isMine;
    setIsMine(next);
    try {
      await productsApi.setMine(id, next);
      // "Bu mening mahsulotim" qo'yilsa — AI tahlil so'rovini yuboramiz
      if (next) setAiRequested(true);
    } catch {
      setIsMine(!next); // Rollback on error
    }
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
              {riskData && (
                <span className={`badge badge-sm ${
                  riskData.risk_level === 'critical' ? 'badge-error' :
                  riskData.risk_level === 'high' ? 'badge-warning' :
                  riskData.risk_level === 'medium' ? 'badge-info' :
                  'badge-success'
                }`}>
                  ⚠ Risk: {riskData.risk_level} ({Math.round(riskData.risk_score * 100)}%)
                </span>
              )}
            </div>
            <h1 className="font-bold text-xl lg:text-2xl leading-snug">{result.title}</h1>
            <ScoreMeter score={result.score} />
          </div>
          <div className="shrink-0 text-center space-y-1">
            <ScoreRadial score={result.score} />
            <p className="text-xs text-base-content/40">{t('product.scoreLabel')}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap pt-1 border-t border-base-300/50">
          <button onClick={handleTrack} disabled={tracked}
            className={`btn btn-sm gap-2 ${tracked ? 'btn-success' : 'btn-outline btn-success'}`}>
            {tracked ? t('product.tracking') : t('product.addTracking')}
          </button>
          <button onClick={toggleMine}
            className={`btn btn-sm gap-2 ${isMine ? 'btn-error btn-outline' : 'btn-outline btn-secondary'}`}>
            {isMine ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                {t('product.removeFromMine')}
              </>
            ) : (
              <>
                🏪 {t('product.markMine')}
              </>
            )}
          </button>
          <button onClick={() => loadData(true)} disabled={refreshing} className="btn btn-sm btn-outline gap-2">
            {refreshing ? <span className="loading loading-spinner loading-xs" /> : '↻'} {t('product.refresh')}
          </button>
          <a href={uzumUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost gap-1">
            {t('product.viewOnUzum')}
          </a>
        </div>
        {/* Delivery info row */}
        {(productDetail?.delivery_type || productDetail?.seller_discount != null) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {productDetail.delivery_type && (
              <span className="badge badge-outline badge-sm gap-1">
                🚚 {productDetail.delivery_type}
              </span>
            )}
            {productDetail.delivery_date && (
              <span className="badge badge-outline badge-sm text-base-content/50">
                {productDetail.delivery_date}
              </span>
            )}
            {productDetail.seller_discount != null && productDetail.seller_discount > 0 && (
              <span className="badge badge-warning badge-sm">
                Seller −{productDetail.seller_discount}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <StatCard
          label={t('product.totalOrders')}
          value={result.orders_quantity != null ? Number(result.orders_quantity).toLocaleString() : '—'}
          sub={t('product.allTime')} accent="text-primary"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
        />
        {/* Kechagi sotuv — productSnapshotDaily dan (fixed, T-509) */}
        <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3 lg:p-4">
          <div className="flex items-start justify-between mb-1">
            <p className="text-xs text-base-content/50">Kechagi sotuv</p>
            <svg className="w-4 h-4 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className={`font-bold text-lg tabular-nums leading-tight ${
            result.daily_sold != null && result.daily_sold > 0 ? 'text-success' : 'text-base-content/30'
          }`}>
            {result.daily_sold != null ? result.daily_sold.toLocaleString() : '—'}
          </p>
          <p className="text-xs text-base-content/40 mt-0.5">
            {result.daily_sold == null ? 'Ma\'lumot to\'planmoqda' : 'Kecha (sobit)'}
          </p>
        </div>
        {/* Bugungi sotuv — live delta, har Yangilashda o'zgaradi (T-509) */}
        <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3 lg:p-4">
          <div className="flex items-start justify-between mb-1">
            <p className="text-xs text-base-content/50">Bugungi sotuv</p>
            <svg className="w-4 h-4 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className={`font-bold text-lg tabular-nums leading-tight ${
            todaySold != null && todaySold > 0 ? 'text-info' : 'text-base-content/30'
          }`}>
            {todaySold != null ? todaySold.toLocaleString() : '—'}
          </p>
          <p className="text-xs text-base-content/40 mt-0.5">
            {todaySold == null ? 'Ma\'lumot to\'planmoqda' : 'Bugun (live)'}
          </p>
        </div>
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
              : result.weekly_bought == null
                ? 'Uzum banner yo\'q'
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
          <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3 lg:p-4">
            <div className="flex items-start justify-between mb-1">
              <p className="text-xs text-base-content/50">{t('product.price')}</p>
              <svg className="w-4 h-4 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
            </div>
            <p className={`font-bold text-lg tabular-nums leading-tight ${
              productDetail?.uzum_card_price != null && productDetail.uzum_card_price < result.sell_price
                ? 'line-through text-base-content/40 text-base'
                : 'text-accent'
            }`}>
              {result.sell_price.toLocaleString()} {t('sourcing.currency')}
            </p>
            {productDetail?.uzum_card_price != null && productDetail.uzum_card_price < result.sell_price && (
              <p className="font-bold text-accent tabular-nums">
                {productDetail.uzum_card_price.toLocaleString()} {t('sourcing.currency')}
                {productDetail.uzum_card_discount != null && (
                  <span className="ml-1 text-xs font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-full">
                    −{productDetail.uzum_card_discount}%
                  </span>
                )}
              </p>
            )}
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <p className="text-xs text-base-content/40">{t('product.minSkuPrice')}</p>
              {productDetail?.is_best_price && (
                <span className="text-[9px] font-bold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full">best price</span>
              )}
            </div>
          </div>
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

      {/* AI Explanation — faqat "Bu mening mahsulotim" bosilganda ko'rinadi */}
      {isMine && result.ai_explanation && result.ai_explanation.filter((b) => typeof b === 'string' && b.trim().length > 0).length > 0 && (() => {
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

      {/* Kunlik sotuv tarixi (T-497) */}
      {dailySales.length > 0 && (() => {
        const hasData = dailySales.some((d) => d.daily_orders_delta != null && d.daily_orders_delta > 0);
        if (!hasData) return null;

        const chartData = dailySales.map((d) => ({
          date: d.date.slice(5),  // 'MM-DD'
          sotuv: d.daily_orders_delta ?? 0,
        }));

        const totalSold = dailySales.reduce((s, d) => s + (d.daily_orders_delta ?? 0), 0);
        const avgDaily = dailySales.filter((d) => (d.daily_orders_delta ?? 0) > 0).length > 0
          ? Math.round(totalSold / dailySales.filter((d) => (d.daily_orders_delta ?? 0) > 0).length)
          : 0;
        const maxDay = dailySales.reduce(
          (best, d) => (d.daily_orders_delta ?? 0) > (best.daily_orders_delta ?? 0) ? d : best,
          dailySales[0],
        );

        return (
          <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base lg:text-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Kunlik sotuv (30 kun)
              </h2>
              <span className="text-xs text-base-content/40">delta = bugungi − kechagi buyurtma</span>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-base-300/60 rounded-xl p-3 text-center">
                <p className="text-xs text-base-content/50 mb-1">Jami (30 kun)</p>
                <p className="font-bold text-lg text-success tabular-nums">{totalSold.toLocaleString()}</p>
              </div>
              <div className="bg-base-300/60 rounded-xl p-3 text-center">
                <p className="text-xs text-base-content/50 mb-1">O'rtacha / kun</p>
                <p className="font-bold text-lg tabular-nums">{avgDaily.toLocaleString()}</p>
              </div>
              <div className="bg-base-300/60 rounded-xl p-3 text-center">
                <p className="text-xs text-base-content/50 mb-1">Eng yaxshi kun</p>
                <p className="font-bold text-lg text-primary tabular-nums">
                  {(maxDay.daily_orders_delta ?? 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-base-content/40">{maxDay.date}</p>
              </div>
            </div>

            {/* Bar chart */}
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#ffffff40' }}
                  interval={Math.floor(chartData.length / 6)}
                />
                <YAxis tick={{ fontSize: 10, fill: '#ffffff40' }} />
                <Tooltip
                  {...glassTooltip}
                  formatter={(v: number) => [`${v} ta`, 'Sotuv']}
                  labelFormatter={(l: string) => `📅 ${l}`}
                />
                <Bar dataKey="sotuv" radius={[3, 3, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.sotuv >= avgDaily ? '#34d399' : '#6b7280'}
                      fillOpacity={entry.sotuv >= avgDaily ? 0.85 : 0.45}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-base-content/30 text-center">
              Yashil = o'rtachadan yuqori ({avgDaily}+ ta/kun)
            </p>
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

          {/* No data notice */}
          {weeklyTrend.weekly_sold == null || weeklyTrend.weekly_sold === 0 ? (
            result.weekly_bought == null ? (
              <div className="rounded-xl bg-base-300/40 border border-base-300/60 p-3 text-xs text-base-content/50 space-y-1">
                <p className="font-semibold text-base-content/70">📊 Haftalik sotuv ma'lumoti yo'q</p>
                <p>Sabab 1: Uzum bu mahsulot uchun "haftalik sotildi" bannerini ko'rsatmaydi (kam sotuv yoki yangi mahsulot).</p>
                <p>Sabab 2: Buyurtmalar soni snapshot'lar orasida o'zgarmagan (yangi tracking yoki haqiqatan sotuv yo'q).</p>
                <p className="text-base-content/40">7–14 kun kuzatishdan keyin ma'lumot to'planadi.</p>
              </div>
            ) : null
          ) : null}

          {/* Summary row */}
          {(() => {
            // result.weekly_bought = fresh Uzum API data (most accurate)
            // weeklyTrend.weekly_sold = stored snapshot (may be 0/stale)
            const effectiveCurrent =
              weeklyTrend.weekly_sold != null && weeklyTrend.weekly_sold > 0
                ? weeklyTrend.weekly_sold
                : (result.weekly_bought ?? null);
            const effectivePrev = weeklyTrend.prev_weekly_sold;
            const effectiveDelta =
              effectiveCurrent != null && effectivePrev != null
                ? effectiveCurrent - effectivePrev
                : weeklyTrend.delta;
            const effectiveDeltaPct =
              effectiveDelta != null && effectivePrev != null && effectivePrev > 0
                ? Number(((effectiveDelta / effectivePrev) * 100).toFixed(1))
                : weeklyTrend.delta_pct;
            return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3 text-center">
              <p className="text-xs text-base-content/50">{t('product.thisWeek')}</p>
              <p className="font-bold text-xl tabular-nums text-success">
                {effectiveCurrent != null ? effectiveCurrent.toLocaleString() : '—'}
              </p>
              <p className="text-xs text-base-content/40">{t('product.sales')}</p>
            </div>
            <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3 text-center">
              <p className="text-xs text-base-content/50">{t('product.lastWeek')}</p>
              <p className="font-bold text-xl tabular-nums">
                {effectivePrev != null && effectivePrev > 0 ? effectivePrev.toLocaleString() : '—'}
              </p>
              <p className="text-xs text-base-content/40">{t('product.sales')}</p>
            </div>
            <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3 text-center">
              <p className="text-xs text-base-content/50">{t('product.difference')}</p>
              <p className={`font-bold text-xl tabular-nums ${
                effectiveDelta != null && effectiveDelta > 0 ? 'text-success' :
                effectiveDelta != null && effectiveDelta < 0 ? 'text-error' : ''
              }`}>
                {effectiveDelta != null
                  ? `${effectiveDelta > 0 ? '+' : ''}${effectiveDelta}`
                  : '—'}
              </p>
              <p className="text-xs text-base-content/40">
                {effectiveDeltaPct != null ? `${effectiveDeltaPct > 0 ? '+' : ''}${effectiveDeltaPct}%` : t('product.sales')}
              </p>
            </div>
            <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3 text-center">
              <p className="text-xs text-base-content/50">{t('product.trend')}</p>
              <div className="flex justify-center mt-1">
                <TrendBadge trend={weeklyTrend.trend} />
              </div>
              {weeklyTrend.score_change != null && (
                <p className={`text-xs mt-1 ${weeklyTrend.score_change > 0 ? 'text-success' : weeklyTrend.score_change < 0 ? 'text-error' : 'text-base-content/40'}`}>
                  Reyting {weeklyTrend.score_change > 0 ? '+' : ''}{weeklyTrend.score_change.toFixed(2)} ball
                </p>
              )}
            </div>
          </div>
            );
          })()}

          {/* Daily sales chart */}
          {(() => {
            // dailySales dan oxirgi 7 kunni ol (bir manba — ProductSnapshotDaily)
            const last7 = dailySales.slice(-7).filter((d) => d.daily_orders_delta != null);
            if (last7.length < 2) return null;
            const chartData7 = last7.map((d) => ({
              date: d.date,
              daily_sold: Math.max(0, d.daily_orders_delta ?? 0),
            }));
            return (
              <div>
                <p className="text-xs text-base-content/50 mb-2">{t('product.dailySales')}</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData7} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
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
                      {chartData7.map((_entry, i) => (
                        <Cell key={i} fill={i === chartData7.length - 1 ? '#a78bfa' : '#34d399'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          })()}

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

      {/* Claude AI Tahlili — faqat "Bu mening mahsulotim" bosilganda chiqadi */}
      <ErrorBoundary variant="section" label="Claude AI tahlili">
      {isMine && (aiLoading || trendAnalysis) && (
        <div className="rounded-2xl bg-base-200/60 border border-primary/20 p-4 lg:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <h2 className="font-bold text-base lg:text-lg">Claude AI Tahlili</h2>
            <span className="badge badge-secondary badge-sm">🏪 Mening mahsulotim</span>
            <span className="badge badge-primary badge-sm ml-auto">AI</span>
          </div>
          {aiLoading && !trendAnalysis ? (
            <div className="flex items-center gap-3 py-3">
              <span className="loading loading-dots loading-md text-primary" />
              <span className="text-sm text-base-content/50">Claude AI tahlil qilmoqda...</span>
            </div>
          ) : trendAnalysis?.analysis ? (
            <div className="space-y-3">
              <p className="text-sm text-base-content/80 leading-relaxed">{trendAnalysis.analysis}</p>
              {trendAnalysis.factors.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {trendAnalysis.factors.map((f, i) => (
                    <span key={i} className="badge badge-outline badge-sm">{f}</span>
                  ))}
                </div>
              )}
              {trendAnalysis.recommendation && (
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
                  <p className="text-sm font-medium text-primary">💡 Tavsiya: {trendAnalysis.recommendation}</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
      </ErrorBoundary>

      {/* ML Forecast — Feature 11 (collapsible). mlPrediction = fallback when mlForecast unavailable */}
      <ErrorBoundary variant="section" label="Sotuv bashorati">
      {(mlForecast || mlPrediction || mlLoading) && (
        <div className="rounded-2xl bg-base-200/60 border border-primary/20 p-4 lg:p-6 space-y-4">
          <button
            onClick={() => setShowMlDetail((v) => !v)}
            className="flex items-center gap-2 w-full text-left"
          >
            <span className="text-xl">📊</span>
            <h2 className="font-bold text-base lg:text-lg">{t('product.mlForecast')}</h2>
            <span className="badge badge-primary badge-sm">Bashorat</span>
            <span className="ml-auto text-base-content/40 text-sm">{showMlDetail ? '▲' : '▼'}</span>
          </button>

          {showMlDetail && mlLoading && !mlForecast && !mlPrediction ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-dots loading-lg text-primary" />
            </div>
          ) : showMlDetail && !mlForecast && mlPrediction && mlPrediction.predictions && (
            /* mlForecast yo'q — mlPrediction (batch ML cache) dan oddiy grafik */
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3">
                  <p className="text-xs text-base-content/50">7 kunlik sotuv bashorati</p>
                  <p className="font-bold text-lg tabular-nums text-primary">
                    ~{Math.round(mlPrediction.predictions[mlPrediction.predictions.length - 1].value)} ta
                  </p>
                  <p className="text-xs text-base-content/40 mt-0.5">{mlPrediction.model_name}</p>
                </div>
                <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3">
                  <p className="text-xs text-base-content/50">Model xatoligi (MAE)</p>
                  <p className="font-bold text-lg tabular-nums">
                    {mlPrediction.mae != null ? `±${mlPrediction.mae.toFixed(1)}` : '—'}
                  </p>
                  <p className="text-xs text-base-content/40 mt-0.5">{mlPrediction.horizon} kunlik</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-base-content/50 mb-2">Sotuv bashorati (keyingi 7 kun)</p>
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart
                    data={mlPrediction.predictions.map((p, i) => ({ day: `+${i + 1}k`, value: Math.round(p.value) }))}
                    margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--chart-tick)' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                    <Tooltip {...glassTooltip} formatter={(v: number) => [`${v} ta`, 'Bashorat']} />
                    <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#predGrad)" dot={{ r: 3, fill: '#6366f1' }} animationDuration={CHART_ANIMATION_MS} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {showMlDetail && mlForecast && (
            <>
              {/* Score & Sales forecast summaries */}
              <div className="grid grid-cols-2 gap-3">
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
                  {(() => {
                    const val = mlForecast.sales_forecast.predictions?.[6]?.value;
                    const isValid = val != null && !isNaN(val);
                    return (
                      <p className={`font-bold text-lg tabular-nums ${
                        mlForecast.sales_forecast.trend === 'up' ? 'text-success' :
                        mlForecast.sales_forecast.trend === 'down' ? 'text-error' : ''
                      }`}>
                        {isValid && val > 0 ? `~${val.toFixed(0)} ta` : isValid ? <span className="text-sm text-base-content/40">Ma'lumot yetarli emas</span> : '—'}
                      </p>
                    );
                  })()}
                  <TrendBadge trend={mlForecast.sales_forecast.trend} />
                </div>
              </div>

              {/* Confidence interval chart */}
              {mlForecast.score_forecast.predictions?.length > 0 && (
                <div>
                  <p className="text-xs text-base-content/50 mb-2">Reyting o'zgarishi bashorati <span className="text-base-content/30">━ O'tgan · ╌ Bashorat</span></p>
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
                      <Area type="monotone" dataKey="score" stroke="#a78bfa" strokeWidth={2} fill="none" dot={false} name="O'tgan reyting" animationDuration={CHART_ANIMATION_MS} />
                      <Area type="monotone" dataKey="predicted" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" fill="none" dot={{ r: 3, fill: '#6366f1' }} name="Bashorat" animationDuration={CHART_ANIMATION_MS} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

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
                <Suspense fallback={<div className="h-[200px] skeleton" />}>
                  <ScoreChart data={snapshots} />
                </Suspense>
                <p className="text-xs text-base-content/30 mt-1">Reyting qanchalik yuqori bo'lsa, mahsulot ko'proq ko'rinadi</p>
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
