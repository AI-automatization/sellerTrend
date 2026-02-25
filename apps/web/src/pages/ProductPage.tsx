import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { uzumApi, productsApi, sourcingApi } from '../api/client';
import { ScoreChart } from '../components/ScoreChart';
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
} from 'recharts';
import { MagnifyingGlassIcon, ArrowTrendingUpIcon } from '../components/icons';

interface AnalyzeResult {
  product_id: number;
  title: string;
  rating: number | null;
  feedback_quantity: number | null;
  orders_quantity: number | null;
  weekly_bought: number | null;
  score: number;
  sell_price: number | null;
  total_available_amount?: number;
  ai_explanation: string[] | null;
  snapshot_id?: string;
}

interface WeeklyTrend {
  weekly_sold: number | null;
  prev_weekly_sold: number | null;
  delta: number | null;
  delta_pct: number | null;
  trend: 'up' | 'flat' | 'down';
  daily_breakdown: Array<{ date: string; orders: number; daily_sold: number }>;
  advice: { type: string; title: string; message: string; urgency: 'high' | 'medium' | 'low' };
  score_change: number | null;
  last_updated: string | null;
}

interface Forecast {
  forecast_7d: number;
  trend: 'up' | 'flat' | 'down';
  slope: number;
}

interface Snapshot {
  score: number;
  weekly_bought: number | null;
  orders_quantity: string;
  snapshot_at: string;
}

interface ExternalItem {
  title: string;
  price: string;
  source: string;
  link: string;
  image: string;
  store: string;
}

function extractSearchQuery(title: string): string {
  const stopWords = new Set([
    'для', 'из', 'и', 'в', 'с', 'на', 'по', 'за', 'от', 'до', 'ва', 'учун',
    'bilan', 'uchun', 'купить', 'продажа', 'набор', 'комплект',
  ]);
  const words = title
    .replace(/[()[\]{}"'«»]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w.toLowerCase()));
  return words.slice(0, 5).join(' ');
}

const SOURCE_META: Record<string, { label: string; flag: string; color: string }> = {
  EBAY:          { label: 'eBay',          flag: '🛒', color: 'badge-warning' },
  JOOM:          { label: 'Joom',          flag: '🌍', color: 'badge-primary' },
  BANGGOOD:       { label: 'Banggood',       flag: '🛍️', color: 'badge-accent' },
  SHOPEE:         { label: 'Shopee',        flag: '🛒', color: 'badge-success' },
  ALIBABA:       { label: 'Alibaba',       flag: '🇨🇳', color: 'badge-secondary' },
  ALIEXPRESS:    { label: 'AliExpress',    flag: '🛍️', color: 'badge-error' },
  DHGATE:        { label: 'DHgate',        flag: '🏪', color: 'badge-accent' },
  MADE_IN_CHINA: { label: 'MadeInChina',  flag: '🏭', color: 'badge-neutral' },
  SERPAPI:       { label: 'Google',        flag: '🔍', color: 'badge-info' },
};

const MAX_SCORE = 10;

const glassTooltip = {
  contentStyle: {
    background: 'rgba(30,35,42,0.85)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    fontSize: 12,
  },
  labelStyle: { color: 'rgba(255,255,255,0.5)' },
};

function ScoreRadial({ score }: { score: number }) {
  const pct = Math.min((score / MAX_SCORE) * 100, 100);
  const color = score >= 6 ? '#22c55e' : score >= 4 ? '#f59e0b' : '#6b7280';
  return (
    <div
      className="radial-progress text-2xl lg:text-3xl font-bold"
      style={{ '--value': pct, '--size': '8rem', '--thickness': '7px', color } as any}
      role="progressbar"
    >
      {score.toFixed(2)}
    </div>
  );
}

function StatCard({
  label, value, sub, accent, icon,
}: {
  label: string; value: string; sub?: string; accent?: string; icon?: React.ReactNode;
}) {
  return (
    <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3 lg:p-4">
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs text-base-content/50">{label}</p>
        {icon && <span className="text-base-content/30">{icon}</span>}
      </div>
      <p className={`font-bold text-lg tabular-nums leading-tight ${accent ?? ''}`}>{value}</p>
      {sub && <p className="text-xs text-base-content/40 mt-0.5">{sub}</p>}
    </div>
  );
}

function ScoreMeter({ score }: { score: number }) {
  const segments = [
    { label: 'Zaif', max: 3, color: 'bg-error' },
    { label: "O'rtacha", max: 5, color: 'bg-warning' },
    { label: 'Yaxshi', max: 7, color: 'bg-success' },
    { label: 'Zo\'r', max: 10, color: 'bg-primary' },
  ];
  const active = segments.findIndex((s) => score <= s.max);
  const seg = segments[active === -1 ? 3 : active];
  return (
    <div className="space-y-1">
      <div className="flex gap-1 h-2">
        {segments.map((s, i) => (
          <div
            key={i}
            className={`flex-1 rounded-full ${i <= (active === -1 ? 3 : active) ? s.color : 'bg-base-300'} opacity-${i === (active === -1 ? 3 : active) ? '100' : '50'}`}
          />
        ))}
      </div>
      <p className="text-xs text-base-content/50 text-right">{seg.label} daraja</p>
    </div>
  );
}

function TrendBadge({ trend }: { trend: 'up' | 'flat' | 'down' }) {
  if (trend === 'up') return <span className="badge badge-success">↗ O'sayapti</span>;
  if (trend === 'down') return <span className="badge badge-error">↘ Tushayapti</span>;
  return <span className="badge badge-ghost">→ Barqaror</span>;
}

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [snapshots, setSnapshots] = useState<{ date: string; score: number; orders: number }[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tracked, setTracked] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [extItems, setExtItems] = useState<ExternalItem[]>([]);
  const [extLoading, setExtLoading] = useState(false);
  const [extSearched, setExtSearched] = useState(false);
  const [extNote, setExtNote] = useState('');
  const [usdRate, setUsdRate] = useState(12900);

  // ML Forecast state
  const [mlForecast, setMlForecast] = useState<any>(null);
  const [trendAnalysis, setTrendAnalysis] = useState<any>(null);
  const [mlLoading, setMlLoading] = useState(false);

  // Weekly trend state
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrend | null>(null);

  async function loadData(showRefreshing = false) {
    if (!id) return;
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [analyzeRes, snapRes, forecastRes] = await Promise.all([
        uzumApi.analyzeById(id),
        productsApi.getSnapshots(id).catch(() => ({ data: [] })),
        productsApi.getForecast(id).catch(() => ({ data: null })),
      ]);
      setResult(analyzeRes.data);
      const snaps: Snapshot[] = snapRes.data;
      setSnapshots(
        snaps.slice().reverse().map((s) => ({
          date: new Date(s.snapshot_at).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' }),
          score: Number(Number(s.score).toFixed(4)),
          orders: s.weekly_bought ?? 0,
        })),
      );
      if (forecastRes.data) setForecast(forecastRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Uzumdan ma'lumot olib bo'lmadi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadData(); }, [id]);

  // Fetch live USD rate
  useEffect(() => {
    sourcingApi.getCurrencyRates()
      .then((r) => { if (r.data?.USD) setUsdRate(r.data.USD); })
      .catch(() => {});
  }, []);

  // Load ML forecast + weekly trend when product is loaded
  useEffect(() => {
    if (!id || !result) return;
    setMlLoading(true);
    Promise.all([
      productsApi.getMlForecast(id).catch(() => ({ data: null })),
      productsApi.getTrendAnalysis(id).catch(() => ({ data: null })),
      productsApi.getWeeklyTrend(id).catch(() => ({ data: null })),
    ]).then(([mlRes, trendRes, weeklyRes]) => {
      if (mlRes.data) setMlForecast(mlRes.data);
      if (trendRes.data) setTrendAnalysis(trendRes.data);
      if (weeklyRes.data) setWeeklyTrend(weeklyRes.data);
    }).finally(() => setMlLoading(false));
  }, [id, result?.product_id]);

  useEffect(() => {
    if (!result?.title || extSearched) return;
    setExtSearched(true);
    setExtLoading(true);
    const q = extractSearchQuery(result.title);
    sourcingApi
      .searchPrices(q, 'BOTH')
      .then((res) => {
        setExtItems((res.data.results ?? []).slice(0, 12));
        if (res.data.note) setExtNote(res.data.note);
      })
      .catch(() => {})
      .finally(() => setExtLoading(false));
  }, [result?.title]);

  async function handleTrack() {
    if (!id) return;
    try { await productsApi.track(id); } catch { /* already tracked */ }
    setTracked(true);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-4">
        <span className="loading loading-spinner loading-lg text-primary" />
        <div className="text-center">
          <p className="font-medium">Uzumdan ma'lumot olinmoqda...</p>
          <p className="text-xs text-base-content/40 mt-1">Mahsulot yangilanmoqda va AI tahlil qilinmoqda</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="w-full space-y-4">
        <div role="alert" className="alert alert-error">
          <span>{error || 'Mahsulot topilmadi'}</span>
        </div>
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm">← Orqaga</button>
      </div>
    );
  }

  const uzumUrl = `https://uzum.uz/ru/product/${result.product_id}`;
  const scoreLevel =
    result.score >= 7 ? { text: "Juda zo'r mahsulot", color: 'text-primary' }
    : result.score >= 5 ? { text: 'Yaxshi mahsulot', color: 'text-success' }
    : result.score >= 3 ? { text: "O'rtacha mahsulot", color: 'text-warning' }
    : { text: 'Zaif mahsulot', color: 'text-error' };

  return (
    <div className="w-full space-y-4 lg:space-y-6">
      {/* Back + breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-base-content/50">
        <button onClick={() => navigate(-1)} className="hover:text-base-content transition-colors">
          ← Orqaga
        </button>
        <span>/</span>
        <span className="text-base-content truncate max-w-xs lg:max-w-md">{result.title}</span>
      </div>

      {/* Hero card */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6 space-y-5">
        <div className="flex items-start gap-4 lg:gap-6 flex-wrap sm:flex-nowrap">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge badge-outline text-xs font-mono">#{result.product_id}</span>
              <span className={`text-xs font-medium ${scoreLevel.color}`}>{scoreLevel.text}</span>
              {refreshing && <span className="loading loading-spinner loading-xs text-primary" />}
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
            {tracked ? '✓ Kuzatuvda' : '+ Kuzatuvga qo\'shish'}
          </button>
          <button onClick={() => loadData(true)} disabled={refreshing} className="btn btn-sm btn-outline gap-2">
            {refreshing ? <span className="loading loading-spinner loading-xs" /> : '↻'} Yangilash
          </button>
          <a href={uzumUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost gap-1">
            Uzumda ko'rish ↗
          </a>
          <Link to="/analyze" className="btn btn-sm btn-ghost gap-1">
            <MagnifyingGlassIcon className="w-4 h-4" /> URL Tahlil
          </Link>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Jami buyurtmalar"
          value={result.orders_quantity != null ? Number(result.orders_quantity).toLocaleString() : '—'}
          sub="barcha vaqt uchun" accent="text-primary"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
        />
        <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3 lg:p-4">
          <div className="flex items-start justify-between mb-1">
            <p className="text-xs text-base-content/50">Haftalik sotuv</p>
            <svg className="w-4 h-4 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`font-bold text-lg tabular-nums leading-tight ${
              weeklyTrend?.weekly_sold ? 'text-success' : result.weekly_bought ? 'text-success' : 'text-base-content/30'
            }`}>
              {weeklyTrend?.weekly_sold != null
                ? weeklyTrend.weekly_sold.toLocaleString()
                : result.weekly_bought != null
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
              : 'oxirgi 7 kun'}
          </p>
        </div>
        <StatCard
          label="Reyting"
          value={result.rating != null ? `${result.rating}` : '—'}
          sub={result.feedback_quantity ? `${result.feedback_quantity.toLocaleString()} sharh` : ''} accent="text-yellow-400"
          icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>}
        />
        {result.sell_price != null && (
          <StatCard
            label="Narx"
            value={`${result.sell_price.toLocaleString()} so'm`}
            sub="minimal SKU narxi" accent="text-accent"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>}
          />
        )}
        <StatCard
          label="Ombor stok"
          value={result.total_available_amount != null && result.total_available_amount > 0
            ? result.total_available_amount.toLocaleString() + ' dona'
            : '—'}
          sub="jami mavjud" accent={result.total_available_amount && result.total_available_amount > 100 ? 'text-success' : 'text-warning'}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
        />
        <StatCard
          label="Conversion"
          value={
            result.orders_quantity && result.feedback_quantity && result.feedback_quantity > 0
              ? `${((result.feedback_quantity / Number(result.orders_quantity)) * 100).toFixed(1)}%`
              : '—'
          }
          sub="sharh/buyurtma" accent="text-info"
        />
      </div>

      {/* Forecast */}
      {forecast && (
        <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6 space-y-4">
          <h2 className="font-bold text-base lg:text-lg flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-5 h-5 text-primary" />
            7 kunlik bashorat
          </h2>
          <div className="flex items-center gap-4 lg:gap-6 flex-wrap">
            <div className="text-center">
              <p className="text-xs text-base-content/50 mb-1">Hozirgi score</p>
              <p className="text-2xl font-bold tabular-nums">{result.score.toFixed(2)}</p>
            </div>
            <div className="text-2xl text-base-content/30">→</div>
            <div className="text-center">
              <p className="text-xs text-base-content/50 mb-1">7 kun keyin</p>
              <p className={`text-2xl font-bold tabular-nums ${
                forecast.trend === 'up' ? 'text-success' : forecast.trend === 'down' ? 'text-error' : 'text-base-content'
              }`}>{forecast.forecast_7d.toFixed(2)}</p>
            </div>
            <TrendBadge trend={forecast.trend} />
            <span className="text-xs text-base-content/30 ml-auto">
              slope {forecast.slope > 0 ? '+' : ''}{forecast.slope.toFixed(4)}
            </span>
          </div>

          {snapshots.length > 1 && (
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart
                  data={[
                    ...snapshots.slice(-10),
                    { date: '7 kun', score: forecast.forecast_7d, orders: 0, forecast: true } as any,
                  ]}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip {...glassTooltip} />
                  <Area type="monotone" dataKey="score" stroke="#a78bfa" strokeWidth={2} fill="url(#scoreGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Weekly Trend Card — Haftalik sotuv trendi + maslahat */}
      {weeklyTrend && (
        <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-bold text-base lg:text-lg flex items-center gap-2">
              <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              7 kunlik sotuv dinamikasi
            </h2>
            {weeklyTrend.last_updated && (
              <span className="text-xs text-base-content/40">
                Yangilangan: {new Date(weeklyTrend.last_updated).toLocaleString('uz-UZ')}
              </span>
            )}
          </div>

          {/* Summary row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3 text-center">
              <p className="text-xs text-base-content/50">Bu hafta</p>
              <p className="font-bold text-xl tabular-nums text-success">
                {weeklyTrend.weekly_sold != null ? weeklyTrend.weekly_sold.toLocaleString() : '—'}
              </p>
              <p className="text-xs text-base-content/40">sotuv</p>
            </div>
            <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3 text-center">
              <p className="text-xs text-base-content/50">O'tgan hafta</p>
              <p className="font-bold text-xl tabular-nums">
                {weeklyTrend.prev_weekly_sold != null ? weeklyTrend.prev_weekly_sold.toLocaleString() : '—'}
              </p>
              <p className="text-xs text-base-content/40">sotuv</p>
            </div>
            <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3 text-center">
              <p className="text-xs text-base-content/50">Farq</p>
              <p className={`font-bold text-xl tabular-nums ${
                weeklyTrend.delta != null && weeklyTrend.delta > 0 ? 'text-success' :
                weeklyTrend.delta != null && weeklyTrend.delta < 0 ? 'text-error' : ''
              }`}>
                {weeklyTrend.delta != null
                  ? `${weeklyTrend.delta > 0 ? '+' : ''}${weeklyTrend.delta}`
                  : '—'}
              </p>
              <p className="text-xs text-base-content/40">
                {weeklyTrend.delta_pct != null ? `${weeklyTrend.delta_pct > 0 ? '+' : ''}${weeklyTrend.delta_pct}%` : 'sotuv'}
              </p>
            </div>
            <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3 text-center">
              <p className="text-xs text-base-content/50">Trend</p>
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
              <p className="text-xs text-base-content/50 mb-2">Kunlik sotuv (taxminiy)</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={weeklyTrend.daily_breakdown} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                    tickFormatter={(v) => { const d = new Date(v); return `${d.getDate()}/${d.getMonth() + 1}`; }}
                    tickLine={false} axisLine={false}
                  />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    {...glassTooltip}
                    labelFormatter={(v) => new Date(v).toLocaleDateString('uz-UZ', { weekday: 'short', day: 'numeric', month: 'short' })}
                    formatter={(value: number) => [`${value} ta`, 'Kunlik sotuv']}
                  />
                  <Bar dataKey="daily_sold" radius={[4, 4, 0, 0]} name="Kunlik sotuv">
                    {weeklyTrend.daily_breakdown.map((entry, i) => (
                      <rect key={i} fill={
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
                  <span className="badge badge-error badge-xs">Shoshilinch</span>
                )}
              </div>
              <p className="text-sm text-base-content/80">{weeklyTrend.advice.message}</p>
            </div>
          )}
        </div>
      )}

      {/* ML Forecast — Feature 11 */}
      {(mlForecast || mlLoading) && (
        <div className="rounded-2xl bg-base-200/60 border border-primary/20 p-4 lg:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧠</span>
            <h2 className="font-bold text-base lg:text-lg">ML Prognoz (Ensemble)</h2>
            <span className="badge badge-primary badge-sm ml-auto">AI+ML</span>
          </div>

          {mlLoading && !mlForecast ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-dots loading-lg text-primary" />
            </div>
          ) : mlForecast && (
            <>
              {/* Score & Sales forecast summaries */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3">
                  <p className="text-xs text-base-content/50">7 kun score</p>
                  <p className={`font-bold text-lg tabular-nums ${
                    mlForecast.score_forecast.trend === 'up' ? 'text-success' :
                    mlForecast.score_forecast.trend === 'down' ? 'text-error' : ''
                  }`}>
                    {mlForecast.score_forecast.predictions?.[6]?.value?.toFixed(2) ?? '—'}
                  </p>
                  <TrendBadge trend={mlForecast.score_forecast.trend} />
                </div>
                <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3">
                  <p className="text-xs text-base-content/50">7 kun sotuv</p>
                  <p className={`font-bold text-lg tabular-nums ${
                    mlForecast.sales_forecast.trend === 'up' ? 'text-success' :
                    mlForecast.sales_forecast.trend === 'down' ? 'text-error' : ''
                  }`}>
                    {mlForecast.sales_forecast.predictions?.[6]?.value?.toFixed(0) ?? '—'}
                  </p>
                  <TrendBadge trend={mlForecast.sales_forecast.trend} />
                </div>
                <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3">
                  <p className="text-xs text-base-content/50">Ishonchlilik</p>
                  <p className="font-bold text-lg tabular-nums">
                    {(mlForecast.score_forecast.confidence * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-base-content/40">confidence</p>
                </div>
                <div className="bg-base-300/60 border border-base-300/40 rounded-xl p-3">
                  <p className="text-xs text-base-content/50">Ma'lumot</p>
                  <p className="font-bold text-lg tabular-nums">{mlForecast.data_points}</p>
                  <p className="text-xs text-base-content/40">snapshot</p>
                </div>
              </div>

              {/* Confidence interval chart */}
              {mlForecast.score_forecast.predictions?.length > 0 && (
                <div>
                  <p className="text-xs text-base-content/50 mb-2">Score prognoz (95% ishonch intervali)</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart
                      data={[
                        ...mlForecast.snapshots.slice(-10).map((s: any) => ({
                          date: new Date(s.date).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' }),
                          score: s.score,
                        })),
                        ...mlForecast.score_forecast.predictions.map((p: any) => ({
                          date: new Date(p.date).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' }),
                          predicted: p.value,
                          lower: p.lower,
                          upper: p.upper,
                        })),
                      ]}
                      margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                      <Tooltip {...glassTooltip} />
                      <Area type="monotone" dataKey="score" stroke="#a78bfa" strokeWidth={2} fill="none" dot={false} />
                      <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confGrad)" dot={false} />
                      <Area type="monotone" dataKey="lower" stroke="none" fill="none" dot={false} />
                      <Area type="monotone" dataKey="predicted" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" fill="none" dot={{ r: 3, fill: '#6366f1' }} />
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
                  {trendAnalysis.factors?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {trendAnalysis.factors.map((f: string, i: number) => (
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
                Ensemble: WMA + Holt's Exponential Smoothing + Linear Regression · MAE: {mlForecast.score_forecast.metrics?.mae ?? '—'} · RMSE: {mlForecast.score_forecast.metrics?.rmse ?? '—'}
              </p>
            </>
          )}
        </div>
      )}

      {/* Score + Orders history */}
      {snapshots.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-5">
            <h2 className="font-bold text-sm text-base-content/70 mb-3">Score tarixi</h2>
            <ScoreChart data={snapshots} />
          </div>
          <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-5">
            <h2 className="font-bold text-sm text-base-content/70 mb-3">Haftalik sotuvlar tarixi</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={snapshots.slice(-15)} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} />
                <Tooltip {...glassTooltip} />
                <Bar dataKey="orders" fill="#34d399" radius={[4, 4, 0, 0]} name="Haftalik sotuvlar" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* AI Explanation */}
      {result.ai_explanation && result.ai_explanation.length > 0 && (
        <div className="rounded-2xl bg-base-200/60 border border-primary/20 p-4 lg:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <h2 className="font-bold text-base lg:text-lg">Claude AI tahlili</h2>
            <span className="badge badge-primary badge-sm ml-auto">AI</span>
          </div>
          <ul className="space-y-3">
            {result.ai_explanation.map((bullet, i) => (
              <li key={i} className="flex items-start gap-3 text-sm bg-base-300/60 rounded-xl p-3">
                <span className="text-primary font-bold mt-0.5 shrink-0">{i + 1}.</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Global Market Price Comparison */}
      <GlobalPriceComparison
        items={extItems} loading={extLoading} note={extNote}
        uzumPrice={result.sell_price} productTitle={result.title}
        usdRate={usdRate}
      />

      {/* Score formula */}
      <div className="alert alert-info alert-soft text-xs">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 stroke-current">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Score = 0.55×ln(1+faollik) + 0.25×ln(1+jami) + 0.10×reyting + 0.10×ombor · Real vaqtda Uzumdan hisoblangan</span>
      </div>
    </div>
  );
}

// ─── Global Price Comparison ──────────────────────────────────────────────────

function GlobalPriceComparison({
  items, loading, note, uzumPrice, productTitle, usdRate,
}: {
  items: ExternalItem[]; loading: boolean; note: string;
  uzumPrice: number | null; productTitle: string; usdRate: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, 6);
  const USD_RATE = usdRate;

  function parsePrice(priceStr: string): number | null {
    const m = priceStr.match(/[\d.,]+/);
    if (!m) return null;
    const n = parseFloat(m[0].replace(',', '.'));
    if (isNaN(n)) return null;
    if (priceStr.includes('$') || n < 10000) return n * USD_RATE;
    return n;
  }

  function marginLabel(extPriceUzs: number): { text: string; cls: string } | null {
    if (!uzumPrice || uzumPrice <= 0) return null;
    const landed = extPriceUzs * 1.3;
    const margin = ((uzumPrice - landed) / uzumPrice) * 100;
    if (margin >= 30) return { text: `+${margin.toFixed(0)}% margin`, cls: 'text-success' };
    if (margin >= 15) return { text: `+${margin.toFixed(0)}% margin`, cls: 'text-warning' };
    if (margin > 0)   return { text: `+${margin.toFixed(0)}% margin`, cls: 'text-error' };
    return { text: 'Zararli', cls: 'text-error' };
  }

  return (
    <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-bold text-base lg:text-lg flex items-center gap-2">
            <span>🌏</span> Global Bozor Taqqoslash
          </h2>
          <p className="text-xs text-base-content/50 mt-0.5">
            Shu mahsulot uchun Banggood va Shopee global narxlari
          </p>
        </div>
        <Link to="/sourcing" className="btn btn-outline btn-xs gap-1">
          Cargo kalkulyator ↗
        </Link>
      </div>

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-base-300/60 rounded-xl p-4 space-y-2 animate-pulse">
              <div className="h-20 bg-base-content/5 rounded-lg" />
              <div className="h-3 bg-base-content/10 rounded w-3/4" />
              <div className="h-4 bg-base-content/10 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {!loading && note && (
        <div className="flex items-start gap-2 bg-base-300/60 rounded-xl px-4 py-3 text-sm">
          <span className="text-base-content/40 text-xs shrink-0 mt-0.5">ℹ️</span>
          <p className="text-base-content/70">{note}</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <>
          {uzumPrice && (() => {
            const prices = items.map((it) => parsePrice(it.price)).filter((p): p is number => p !== null);
            if (prices.length === 0) return null;
            const minExt = Math.min(...prices);
            const diff = ((uzumPrice - minExt) / uzumPrice) * 100;
            return (
              <div className="grid grid-cols-3 gap-2 bg-base-300/60 border border-base-300/40 rounded-xl p-3 lg:p-4">
                <div className="text-center">
                  <p className="text-xs text-base-content/40">Uzumda narx</p>
                  <p className="font-bold text-sm">{uzumPrice.toLocaleString()} so'm</p>
                </div>
                <div className="text-center flex items-center justify-center">
                  <span className="text-2xl">↔</span>
                </div>
                <div className="text-center">
                  <p className="text-xs text-base-content/40">Eng arzon xalq. narx</p>
                  <p className="font-bold text-sm text-primary">{minExt.toLocaleString()} so'm</p>
                  {diff > 0 && <p className="text-xs text-success mt-0.5">Farq: {diff.toFixed(0)}%</p>}
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {visible.map((item, i) => {
              const meta = SOURCE_META[item.source] ?? { label: item.source, flag: '🌐', color: 'badge-ghost' };
              const extPriceUzs = parsePrice(item.price);
              const mg = extPriceUzs ? marginLabel(extPriceUzs) : null;

              return (
                <div key={i} className="bg-base-300/60 border border-base-300/40 rounded-xl p-3 flex flex-col gap-2 hover:bg-base-content/5 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className={`badge badge-xs ${meta.color}`}>{meta.flag} {meta.label}</span>
                    {mg && <span className={`text-xs font-medium ${mg.cls}`}>{mg.text}</span>}
                  </div>
                  {item.image ? (
                    <img src={item.image} alt={item.title}
                      className="w-full h-24 object-contain rounded-lg bg-base-200"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="w-full h-24 rounded-lg bg-base-200 flex items-center justify-center text-3xl">📦</div>
                  )}
                  <p className="text-xs leading-snug line-clamp-2 text-base-content/80 flex-1">{item.title}</p>
                  <p className="font-bold text-base text-primary leading-none">{item.price}</p>
                  {extPriceUzs && <p className="text-xs text-base-content/40">≈ {extPriceUzs.toLocaleString()} so'm</p>}
                  {item.store && <p className="text-xs text-base-content/40 truncate">{item.store}</p>}
                  <div className="flex gap-1 mt-auto">
                    {item.link && item.link !== '#' ? (
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-xs flex-1">Ko'rish ↗</a>
                    ) : (
                      <span className="btn btn-xs btn-disabled flex-1">Demo</span>
                    )}
                    <Link to={`/sourcing?q=${encodeURIComponent(productTitle)}&price=${extPriceUzs ?? ''}`}
                      className="btn btn-ghost btn-xs" title="Cargo kalkulyatorda hisoblash">🧮</Link>
                  </div>
                </div>
              );
            })}
          </div>

          {items.length > 6 && (
            <button onClick={() => setExpanded(!expanded)} className="btn btn-ghost btn-sm w-full">
              {expanded ? '↑ Kamroq ko\'rsatish' : `↓ Yana ${items.length - 6} ta natija`}
            </button>
          )}
        </>
      )}

      {!loading && items.length === 0 && !note && (
        <div className="text-center py-8 text-base-content/30">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-sm">Global bozorda natija topilmadi</p>
        </div>
      )}
    </div>
  );
}
