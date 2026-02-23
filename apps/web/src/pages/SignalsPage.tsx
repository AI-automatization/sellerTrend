import { useState, useEffect } from 'react';
import { signalsApi } from '../api/client';

type Tab =
  | 'cannibalization'
  | 'dead-stock'
  | 'saturation'
  | 'flash-sales'
  | 'early-signals'
  | 'stock-cliffs'
  | 'ranking'
  | 'checklist'
  | 'price-test'
  | 'replenishment';

const TABS: { key: Tab; label: string; emoji: string; shortLabel: string }[] = [
  { key: 'cannibalization', label: 'Kannibalizatsiya', emoji: '🔀', shortLabel: 'Kannibal.' },
  { key: 'dead-stock', label: 'Dead Stock', emoji: '💀', shortLabel: 'Dead Stock' },
  { key: 'saturation', label: 'Saturatsiya', emoji: '📊', shortLabel: 'Saturats.' },
  { key: 'flash-sales', label: 'Flash Sale', emoji: '⚡', shortLabel: 'Flash' },
  { key: 'early-signals', label: 'Erta Signal', emoji: '🌱', shortLabel: 'Erta' },
  { key: 'stock-cliffs', label: 'Stock Alert', emoji: '📦', shortLabel: 'Stock' },
  { key: 'ranking', label: 'Ranking', emoji: '📈', shortLabel: 'Ranking' },
  { key: 'checklist', label: 'Checklist', emoji: '✅', shortLabel: 'Check' },
  { key: 'price-test', label: 'Narx Test', emoji: '🧪', shortLabel: 'A/B Test' },
  { key: 'replenishment', label: 'Zahira', emoji: '🔄', shortLabel: 'Zahira' },
];

export function SignalsPage() {
  const [tab, setTab] = useState<Tab>('cannibalization');

  return (
    <div className="w-full space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 lg:w-7 lg:h-7 text-warning">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            Signallar
          </h1>
          <p className="text-base-content/50 text-sm mt-1">
            v3.0 — Ogohlantirish va analitika signallari (Features 21-30)
          </p>
        </div>
        <div className="text-xs text-base-content/30 hidden sm:block">
          {TABS.length} ta signal moduli
        </div>
      </div>

      {/* Tab navigation — scrollable on mobile */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`btn btn-sm gap-1.5 whitespace-nowrap transition-all ${
                tab === t.key
                  ? 'btn-primary shadow-md shadow-primary/20'
                  : 'btn-ghost hover:bg-base-300/50'
              }`}
            >
              <span className="text-base">{t.emoji}</span>
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.shortLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'cannibalization' && <CannibalizationTab />}
      {tab === 'dead-stock' && <DeadStockTab />}
      {tab === 'saturation' && <SaturationTab />}
      {tab === 'flash-sales' && <FlashSalesTab />}
      {tab === 'early-signals' && <EarlySignalsTab />}
      {tab === 'stock-cliffs' && <StockCliffsTab />}
      {tab === 'ranking' && <RankingTab />}
      {tab === 'checklist' && <ChecklistTab />}
      {tab === 'price-test' && <PriceTestTab />}
      {tab === 'replenishment' && <ReplenishmentTab />}
    </div>
  );
}

/* ============ Shared ============ */
function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6">
      {children}
    </div>
  );
}

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg lg:text-xl font-bold">{title}</h2>
      <p className="text-base-content/50 text-sm mt-0.5">{desc}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-12 text-base-content/30">
      <p className="text-4xl mb-2">📭</p>
      <p className="text-sm">{text}</p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-12">
      <span className="loading loading-dots loading-lg text-primary" />
    </div>
  );
}

/* ============ Feature 21 — Cannibalization Alert ============ */
function CannibalizationTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    signalsApi.getCannibalization()
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SectionCard><LoadingSpinner /></SectionCard>;

  return (
    <SectionCard>
      <SectionHeader
        title="Kannibalizatsiya Ogohlantirishi"
        desc="Sizning mahsulotlaringiz bir-birining bozorini yeyaptimi?"
      />
      {data.length === 0 ? (
        <EmptyState text="Kannibalizatsiya aniqlanmadi — yaxshi!" />
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs text-base-content/40 uppercase">
                <th>Mahsulot A</th>
                <th>Mahsulot B</th>
                <th className="text-center">Overlap</th>
                <th>Sabab</th>
              </tr>
            </thead>
            <tbody>
              {data.map((pair: any, i: number) => (
                <tr key={i} className="hover:bg-base-300/20 transition-colors">
                  <td className="max-w-[200px] truncate text-sm">{pair.product_a_title}</td>
                  <td className="max-w-[200px] truncate text-sm">{pair.product_b_title}</td>
                  <td className="text-center">
                    <div className="radial-progress text-xs text-warning" style={{ '--value': pair.overlap_score * 100, '--size': '2.5rem' } as any}>
                      {(pair.overlap_score * 100).toFixed(0)}%
                    </div>
                  </td>
                  <td className="text-xs text-base-content/60 max-w-[200px]">{pair.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

/* ============ Feature 22 — Dead Stock Predictor ============ */
function DeadStockTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    signalsApi.getDeadStock()
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SectionCard><LoadingSpinner /></SectionCard>;

  const riskColor = (level: string) =>
    level === 'high' ? 'badge-error' : level === 'medium' ? 'badge-warning' : 'badge-success';

  return (
    <SectionCard>
      <SectionHeader
        title="Dead Stock Bashorati"
        desc="Qaysi mahsulotlar tez orada sotilmaydigan holatga tushishi mumkin?"
      />
      {data.length === 0 ? (
        <EmptyState text="Dead stock xavfi yo'q — yaxshi!" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.map((item: any) => (
            <div key={item.product_id} className="rounded-xl bg-base-300/40 border border-base-300/30 p-4 hover:bg-base-300/60 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm truncate max-w-[65%]">{item.title}</h3>
                <span className={`badge ${riskColor(item.risk_level)} badge-sm`}>{item.risk_level}</span>
              </div>
              <div className="flex gap-4 text-xs text-base-content/60 mb-3">
                <span>Risk: <b>{(item.risk_score * 100).toFixed(0)}%</b></span>
                <span>~<b>{item.days_to_dead}</b> kun qoldi</span>
              </div>
              <div className="w-full bg-base-300 rounded-full h-1.5 mb-2">
                <div
                  className={`h-1.5 rounded-full ${item.risk_level === 'high' ? 'bg-error' : item.risk_level === 'medium' ? 'bg-warning' : 'bg-success'}`}
                  style={{ width: `${Math.min(item.risk_score * 100, 100)}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {item.factors.map((f: string, i: number) => (
                  <span key={i} className="badge badge-xs badge-outline">{f}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

/* ============ Feature 23 — Category Saturation Index ============ */
function SaturationTab() {
  const [categoryId, setCategoryId] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  function handleSearch() {
    if (!categoryId) return;
    setLoading(true);
    signalsApi.getSaturation(Number(categoryId))
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }

  const levelColor = (l: string) =>
    l === 'oversaturated' ? 'text-error' : l === 'saturated' ? 'text-warning' :
    l === 'moderate' ? 'text-info' : 'text-success';

  return (
    <SectionCard>
      <SectionHeader
        title="Kategoriya Saturatsiya Indeksi"
        desc="Kategoriyada raqobat qanchalik kuchli?"
      />
      <div className="flex gap-2 mb-6 flex-wrap">
        <input
          type="number"
          className="input input-bordered input-sm w-48"
          placeholder="Kategoriya ID"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className="btn btn-primary btn-sm" onClick={handleSearch} disabled={loading}>
          {loading ? <span className="loading loading-spinner loading-xs" /> : 'Tahlil'}
        </button>
      </div>
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4">
            <p className="text-xs text-base-content/40">Saturatsiya</p>
            <p className="text-2xl font-bold mt-1">{(data.saturation_index * 100).toFixed(0)}%</p>
            <p className={`text-xs mt-0.5 font-medium ${levelColor(data.level)}`}>{data.level}</p>
          </div>
          <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4">
            <p className="text-xs text-base-content/40">Sotuvchilar</p>
            <p className="text-2xl font-bold mt-1">{data.seller_count}</p>
          </div>
          <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4">
            <p className="text-xs text-base-content/40">O'rt. Score</p>
            <p className="text-2xl font-bold mt-1">{data.avg_score}</p>
          </div>
          <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4">
            <p className="text-xs text-base-content/40">Top 10% ulushi</p>
            <p className="text-2xl font-bold mt-1">{data.top10_share_pct}%</p>
          </div>
        </div>
      )}
      {!data && !loading && (
        <EmptyState text="Kategoriya ID kiritib, tahlil qiling" />
      )}
    </SectionCard>
  );
}

/* ============ Feature 24 — Flash Sale Detector ============ */
function FlashSalesTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    signalsApi.getFlashSales()
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SectionCard><LoadingSpinner /></SectionCard>;

  return (
    <SectionCard>
      <SectionHeader
        title="Flash Sale Detector"
        desc="Kuzatilayotgan mahsulotlarda keskin narx tushishi"
      />
      {data.length === 0 ? (
        <EmptyState text="Flash sale aniqlanmadi" />
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs text-base-content/40 uppercase">
                <th>Mahsulot</th>
                <th className="text-right">Eski narx</th>
                <th className="text-right">Yangi narx</th>
                <th className="text-center">Tushish</th>
                <th>Sana</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item: any, i: number) => (
                <tr key={i} className="hover:bg-base-300/20 transition-colors">
                  <td className="max-w-[200px] truncate text-sm">{item.title}</td>
                  <td className="text-right tabular-nums text-sm line-through text-base-content/40">
                    {Number(item.old_price).toLocaleString()} so'm
                  </td>
                  <td className="text-right tabular-nums text-sm text-success font-medium">
                    {Number(item.new_price).toLocaleString()} so'm
                  </td>
                  <td className="text-center">
                    <span className="badge badge-error badge-sm">-{item.price_drop_pct}%</span>
                  </td>
                  <td className="text-xs text-base-content/40">{new Date(item.detected_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

/* ============ Feature 25 — New Product Early Signal ============ */
function EarlySignalsTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    signalsApi.getEarlySignals()
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SectionCard><LoadingSpinner /></SectionCard>;

  return (
    <SectionCard>
      <SectionHeader
        title="Yangi Mahsulot Erta Signallari"
        desc="30 kundan kam yoslidagi tez o'sayotgan mahsulotlar"
      />
      {data.length === 0 ? (
        <EmptyState text="Erta signallar yo'q" />
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs text-base-content/40 uppercase">
                <th>Mahsulot</th>
                <th className="text-center">Momentum</th>
                <th className="text-center">Yoshi</th>
                <th className="text-right">Sotuv tezligi</th>
                <th className="text-right">Score o'sishi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item: any) => (
                <tr key={item.product_id} className="hover:bg-base-300/20 transition-colors">
                  <td className="max-w-[200px] truncate text-sm">{item.title}</td>
                  <td className="text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <progress className="progress progress-primary w-16 h-2" value={item.momentum_score * 100} max="100" />
                      <span className="text-xs tabular-nums">{(item.momentum_score * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="text-center text-sm tabular-nums">{item.days_since_first} kun</td>
                  <td className="text-right text-sm tabular-nums">{item.sales_velocity}/hafta</td>
                  <td className="text-right text-success text-sm font-medium">+{item.score_growth}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

/* ============ Feature 26 — Stock Cliff Alert ============ */
function StockCliffsTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    signalsApi.getStockCliffs()
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SectionCard><LoadingSpinner /></SectionCard>;

  const sevColor = (s: string) => s === 'critical' ? 'badge-error' : 'badge-warning';

  return (
    <SectionCard>
      <SectionHeader
        title="Stock Cliff Alert"
        desc="Zaxira tugashiga yaqin mahsulotlar"
      />
      {data.length === 0 ? (
        <EmptyState text="Stock cliff xavfi yo'q" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.map((item: any) => (
            <div key={item.product_id} className="rounded-xl bg-base-300/40 border border-base-300/30 p-4 hover:bg-base-300/60 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm truncate max-w-[70%]">{item.title}</h3>
                <span className={`badge ${sevColor(item.severity)} badge-sm`}>{item.severity}</span>
              </div>
              <div className="flex gap-4 text-xs text-base-content/60">
                <span>Tezlik: <b>{item.current_velocity}</b>/kun</span>
                <span>~<b className={item.estimated_days_left <= 7 ? 'text-error' : ''}>{item.estimated_days_left}</b> kun qoldi</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

/* ============ Feature 27 — Ranking Position Tracker ============ */
function RankingTab() {
  const [productId, setProductId] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  function handleSearch() {
    if (!productId.trim()) return;
    setLoading(true);
    setSearched(true);
    signalsApi.getRanking(productId.trim())
      .then((r) => setData(r.data))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }

  return (
    <SectionCard>
      <SectionHeader
        title="Ranking Position Tracker"
        desc="Mahsulotning kategoriya ichidagi pozitsiyasi tarixi"
      />
      <div className="flex gap-2 mb-6 flex-wrap">
        <input
          type="text"
          className="input input-bordered input-sm w-48"
          placeholder="Product ID"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className="btn btn-primary btn-sm" onClick={handleSearch} disabled={loading}>
          {loading ? <span className="loading loading-spinner loading-xs" /> : 'Ko\'rish'}
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : searched && data.length === 0 ? (
        <EmptyState text="Bu mahsulot uchun ranking tarixi topilmadi" />
      ) : data.length > 0 ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4">
              <p className="text-xs text-base-content/40">Hozirgi rank</p>
              <p className="text-2xl font-bold mt-1">#{data[data.length - 1].rank}</p>
            </div>
            <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4">
              <p className="text-xs text-base-content/40">Eng yaxshi</p>
              <p className="text-2xl font-bold mt-1 text-success">#{Math.min(...data.map((d: any) => d.rank))}</p>
            </div>
            <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4">
              <p className="text-xs text-base-content/40">O'rt. Score</p>
              <p className="text-2xl font-bold mt-1">
                {(data.reduce((s: number, d: any) => s + (d.score ?? 0), 0) / data.length).toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4">
              <p className="text-xs text-base-content/40">Ma'lumotlar</p>
              <p className="text-2xl font-bold mt-1">{data.length} kun</p>
            </div>
          </div>

          {/* History table */}
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr className="text-xs text-base-content/40 uppercase">
                  <th>Sana</th>
                  <th className="text-center">Rank</th>
                  <th className="text-right">Score</th>
                  <th className="text-right">Haftalik sotuv</th>
                  <th>Kategoriya</th>
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map((item: any, i: number) => {
                  const prevRank = i < data.length - 1 ? [...data].reverse()[i + 1]?.rank : null;
                  const rankChange = prevRank ? prevRank - item.rank : 0;
                  return (
                    <tr key={i} className="hover:bg-base-300/20 transition-colors">
                      <td className="text-sm text-base-content/70">
                        {new Date(item.date).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="text-center">
                        <span className="font-bold text-sm">#{item.rank}</span>
                        {rankChange !== 0 && (
                          <span className={`text-xs ml-1 ${rankChange > 0 ? 'text-success' : 'text-error'}`}>
                            {rankChange > 0 ? `+${rankChange}` : rankChange}
                          </span>
                        )}
                      </td>
                      <td className="text-right tabular-nums text-sm">
                        {item.score != null ? item.score.toFixed(2) : '—'}
                      </td>
                      <td className="text-right tabular-nums text-sm text-success">
                        {item.weekly_bought ?? '—'}
                      </td>
                      <td className="text-xs text-base-content/50">#{item.category_id}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <EmptyState text="Product ID kiritib, ranking tarixini ko'ring" />
      )}
    </SectionCard>
  );
}

/* ============ Feature 28 — Product Launch Checklist ============ */
function ChecklistTab() {
  const [checklist, setChecklist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    signalsApi.getChecklist()
      .then((r) => setChecklist(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggleItem(key: string) {
    if (!checklist) return;
    const updated = {
      ...checklist,
      items: checklist.items.map((item: any) =>
        item.key === key ? { ...item, done: !item.done } : item,
      ),
    };
    setChecklist(updated);
  }

  function saveChecklist() {
    if (!checklist) return;
    setSaving(true);
    signalsApi.saveChecklist({
      title: checklist.title,
      items: checklist.items,
    }).then((r) => setChecklist({ ...checklist, id: r.data.id }))
      .catch(() => {})
      .finally(() => setSaving(false));
  }

  if (loading) return <SectionCard><LoadingSpinner /></SectionCard>;
  if (!checklist) return null;

  const done = checklist.items.filter((i: any) => i.done).length;
  const total = checklist.items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <SectionCard>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg lg:text-xl font-bold">{checklist.title}</h2>
          <p className="text-base-content/50 text-sm">{done}/{total} bajarildi ({pct}%)</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={saveChecklist} disabled={saving}>
          {saving ? <span className="loading loading-spinner loading-xs" /> : 'Saqlash'}
        </button>
      </div>
      <progress className="progress progress-primary w-full h-2 mb-5" value={pct} max="100" />
      <div className="space-y-2">
        {checklist.items.map((item: any) => (
          <label key={item.key} className="flex items-center gap-3 p-3 rounded-xl bg-base-300/40 border border-base-300/30 cursor-pointer hover:bg-base-300/60 transition-colors">
            <input
              type="checkbox"
              className="checkbox checkbox-primary checkbox-sm"
              checked={item.done}
              onChange={() => toggleItem(item.key)}
            />
            <span className={`text-sm ${item.done ? 'line-through text-base-content/30' : ''}`}>
              {item.label}
            </span>
          </label>
        ))}
      </div>
    </SectionCard>
  );
}

/* ============ Feature 29 — A/B Price Testing ============ */
function PriceTestTab() {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ product_id: '', original_price: '', test_price: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    signalsApi.listPriceTests()
      .then((r) => setTests(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function createTest() {
    if (!form.product_id || !form.original_price || !form.test_price) return;
    setCreating(true);
    signalsApi.createPriceTest({
      product_id: form.product_id,
      original_price: Number(form.original_price),
      test_price: Number(form.test_price),
    })
      .then((r) => {
        setTests([{ ...r.data, product_title: `Product #${form.product_id}` }, ...tests]);
        setForm({ product_id: '', original_price: '', test_price: '' });
      })
      .catch(() => {})
      .finally(() => setCreating(false));
  }

  function updateStatus(id: string, status: string) {
    signalsApi.updatePriceTest(id, { status })
      .then(() => {
        setTests(tests.map((t) => t.id === id ? { ...t, status } : t));
      })
      .catch(() => {});
  }

  if (loading) return <SectionCard><LoadingSpinner /></SectionCard>;

  const statusColor = (s: string) =>
    s === 'COMPLETED' ? 'badge-success' : s === 'RUNNING' ? 'badge-warning' :
    s === 'CANCELLED' ? 'badge-error' : 'badge-ghost';

  return (
    <SectionCard>
      <SectionHeader
        title="A/B Narx Testlash"
        desc="Turli narxlarni sinab, eng yaxshisini toping"
      />

      {/* Create form */}
      <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4 mb-6">
        <p className="text-xs text-base-content/50 mb-3">Yangi test yaratish</p>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            className="input input-bordered input-sm w-36"
            placeholder="Product ID"
            value={form.product_id}
            onChange={(e) => setForm({ ...form, product_id: e.target.value })}
          />
          <input
            type="number"
            className="input input-bordered input-sm w-36"
            placeholder="Asl narx"
            value={form.original_price}
            onChange={(e) => setForm({ ...form, original_price: e.target.value })}
          />
          <input
            type="number"
            className="input input-bordered input-sm w-36"
            placeholder="Test narx"
            value={form.test_price}
            onChange={(e) => setForm({ ...form, test_price: e.target.value })}
          />
          <button className="btn btn-primary btn-sm" onClick={createTest} disabled={creating}>
            {creating ? <span className="loading loading-spinner loading-xs" /> : 'Yaratish'}
          </button>
        </div>
      </div>

      {tests.length === 0 ? (
        <EmptyState text="Hali test yo'q — yuqorida yangi test yarating" />
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs text-base-content/40 uppercase">
                <th>Mahsulot</th>
                <th className="text-right">Asl narx</th>
                <th className="text-right">Test narx</th>
                <th className="text-center">Status</th>
                <th className="text-right">Asl sotuv</th>
                <th className="text-right">Test sotuv</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t: any) => (
                <tr key={t.id} className="hover:bg-base-300/20 transition-colors">
                  <td className="max-w-[150px] truncate text-sm">{t.product_title || `#${t.product_id}`}</td>
                  <td className="text-right tabular-nums text-sm">{Number(t.original_price).toLocaleString()}</td>
                  <td className="text-right tabular-nums text-sm">{Number(t.test_price).toLocaleString()}</td>
                  <td className="text-center"><span className={`badge ${statusColor(t.status)} badge-sm`}>{t.status}</span></td>
                  <td className="text-right tabular-nums text-sm">{t.original_sales ?? '—'}</td>
                  <td className="text-right tabular-nums text-sm">{t.test_sales ?? '—'}</td>
                  <td>
                    <div className="flex gap-1">
                      {t.status === 'PLANNED' && (
                        <button className="btn btn-xs btn-success" onClick={() => updateStatus(t.id, 'RUNNING')}>
                          Boshlash
                        </button>
                      )}
                      {t.status === 'RUNNING' && (
                        <button className="btn btn-xs btn-info" onClick={() => updateStatus(t.id, 'COMPLETED')}>
                          Tugatish
                        </button>
                      )}
                      {(t.status === 'PLANNED' || t.status === 'RUNNING') && (
                        <button className="btn btn-xs btn-ghost text-error" onClick={() => updateStatus(t.id, 'CANCELLED')}>
                          Bekor
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

/* ============ Feature 30 — Replenishment Planner ============ */
function ReplenishmentTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadTime, setLeadTime] = useState(14);

  useEffect(() => {
    setLoading(true);
    signalsApi.getReplenishment(leadTime)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [leadTime]);

  return (
    <SectionCard>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg lg:text-xl font-bold">Zahira Rejalashtirish</h2>
          <p className="text-base-content/50 text-sm">Qachon va qancha buyurtma berish kerak?</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-base-content/50">Yetkazish:</span>
          <select
            className="select select-bordered select-sm"
            value={leadTime}
            onChange={(e) => setLeadTime(Number(e.target.value))}
          >
            <option value={7}>7 kun</option>
            <option value={14}>14 kun</option>
            <option value={21}>21 kun</option>
            <option value={30}>30 kun</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : data.length === 0 ? (
        <EmptyState text="Ma'lumot yo'q" />
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs text-base-content/40 uppercase">
                <th>Mahsulot</th>
                <th className="text-right">Kunlik sotuv</th>
                <th className="text-right">Reorder nuqtasi</th>
                <th className="text-right">Tavsiya</th>
                <th>Keyingi buyurtma</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item: any) => {
                const isUrgent = new Date(item.next_order_date) <= new Date(Date.now() + 7 * 86400000);
                return (
                  <tr key={item.product_id} className={`hover:bg-base-300/20 transition-colors ${isUrgent ? 'bg-error/5' : ''}`}>
                    <td className="max-w-[200px] truncate text-sm">{item.title}</td>
                    <td className="text-right tabular-nums text-sm">{item.avg_daily_sales}</td>
                    <td className="text-right tabular-nums text-sm">{item.reorder_point} dona</td>
                    <td className="text-right font-semibold tabular-nums text-sm">{item.suggested_order_qty} dona</td>
                    <td>
                      <span className={`text-sm ${isUrgent ? 'text-error font-bold' : 'text-base-content/70'}`}>
                        {item.next_order_date}
                        {isUrgent && <span className="ml-1 badge badge-error badge-xs">Tez!</span>}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
