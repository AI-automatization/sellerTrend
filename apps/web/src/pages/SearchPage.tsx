import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsApi } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';
import { MagnifyingGlassIcon } from '../components/icons';
import { useI18n } from '../i18n/I18nContext';
import { PageHint } from '../components/PageHint';
import type { SearchProduct } from '../api/types';
import { toast } from 'react-toastify';

const DEBOUNCE_MS = 300;
const DEFAULT_LIMIT = 24;
const MIN_QUERY_LENGTH = 2;

function formatPrice(price: number): string {
  return price.toLocaleString('ru-RU');
}

export function SearchPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [trackingIds, setTrackingIds] = useState<Set<number>>(new Set());
  const [trackedIds, setTrackedIds] = useState<Set<number>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');
    try {
      const res = await productsApi.searchProducts(q.trim(), DEFAULT_LIMIT);
      if (!controller.signal.aborted) {
        setResults(res.data);
        setHasSearched(true);
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

  // Debounced search
  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      search(query);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, search]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  async function handleTrack(product: SearchProduct) {
    const uzumId = product.productId ?? product.id;
    if (trackedIds.has(uzumId) || trackingIds.has(uzumId)) return;

    setTrackingIds(prev => new Set(prev).add(uzumId));
    try {
      await productsApi.trackFromSearch(uzumId);
      setTrackedIds(prev => new Set(prev).add(uzumId));
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

  return (
    <div className="w-full space-y-4 lg:space-y-6">
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
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/30" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input input-bordered w-full pl-10"
            placeholder={t('search.placeholder')}
            autoFocus
          />
          {loading && (
            <span className="loading loading-spinner loading-sm absolute right-3 top-1/2 -translate-y-1/2 text-primary" />
          )}
        </div>
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

      {/* Loading skeleton */}
      {loading && !hasSearched && query.trim().length >= MIN_QUERY_LENGTH && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card bg-base-200/60 border border-base-300/50">
              <div className="card-body p-4 gap-3">
                <div className="skeleton h-40 w-full rounded-lg" />
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
                <div className="flex justify-between">
                  <div className="skeleton h-5 w-20" />
                  <div className="skeleton h-8 w-24 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results grid */}
      {hasSearched && results.length > 0 && (
        <>
          <p className="text-sm text-base-content/50">
            {t('search.resultsCount').replace('{count}', String(results.length))}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {results.map((product) => {
              const uzumId = product.productId ?? product.id;
              const isTracking = trackingIds.has(uzumId);
              const isTracked = trackedIds.has(uzumId);

              return (
                <div
                  key={product.id}
                  className="card bg-base-200/60 border border-base-300/50 hover:border-primary/30 transition-colors duration-200"
                >
                  <div className="card-body p-4 gap-3">
                    {/* Product image */}
                    {product.photoUrl ? (
                      <figure
                        className="rounded-lg overflow-hidden bg-base-300/30 aspect-square cursor-pointer"
                        onClick={() => navigate(`/products/${uzumId}`)}
                      >
                        <img
                          src={product.photoUrl}
                          alt={product.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </figure>
                    ) : (
                      <div
                        className="rounded-lg bg-base-300/30 aspect-square flex items-center justify-center cursor-pointer"
                        onClick={() => navigate(`/products/${uzumId}`)}
                      >
                        <MagnifyingGlassIcon className="w-10 h-10 text-base-content/15" />
                      </div>
                    )}

                    {/* Title */}
                    <h3
                      className="font-semibold text-sm leading-snug line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => navigate(`/products/${uzumId}`)}
                      title={product.title}
                    >
                      {product.title}
                    </h3>

                    {/* Stats row */}
                    <div className="flex flex-wrap gap-2 text-xs text-base-content/50">
                      {product.rating > 0 && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          {product.rating.toFixed(1)}
                        </span>
                      )}
                      {product.ordersQuantity != null && product.ordersQuantity > 0 && (
                        <span>{t('search.orders')}: {product.ordersQuantity.toLocaleString()}</span>
                      )}
                      {product.reviewsAmount != null && product.reviewsAmount > 0 && (
                        <span>{t('search.reviews')}: {product.reviewsAmount.toLocaleString()}</span>
                      )}
                    </div>

                    {/* Price + Track button */}
                    <div className="flex items-center justify-between mt-auto pt-1">
                      <div>
                        {product.sellPrice != null && product.sellPrice > 0 ? (
                          <span className="font-bold text-base tabular-nums">
                            {formatPrice(product.sellPrice)} <span className="text-xs font-normal text-base-content/40">{t('common.som')}</span>
                          </span>
                        ) : product.minSellPrice != null && product.minSellPrice > 0 ? (
                          <span className="font-bold text-base tabular-nums">
                            {t('search.from')} {formatPrice(product.minSellPrice)} <span className="text-xs font-normal text-base-content/40">{t('common.som')}</span>
                          </span>
                        ) : (
                          <span className="text-sm text-base-content/30">{t('search.noPrice')}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleTrack(product)}
                        disabled={isTracking || isTracked}
                        className={`btn btn-sm gap-1 ${
                          isTracked
                            ? 'btn-success'
                            : 'btn-outline btn-primary'
                        }`}
                      >
                        {isTracking ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : isTracked ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        )}
                        {isTracked ? t('search.tracked') : t('search.track')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
