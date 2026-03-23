import { useState, useEffect, useRef, useCallback, lazy, Suspense, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsApi, uzumApi } from '../api/client';
import { MagnifyingGlassIcon, FireIcon } from './icons';
import { useI18n } from '../i18n/I18nContext';
import { useTrackedProducts } from '../hooks/useTrackedProducts';
import { getErrorMessage } from '../utils/getErrorMessage';
import { toast } from 'react-toastify';

const ScoreChart = lazy(() => import('./ScoreChart'));
import type { SearchProduct, AnalyzeResult, Snapshot, ChartPoint } from '../api/types';

const MIN_QUERY_LENGTH = 2;
const BATCH_SIZE = 15;
const PAGE_LIMIT = 30;
const MAX_SCORE = 10;

function formatPrice(price: number) {
  return price.toLocaleString('ru-RU');
}

type RadialStyle = React.CSSProperties & { '--value': number; '--size': string; '--thickness': string };

function ScoreRadial({ score }: { score: number }) {
  const pct = Math.min((score / MAX_SCORE) * 100, 100);
  const color = score >= 6 ? '#22c55e' : score >= 4 ? '#f59e0b' : '#6b7280';
  const style: RadialStyle = { '--value': pct, '--size': '6rem', '--thickness': '5px', color };
  return (
    <div className="radial-progress text-xl font-bold" style={style} role="progressbar">
      {score.toFixed(2)}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl bg-base-200/60 border border-base-300/30 p-3">
      <p className="text-[10px] text-base-content/40 uppercase tracking-wider mb-1">{label}</p>
      <p className={`font-bold text-base tabular-nums ${accent ?? ''}`}>{value}</p>
    </div>
  );
}

interface AnalyzeState {
  url: string;
  result: AnalyzeResult | null;
  snapshots: ChartPoint[];
  loading: boolean;
  error: string;
  tracked: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchDrawer({ isOpen, onClose }: Props) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { isTracked, trackProduct } = useTrackedProducts();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [page, setPage] = useState(1);
  const [offset, setOffset] = useState(0);
  const [trackingIds, setTrackingIds] = useState<Set<number>>(new Set());
  const [sortKey, setSortKey] = useState<'default' | 'score' | 'orders' | 'price'>('default');
  const [analyzeState, setAnalyzeState] = useState<AnalyzeState | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reset + focus when opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setError('');
      setHasSearched(false);
      setHasMore(false);
      setHasNextPage(false);
      setPage(1);
      setOffset(0);
      setSortKey('default');
      setAnalyzeState(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      abortRef.current?.abort();
    }
  }, [isOpen]);

  // Escape: if in analyze view → go back, else close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (analyzeState) setAnalyzeState(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, analyzeState]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  function calcPaging(batchCount: number, nextOffset: number, currentPage: number) {
    const pageStart = (currentPage - 1) * PAGE_LIMIT;
    const withinPage = nextOffset - pageStart;
    return {
      hasMore: batchCount === BATCH_SIZE && withinPage < PAGE_LIMIT,
      hasNextPage: batchCount === BATCH_SIZE && withinPage >= PAGE_LIMIT,
    };
  }

  const search = useCallback(async (q: string) => {
    if (q.trim().length < MIN_QUERY_LENGTH) {
      setResults([]); setHasSearched(false); setHasMore(false); setHasNextPage(false);
      setOffset(0); setPage(1);
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true); setError(''); setPage(1); setOffset(0);
    setHasMore(false); setHasNextPage(false);
    try {
      const res = await productsApi.searchProducts(q.trim(), BATCH_SIZE, 0);
      if (!ctrl.signal.aborted) {
        setResults(res.data);
        setHasSearched(true);
        const paging = calcPaging(res.data.length, BATCH_SIZE, 1);
        setHasMore(paging.hasMore);
        setHasNextPage(paging.hasNextPage);
        setOffset(BATCH_SIZE);
        scrollRef.current?.scrollTo({ top: 0 });
      }
    } catch (err: unknown) {
      if (!ctrl.signal.aborted) {
        const isCancel = err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'ERR_CANCELED';
        if (!isCancel) setError(getErrorMessage(err, t('search.error'), t));
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [t]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const res = await productsApi.searchProducts(query.trim(), BATCH_SIZE, offset);
      if (res.data.length > 0) {
        setResults(prev => [...prev, ...res.data]);
        const nextOffset = offset + BATCH_SIZE;
        const paging = calcPaging(res.data.length, nextOffset, page);
        setHasMore(paging.hasMore);
        setHasNextPage(paging.hasNextPage);
        setOffset(nextOffset);
      } else {
        setHasMore(false); setHasNextPage(false);
      }
    } catch { setHasMore(false); }
    finally { setLoadingMore(false); }
  }, [hasMore, loadingMore, loading, offset, query, page]);

  const changePage = useCallback(async (newPage: number) => {
    if (newPage < 1 || loading || loadingMore) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPage(newPage); setResults([]); setHasMore(false); setHasNextPage(false);
    setLoading(true); setError('');
    const pageStart = (newPage - 1) * PAGE_LIMIT;
    try {
      const res = await productsApi.searchProducts(query.trim(), BATCH_SIZE, pageStart);
      if (!ctrl.signal.aborted) {
        setResults(res.data);
        const nextOffset = pageStart + BATCH_SIZE;
        const paging = calcPaging(res.data.length, nextOffset, newPage);
        setHasMore(paging.hasMore); setHasNextPage(paging.hasNextPage); setOffset(nextOffset);
        scrollRef.current?.scrollTo({ top: 0 });
      }
    } catch (err: unknown) {
      if (!ctrl.signal.aborted) setError(getErrorMessage(err, t('search.error'), t));
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [loading, loadingMore, query, t]);

  // Infinite scroll sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { root: scrollRef.current, rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  async function handleTrack(product: SearchProduct) {
    const uzumId = product.productId ?? product.id;
    if (isTracked(uzumId) || trackingIds.has(uzumId)) return;
    setTrackingIds(prev => new Set(prev).add(uzumId));
    try {
      await trackProduct(uzumId);
      toast.success(t('search.trackSuccess'));
    } catch {
      toast.error(t('search.trackError'));
    } finally {
      setTrackingIds(prev => { const n = new Set(prev); n.delete(uzumId); return n; });
    }
  }

  async function handleAnalyzeProduct(uzumId: number) {
    const url = `https://uzum.uz/product/${uzumId}`;
    setAnalyzeState({ url, result: null, snapshots: [], loading: true, error: '', tracked: false });
    scrollRef.current?.scrollTo({ top: 0 });
    try {
      const res = await uzumApi.analyzeUrl(url);
      const data: AnalyzeResult = res.data;
      let snapshots: ChartPoint[] = [];
      let tracked = false;
      try {
        const [snap, trackedRes] = await Promise.all([
          productsApi.getSnapshots(String(data.product_id)),
          productsApi.getTracked(),
        ]);
        snapshots = snap.data.slice().reverse().map((s: Snapshot) => ({
          date: new Date(s.snapshot_at).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
          score: Number(Number(s.score).toFixed(4)),
        }));
        tracked = (trackedRes.data as Array<{ product_id: string | number }>)
          .some((t) => String(t.product_id) === String(data.product_id));
      } catch { /* optional */ }
      setAnalyzeState({ url, result: data, snapshots, loading: false, error: '', tracked });
    } catch (err: unknown) {
      setAnalyzeState(prev => prev ? { ...prev, loading: false, error: getErrorMessage(err, t('analyze.error')) } : null);
    }
  }

  async function handleAnalyzeTrack() {
    if (!analyzeState?.result) return;
    try {
      await productsApi.track(String(analyzeState.result.product_id));
      setAnalyzeState(prev => prev ? { ...prev, tracked: true } : null);
      window.dispatchEvent(new CustomEvent('product-tracked'));
    } catch { /* already tracked */ }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    search(query);
  }

  const showPagination = hasSearched && !loading && (page > 1 || hasNextPage);

  const sortedResults = sortKey === 'default' ? results : [...results].sort((a, b) => {
    if (sortKey === 'score') return (b.score ?? -1) - (a.score ?? -1);
    if (sortKey === 'orders') return (b.ordersQuantity ?? 0) - (a.ordersQuantity ?? 0);
    return (b.sellPrice ?? b.minSellPrice ?? 0) - (a.sellPrice ?? a.minSellPrice ?? 0);
  });

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open z-50">
      <div className="modal-box w-full max-w-4xl max-h-[88vh] p-0 flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-base-300/40 shrink-0">
          {analyzeState ? (
            /* Analyze mode header */
            <>
              <button
                onClick={() => setAnalyzeState(null)}
                className="btn btn-ghost btn-sm gap-1.5 text-base-content/60"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Orqaga
              </button>
              <div className="flex-1" />
            </>
          ) : (
            /* Search mode header */
            <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="input input-bordered w-full pl-9"
                  placeholder={t('search.placeholder')}
                />
              </div>
              <button
                type="submit"
                disabled={loading || query.trim().length < MIN_QUERY_LENGTH}
                className="btn btn-primary"
              >
                {loading ? <span className="loading loading-spinner loading-sm" /> : t('search.searchBtn')}
              </button>
            </form>
          )}
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-square shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">

          {/* ── ANALYZE PANEL ── */}
          {analyzeState && (
            <div className="space-y-4">
              {analyzeState.loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <span className="loading loading-ring loading-lg text-primary" />
                  <p className="text-xs text-base-content/30 animate-pulse">{t('analyze.analyzing')}</p>
                </div>
              )}

              {analyzeState.error && (
                <div role="alert" className="alert alert-error alert-soft text-sm">
                  <svg className="h-4 w-4 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{analyzeState.error}</span>
                </div>
              )}

              {analyzeState.result && (
                <div className="rounded-2xl bg-base-200/50 border border-base-300/40 p-4 space-y-4">
                  {/* Title + score */}
                  <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FireIcon className="w-4 h-4 text-orange-400 shrink-0" />
                        <span className="text-xs text-base-content/40">#{analyzeState.result.product_id}</span>
                      </div>
                      <h4 className="font-bold text-base leading-snug">{analyzeState.result.title}</h4>
                    </div>
                    <div className="shrink-0 text-center">
                      <ScoreRadial score={analyzeState.result.score} />
                      <p className="text-[10px] text-base-content/40 mt-1 uppercase tracking-wider">Trend Score</p>
                    </div>
                  </div>

                  <div className="h-px bg-base-300/30" />

                  {/* Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <StatCard label={t('analyze.totalOrders')} value={(analyzeState.result.orders_quantity ?? 0).toLocaleString()} accent="text-primary" />
                    <StatCard
                      label={t('analyze.recentActivity')}
                      value={analyzeState.result.weekly_bought != null ? analyzeState.result.weekly_bought.toLocaleString() : '—'}
                      accent={analyzeState.result.weekly_bought ? 'text-success' : 'text-base-content/30'}
                    />
                    <StatCard label={t('analyze.rating')} value={`${analyzeState.result.rating}`} accent="text-yellow-400" />
                    <StatCard label={t('analyze.reviews')} value={(analyzeState.result.feedback_quantity ?? 0).toLocaleString()} accent="text-secondary" />
                    {analyzeState.result.sell_price != null && (
                      <StatCard label={t('analyze.price')} value={`${analyzeState.result.sell_price.toLocaleString()} so'm`} accent="text-accent" />
                    )}
                  </div>

                  {/* Score history */}
                  {analyzeState.snapshots.length > 1 && (
                    <>
                      <div className="h-px bg-base-300/30" />
                      <div>
                        <p className="text-xs text-base-content/40 mb-2">{t('analyze.scoreHistory')}</p>
                        <Suspense fallback={<div className="h-[200px] skeleton" />}>
                          <ScoreChart data={analyzeState.snapshots} />
                        </Suspense>
                      </div>
                    </>
                  )}

                  {/* AI explanation */}
                  {analyzeState.result.ai_explanation && analyzeState.result.ai_explanation.length > 0 && (
                    <>
                      <div className="h-px bg-base-300/30" />
                      <div>
                        <p className="text-xs text-base-content/40 mb-2 flex items-center gap-1">
                          <span>🤖</span> {t('analyze.aiAnalysis')}
                        </p>
                        <ul className="space-y-1.5">
                          {analyzeState.result.ai_explanation.map((bullet, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="text-primary mt-0.5 shrink-0">•</span>
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-1">
                    <div className="alert alert-info alert-soft text-xs flex-1 mr-3">
                      <svg fill="none" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 stroke-current">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{t('analyze.scoreFormula')}</span>
                    </div>
                    <button
                      onClick={handleAnalyzeTrack}
                      disabled={analyzeState.tracked}
                      className={`btn btn-sm gap-2 shrink-0 ${analyzeState.tracked ? 'btn-success' : 'btn-outline btn-success'}`}
                    >
                      {analyzeState.tracked
                        ? <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> {t('analyze.tracked')}</>
                        : `+ ${t('analyze.track')}`
                      }
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SEARCH RESULTS ── */}
          {!analyzeState && (
            <>
              {error && (
                <div className="alert alert-error alert-soft text-sm mb-4">{error}</div>
              )}

              {/* Loading skeleton */}
              {loading && (
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="rounded-2xl bg-base-200/60 overflow-hidden animate-pulse">
                      <div className="aspect-square bg-base-300/40" />
                      <div className="p-3 space-y-2">
                        <div className="h-3 bg-base-300/40 rounded w-3/4" />
                        <div className="h-3 bg-base-300/40 rounded w-1/2" />
                        <div className="h-3 bg-base-300/40 rounded w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Results grid */}
              {!loading && hasSearched && results.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-base-content/40">
                      {results.length} natija{page > 1 && <span className="ml-1">· {page}-sahifa</span>}
                    </p>
                    <select
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
                      className="select select-xs select-bordered text-xs w-32"
                    >
                      <option value="default">Saralash</option>
                      <option value="score">{t('search.sortTrend')}</option>
                      <option value="orders">{t('search.orders')}</option>
                      <option value="price">{t('analyze.price')}</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {sortedResults.map((product) => {
                      const uzumId = product.productId ?? product.id;
                      const tracked = isTracked(uzumId);
                      const isTracking = trackingIds.has(uzumId);
                      const price = product.sellPrice ?? product.minSellPrice ?? null;
                      const isFrom = !product.sellPrice && !!product.minSellPrice;

                      return (
                        <div
                          key={product.id}
                          className="rounded-2xl bg-base-100 border border-base-300/30 shadow-sm hover:shadow-md hover:border-primary/20 transition-all overflow-hidden flex flex-col"
                        >
                          {/* Image */}
                          <div
                            className="relative aspect-square bg-base-200/50 overflow-hidden cursor-pointer group"
                            onClick={() => { navigate(`/products/${uzumId}`); onClose(); }}
                          >
                            {product.photoUrl ? (
                              <img src={product.photoUrl} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <MagnifyingGlassIcon className="w-8 h-8 text-base-content/10" />
                              </div>
                            )}
                            {tracked && (
                              <div className="absolute top-2 left-2 bg-success/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                                <span className="text-[9px] font-bold text-success-content uppercase tracking-wider">{t('search.tracked')}</span>
                              </div>
                            )}
                            {product.rating > 0 && (
                              <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-base-100/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                                <svg className="w-2.5 h-2.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                <span className="text-[9px] font-bold text-base-content/70">{product.rating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="p-2.5 flex flex-col gap-2 flex-1">
                            <p
                              className="text-xs font-medium leading-snug line-clamp-2 cursor-pointer hover:text-primary transition-colors min-h-[2rem]"
                              onClick={() => { navigate(`/products/${uzumId}`); onClose(); }}
                            >
                              {product.title}
                            </p>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              {product.ordersQuantity != null && product.ordersQuantity > 0 && (
                                <span className="text-[9px] bg-base-200/80 px-1.5 py-0.5 rounded-full text-base-content/45">
                                  {product.ordersQuantity.toLocaleString()} {t('search.orders')}
                                </span>
                              )}
                              {product.weeklyBought != null && product.weeklyBought > 0 && (
                                <span className="text-[9px] bg-success/10 px-1.5 py-0.5 rounded-full text-success font-medium">
                                  +{product.weeklyBought.toLocaleString()} {t('search.weekly')}
                                </span>
                              )}
                              {product.reviewsAmount != null && product.reviewsAmount > 0 && (
                                <span className="text-[9px] bg-base-200/80 px-1.5 py-0.5 rounded-full text-base-content/45">
                                  ★ {product.reviewsAmount.toLocaleString()} {t('search.reviews')}
                                </span>
                              )}
                            </div>

                            <div className="mt-auto">
                              {price != null && price > 0 && (
                                <p className="font-bold text-sm tabular-nums leading-tight">
                                  {isFrom && <span className="text-[9px] font-normal text-base-content/40 mr-0.5">{t('search.from')}</span>}
                                  {formatPrice(price)}
                                  <span className="text-[9px] font-normal text-base-content/35 ml-0.5">{t('common.som')}</span>
                                </p>
                              )}
                            </div>

                            <div className="flex gap-1 mt-1">
                              <button
                                onClick={() => handleTrack(product)}
                                disabled={isTracking || tracked}
                                className={`btn btn-xs flex-1 gap-1 ${tracked ? 'btn-success' : 'btn-outline btn-primary'}`}
                              >
                                {isTracking ? (
                                  <span className="loading loading-spinner loading-xs" />
                                ) : tracked ? (
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                  </svg>
                                )}
                                {tracked ? t('search.tracked') : t('search.track')}
                              </button>
                              <button
                                onClick={() => handleAnalyzeProduct(uzumId)}
                                className="btn btn-xs btn-ghost text-base-content/40 hover:text-primary gap-1"
                              >
                                <MagnifyingGlassIcon className="w-3 h-3" />
                                {t('search.analyze')}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div ref={sentinelRef} className="h-1 mt-2" />

                  {loadingMore && (
                    <div className="flex justify-center py-4">
                      <span className="loading loading-spinner loading-sm text-primary" />
                    </div>
                  )}

                  {showPagination && (
                    <div className="flex items-center justify-center gap-2 pt-4 border-t border-base-300/20 mt-2">
                      {page > 1 && <button onClick={() => changePage(page - 1)} className="btn btn-ghost btn-sm">← Oldingi</button>}
                      <span className="text-sm text-base-content/50">{page}-sahifa</span>
                      {hasNextPage && <button onClick={() => changePage(page + 1)} className="btn btn-ghost btn-sm">Keyingi →</button>}
                    </div>
                  )}
                </>
              )}

              {!loading && hasSearched && results.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-base-content/30">
                  <MagnifyingGlassIcon className="w-10 h-10 mb-3" />
                  <p className="text-sm">{t('search.noResults')}</p>
                </div>
              )}

              {!hasSearched && !loading && (
                <div className="flex flex-col items-center justify-center py-20 text-base-content/25 text-center">
                  <MagnifyingGlassIcon className="w-12 h-12 mb-3" />
                  <p className="text-sm">{t('search.subtitle')}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Backdrop */}
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}
