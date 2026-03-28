import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { discoveryApi, productsApi } from '../../api/client';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { logError } from '../../utils/handleError';
import { useI18n } from '../../i18n/I18nContext';
import { FireIcon, ArrowTrendingUpIcon } from '../icons';
import { StatusBadge } from './StatusBadge';
import { ScoreBadge } from './ScoreBadge';
import { ProgressBar } from './ProgressBar';
import type { Run, RunDetail } from './types';
import { POPULAR_CATEGORIES } from './types';
import { PlanGuard } from '../PlanGuard';

export function ScannerTab() {
  const { t } = useI18n();
  const [categoryInput, setCategoryInput] = useState('');
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRun, setSelectedRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadRuns() {
    try { const res = await discoveryApi.listRuns(); setRuns(res.data); } catch (e) { logError(e); }
  }

  useEffect(() => {
    loadRuns().finally(() => setLoading(false));
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    const hasActive = runs.some((r) => r.status === 'PENDING' || r.status === 'RUNNING');
    if (hasActive) {
      if (!pollRef.current) pollRef.current = setInterval(() => loadRuns(), 3000);
    } else {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
  }, [runs]);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    const input = categoryInput.trim();
    if (!input) { setError(t('discovery.categoryIdPlaceholder')); return; }
    // Plain text (not a number and not a URL) — must select from suggestions
    if (!/^\d+$/.test(input) && !input.startsWith('http')) {
      setError(t('discovery.selectFromSuggestions'));
      return;
    }
    setError(''); setStarting(true);
    try { await discoveryApi.startRun(input); setCategoryInput(''); await loadRuns(); }
    catch (err: unknown) { setError(getErrorMessage(err)); }
    finally { setStarting(false); }
  }

  async function openRun(run: Run) {
    try { const res = await discoveryApi.getRun(run.id); setSelectedRun(res.data); } catch (e) { logError(e); }
  }

  // Category autocomplete state
  const [catSuggestions, setCatSuggestions] = useState<Array<{ id: number; title: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim() || q.startsWith('http') || /^\d+$/.test(q.trim())) {
      setCatSuggestions([]); setShowSuggestions(false); return;
    }
    try {
      const res = await discoveryApi.searchCategories(q);
      setCatSuggestions(res.data ?? []);
      setShowSuggestions((res.data ?? []).length > 0);
    } catch { setCatSuggestions([]); setShowSuggestions(false); }
  }, []);

  function handleCategoryInput(value: string) {
    setCategoryInput(value);
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    suggestDebounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  }

  function selectCategory(cat: { id: number; title: string }) {
    setCategoryInput(String(cat.id));
    setCatSuggestions([]); setShowSuggestions(false);
    // Auto-submit after selection
    setTimeout(() => {
      const form = autocompleteRef.current?.closest('form');
      form?.requestSubmit();
    }, 0);
  }

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const [trackedIds, setTrackedIds] = useState<Set<string>>(new Set());

  async function handleTrack(productId: string) {
    setTrackedIds((prev) => new Set(prev).add(productId));
    setTrackingId(productId);
    try {
      await productsApi.track(productId);
    } catch {
      setTrackedIds((prev) => { const s = new Set(prev); s.delete(productId); return s; });
    } finally {
      setTrackingId(null);
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Start run form */}
        <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
          <div className="card-body">
            <h2 className="card-title text-base">{t('discovery.newScan')}</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {POPULAR_CATEGORIES.map((cat) => (
                <button key={cat.id} onClick={() => setCategoryInput(cat.url ?? String(cat.id))}
                  className="btn btn-xs btn-ghost border border-base-300">
                  {t(cat.labelKey)} <span className="text-base-content/40 ml-1">#{cat.id}</span>
                </button>
              ))}
            </div>
            <form onSubmit={handleStart} className="flex gap-3">
              <div className="relative flex-1" ref={autocompleteRef}>
                <input type="text" value={categoryInput}
                  onChange={(e) => handleCategoryInput(e.target.value)}
                  onFocus={() => catSuggestions.length > 0 && setShowSuggestions(true)}
                  placeholder={t('discovery.categoryIdPlaceholder')}
                  className="input input-bordered w-full" />
                {showSuggestions && (
                  <ul className="absolute z-50 w-full mt-1 bg-base-100 border border-base-300 rounded-xl shadow-lg overflow-hidden">
                    {catSuggestions.map((cat) => (
                      <li key={cat.id}>
                        <button type="button" onMouseDown={() => selectCategory(cat)}
                          className="w-full text-left px-4 py-2 hover:bg-base-200 flex items-center justify-between gap-2">
                          <span className="text-sm">{cat.title}</span>
                          <span className="text-xs text-base-content/40 font-mono shrink-0">#{cat.id}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button type="submit" disabled={starting} className="btn btn-primary gap-2">
                {starting ? <span className="loading loading-spinner loading-sm" /> : <ArrowTrendingUpIcon className="w-4 h-4" />}
                {starting ? t('discovery.startingBtn') : t('discovery.startBtn')}
              </button>
            </form>
            {error && <p className="text-error text-sm mt-1">{error}</p>}
            <p className="text-xs text-base-content/40">
              {t('discovery.scanner.hint')}
            </p>
          </div>
        </div>

        {/* Runs list */}
        <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
          <div className="card-body p-0">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-base-300">
              <h2 className="card-title text-base gap-2">
                <FireIcon className="w-5 h-5 text-orange-400" /> {t('discovery.scansHeader')}
              </h2>
              <span className="badge badge-neutral">{runs.length}</span>
            </div>
            {loading ? (
              <div className="flex justify-center py-12"><span className="loading loading-dots loading-lg text-primary" /></div>
            ) : runs.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-2 text-base-content/40">
                <ArrowTrendingUpIcon className="w-10 h-10" />
                <p>{t('discovery.empty')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm table-zebra">
                  <thead>
                    <tr>
                      <th>{t('discovery.col.categoryId')}</th>
                      <th>{t('discovery.col.status')}</th>
                      <th>{t('discovery.col.products')}</th>
                      <th>{t('discovery.col.winners')}</th>
                      <th>{t('discovery.col.date')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => (
                      <tr key={run.id} className="hover">
                        <td>
                          <p className="font-medium text-sm">{run.category_name ?? `${t('discovery.scanner.catPrefix')}${run.category_id}`}</p>
                          {run.category_name && <p className="text-xs text-base-content/40 font-mono">#{run.category_id}</p>}
                        </td>
                        <td>
                          <div className="flex flex-col gap-1">
                            <StatusBadge status={run.status} />
                            {run.status === 'RUNNING' && <ProgressBar processed={run.processed} total={run.total_products} />}
                          </div>
                        </td>
                        <td className="tabular-nums text-sm">{run.total_products?.toLocaleString() ?? '—'}</td>
                        <td>{run.winner_count > 0 ? <span className="badge badge-success badge-sm">Top {run.winner_count}</span> : <span className="text-base-content/30">—</span>}</td>
                        <td className="text-xs text-base-content/50 whitespace-nowrap">{new Date(run.created_at).toLocaleString('ru-RU')}</td>
                        <td>{run.status === 'DONE' && <button onClick={() => openRun(run)} className="btn btn-xs btn-primary">{t('discovery.viewBtn')}</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Winners drawer */}
      {selectedRun && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50" onClick={() => setSelectedRun(null)} />
          <div className="w-full max-w-2xl bg-base-200 h-full overflow-y-auto flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-base-300">
              <div>
                <h2 className="font-bold">{selectedRun.category_name ?? `${t('discovery.scanner.catPrefix')}${selectedRun.category_id}`}</h2>
                <p className="text-xs text-base-content/40">
                  {selectedRun.category_name && `#${selectedRun.category_id} · `}
                  Top {selectedRun.winners.length} {t('discovery.scanner.topProducts')}
                  {selectedRun.finished_at && ` · ${new Date(selectedRun.finished_at).toLocaleString('ru-RU')}`}
                </p>
              </div>
              <button onClick={() => setSelectedRun(null)} className="btn btn-ghost btn-sm btn-square">✕</button>
            </div>
            <div className="overflow-y-auto flex-1">
              {selectedRun.winners.length === 0 ? (
                <div className="flex justify-center py-12 text-base-content/40">{t('discovery.winnersDrawer.empty')}</div>
              ) : (
                <table className="table table-sm w-full">
                  <thead className="sticky top-0 bg-base-200 z-10">
                    <tr>
                      <th className="w-8">#</th>
                      <th>{t('discovery.scanner.winners.col.product')}</th>
                      <th className="text-right">{t('discovery.scanner.winners.col.score')}</th>
                      <th className="text-right">{t('discovery.scanner.winners.col.activity')}</th>
                      <th className="text-right">{t('discovery.scanner.winners.col.price')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRun.winners.map((w) => (
                      <tr key={w.product_id} className="hover">
                        <td><span className={`font-bold text-sm ${w.rank === 1 ? 'text-yellow-400' : w.rank === 2 ? 'text-gray-400' : w.rank === 3 ? 'text-amber-600' : 'text-base-content/40'}`}>{w.rank === 1 ? '\u{1F947}' : w.rank === 2 ? '\u{1F948}' : w.rank === 3 ? '\u{1F949}' : w.rank}</span></td>
                        <td>
                          <div className="flex items-center gap-2 max-w-xs">
                            {w.photo_url ? (
                              <img
                                src={w.photo_url}
                                alt=""
                                className="w-8 h-8 rounded-lg object-cover shrink-0 bg-base-300/40"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-base-300/20 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <Link to={`/products/${w.product_id}`} onClick={() => setSelectedRun(null)} className="text-sm font-medium leading-tight line-clamp-2 hover:text-primary transition-colors">{w.title}</Link>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs text-base-content/40">#{w.product_id}</p>
                                {w.shop_title && <p className="text-xs text-base-content/30 truncate max-w-[120px]">{w.shop_title.replace(/^"|"$/g, '')}</p>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-right"><ScoreBadge score={w.score} /></td>
                        <td className="text-right tabular-nums text-sm">{w.weekly_bought != null ? <span className="text-success">{w.weekly_bought.toLocaleString()}</span> : <span className="text-base-content/30">—</span>}</td>
                        <td className="text-right tabular-nums text-xs text-base-content/60">{w.sell_price ? `${Number(w.sell_price).toLocaleString()} ${t('common.som')}` : '—'}</td>
                        <td>
                          <button
                            onClick={() => handleTrack(w.product_id)}
                            disabled={trackingId === w.product_id || trackedIds.has(w.product_id)}
                            className={`btn btn-xs ${trackedIds.has(w.product_id) ? 'btn-success no-animation' : 'btn-outline btn-success'}`}
                          >
                            {trackingId === w.product_id
                              ? <span className="loading loading-spinner loading-xs" />
                              : trackedIds.has(w.product_id) ? t('discovery.scanner.tracked') : t('discovery.scanner.trackBtn')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function ScannerTabGuarded() {
  return (
    <PlanGuard requiredPlan="PRO">
      <ScannerTab />
    </PlanGuard>
  );
}
