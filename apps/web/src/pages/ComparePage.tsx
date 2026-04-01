import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { uzumApi } from '../api/client';
import { useI18n } from '../i18n/I18nContext';
import { getErrorMessage } from '../utils/getErrorMessage';
import { MagnifyingGlassIcon, ScaleIcon } from '../components/icons';
import type { AnalyzeResult } from '../api/types';

const MAX_PRODUCTS = 3;

interface CompareProduct {
  product_id: number;
  title: string;
  photo_url?: string | null;
  sell_price: number | null;
  score: number;
  weekly_bought: number | null;
  orders_quantity: number | null;
  rating: number | null;
  feedback_quantity: number | null;
  total_available_amount?: number;
}

type CompareField = {
  key: keyof CompareProduct;
  labelKey: string;
  format: (v: unknown) => string;
  higherIsBetter: boolean;
};

const COMPARE_FIELDS: CompareField[] = [
  { key: 'sell_price', labelKey: 'dashboard.price', format: (v) => v != null ? `${Number(v).toLocaleString()} UZS` : '-', higherIsBetter: false },
  { key: 'score', labelKey: 'dashboard.score', format: (v) => v != null ? Number(v).toFixed(2) : '-', higherIsBetter: true },
  { key: 'weekly_bought', labelKey: 'dashboard.weekly', format: (v) => v != null ? String(v) : '-', higherIsBetter: true },
  { key: 'orders_quantity', labelKey: 'dashboard.orders', format: (v) => v != null ? Number(v).toLocaleString() : '-', higherIsBetter: true },
  { key: 'rating', labelKey: 'dashboard.rating', format: (v) => v != null ? Number(v).toFixed(1) : '-', higherIsBetter: true },
  { key: 'feedback_quantity', labelKey: 'dashboard.review', format: (v) => v != null ? Number(v).toLocaleString() : '-', higherIsBetter: true },
  { key: 'total_available_amount', labelKey: 'compare.stock', format: (v) => v != null ? Number(v).toLocaleString() : '-', higherIsBetter: true },
];

function parseIdsFromParams(sp: URLSearchParams): number[] {
  const raw = sp.get('ids');
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0)
    .slice(0, MAX_PRODUCTS);
}

function extractProductId(input: string): string | null {
  const trimmed = input.trim();

  // Pure numeric ID
  if (/^\d+$/.test(trimmed)) return trimmed;

  // Uzum URL: extract ID from slug ending with -{id} (greedy — oxirgi raqamni olish)
  const urlMatch = trimmed.match(/product\/.*-(\d+)/);
  if (urlMatch) return urlMatch[1];

  // Fallback: any trailing number group
  const numMatch = trimmed.match(/(\d+)\s*$/);
  if (numMatch) return numMatch[1];

  return null;
}

function findWinner(products: CompareProduct[], field: CompareField): number | null {
  const values = products.map((p) => {
    const v = p[field.key];
    return v != null ? Number(v) : null;
  });

  const validValues = values.filter((v): v is number => v !== null && !isNaN(v));
  if (validValues.length < 2) return null;

  const best = field.higherIsBetter
    ? Math.max(...validValues)
    : Math.min(...validValues);

  const winnerIdx = values.indexOf(best);
  return winnerIdx >= 0 ? winnerIdx : null;
}

export function ComparePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const [products, setProducts] = useState<CompareProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const fetchProduct = useCallback(async (productId: number): Promise<CompareProduct | null> => {
    try {
      const res = await uzumApi.analyzeById(String(productId));
      const data: AnalyzeResult = res.data;
      return {
        product_id: data.product_id,
        title: data.title,
        photo_url: data.photo_url,
        sell_price: data.sell_price,
        score: data.score,
        weekly_bought: data.weekly_bought,
        orders_quantity: data.orders_quantity,
        rating: data.rating,
        feedback_quantity: data.feedback_quantity,
        total_available_amount: data.total_available_amount,
      };
    } catch {
      return null;
    }
  }, []);

  // Load products from URL params on mount
  useEffect(() => {
    const ids = parseIdsFromParams(sp);
    if (ids.length === 0) return;

    setLoading(true);
    setError('');

    Promise.all(ids.map(fetchProduct))
      .then((results) => {
        const valid = results.filter((r): r is CompareProduct => r !== null);
        setProducts(valid);
        if (valid.length === 0) {
          setError(t('common.error'));
        }
      })
      .catch((err) => setError(getErrorMessage(err, t('common.error'), t)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateUrlParams(prods: CompareProduct[]) {
    const ids = prods.map((p) => p.product_id).join(',');
    navigate(`/compare${ids ? `?ids=${ids}` : ''}`, { replace: true });
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!inputValue.trim()) return;
    if (products.length >= MAX_PRODUCTS) return;

    const productId = extractProductId(inputValue);
    if (!productId) {
      setError(t('common.error'));
      return;
    }

    // Check for duplicates
    const numId = parseInt(productId, 10);
    if (products.some((p) => p.product_id === numId)) {
      setInputValue('');
      return;
    }

    setAddLoading(true);
    setError('');

    const result = await fetchProduct(numId);
    if (result) {
      const updated = [...products, result];
      setProducts(updated);
      updateUrlParams(updated);
      setInputValue('');
    } else {
      setError(t('common.error'));
    }
    setAddLoading(false);
  }

  function removeProduct(idx: number) {
    const updated = products.filter((_, i) => i !== idx);
    setProducts(updated);
    updateUrlParams(updated);
  }

  // Empty state
  if (!loading && products.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center">
            <ScaleIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-heading">{t('compare.title')}</h1>
            <p className="text-sm text-base-content/50">{t('compare.empty')}</p>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAddProduct} className="flex gap-2 max-w-lg">
          <input
            type="text"
            className="input input-bordered flex-1"
            placeholder={t('compare.inputPlaceholder')}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={addLoading}>
            {addLoading ? <span className="loading loading-spinner loading-sm" /> : <MagnifyingGlassIcon className="w-5 h-5" />}
            {t('compare.addProduct')}
          </button>
        </form>

        <div className="card bg-base-200/50 border border-base-300/30">
          <div className="card-body items-center text-center py-16">
            <ScaleIcon className="w-16 h-16 text-base-content/15" />
            <p className="text-base-content/40 text-sm mt-4">{t('compare.empty')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center">
          <ScaleIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-heading">{t('compare.title')}</h1>
          <p className="text-sm text-base-content/50">
            {products.length}/{MAX_PRODUCTS} {t('compare.products')}
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* Add product form */}
      {products.length < MAX_PRODUCTS && (
        <form onSubmit={handleAddProduct} className="flex gap-2 max-w-lg">
          <input
            type="text"
            className="input input-bordered flex-1"
            placeholder={t('compare.inputPlaceholder')}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm lg:btn-md" disabled={addLoading}>
            {addLoading ? <span className="loading loading-spinner loading-sm" /> : null}
            {t('compare.addProduct')}
          </button>
        </form>
      )}
      {products.length >= MAX_PRODUCTS && (
        <p className="text-sm text-warning">{t('compare.max')}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : (
        <>
          {/* Product Cards — side by side on desktop, vertical on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p, idx) => (
              <div key={p.product_id} className="card bg-base-200/50 border border-base-300/30 shadow-sm">
                <div className="card-body p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {p.photo_url ? (
                        <img
                          src={p.photo_url}
                          alt={p.title}
                          className="w-14 h-14 rounded-lg object-cover shrink-0 bg-base-300"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-base-300/50 flex items-center justify-center shrink-0">
                          <span className="text-base-content/20 text-xs">IMG</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm leading-tight line-clamp-2">{p.title}</h3>
                        <p className="text-xs text-base-content/40 mt-1">ID: {p.product_id}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeProduct(idx)}
                      className="btn btn-ghost btn-xs btn-square text-base-content/30 hover:text-error"
                      aria-label={t('common.delete')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {/* Score badge */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`badge ${p.score >= 6 ? 'badge-success' : p.score >= 4 ? 'badge-warning' : 'badge-ghost'} badge-lg font-bold`}>
                      {p.score.toFixed(2)}
                    </span>
                    <span className="text-xs text-base-content/40">{t('dashboard.score')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison Table */}
          {products.length >= 2 && (
            <div className="card bg-base-200/50 border border-base-300/30 shadow-sm overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th className="text-base-content/50 text-xs">{t('compare.field')}</th>
                    {products.map((p) => (
                      <th key={p.product_id} className="text-center text-xs">
                        <span className="truncate block max-w-[140px]">{p.title}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_FIELDS.map((field) => {
                    const winnerIdx = findWinner(products, field);
                    return (
                      <tr key={field.key}>
                        <td className="text-base-content/60 text-sm font-medium">{t(field.labelKey)}</td>
                        {products.map((p, idx) => {
                          const isWinner = winnerIdx === idx;
                          return (
                            <td
                              key={p.product_id}
                              className={`text-center text-sm font-semibold ${isWinner ? 'bg-success/10 text-success' : ''}`}
                            >
                              <span className="flex items-center justify-center gap-1">
                                {field.format(p[field.key])}
                                {isWinner && (
                                  <span className="badge badge-success badge-xs">{t('compare.winner')}</span>
                                )}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
