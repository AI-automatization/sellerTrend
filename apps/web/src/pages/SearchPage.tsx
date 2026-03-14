import { useState, useEffect, useRef, useCallback, Fragment, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsApi } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';
import { MagnifyingGlassIcon } from '../components/icons';
import { useI18n } from '../i18n/I18nContext';
import { PageHint } from '../components/PageHint';
import { ExpandPanel } from '../components/search/ExpandPanel';
import { useTrackedProducts } from '../hooks/useTrackedProducts';
import type { SearchProduct } from '../api/types';
import { toast } from 'react-toastify';

const MIN_QUERY_LENGTH = 2;
const PAGE_SIZE = 24;
const PAGE_LIMIT = 64;

function formatPrice(price: number): string {
  return price.toLocaleString('ru-RU');
}

export function SearchPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
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
  const { isTracked, trackProduct } = useTrackedProducts();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);

  /** Scroll sahifa tepasiga */
  const scrollToTop = useCallback(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  /** hasMore va hasNextPage ni hisoblash */
  function calcPaging(batchCount: number, nextOffset: number, currentPage: number) {
    const pageStart = (currentPage - 1) * PAGE_LIMIT;
    const withinPage = nextOffset - pageStart;
    const batchFull = batchCount === PAGE_SIZE;
    return {
      hasMore: batchFull && withinPage < PAGE_LIMIT,
      hasNextPage: batchFull && withinPage >= PAGE_LIMIT,
    };
  }

  const search = useCallback(async (q: string) => {
    if (q.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setHasSearched(false);
      setHasMore(false);
      setHasNextPage(false);
      setOffset(0);
      setPage(1);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');
    setPage(1);
    setOffset(0);
    setHasMore(false);
    setHasNextPage(false);

    try {
      const res = await productsApi.searchProducts(q.trim(), PAGE_SIZE, 0);
      if (!controller.signal.aborted) {
        setResults(res.data);
        setHasSearched(true);
        const nextOffset = PAGE_SIZE;
        const paging = calcPaging(res.data.length, nextOffset, 1);
        setHasMore(paging.hasMore);
        setHasNextPage(paging.hasNextPage);
        setOffset(nextOffset);
      }
    } catch (err: unknown) {
      if (!controller.signal.aborted) {
        const isCancel = err && typeof err === 'object' && 'code' in err &&
          (err as { code: string }).code === 'ERR_CANCELED';
        if (!isCancel) {
          setError(getErrorMessage(err, t('search.error'), t));
        }
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [t]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const res = await productsApi.searchProducts(query.trim(), PAGE_SIZE, offset);
      if (res.data.length > 0) {
        setResults(prev => [...prev, ...res.data]);
        const nextOffset = offset + PAGE_SIZE;
        const paging = calcPaging(res.data.length, nextOffset, page);
        setHasMore(paging.hasMore);
        setHasNextPage(paging.hasNextPage);
        setOffset(nextOffset);
      } else {
        setHasMore(false);
        setHasNextPage(false);
      }
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, loading, offset, query, page]);

  const changePage = useCallback(async (newPage: number) => {
    if (newPage < 1 || loading || loadingMore) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPage(newPage);
    setResults([]);
    setHasMore(false);
    setHasNextPage(false);
    setExpandedId(null);
    setLoading(true);
    setError('');

    const pageStart = (newPage - 1) * PAGE_LIMIT;
    try {
      const res = await productsApi.searchProducts(query.trim(), PAGE_SIZE, pageStart);
      if (!controller.signal.aborted) {
        setResults(res.data);
        const nextOffset = pageStart + PAGE_SIZE;
        const paging = calcPaging(res.data.length, nextOffset, newPage);
        setHasMore(paging.hasMore);
        setHasNextPage(paging.hasNextPage);
        setOffset(nextOffset);
        scrollToTop();
      }
    } catch (err: unknown) {
      if (!controller.signal.aborted) {
        setError(getErrorMessage(err, t('search.error'), t));
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [loading, loadingMore, query, scrollToTop, t]);

  // IntersectionObserver — sentinel ko'ringanda loadMore
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '300px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    search(query);
  }

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

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
      setTrackingIds(prev => {
        const next = new Set(prev);
        next.delete(uzumId);
        return next;
      });
    }
  }

  const showPagination = hasSearched && !loading && (page > 1 || hasNextPage);

  return (
    <div className="w-full space-y-4 lg:space-y-6">
      <div ref={topRef} />
      <PageHint page="search">{t('hints.search')}</PageHint>

      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
          <MagnifyingGlassIcon className="w-6 h-6 lg:w-7 lg:h-7 text-primary" />
          {t('search.title')}
        </h1>
        <p className="text-base-content/50 text-sm mt-1">
          {t('search.subtitle')}
        </p>
      </div>

      {/* Search input */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/30" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input input-bordered w-full pl-10"
              placeholder={t('search.placeholder')}
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading || query.trim().length < MIN_QUERY_LENGTH}
            className="btn btn-primary min-w-[120px]"
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <><MagnifyingGlassIcon className="w-4 h-4" />{t('search.searchBtn')}</>
            )}
          </button>
        </form>
        {query.length > 0 && query.trim().length < MIN_QUERY_LENGTH && (
          <p className="text-xs text-base-content/40 mt-2">
            {t('search.minChars')}
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="alert alert-error alert-soft">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Loading skeleton — birinchi qidiruv / sahifa o'tish */}
      {loading && query.trim().length >= MIN_QUERY_LENGTH && (
        <SearchCardSkeleton count={8} />
      )}

      {/* Results grid */}
      {hasSearched && results.length > 0 && (
        <>
          <p className="text-sm text-base-content/50">
            {t('search.resultsCount').replace('{count}', String(results.length))}
            {page > 1 && (
              <span className="ml-2 text-base-content/30">· {page}-sahifa</span>
            )}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {results.map((product) => {
              const uzumId = product.productId ?? product.id;
              const isTracking = trackingIds.has(uzumId);
              const tracked = isTracked(uzumId);
              const isExpanded = expandedId === uzumId;
              const price = product.sellPrice ?? product.minSellPrice ?? null;
              const isFrom = !product.sellPrice && !!product.minSellPrice;

              return (
                <Fragment key={product.id}>
                  <div
                    className={`rounded-2xl bg-base-100 border overflow-hidden transition-all duration-200 ${
                      isExpanded
                        ? 'border-primary/40 shadow-lg shadow-primary/8'
                        : 'border-base-300/30 shadow-sm hover:shadow-lg hover:border-primary/25'
                    }`}
                  >
                    {/* Image area */}
                    <div
                      className="relative aspect-square bg-base-200/50 overflow-hidden cursor-pointer group"
                      onClick={() => navigate(`/products/${uzumId}`)}
                    >
                      {product.photoUrl ? (
                        <img
                          src={product.photoUrl}
                          alt={product.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MagnifyingGlassIcon className="w-12 h-12 text-base-content/10" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-200" />
                      {product.rating > 0 && (
                        <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-base-100/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full shadow-sm">
                          <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-[10px] font-bold text-base-content/80">{product.rating.toFixed(1)}</span>
                        </div>
                      )}
                      {tracked && (
                        <div className="absolute top-2 left-2 bg-success/90 backdrop-blur-sm px-2 py-0.5 rounded-full">
                          <span className="text-[10px] font-bold text-success-content uppercase tracking-wider">{t('search.tracked')}</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-3 space-y-2.5">
                      <h3
                        className="font-semibold text-sm leading-snug line-clamp-2 cursor-pointer hover:text-primary transition-colors min-h-[2.5rem]"
                        onClick={() => navigate(`/products/${uzumId}`)}
                        title={product.title}
                      >
                        {product.title}
                      </h3>

                      {((product.ordersQuantity != null && product.ordersQuantity > 0) || (product.reviewsAmount != null && product.reviewsAmount > 0)) && (
                        <div className="flex flex-wrap gap-1">
                          {product.ordersQuantity != null && product.ordersQuantity > 0 && (
                            <span className="inline-flex items-center text-[10px] bg-base-200/80 px-2 py-0.5 rounded-full text-base-content/50 font-medium">
                              {product.ordersQuantity.toLocaleString()} {t('search.orders')}
                            </span>
                          )}
                          {product.reviewsAmount != null && product.reviewsAmount > 0 && (
                            <span className="inline-flex items-center text-[10px] bg-base-200/80 px-2 py-0.5 rounded-full text-base-content/50 font-medium">
                              {product.reviewsAmount.toLocaleString()} {t('search.reviews')}
                            </span>
                          )}
                        </div>
                      )}

                      <div>
                        {price != null && price > 0 ? (
                          <>
                            <p className="font-bold text-lg tabular-nums leading-tight">
                              {isFrom && <span className="text-sm font-normal text-base-content/40 mr-1">{t('search.from')}</span>}
                              {formatPrice(price)}
                            </p>
                            <p className="text-[10px] text-base-content/35 uppercase tracking-wider">{t('common.som')}</p>
                          </>
                        ) : (
                          <p className="text-sm text-base-content/25">{t('search.noPrice')}</p>
                        )}
                      </div>

                      <div className="flex gap-1.5 pt-0.5">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : uzumId)}
                          className={`btn btn-sm flex-1 gap-1 text-xs ${
                            isExpanded ? 'btn-secondary' : 'btn-outline btn-secondary'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                          </svg>
                          {t('search.analyze')}
                        </button>
                        <button
                          onClick={() => handleTrack(product)}
                          disabled={isTracking || tracked}
                          className={`btn btn-sm flex-1 gap-1 text-xs ${
                            tracked ? 'btn-success' : 'btn-outline btn-primary'
                          }`}
                        >
                          {isTracking ? (
                            <span className="loading loading-spinner loading-xs" />
                          ) : tracked ? (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                          )}
                          {tracked ? t('search.tracked') : t('search.track')}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Inline expand panel */}
                  {isExpanded && (
                    <ExpandPanel
                      productId={uzumId}
                      onClose={() => setExpandedId(null)}
                      isTracked={tracked}
                    />
                  )}
                </Fragment>
              );
            })}
          </div>

          {/* Infinite scroll sentinel + loading skeleton */}
          <div ref={sentinelRef}>
            {loadingMore && <SearchCardSkeleton count={4} />}
          </div>

          {/* Pagination */}
          {showPagination && (
            <div className="flex items-center justify-center gap-2 pt-2 pb-4">
              <button
                onClick={() => changePage(page - 1)}
                disabled={page <= 1 || loading}
                className="btn btn-sm btn-ghost gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Oldingi
              </button>

              {/* Sahifa raqamlari */}
              <div className="flex items-center gap-1">
                {page > 2 && (
                  <>
                    <button onClick={() => changePage(1)} className="btn btn-sm btn-ghost w-9 h-9 p-0">1</button>
                    {page > 3 && <span className="text-base-content/30 px-1">···</span>}
                  </>
                )}
                {page > 1 && (
                  <button onClick={() => changePage(page - 1)} className="btn btn-sm btn-ghost w-9 h-9 p-0">
                    {page - 1}
                  </button>
                )}
                <button className="btn btn-sm btn-primary w-9 h-9 p-0 pointer-events-none">
                  {page}
                </button>
                {hasNextPage && (
                  <button onClick={() => changePage(page + 1)} className="btn btn-sm btn-ghost w-9 h-9 p-0">
                    {page + 1}
                  </button>
                )}
              </div>

              <button
                onClick={() => changePage(page + 1)}
                disabled={!hasNextPage || loading}
                className="btn btn-sm btn-ghost gap-1"
              >
                Keyingi
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {hasSearched && !loading && results.length === 0 && !error && (
        <div className="text-center py-12">
          <MagnifyingGlassIcon className="w-16 h-16 mx-auto text-base-content/10 mb-4" />
          <p className="text-lg font-semibold text-base-content/40">
            {t('search.noResults')}
          </p>
          <p className="text-sm text-base-content/30 mt-1">
            {t('search.noResultsHint')}
          </p>
        </div>
      )}

      {/* Initial state */}
      {!hasSearched && !loading && query.length === 0 && (
        <div className="text-center py-12">
          <MagnifyingGlassIcon className="w-16 h-16 mx-auto text-base-content/10 mb-4" />
          <p className="text-lg font-semibold text-base-content/40">
            {t('search.initial')}
          </p>
          <p className="text-sm text-base-content/30 mt-1">
            {t('search.initialHint')}
          </p>
        </div>
      )}
    </div>
  );
}

function SearchCardSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-base-100 border border-base-300/30 shadow-sm overflow-hidden">
          <div className="skeleton aspect-square w-full rounded-none" />
          <div className="p-3 space-y-2.5">
            <div className="skeleton h-3.5 w-full rounded-lg" />
            <div className="skeleton h-3.5 w-2/3 rounded-lg" />
            <div className="flex gap-1">
              <div className="skeleton h-4 w-20 rounded-full" />
              <div className="skeleton h-4 w-16 rounded-full" />
            </div>
            <div>
              <div className="skeleton h-5 w-28 rounded-lg" />
              <div className="skeleton h-3 w-10 rounded mt-1" />
            </div>
            <div className="flex gap-1.5 pt-0.5">
              <div className="skeleton h-8 flex-1 rounded-lg" />
              <div className="skeleton h-8 flex-1 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
