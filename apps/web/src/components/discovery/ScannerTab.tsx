import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { discoveryApi, productsApi } from '../../api/client';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { logError } from '../../utils/handleError';
import { FireIcon, ArrowTrendingUpIcon } from '../icons';
import { StatusBadge } from './StatusBadge';
import { ScoreBadge } from './ScoreBadge';
import { ProgressBar } from './ProgressBar';
import type { Run, RunDetail } from './types';
import { POPULAR_CATEGORIES } from './types';

export function ScannerTab() {
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
    if (!input) { setError('URL yoki kategoriya ID kiriting'); return; }
    setError(''); setStarting(true);
    try { await discoveryApi.startRun(input); setCategoryInput(''); await loadRuns(); }
    catch (err: unknown) { setError(getErrorMessage(err)); }
    finally { setStarting(false); }
  }

  async function openRun(run: Run) {
    try { const res = await discoveryApi.getRun(run.id); setSelectedRun(res.data); } catch (e) { logError(e); }
  }

  const [trackedIds, setTrackedIds] = useState<Set<string>>(new Set());

  async function handleTrack(productId: string) {
    // Optimistic UI — mark as tracked immediately
    setTrackedIds((prev) => new Set(prev).add(productId));
    setTrackingId(productId);
    try {
      await productsApi.track(productId);
    } catch {
      // Rollback on failure
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
            <h2 className="card-title text-base">Yangi skanerlash</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {POPULAR_CATEGORIES.map((cat) => (
                <button key={cat.id} onClick={() => setCategoryInput(String(cat.id))}
                  className="btn btn-xs btn-ghost border border-base-300">
                  {cat.label} <span className="text-base-content/40 ml-1">#{cat.id}</span>
                </button>
              ))}
            </div>
            <form onSubmit={handleStart} className="flex gap-3">
              <input type="text" value={categoryInput} onChange={(e) => setCategoryInput(e.target.value)}
                placeholder="https://uzum.uz/ru/category/smartfony yoki 10012" className="input input-bordered flex-1" />
              <button type="submit" disabled={starting} className="btn btn-primary gap-2">
                {starting ? <span className="loading loading-spinner loading-sm" /> : <ArrowTrendingUpIcon className="w-4 h-4" />}
                {starting ? 'Boshlanmoqda...' : 'Boshlash'}
              </button>
            </form>
            {error && <p className="text-error text-sm mt-1">{error}</p>}
            <p className="text-xs text-base-content/40">
              Uzum saytida kategoriyani oching, URL ni ko'chiring va shu yerga yapishtirilg. ID avtomatik aniqlanadi.
            </p>
          </div>
        </div>

        {/* Runs list */}
        <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
          <div className="card-body p-0">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-base-300">
              <h2 className="card-title text-base gap-2">
                <FireIcon className="w-5 h-5 text-orange-400" /> Skanerlashlar
              </h2>
              <span className="badge badge-neutral">{runs.length}</span>
            </div>
            {loading ? (
              <div className="flex justify-center py-12"><span className="loading loading-dots loading-lg text-primary" /></div>
            ) : runs.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-2 text-base-content/40">
                <ArrowTrendingUpIcon className="w-10 h-10" />
                <p>Hali skanerlash yo'q. Yuqorida kategoriya kiriting.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm table-zebra">
                  <thead>
                    <tr>
                      <th>Kategoriya ID</th><th>Holat</th><th>Mahsulotlar</th>
                      <th>G'oliblar</th><th>Sana</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => (
                      <tr key={run.id} className="hover">
                        <td className="font-mono font-medium">#{run.category_id}</td>
                        <td>
                          <div className="flex flex-col gap-1">
                            <StatusBadge status={run.status} />
                            {run.status === 'RUNNING' && <ProgressBar processed={run.processed} total={run.total_products} />}
                          </div>
                        </td>
                        <td className="tabular-nums text-sm">{run.total_products?.toLocaleString() ?? '—'}</td>
                        <td>{run.winner_count > 0 ? <span className="badge badge-success badge-sm">Top {run.winner_count}</span> : <span className="text-base-content/30">—</span>}</td>
                        <td className="text-xs text-base-content/50 whitespace-nowrap">{new Date(run.created_at).toLocaleString('ru-RU')}</td>
                        <td>{run.status === 'DONE' && <button onClick={() => openRun(run)} className="btn btn-xs btn-primary">Ko'rish</button>}</td>
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
                <p className="text-xs text-base-content/40">Kategoriya #{selectedRun.category_id}</p>
                <h2 className="font-bold">Top {selectedRun.winners.length} mahsulot</h2>
                {selectedRun.finished_at && <p className="text-xs text-base-content/40 mt-0.5">{new Date(selectedRun.finished_at).toLocaleString('ru-RU')}</p>}
              </div>
              <button onClick={() => setSelectedRun(null)} className="btn btn-ghost btn-sm btn-square">✕</button>
            </div>
            <div className="overflow-y-auto flex-1">
              {selectedRun.winners.length === 0 ? (
                <div className="flex justify-center py-12 text-base-content/40">G'oliblar topilmadi</div>
              ) : (
                <table className="table table-sm w-full">
                  <thead className="sticky top-0 bg-base-200 z-10">
                    <tr><th className="w-8">#</th><th>Mahsulot</th><th className="text-right">Score</th><th className="text-right">Faollik</th><th className="text-right">Narx</th><th></th></tr>
                  </thead>
                  <tbody>
                    {selectedRun.winners.map((w) => (
                      <tr key={w.product_id} className="hover">
                        <td><span className={`font-bold text-sm ${w.rank === 1 ? 'text-yellow-400' : w.rank === 2 ? 'text-gray-400' : w.rank === 3 ? 'text-amber-600' : 'text-base-content/40'}`}>{w.rank === 1 ? '\u{1F947}' : w.rank === 2 ? '\u{1F948}' : w.rank === 3 ? '\u{1F949}' : w.rank}</span></td>
                        <td>
                          <div className="max-w-xs">
                            <Link to={`/products/${w.product_id}`} onClick={() => setSelectedRun(null)} className="text-sm font-medium leading-tight line-clamp-2 hover:text-primary transition-colors">{w.title}</Link>
                            <p className="text-xs text-base-content/40 mt-0.5">#{w.product_id}</p>
                          </div>
                        </td>
                        <td className="text-right"><ScoreBadge score={w.score} /></td>
                        <td className="text-right tabular-nums text-sm">{w.weekly_bought != null ? <span className="text-success">{w.weekly_bought.toLocaleString()}</span> : <span className="text-base-content/30">—</span>}</td>
                        <td className="text-right tabular-nums text-xs text-base-content/60">{w.sell_price ? `${Number(w.sell_price).toLocaleString()} so'm` : '—'}</td>
                        <td>
                          <button
                            onClick={() => handleTrack(w.product_id)}
                            disabled={trackingId === w.product_id || trackedIds.has(w.product_id)}
                            className={`btn btn-xs ${trackedIds.has(w.product_id) ? 'btn-success no-animation' : 'btn-outline btn-success'}`}
                          >
                            {trackingId === w.product_id
                              ? <span className="loading loading-spinner loading-xs" />
                              : trackedIds.has(w.product_id) ? '\u2713 Tracked' : '+ Track'}
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
