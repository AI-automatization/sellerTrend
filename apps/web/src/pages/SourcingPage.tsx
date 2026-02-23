import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { sourcingApi } from '../api/client';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CurrencyRates { USD: number; CNY: number; EUR: number }

interface CargoProvider {
  id: string; name: string; origin: string; method: string;
  rate_per_kg: number; delivery_days: number; min_weight_kg: number | null;
}

interface CalcResult {
  item_cost_usd: number; total_item_cost_usd: number; cargo_cost_usd: number;
  customs_usd: number; vat_usd: number; landed_cost_usd: number; landed_cost_uzs: number;
  usd_rate: number; delivery_days: number; provider_name: string;
  sell_price_uzs?: number; profit_uzs?: number; gross_margin_pct?: number; roi_pct?: number;
}

interface SearchItem {
  title: string; price: string; source: string; link: string; image: string; store: string;
}

interface HistoryItem {
  id: string; item_name: string | null; item_cost_usd: number; weight_kg: number;
  quantity: number; landed_cost_usd: number; landed_cost_uzs: number;
  gross_margin_pct: number | null; roi_pct: number | null; provider: string | null; created_at: string;
}

interface SourcingJob {
  id: string; status: string; query: string; platforms: string[]; product_id: string;
  result_count: number; created_at: string; finished_at: string | null;
}

interface SourcingJobDetail {
  id: string; status: string; query: string; platforms: string[];
  product_id: string; created_at: string; finished_at: string | null;
  results: SourcingResult[];
}

interface SourcingResult {
  id: string; platform: string; platform_name: string; country: string;
  title: string; price_usd: number; price_local: number | null; currency: string;
  url: string; image_url: string | null; seller_name: string | null;
  seller_rating: number | null; min_order_qty: number | null;
  shipping_days: number | null; ai_match_score: number | null;
  ai_notes: string | null; rank: number | null;
  cargo: {
    landed_cost_usd: number; landed_cost_uzs: number; cargo_cost_usd: number;
    customs_usd: number; vat_usd: number; margin_pct: number | null;
    roi_pct: number | null; provider: string | null;
  } | null;
}

const METHOD_ICONS: Record<string, string> = {
  AVIA: '✈️', CARGO: '🚢', RAIL: '🚂', AUTO: '🚛', TURKEY: '🌉',
};

const COUNTRY_FLAGS: Record<string, string> = {
  CN: '🇨🇳', DE: '🇩🇪', US: '🇺🇸',
};

function fmt(n: number, digits = 0) {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
function fmtUSD(n: number) { return '$' + fmt(n, 2); }
function fmtUZS(n: number) { return fmt(Math.round(n)) + ' so\'m'; }

function matchColor(score: number | null) {
  if (score == null) return 'text-base-content/50';
  if (score >= 0.8) return 'text-success';
  if (score >= 0.5) return 'text-warning';
  return 'text-error';
}

function marginColor(margin: number | null) {
  if (margin == null) return '';
  if (margin >= 30) return 'text-success';
  if (margin >= 15) return 'text-warning';
  return 'text-error';
}

type Tab = 'calculator' | 'search' | 'import' | 'jobs' | 'history';

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SourcingPage() {
  const [searchParams] = useSearchParams();
  const prefillName = searchParams.get('q') ?? '';
  const prefillPrice = searchParams.get('price') ?? '';
  const prefillProductId = searchParams.get('product_id') ?? '';

  const [tab, setTab] = useState<Tab>(prefillProductId ? 'import' : prefillName ? 'calculator' : 'calculator');
  const [rates, setRates] = useState<CurrencyRates | null>(null);
  const [providers, setProviders] = useState<CargoProvider[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      sourcingApi.getCurrencyRates(),
      sourcingApi.getCargoProviders(),
    ]).then(([r, p]) => {
      setRates(r.data);
      setProviders(p.data);
    }).finally(() => setRatesLoading(false));
  }, []);

  async function refreshRates() {
    setRatesLoading(true);
    try {
      const r = await sourcingApi.refreshRates();
      setRates(r.data);
    } finally {
      setRatesLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sourcing Engine</h1>
          <p className="text-base-content/60 text-sm mt-1">
            Xitoy / Yevropa narxlarini solishtiring, AI orqali eng yaxshi variantni toping
          </p>
        </div>

        {/* Live currency rates */}
        <div className="flex items-center gap-3 bg-base-200 rounded-xl px-4 py-2 text-sm">
          {ratesLoading ? (
            <span className="loading loading-spinner loading-xs" />
          ) : rates ? (
            <>
              <span className="font-medium">USD</span>
              <span className="text-primary font-bold">{fmt(rates.USD)}</span>
              <span className="text-base-content/30">|</span>
              <span className="font-medium">CNY</span>
              <span className="text-warning font-bold">{fmt(rates.CNY)}</span>
              <span className="text-base-content/30">|</span>
              <span className="font-medium">EUR</span>
              <span className="text-success font-bold">{fmt(rates.EUR)}</span>
              <span className="text-xs text-base-content/40">so'm</span>
            </>
          ) : <span className="text-base-content/40 text-xs">Kurslar yuklanmadi</span>}
          <button onClick={refreshRates} className="btn btn-ghost btn-xs" title="CBU dan yangilash">↻</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-base-200 w-fit">
        {([
          ['calculator', '🧮 Kalkulyator'],
          ['search', '🔍 Tez Qidirish'],
          ['import', '🌍 Import Tahlil'],
          ['jobs', '📊 Qidiruvlar'],
          ['history', '📋 Tarix'],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`tab ${tab === t ? 'tab-active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'calculator' && (
        <CargoCalculator
          providers={providers}
          rates={rates}
          prefillName={prefillName}
          prefillItemCostUzs={prefillPrice ? parseFloat(prefillPrice) : undefined}
        />
      )}
      {tab === 'search' && <ExternalSearch initialQuery={prefillName} />}
      {tab === 'import' && (
        <ImportAnalysis
          initialProductId={prefillProductId ? parseInt(prefillProductId) : undefined}
          initialTitle={prefillName}
        />
      )}
      {tab === 'jobs' && <JobsList />}
      {tab === 'history' && <CalculationHistory />}
    </div>
  );
}

// ─── Import Analysis (Full Pipeline) ─────────────────────────────────────────

function ImportAnalysis({
  initialProductId,
  initialTitle,
}: {
  initialProductId?: number;
  initialTitle?: string;
}) {
  const [productId, setProductId] = useState(initialProductId ? String(initialProductId) : '');
  const [title, setTitle] = useState(initialTitle ?? '');
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SourcingJobDetail | null>(null);
  const [error, setError] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  // Auto-start if we have product_id from URL
  useEffect(() => {
    if (initialProductId && initialTitle && !jobId) {
      handleStart();
    }
  }, []); // eslint-disable-line

  async function handleStart() {
    if (!productId || !title) {
      setError('Product ID va nomi kerak');
      return;
    }
    setLoading(true);
    setError('');
    setJob(null);
    try {
      const res = await sourcingApi.createJob({
        product_id: parseInt(productId),
        product_title: title,
      });
      setJobId(res.data.job_id);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Xato yuz berdi');
    } finally {
      setLoading(false);
    }
  }

  // Poll for job completion
  useEffect(() => {
    if (!jobId) return;
    let active = true;

    async function poll() {
      while (active) {
        try {
          const res = await sourcingApi.getJob(jobId!);
          if (!active) return;
          setJob(res.data);
          if (res.data.status === 'DONE' || res.data.status === 'FAILED') return;
        } catch { /* ignore */ }
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    poll();
    return () => { active = false; };
  }, [jobId]);

  const filteredResults = job?.results?.filter((r) =>
    platformFilter === 'all' || r.platform === platformFilter
  ) ?? [];

  const platforms = [...new Set(job?.results?.map((r) => r.platform) ?? [])];

  return (
    <div className="space-y-4">
      {/* Search form */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title text-lg">🌍 Import Tahlil — AI orqali global narx qidirish</h2>
          <p className="text-sm text-base-content/60">
            Mahsulot nomini kiriting — AI qidiruv so'rovini optimallashtiradi, 1688, Taobao, Banggood, Shopee dan narxlarni topadi va eng yaxshi variantni tavsiya qiladi
          </p>
          <div className="flex gap-2 mt-3 flex-wrap">
            <input
              type="number"
              placeholder="Product ID"
              className="input input-bordered input-sm w-32"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            />
            <input
              type="text"
              placeholder="Mahsulot nomi (masalan: Samsung Galaxy Buds2)"
              className="input input-bordered input-sm flex-1 min-w-48"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <button
              onClick={handleStart}
              className="btn btn-primary btn-sm"
              disabled={loading || (!!jobId && job?.status !== 'DONE' && job?.status !== 'FAILED')}
            >
              {loading ? <span className="loading loading-spinner loading-xs" /> : '🚀 Qidirish'}
            </button>
          </div>
          {error && <p className="text-error text-sm mt-2">{error}</p>}
        </div>
      </div>

      {/* Job Status */}
      {jobId && job && (
        <>
          <div className="flex items-center gap-3 text-sm">
            <StatusBadge status={job.status} />
            <span className="text-base-content/50">
              Topildi: {job.results.length} ta natija
              {job.results.filter((r) => (r.ai_match_score ?? 0) >= 0.5).length > 0 &&
                ` (${job.results.filter((r) => (r.ai_match_score ?? 0) >= 0.5).length} ta mos)`
              }
            </span>
            {job.status === 'RUNNING' && <span className="loading loading-spinner loading-xs" />}
          </div>

          {/* Platform filter */}
          {platforms.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setPlatformFilter('all')}
                className={`btn btn-xs ${platformFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              >
                Hammasi ({job.results.length})
              </button>
              {platforms.map((p) => {
                const count = job.results.filter((r) => r.platform === p).length;
                const plat = job.results.find((r) => r.platform === p);
                const flag = COUNTRY_FLAGS[plat?.country ?? ''] ?? '';
                return (
                  <button
                    key={p}
                    onClick={() => setPlatformFilter(p)}
                    className={`btn btn-xs ${platformFilter === p ? 'btn-primary' : 'btn-ghost'}`}
                  >
                    {flag} {plat?.platform_name ?? p} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Results */}
          {filteredResults.length > 0 && (
            <div className="space-y-3">
              {filteredResults.map((r) => (
                <SourcingResultCard key={r.id} result={r} />
              ))}
            </div>
          )}

          {job.status === 'DONE' && filteredResults.length === 0 && (
            <div className="text-center py-12 text-base-content/40">
              <p className="text-4xl mb-2">🔍</p>
              <p>Hech narsa topilmadi</p>
            </div>
          )}
        </>
      )}

      {!jobId && (
        <div className="text-center py-16 text-base-content/30">
          <p className="text-5xl mb-3">🌍</p>
          <p>Mahsulot kiritib "Qidirish" tugmasini bosing</p>
          <p className="text-xs mt-2">AI optimallashtirilgan qidiruv + narx taqqoslash + ROI hisoblash</p>
        </div>
      )}
    </div>
  );
}

function SourcingResultCard({ result: r }: { result: SourcingResult }) {
  const flag = COUNTRY_FLAGS[r.country] ?? '';

  return (
    <div className="card bg-base-200 hover:bg-base-300 transition-colors">
      <div className="card-body p-4">
        <div className="flex gap-4">
          {/* Image */}
          {r.image_url && (
            <img
              src={r.image_url}
              alt={r.title}
              className="w-20 h-20 object-contain rounded-lg bg-base-300 flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {r.rank && <span className="badge badge-sm badge-primary">#{r.rank}</span>}
                  <span className="badge badge-sm badge-outline">{flag} {r.platform_name}</span>
                  {r.ai_match_score != null && (
                    <span className={`badge badge-sm ${matchColor(r.ai_match_score)}`}>
                      AI: {(r.ai_match_score * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium line-clamp-2 leading-snug">{r.title}</p>
              </div>

              {/* Price */}
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-primary">{fmtUSD(r.price_usd)}</p>
                {r.seller_name && (
                  <p className="text-xs text-base-content/50">{r.seller_name}</p>
                )}
              </div>
            </div>

            {/* AI Notes */}
            {r.ai_notes && (
              <p className="text-xs text-base-content/60 mt-1 italic">AI: {r.ai_notes}</p>
            )}

            {/* Cargo & Margin info */}
            {r.cargo && (
              <div className="flex gap-4 mt-2 text-xs">
                <span>
                  Landed: <b>{fmtUSD(r.cargo.landed_cost_usd)}</b>
                </span>
                {r.cargo.margin_pct != null && (
                  <span className={marginColor(r.cargo.margin_pct)}>
                    Margin: <b>{r.cargo.margin_pct.toFixed(1)}%</b>
                  </span>
                )}
                {r.cargo.roi_pct != null && (
                  <span className={r.cargo.roi_pct > 0 ? 'text-success' : 'text-error'}>
                    ROI: <b>{r.cargo.roi_pct.toFixed(1)}%</b>
                  </span>
                )}
                {r.cargo.provider && (
                  <span className="text-base-content/40">{r.cargo.provider}</span>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-2">
              {r.url && r.url !== '#' && (
                <a href={r.url} target="_blank" rel="noopener noreferrer"
                  className="btn btn-outline btn-xs">
                  Ko'rish ↗
                </a>
              )}
              {r.min_order_qty && r.min_order_qty > 1 && (
                <span className="badge badge-sm badge-warning">MOQ: {r.min_order_qty}</span>
              )}
              {r.shipping_days && (
                <span className="badge badge-sm badge-ghost">{r.shipping_days} kun</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'DONE' ? 'badge-success' :
    status === 'RUNNING' ? 'badge-warning' :
    status === 'FAILED' ? 'badge-error' : 'badge-ghost';
  return <span className={`badge badge-sm ${cls}`}>{status}</span>;
}

// ─── Jobs List ───────────────────────────────────────────────────────────────

function JobsList() {
  const [jobs, setJobs] = useState<SourcingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<SourcingJobDetail | null>(null);

  useEffect(() => {
    sourcingApi.listJobs().then((r) => setJobs(r.data)).finally(() => setLoading(false));
  }, []);

  async function viewJob(id: string) {
    const res = await sourcingApi.getJob(id);
    setSelectedJob(res.data);
  }

  if (loading) return <div className="flex justify-center py-16"><span className="loading loading-spinner loading-lg" /></div>;

  if (selectedJob) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedJob(null)} className="btn btn-ghost btn-sm">← Orqaga</button>

        <div className="card bg-base-200">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <StatusBadge status={selectedJob.status} />
              <h2 className="card-title text-lg flex-1">{selectedJob.query}</h2>
              <span className="text-sm text-base-content/50">
                {selectedJob.results.length} natija
              </span>
            </div>
          </div>
        </div>

        {selectedJob.results.map((r) => (
          <SourcingResultCard key={r.id} result={r} />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) return (
    <div className="text-center py-20 text-base-content/40">
      <p className="text-5xl mb-4">📊</p>
      <p>Hali qidiruvlar yo'q</p>
      <p className="text-sm mt-1">"Import Tahlil" tabidan birinchi qidiruvni boshlang</p>
    </div>
  );

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h2 className="card-title text-lg">Qidiruvlar Tarixi</h2>
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>So'rov</th>
                <th>Status</th>
                <th>Natijalar</th>
                <th>Platformalar</th>
                <th>Sana</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="hover">
                  <td className="max-w-48 truncate text-sm">{j.query}</td>
                  <td><StatusBadge status={j.status} /></td>
                  <td>{j.result_count}</td>
                  <td className="text-xs text-base-content/50">{j.platforms.join(', ')}</td>
                  <td className="text-xs text-base-content/40">
                    {new Date(j.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td>
                    <button onClick={() => viewJob(j.id)} className="btn btn-ghost btn-xs">
                      Ko'rish
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Cargo Calculator ─────────────────────────────────────────────────────────

function CargoCalculator({
  providers, rates, prefillName, prefillItemCostUzs,
}: {
  providers: CargoProvider[]; rates: CurrencyRates | null;
  prefillName?: string; prefillItemCostUzs?: number;
}) {
  const usdRate = rates?.USD ?? 12900;
  const [form, setForm] = useState({
    item_name: prefillName ?? '',
    item_cost_usd: prefillItemCostUzs ? (prefillItemCostUzs / usdRate).toFixed(2) : '',
    weight_kg: '', quantity: '1', provider_id: '', customs_rate: '10', sell_price_uzs: '',
  });
  const [result, setResult] = useState<CalcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cnProviders = providers.filter((p) => p.origin === 'CN');
  const euProviders = providers.filter((p) => p.origin === 'EU');

  useEffect(() => {
    if (providers.length > 0 && !form.provider_id) {
      setForm((f) => ({ ...f, provider_id: providers[0].id }));
    }
  }, [providers]);

  const selectedProvider = providers.find((p) => p.id === form.provider_id);
  const preview = (() => {
    if (!rates || !selectedProvider || !form.item_cost_usd || !form.weight_kg) return null;
    const itemCost = parseFloat(form.item_cost_usd) * parseInt(form.quantity || '1');
    const cargo = parseFloat(form.weight_kg) * selectedProvider.rate_per_kg;
    const cr = parseFloat(form.customs_rate) / 100;
    const customs = (itemCost + cargo) * cr;
    const vat = (itemCost + cargo + customs) * 0.12;
    const landed = itemCost + cargo + customs + vat;
    return { landed, landedUzs: landed * rates.USD };
  })();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.provider_id) { setError("Cargo yo'nalishini tanlang"); return; }
    setLoading(true); setError('');
    try {
      const r = await sourcingApi.calculateCargo({
        item_name: form.item_name || undefined,
        item_cost_usd: parseFloat(form.item_cost_usd),
        weight_kg: parseFloat(form.weight_kg),
        quantity: parseInt(form.quantity),
        provider_id: form.provider_id,
        customs_rate: parseFloat(form.customs_rate) / 100,
        sell_price_uzs: form.sell_price_uzs ? parseFloat(form.sell_price_uzs) : undefined,
      });
      setResult(r.data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Xato yuz berdi');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title text-lg">Cargo Xarajatini Hisoblash</h2>
          <form onSubmit={submit} className="space-y-4 mt-2">
            <div className="form-control">
              <label className="label"><span className="label-text">Mahsulot nomi (ixtiyoriy)</span></label>
              <input type="text" placeholder="Masalan: Samsung Galaxy S24"
                className="input input-bordered input-sm" value={form.item_name}
                onChange={(e) => setForm({ ...form, item_name: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="form-control">
                <label className="label"><span className="label-text">Narxi (USD) *</span></label>
                <input type="number" step="0.01" min="0.01" placeholder="15.50"
                  className="input input-bordered input-sm" value={form.item_cost_usd}
                  onChange={(e) => setForm({ ...form, item_cost_usd: e.target.value })} required />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Miqdori (dona) *</span></label>
                <input type="number" min="1" placeholder="1"
                  className="input input-bordered input-sm" value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
              </div>
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Umumiy og'irlik (kg) *</span></label>
              <input type="number" step="0.1" min="0.1" placeholder="2.5"
                className="input input-bordered input-sm" value={form.weight_kg}
                onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} required />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Cargo yo'nalishi *</span></label>
              {cnProviders.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-base-content/40 mb-1">🇨🇳 Xitoy → Toshkent</p>
                  {cnProviders.map((p) => (
                    <label key={p.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-base-300 transition-colors">
                      <input type="radio" name="provider" className="radio radio-sm radio-primary"
                        value={p.id} checked={form.provider_id === p.id}
                        onChange={() => setForm({ ...form, provider_id: p.id })} />
                      <span className="flex-1 text-sm">{METHOD_ICONS[p.method]} {p.name}</span>
                      <span className="text-xs text-base-content/50">
                        ${p.rate_per_kg}/kg · {p.delivery_days} kun
                        {p.min_weight_kg ? ` · min ${p.min_weight_kg}kg` : ''}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {euProviders.length > 0 && (
                <div>
                  <p className="text-xs text-base-content/40 mb-1">🇪🇺 Yevropa → Toshkent</p>
                  {euProviders.map((p) => (
                    <label key={p.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-base-300 transition-colors">
                      <input type="radio" name="provider" className="radio radio-sm radio-secondary"
                        value={p.id} checked={form.provider_id === p.id}
                        onChange={() => setForm({ ...form, provider_id: p.id })} />
                      <span className="flex-1 text-sm">{METHOD_ICONS[p.method]} {p.name}</span>
                      <span className="text-xs text-base-content/50">${p.rate_per_kg}/kg · {p.delivery_days} kun</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="form-control">
                <label className="label"><span className="label-text">Bojxona (%)</span></label>
                <select className="select select-bordered select-sm" value={form.customs_rate}
                  onChange={(e) => setForm({ ...form, customs_rate: e.target.value })}>
                  <option value="0">0% (Beosil)</option>
                  <option value="10">10% (Standart)</option>
                  <option value="20">20% (Yuqori)</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Uzum narxi (so'm)</span>
                  <span className="label-text-alt text-base-content/40">ixtiyoriy</span>
                </label>
                <input type="number" min="0" placeholder="150000"
                  className="input input-bordered input-sm" value={form.sell_price_uzs}
                  onChange={(e) => setForm({ ...form, sell_price_uzs: e.target.value })} />
              </div>
            </div>

            {preview && (
              <div className="bg-base-300 rounded-lg px-4 py-3 text-sm">
                <span className="text-base-content/50">Taxminiy tushib kelish: </span>
                <span className="font-bold text-primary">{fmtUZS(preview.landedUzs)}</span>
                <span className="text-base-content/40 ml-2">≈ {fmtUSD(preview.landed)}</span>
              </div>
            )}

            {error && <p className="text-error text-sm">{error}</p>}

            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? <span className="loading loading-spinner loading-sm" /> : '🧮 Hisoblash'}
            </button>
          </form>
        </div>
      </div>

      {result ? <ResultCard result={result} /> : (
        <div className="card bg-base-200 opacity-40">
          <div className="card-body items-center justify-center py-24">
            <div className="text-6xl mb-3">📦</div>
            <p className="text-base-content/60">Natija shu yerda chiqadi</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: CalcResult }) {
  const perUnit = result.total_item_cost_usd / result.item_cost_usd;
  const landedPerUnit = result.landed_cost_usd / perUnit;
  const landedUzsPerUnit = result.landed_cost_uzs / perUnit;

  const mColor = marginColor(result.gross_margin_pct ?? null);

  const rows = [
    { label: 'Mahsulot narxi (jami)', usd: result.total_item_cost_usd },
    { label: `Cargo — ${result.provider_name}`, usd: result.cargo_cost_usd },
    { label: 'Bojxona to\'lovi', usd: result.customs_usd },
    { label: 'QQS (12%)', usd: result.vat_usd },
  ];

  return (
    <div className="space-y-4">
      <div className="card bg-base-200">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-lg">Natija</h2>
            <span className="badge badge-outline text-xs">{result.delivery_days} kun</span>
          </div>

          <table className="table table-sm mt-2">
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="text-base-content/60">{r.label}</td>
                  <td className="text-right font-mono text-sm">{fmtUSD(r.usd)}</td>
                  <td className="text-right font-mono text-xs text-base-content/40">
                    {fmtUZS(r.usd * result.usd_rate)}
                  </td>
                </tr>
              ))}
              <tr className="font-bold bg-base-300">
                <td>Tushib kelish narxi (jami)</td>
                <td className="text-right font-mono">{fmtUSD(result.landed_cost_usd)}</td>
                <td className="text-right font-mono text-sm">{fmtUZS(result.landed_cost_uzs)}</td>
              </tr>
            </tbody>
          </table>

          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center mt-2">
            <p className="text-xs text-base-content/50 mb-1">1 dona landed cost</p>
            <p className="text-3xl font-bold text-primary">{fmtUZS(landedUzsPerUnit)}</p>
            <p className="text-sm text-base-content/50 mt-1">≈ {fmtUSD(landedPerUnit)}</p>
            <p className="text-xs text-base-content/30 mt-1">
              1 USD = {fmt(result.usd_rate)} so'm (CBU kursi)
            </p>
          </div>

          {result.sell_price_uzs != null && (
            <>
              <div className="divider text-xs mt-1">Foydalilik tahlili</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="stat bg-base-300 rounded-xl p-3">
                  <div className="stat-title text-xs">Sof foyda</div>
                  <div className={`stat-value text-base ${result.profit_uzs! > 0 ? 'text-success' : 'text-error'}`}>
                    {result.profit_uzs! > 0 ? '+' : ''}{fmt(result.profit_uzs!)}
                  </div>
                  <div className="stat-desc text-xs">so'm / dona</div>
                </div>
                <div className="stat bg-base-300 rounded-xl p-3">
                  <div className="stat-title text-xs">Gross Margin</div>
                  <div className={`stat-value text-base ${mColor}`}>
                    {result.gross_margin_pct!.toFixed(1)}%
                  </div>
                  <div className="stat-desc text-xs">
                    {result.gross_margin_pct! >= 30 ? 'Zo\'r!' : result.gross_margin_pct! >= 15 ? 'Yaxshi' : 'Kam'}
                  </div>
                </div>
                <div className="stat bg-base-300 rounded-xl p-3">
                  <div className="stat-title text-xs">ROI</div>
                  <div className={`stat-value text-base ${result.roi_pct! > 0 ? 'text-success' : 'text-error'}`}>
                    {result.roi_pct!.toFixed(1)}%
                  </div>
                  <div className="stat-desc text-xs">kapital daromadi</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── External Price Search (Quick — backward compat) ─────────────────────────

function ExternalSearch({ initialQuery }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery ?? '');
  const [source, setSource] = useState('ALIBABA');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setResults([]); setNote('');
    try {
      const r = await sourcingApi.searchPrices(query, source);
      setResults(r.data.results ?? []);
      setNote(r.data.note ?? '');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title text-lg">Tez Narx Qidirish (Playwright)</h2>
          <p className="text-sm text-base-content/60">
            Banggood va Shopee'dan real-time narxlarni scraping orqali topadi
          </p>
          <form onSubmit={handleSearch} className="flex gap-2 mt-2 flex-wrap">
            <select className="select select-bordered select-sm" value={source}
              onChange={(e) => setSource(e.target.value)}>
              <option value="ALIBABA">🇨🇳 Banggood + Shopee</option>
              <option value="ALIEXPRESS">🛒 Banggood + Shopee</option>
            </select>
            <input type="text" placeholder="Masalan: wireless earphones"
              className="input input-bordered input-sm flex-1 min-w-48"
              value={query} onChange={(e) => setQuery(e.target.value)} />
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? <span className="loading loading-spinner loading-xs" /> : 'Qidirish'}
            </button>
          </form>
        </div>
      </div>

      {note && <div className="alert bg-base-200 text-sm"><span>ℹ️ {note}</span></div>}

      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((item, i) => (
            <div key={i} className="card bg-base-200 hover:bg-base-300 transition-colors">
              <div className="card-body p-4">
                {item.image && (
                  <img src={item.image} alt={item.title}
                    className="w-full h-28 object-contain rounded-lg bg-base-300 mb-2"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <p className="text-sm font-medium line-clamp-2 leading-snug">{item.title}</p>
                <p className="text-xl font-bold text-primary mt-1">{item.price}</p>
                <p className="text-xs text-base-content/50">{item.store}</p>
                {item.link && item.link !== '#' && (
                  <a href={item.link} target="_blank" rel="noopener noreferrer"
                    className="btn btn-outline btn-xs mt-2 w-fit">Ko'rish ↗</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && query && (
        <div className="text-center py-16 text-base-content/40">
          <p className="text-5xl mb-3">🔍</p>
          <p>Hech narsa topilmadi</p>
        </div>
      )}
    </div>
  );
}

// ─── History ──────────────────────────────────────────────────────────────────

function CalculationHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sourcingApi.getHistory().then((r) => setHistory(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-16"><span className="loading loading-spinner loading-lg" /></div>;

  if (history.length === 0) return (
    <div className="text-center py-20 text-base-content/40">
      <p className="text-5xl mb-4">📋</p>
      <p>Hali hech qanday hisoblash yo'q</p>
      <p className="text-sm mt-1">Kalkulyator tabida birinchi hisoblashni bajaring</p>
    </div>
  );

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h2 className="card-title text-lg">Oxirgi Hisoblashlar</h2>
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Mahsulot</th>
                <th>Narx × Dona</th>
                <th>Og'irlik</th>
                <th>Landed (so'm)</th>
                <th>Margin</th>
                <th>ROI</th>
                <th>Yo'nalish</th>
                <th>Sana</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => {
                const mc = marginColor(h.gross_margin_pct);
                return (
                  <tr key={h.id} className="hover">
                    <td className="max-w-36 truncate text-sm">{h.item_name || '—'}</td>
                    <td className="text-sm">${h.item_cost_usd.toFixed(2)} × {h.quantity}</td>
                    <td>{h.weight_kg} kg</td>
                    <td className="font-medium">{fmtUZS(h.landed_cost_uzs)}</td>
                    <td className={mc}>{h.gross_margin_pct != null ? h.gross_margin_pct.toFixed(1) + '%' : '—'}</td>
                    <td className={mc}>{h.roi_pct != null ? h.roi_pct.toFixed(1) + '%' : '—'}</td>
                    <td className="text-xs text-base-content/50">{h.provider ?? '—'}</td>
                    <td className="text-xs text-base-content/40">
                      {new Date(h.created_at).toLocaleDateString('ru-RU')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
