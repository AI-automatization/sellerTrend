import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { discoveryApi, productsApi, seasonalApi, nicheApi } from '../api/client';
import { FireIcon, ArrowTrendingUpIcon } from '../components/icons';

// ─── Shared types ────────────────────────────────────────────────────────────

interface Run {
  id: string;
  category_id: string;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';
  total_products: number | null;
  processed: number | null;
  winner_count: number;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

interface Winner {
  rank: number;
  product_id: string;
  title: string;
  score: number | null;
  weekly_bought: number | null;
  orders_quantity: string | null;
  sell_price: string | null;
}

interface RunDetail extends Omit<Run, 'winner_count'> {
  winners: Winner[];
}

interface SeasonalEvent {
  id: string;
  season_name: string;
  season_start: number;
  season_end: number;
  avg_score_boost: number | null;
  peak_week: number | null;
}

interface NicheItem {
  product_id: string;
  title: string;
  niche_score: number;
  weekly_bought: number | null;
  orders_quantity: number | null;
  sell_price: number | null;
}

interface GapItem {
  product_id: string;
  title: string;
  weekly_bought: number | null;
  seller_count: number | null;
  gap_ratio: number;
}

const POPULAR_CATEGORIES = [
  { id: 10012, label: "Go'zallik" },
  { id: 10091, label: 'Makiyaj' },
  { id: 10165, label: 'Soch parvarishi' },
  { id: 11736, label: 'Soch kosmetikasi' },
  { id: 12888, label: 'Konturing' },
];

const MONTH_NAMES = [
  'Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn',
  'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek',
];

// ─── Helper components ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Run['status'] }) {
  const map = { PENDING: 'badge-warning', RUNNING: 'badge-info', DONE: 'badge-success', FAILED: 'badge-error' };
  const labels = { PENDING: 'Kutmoqda', RUNNING: 'Ishlayapti', DONE: 'Tayyor', FAILED: 'Xato' };
  return (
    <span className={`badge badge-sm ${map[status]}`}>
      {status === 'RUNNING' && <span className="loading loading-spinner loading-xs mr-1" />}
      {labels[status]}
    </span>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-base-content/30">—</span>;
  const color = score >= 6 ? 'text-success' : score >= 4 ? 'text-warning' : 'text-base-content/60';
  return <span className={`font-bold tabular-nums ${color}`}>{score.toFixed(2)}</span>;
}

function ProgressBar({ processed, total }: { processed: number | null; total: number | null }) {
  if (!total) return null;
  const pct = Math.min(Math.round(((processed ?? 0) / total) * 100), 100);
  return (
    <div className="flex items-center gap-2">
      <progress className="progress progress-info w-24 h-2" value={pct} max={100} />
      <span className="text-xs text-base-content/50">{pct}%</span>
    </div>
  );
}

// ─── Tab 1: Scanner (existing) ───────────────────────────────────────────────

function ScannerTab() {
  const [categoryInput, setCategoryInput] = useState('');
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRun, setSelectedRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadRuns() {
    try { const res = await discoveryApi.listRuns(); setRuns(res.data); } catch {}
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
    catch (err: any) { setError(err.response?.data?.message ?? 'Xato yuz berdi'); }
    finally { setStarting(false); }
  }

  async function openRun(run: Run) {
    try { const res = await discoveryApi.getRun(run.id); setSelectedRun(res.data); } catch {}
  }

  async function handleTrack(productId: string) {
    setTrackingId(productId);
    try { await productsApi.track(productId); } catch {}
    finally { setTrackingId(null); }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Start run form */}
        <div className="card bg-base-200 shadow-sm">
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
        <div className="card bg-base-200 shadow-sm">
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
                        <td className="text-xs text-base-content/50 whitespace-nowrap">{new Date(run.created_at).toLocaleString('uz-UZ')}</td>
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
                {selectedRun.finished_at && <p className="text-xs text-base-content/40 mt-0.5">{new Date(selectedRun.finished_at).toLocaleString('uz-UZ')}</p>}
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
                        <td><span className={`font-bold text-sm ${w.rank === 1 ? 'text-yellow-400' : w.rank === 2 ? 'text-gray-400' : w.rank === 3 ? 'text-amber-600' : 'text-base-content/40'}`}>{w.rank === 1 ? '🥇' : w.rank === 2 ? '🥈' : w.rank === 3 ? '🥉' : w.rank}</span></td>
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
                          <button onClick={() => handleTrack(w.product_id)} disabled={trackingId === w.product_id} className="btn btn-xs btn-outline btn-success">
                            {trackingId === w.product_id ? <span className="loading loading-spinner loading-xs" /> : '+ Track'}
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

// ─── Tab 2: Seasonal Calendar (F02) ─────────────────────────────────────────

function SeasonalCalendarTab() {
  const [events, setEvents] = useState<SeasonalEvent[]>([]);
  const [upcoming, setUpcoming] = useState<SeasonalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      seasonalApi.getCalendar().then((r) => setEvents(r.data?.events ?? r.data ?? [])),
      seasonalApi.getUpcoming().then((r) => setUpcoming(r.data?.events ?? r.data ?? [])),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const currentMonth = new Date().getMonth() + 1;

  function isActiveMonth(ev: SeasonalEvent, month: number) {
    if (ev.season_start <= ev.season_end) {
      return month >= ev.season_start && month <= ev.season_end;
    }
    return month >= ev.season_start || month <= ev.season_end;
  }

  if (loading) {
    return <div className="flex justify-center py-16"><span className="loading loading-dots loading-lg text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body p-4">
            <h2 className="card-title text-base gap-2">
              <span className="text-lg">📅</span> Yaqin 30 kunda
            </h2>
            <div className="flex flex-wrap gap-3 mt-2">
              {upcoming.map((ev) => (
                <div key={ev.id} className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 flex-1 min-w-48">
                  <p className="font-bold text-sm">{ev.season_name}</p>
                  <p className="text-xs text-base-content/50 mt-1">
                    {MONTH_NAMES[ev.season_start - 1]} — {MONTH_NAMES[ev.season_end - 1]}
                  </p>
                  {ev.avg_score_boost && (
                    <p className="text-xs text-success mt-1">
                      Score boost: +{Number(ev.avg_score_boost).toFixed(0)}%
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Heatmap calendar */}
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-base">Yillik mavsumiy kalendar</h2>
          <p className="text-xs text-base-content/40">
            Qaysi oylarda qaysi trendlar kuchayishini ko'ring
          </p>

          {events.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-base-content/40">
              <p>Mavsumiy ma'lumotlar hali kiritilmagan</p>
            </div>
          ) : (
            <div className="overflow-x-auto mt-4">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th className="min-w-40">Mavsum</th>
                    {MONTH_NAMES.map((m) => (
                      <th key={m} className="text-center text-xs px-1 w-10">{m}</th>
                    ))}
                    <th className="text-right">Boost</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id} className="hover">
                      <td className="font-medium text-sm">{ev.season_name}</td>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                        const active = isActiveMonth(ev, month);
                        const isPeak = ev.peak_week && month === Math.ceil(ev.peak_week / 4.33);
                        return (
                          <td key={month} className="text-center px-1">
                            <div
                              className={`w-6 h-6 rounded mx-auto flex items-center justify-center text-xs ${
                                isPeak
                                  ? 'bg-primary text-primary-content font-bold'
                                  : active
                                  ? 'bg-primary/30'
                                  : month === currentMonth
                                  ? 'bg-base-300'
                                  : ''
                              }`}
                            >
                              {isPeak ? '★' : active ? '●' : ''}
                            </div>
                          </td>
                        );
                      })}
                      <td className="text-right text-xs">
                        {ev.avg_score_boost ? (
                          <span className="text-success font-bold">+{Number(ev.avg_score_boost).toFixed(0)}%</span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab 3: Niche Finder (F04) ──────────────────────────────────────────────

function NicheFinderTab() {
  const [niches, setNiches] = useState<NicheItem[]>([]);
  const [gaps, setGaps] = useState<GapItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [catId, setCatId] = useState('');
  const [subTab, setSubTab] = useState<'niches' | 'gaps'>('niches');
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    const id = catId.trim() ? Number(catId.trim()) : undefined;
    try {
      const [nichesRes, gapsRes] = await Promise.all([
        nicheApi.findNiches(id),
        nicheApi.findGaps(id),
      ]);
      setNiches(nichesRes.data?.niches ?? nichesRes.data ?? []);
      setGaps(gapsRes.data?.gaps ?? gapsRes.data ?? []);
    } catch {}
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-base">Niche qidirish</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {POPULAR_CATEGORIES.map((cat) => (
              <button key={cat.id} onClick={() => setCatId(String(cat.id))}
                className="btn btn-xs btn-ghost border border-base-300">
                {cat.label} <span className="text-base-content/40 ml-1">#{cat.id}</span>
              </button>
            ))}
          </div>
          <form onSubmit={handleSearch} className="flex gap-3">
            <input type="text" value={catId} onChange={(e) => setCatId(e.target.value)}
              placeholder="Kategoriya ID (ixtiyoriy — hamma uchun)" className="input input-bordered flex-1" />
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? <span className="loading loading-spinner loading-sm" /> : 'Topish'}
            </button>
          </form>
        </div>
      </div>

      {searched && (
        <>
          {/* Sub-tabs */}
          <div role="tablist" className="tabs tabs-boxed bg-base-200 w-fit">
            <button role="tab" onClick={() => setSubTab('niches')}
              className={`tab ${subTab === 'niches' ? 'tab-active' : ''}`}>
              Niche'lar ({niches.length})
            </button>
            <button role="tab" onClick={() => setSubTab('gaps')}
              className={`tab ${subTab === 'gaps' ? 'tab-active' : ''}`}>
              Gap'lar ({gaps.length})
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><span className="loading loading-dots loading-lg text-primary" /></div>
          ) : subTab === 'niches' ? (
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body p-0">
                <div className="px-4 pt-4 pb-3 border-b border-base-300">
                  <h3 className="font-bold text-sm">Niche imkoniyatlari</h3>
                  <p className="text-xs text-base-content/40">Yuqori talab + past raqobat = yaxshi niche</p>
                </div>
                {niches.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-base-content/40">
                    <p>Niche topilmadi. Boshqa kategoriya sinab ko'ring.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>#</th><th>Mahsulot</th><th className="text-right">Niche Score</th>
                          <th className="text-right">Haftalik</th><th className="text-right">Narx</th>
                        </tr>
                      </thead>
                      <tbody>
                        {niches.map((n, i) => (
                          <tr key={n.product_id} className="hover">
                            <td className="text-base-content/40 font-bold text-sm">{i + 1}</td>
                            <td>
                              <Link to={`/products/${n.product_id}`} className="text-sm font-medium hover:text-primary transition-colors">
                                {n.title}
                              </Link>
                            </td>
                            <td className="text-right">
                              <span className={`font-bold tabular-nums ${n.niche_score >= 0.65 ? 'text-success' : n.niche_score >= 0.4 ? 'text-warning' : 'text-base-content/50'}`}>
                                {(n.niche_score * 100).toFixed(0)}%
                              </span>
                            </td>
                            <td className="text-right tabular-nums text-sm text-success">
                              {n.weekly_bought?.toLocaleString() ?? '—'}
                            </td>
                            <td className="text-right tabular-nums text-xs text-base-content/60">
                              {n.sell_price ? `${n.sell_price.toLocaleString()} so'm` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body p-0">
                <div className="px-4 pt-4 pb-3 border-b border-base-300">
                  <h3 className="font-bold text-sm">Demand-Supply Gap'lar</h3>
                  <p className="text-xs text-base-content/40">Talab yuqori lekin sotuvchilar kam bo'lgan mahsulotlar</p>
                </div>
                {gaps.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-base-content/40">
                    <p>Gap topilmadi.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>#</th><th>Mahsulot</th><th className="text-right">Haftalik talab</th>
                          <th className="text-right">Sotuvchilar</th><th className="text-right">Gap nisbati</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gaps.map((g, i) => (
                          <tr key={g.product_id} className="hover">
                            <td className="text-base-content/40 font-bold text-sm">{i + 1}</td>
                            <td>
                              <Link to={`/products/${g.product_id}`} className="text-sm font-medium hover:text-primary transition-colors">
                                {g.title}
                              </Link>
                            </td>
                            <td className="text-right tabular-nums text-sm text-success">
                              {g.weekly_bought?.toLocaleString() ?? '—'}
                            </td>
                            <td className="text-right tabular-nums text-sm">{g.seller_count ?? '—'}</td>
                            <td className="text-right">
                              <span className="badge badge-success badge-sm">{g.gap_ratio.toFixed(1)}x</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function DiscoveryPage() {
  const [tab, setTab] = useState<'scanner' | 'seasonal' | 'niche'>('scanner');

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ArrowTrendingUpIcon className="w-6 h-6 text-primary" />
          Category Discovery
        </h1>
        <p className="text-base-content/50 text-sm mt-1">
          Kategoriya skanerlash, mavsumiy trendlar va niche topish
        </p>
      </div>

      {/* Main tabs */}
      <div role="tablist" className="tabs tabs-boxed bg-base-200 w-fit">
        <button role="tab" onClick={() => setTab('scanner')}
          className={`tab ${tab === 'scanner' ? 'tab-active' : ''}`}>
          Skanerlash
        </button>
        <button role="tab" onClick={() => setTab('seasonal')}
          className={`tab ${tab === 'seasonal' ? 'tab-active' : ''}`}>
          Mavsumiy Kalendar
        </button>
        <button role="tab" onClick={() => setTab('niche')}
          className={`tab ${tab === 'niche' ? 'tab-active' : ''}`}>
          Niche Topish
        </button>
      </div>

      {tab === 'scanner' && <ScannerTab />}
      {tab === 'seasonal' && <SeasonalCalendarTab />}
      {tab === 'niche' && <NicheFinderTab />}
    </div>
  );
}
