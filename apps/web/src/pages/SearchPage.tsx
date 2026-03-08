import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsApi } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';
import { MagnifyingGlassIcon } from '../components/icons';
import { useI18n } from '../i18n/I18nContext';
import { PageHint } from '../components/PageHint';
import { ProductSearchCard } from '../components/search/ProductSearchCard';
import { SearchSkeleton } from '../components/search/SearchSkeleton';
import type { SearchProduct } from '../api/types';
import { toast } from 'react-toastify';

const DEBOUNCE_MS = 300;
const DEFAULT_LIMIT = 24;
const MIN_QUERY_LENGTH = 2;

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

  async function handleTrack(uzumId: number) {
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

  function handleProductClick(uzumId: number) {
    navigate(`/products/${uzumId}`);
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
        <SearchSkeleton />
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
              return (
                <ProductSearchCard
                  key={product.id}
                  product={product}
                  isTracked={trackedIds.has(uzumId)}
                  onTrack={handleTrack}
                  isTrackLoading={trackingIds.has(uzumId)}
                  onClick={handleProductClick}
                />
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
