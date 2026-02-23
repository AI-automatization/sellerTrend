import { useState, useEffect } from 'react';
import { signalsApi } from '../api/client';

type Tab =
  | 'cannibalization'
  | 'dead-stock'
  | 'saturation'
  | 'flash-sales'
  | 'early-signals'
  | 'stock-cliffs'
  | 'checklist'
  | 'price-test'
  | 'replenishment';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'cannibalization', label: 'Kannibalizatsiya', icon: '21' },
  { key: 'dead-stock', label: 'Dead Stock', icon: '22' },
  { key: 'saturation', label: 'Saturatsiya', icon: '23' },
  { key: 'flash-sales', label: 'Flash Sale', icon: '24' },
  { key: 'early-signals', label: 'Erta Signal', icon: '25' },
  { key: 'stock-cliffs', label: 'Stock Alert', icon: '26' },
  { key: 'checklist', label: 'Checklist', icon: '28' },
  { key: 'price-test', label: 'Narx Test', icon: '29' },
  { key: 'replenishment', label: 'Zahira', icon: '30' },
];

export function SignalsPage() {
  const [tab, setTab] = useState<Tab>('cannibalization');

  return (
    <div className="w-full space-y-4 lg:space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Signallar</h1>
          <p className="text-base-content/60 text-sm mt-1">
            v3.0 — Ogohlantirish va analitika signallari
          </p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="bg-base-200/60 border border-base-300/50 rounded-2xl p-2">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}
            >
              <span className="badge badge-xs badge-outline mr-1">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="bg-base-200/60 border border-base-300/50 rounded-2xl p-4 lg:p-6">
        {tab === 'cannibalization' && <CannibalizationTab />}
        {tab === 'dead-stock' && <DeadStockTab />}
        {tab === 'saturation' && <SaturationTab />}
        {tab === 'flash-sales' && <FlashSalesTab />}
        {tab === 'early-signals' && <EarlySignalsTab />}
        {tab === 'stock-cliffs' && <StockCliffsTab />}
        {tab === 'checklist' && <ChecklistTab />}
        {tab === 'price-test' && <PriceTestTab />}
        {tab === 'replenishment' && <ReplenishmentTab />}
      </div>
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

  if (loading) return <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg" /></div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Kannibalizatsiya Ogohlantirishi</h2>
      <p className="text-base-content/60 text-sm mb-4">
        Sizning mahsulotlaringiz bir-birining bozorini yeyaptimi?
      </p>
      {data.length === 0 ? (
        <div className="text-center py-8 text-base-content/50">Kannibalizatsiya aniqlanmadi</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Mahsulot A</th>
                <th>Mahsulot B</th>
                <th>Overlap</th>
                <th>Sabab</th>
              </tr>
            </thead>
            <tbody>
              {data.map((pair: any, i: number) => (
                <tr key={i}>
                  <td className="max-w-[200px] truncate">{pair.product_a_title}</td>
                  <td className="max-w-[200px] truncate">{pair.product_b_title}</td>
                  <td>
                    <div className="radial-progress text-xs text-warning" style={{ '--value': pair.overlap_score * 100, '--size': '2.5rem' } as any}>
                      {(pair.overlap_score * 100).toFixed(0)}%
                    </div>
                  </td>
                  <td className="text-xs text-base-content/70">{pair.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
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

  if (loading) return <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg" /></div>;

  const riskColor = (level: string) =>
    level === 'high' ? 'badge-error' : level === 'medium' ? 'badge-warning' : 'badge-success';

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Dead Stock Bashorati</h2>
      <p className="text-base-content/60 text-sm mb-4">
        Qaysi mahsulotlar tez orada sotilmaydigan holatga tushishi mumkin?
      </p>
      {data.length === 0 ? (
        <div className="text-center py-8 text-base-content/50">Dead stock xavfi yo'q</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.map((item: any) => (
            <div key={item.product_id} className="card bg-base-300/50 p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm truncate max-w-[60%]">{item.title}</h3>
                <span className={`badge ${riskColor(item.risk_level)} badge-sm`}>{item.risk_level}</span>
              </div>
              <div className="flex gap-4 text-xs text-base-content/70 mb-2">
                <span>Risk: {(item.risk_score * 100).toFixed(0)}%</span>
                <span>~{item.days_to_dead} kun qoldi</span>
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
    </div>
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
    <div>
      <h2 className="text-xl font-bold mb-2">Kategoriya Saturatsiya Indeksi</h2>
      <p className="text-base-content/60 text-sm mb-4">Kategoriyada raqobat qanchalik kuchli?</p>
      <div className="flex gap-2 mb-6">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat bg-base-300/50 rounded-xl p-4">
            <div className="stat-title text-xs">Saturatsiya</div>
            <div className="stat-value text-2xl">{(data.saturation_index * 100).toFixed(0)}%</div>
            <div className={`stat-desc ${levelColor(data.level)}`}>{data.level}</div>
          </div>
          <div className="stat bg-base-300/50 rounded-xl p-4">
            <div className="stat-title text-xs">Sotuvchilar</div>
            <div className="stat-value text-2xl">{data.seller_count}</div>
          </div>
          <div className="stat bg-base-300/50 rounded-xl p-4">
            <div className="stat-title text-xs">O'rt. Score</div>
            <div className="stat-value text-2xl">{data.avg_score}</div>
          </div>
          <div className="stat bg-base-300/50 rounded-xl p-4">
            <div className="stat-title text-xs">Top 10% ulushi</div>
            <div className="stat-value text-2xl">{data.top10_share_pct}%</div>
          </div>
        </div>
      )}
    </div>
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

  if (loading) return <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg" /></div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Flash Sale Detector</h2>
      <p className="text-base-content/60 text-sm mb-4">
        Kuzatilayotgan mahsulotlarda keskin narx tushishi aniqlandi
      </p>
      {data.length === 0 ? (
        <div className="text-center py-8 text-base-content/50">Flash sale aniqlanmadi</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Mahsulot</th>
                <th>Eski narx</th>
                <th>Yangi narx</th>
                <th>Tushish</th>
                <th>Sana</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item: any, i: number) => (
                <tr key={i}>
                  <td className="max-w-[200px] truncate">{item.title}</td>
                  <td>{Number(item.old_price).toLocaleString()} so'm</td>
                  <td className="text-success">{Number(item.new_price).toLocaleString()} so'm</td>
                  <td><span className="badge badge-error badge-sm">-{item.price_drop_pct}%</span></td>
                  <td className="text-xs">{new Date(item.detected_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
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

  if (loading) return <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg" /></div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Yangi Mahsulot Erta Signallari</h2>
      <p className="text-base-content/60 text-sm mb-4">
        30 kundan kam yoslidagi tez o'sayotgan mahsulotlar
      </p>
      {data.length === 0 ? (
        <div className="text-center py-8 text-base-content/50">Erta signallar yo'q</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Mahsulot</th>
                <th>Momentum</th>
                <th>Yoshi (kun)</th>
                <th>Sotuv tezligi</th>
                <th>Score o'sishi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item: any) => (
                <tr key={item.product_id}>
                  <td className="max-w-[200px] truncate">{item.title}</td>
                  <td>
                    <progress className="progress progress-primary w-16" value={item.momentum_score * 100} max="100" />
                    <span className="ml-2 text-xs">{(item.momentum_score * 100).toFixed(0)}%</span>
                  </td>
                  <td>{item.days_since_first} kun</td>
                  <td>{item.sales_velocity}/hafta</td>
                  <td className="text-success">+{item.score_growth}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
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

  if (loading) return <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg" /></div>;

  const sevColor = (s: string) => s === 'critical' ? 'badge-error' : 'badge-warning';

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Stock Cliff Alert</h2>
      <p className="text-base-content/60 text-sm mb-4">
        Zaxira tugashiga yaqin mahsulotlar
      </p>
      {data.length === 0 ? (
        <div className="text-center py-8 text-base-content/50">Stock cliff xavfi yo'q</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.map((item: any) => (
            <div key={item.product_id} className="card bg-base-300/50 p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm truncate max-w-[70%]">{item.title}</h3>
                <span className={`badge ${sevColor(item.severity)} badge-sm`}>{item.severity}</span>
              </div>
              <div className="flex gap-4 text-xs text-base-content/70">
                <span>Tezlik: {item.current_velocity}/kun</span>
                <span>~{item.estimated_days_left} kun qoldi</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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

  if (loading) return <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg" /></div>;
  if (!checklist) return null;

  const done = checklist.items.filter((i: any) => i.done).length;
  const total = checklist.items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">{checklist.title}</h2>
          <p className="text-base-content/60 text-sm">{done}/{total} bajarildi ({pct}%)</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={saveChecklist} disabled={saving}>
          {saving ? <span className="loading loading-spinner loading-xs" /> : 'Saqlash'}
        </button>
      </div>
      <progress className="progress progress-primary w-full mb-4" value={pct} max="100" />
      <div className="space-y-2">
        {checklist.items.map((item: any) => (
          <label key={item.key} className="flex items-center gap-3 p-3 bg-base-300/50 rounded-lg cursor-pointer hover:bg-base-300/80 transition">
            <input
              type="checkbox"
              className="checkbox checkbox-primary checkbox-sm"
              checked={item.done}
              onChange={() => toggleItem(item.key)}
            />
            <span className={`text-sm ${item.done ? 'line-through text-base-content/40' : ''}`}>
              {item.label}
            </span>
          </label>
        ))}
      </div>
    </div>
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

  if (loading) return <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg" /></div>;

  const statusColor = (s: string) =>
    s === 'COMPLETED' ? 'badge-success' : s === 'RUNNING' ? 'badge-warning' :
    s === 'CANCELLED' ? 'badge-error' : 'badge-ghost';

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">A/B Narx Testlash</h2>
      <p className="text-base-content/60 text-sm mb-4">
        Turli narxlarni sinab, eng yaxshisini toping
      </p>

      {/* Create form */}
      <div className="flex flex-wrap gap-2 mb-6">
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

      {tests.length === 0 ? (
        <div className="text-center py-8 text-base-content/50">Hali test yo'q</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Mahsulot</th>
                <th>Asl narx</th>
                <th>Test narx</th>
                <th>Status</th>
                <th>Asl sotuv</th>
                <th>Test sotuv</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t: any) => (
                <tr key={t.id}>
                  <td className="max-w-[150px] truncate">{t.product_title || `#${t.product_id}`}</td>
                  <td>{Number(t.original_price).toLocaleString()}</td>
                  <td>{Number(t.test_price).toLocaleString()}</td>
                  <td><span className={`badge ${statusColor(t.status)} badge-sm`}>{t.status}</span></td>
                  <td>{t.original_sales}</td>
                  <td>{t.test_sales}</td>
                  <td className="flex gap-1">
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
                      <button className="btn btn-xs btn-error" onClick={() => updateStatus(t.id, 'CANCELLED')}>
                        Bekor
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
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
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">Zahira Rejalashtirish</h2>
          <p className="text-base-content/60 text-sm">Qachon va qancha buyurtma berish kerak?</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-base-content/60">Yetkazish:</span>
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
        <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg" /></div>
      ) : data.length === 0 ? (
        <div className="text-center py-8 text-base-content/50">Ma'lumot yo'q</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Mahsulot</th>
                <th>Kunlik sotuv</th>
                <th>Reorder nuqtasi</th>
                <th>Tavsiya miqdor</th>
                <th>Keyingi buyurtma</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item: any) => {
                const isUrgent = new Date(item.next_order_date) <= new Date(Date.now() + 7 * 86400000);
                return (
                  <tr key={item.product_id} className={isUrgent ? 'bg-error/10' : ''}>
                    <td className="max-w-[200px] truncate">{item.title}</td>
                    <td>{item.avg_daily_sales}</td>
                    <td>{item.reorder_point} dona</td>
                    <td className="font-semibold">{item.suggested_order_qty} dona</td>
                    <td>
                      <span className={isUrgent ? 'text-error font-bold' : ''}>
                        {item.next_order_date}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
