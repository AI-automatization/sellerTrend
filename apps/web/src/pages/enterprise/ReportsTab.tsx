import { useState, useEffect } from 'react';
import { reportsApi } from '../../api/client';
import { SectionCard, SectionHeader, Loading, EmptyState } from './shared';
import { logError, toastError } from '../../utils/handleError';

interface Report {
  id: string;
  title: string;
  report_type: string;
  created_at: string;
}

interface GeneratedReport {
  title: string;
  generated_at: string;
  rows?: Record<string, unknown>[];
}

interface MarketShop {
  name: string;
  product_count: number;
  total_sales: number;
  market_share_pct: number;
}

interface MarketShareData {
  total_products: number;
  total_sales: number;
  shops?: MarketShop[];
}

export function ReportsTab() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', report_type: 'product' });
  const [creating, setCreating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedReport | null>(null);
  const [marketCatId, setMarketCatId] = useState('');
  const [marketData, setMarketData] = useState<MarketShareData | null>(null);

  useEffect(() => {
    reportsApi.list()
      .then((r) => setReports(r.data))
      .catch(logError)
      .finally(() => setLoading(false));
  }, []);

  function createReport() {
    if (!form.title) return;
    setCreating(true);
    reportsApi.create({ title: form.title, report_type: form.report_type })
      .then((r) => { setReports([r.data, ...reports]); setForm({ title: '', report_type: 'product' }); })
      .catch((e) => toastError(e))
      .finally(() => setCreating(false));
  }

  function generateReport(id: string) {
    reportsApi.generate(id).then((r) => setGenerated(r.data)).catch((e) => toastError(e));
  }

  function loadMarketShare() {
    if (!marketCatId) return;
    reportsApi.marketShare(Number(marketCatId)).then((r) => setMarketData(r.data)).catch((e) => toastError(e));
  }

  function downloadMarketShareCSV(data: MarketShareData) {
    if (!data.shops?.length) return;
    const header = 'Do\'kon,Mahsulotlar,Haftalik sotuv,Bozor ulushi (%)';
    const rows = data.shops.map((s) =>
      `"${s.name || "Noma'lum"}",${s.product_count},${s.total_sales},${s.market_share_pct}`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `market-share-${marketCatId}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <SectionCard><Loading /></SectionCard>;

  return (
    <div className="space-y-4">
      <SectionCard>
        <SectionHeader
          title="Hisobot Yaratish"
          desc="Custom hisobotlar yarating va generatsiya qiling"
        />

        <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4 mb-4">
          <p className="text-xs text-base-content/50 mb-3">Yangi hisobot</p>
          <div className="flex flex-wrap gap-2">
            <input className="input input-bordered input-sm flex-1 min-w-40" placeholder="Hisobot nomi" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <select className="select select-bordered select-sm" value={form.report_type}
              onChange={(e) => setForm({ ...form, report_type: e.target.value })}>
              <option value="product">Mahsulot</option>
              <option value="category">Kategoriya</option>
              <option value="market">Bozor</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={createReport} disabled={creating}>
              {creating ? <span className="loading loading-spinner loading-xs" /> : 'Yaratish'}
            </button>
          </div>
        </div>

        {reports.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr className="text-xs text-base-content/40 uppercase">
                  <th>Nomi</th>
                  <th>Turi</th>
                  <th>Sana</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-base-300/20 transition-colors">
                    <td className="text-sm font-medium">{r.title}</td>
                    <td><span className="badge badge-sm badge-outline">{r.report_type}</span></td>
                    <td className="text-xs text-base-content/40">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td><button className="btn btn-xs btn-ghost text-info" onClick={() => generateReport(r.id)}>Generatsiya</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {generated && (
          <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4 mt-4">
            <h3 className="font-bold text-sm mb-2">{generated.title}</h3>
            <p className="text-xs text-base-content/40 mb-3">Yaratildi: {generated.generated_at}</p>
            <div className="overflow-x-auto">
              <table className="table table-xs">
                <tbody>
                  {generated.rows?.slice(0, 20).map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="text-xs">{String(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Market Share */}
      <SectionCard>
        <SectionHeader
          title="Bozor Ulushi"
          desc="Kategoriya bo'yicha do'konlar bozor ulushi"
        />
        <div className="flex flex-wrap gap-2 mb-4">
          <input className="input input-bordered input-sm w-40" placeholder="Kategoriya ID" value={marketCatId}
            onChange={(e) => setMarketCatId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadMarketShare()} />
          <button className="btn btn-sm btn-primary" onClick={loadMarketShare}>Hisoblash</button>
          {marketData && marketData.shops && marketData.shops.length > 0 && (
            <button className="btn btn-sm btn-outline gap-1" onClick={() => downloadMarketShareCSV(marketData!)}>
              📥 CSV yuklab olish
            </button>
          )}
        </div>
        {marketData ? (
          <div>
            <div className="flex gap-4 text-sm mb-4">
              <div className="rounded-xl bg-base-300/40 border border-base-300/30 px-4 py-2">
                Jami mahsulot: <strong>{marketData.total_products}</strong>
              </div>
              <div className="rounded-xl bg-base-300/40 border border-base-300/30 px-4 py-2">
                Jami sotuv: <strong>{marketData.total_sales}</strong>/hafta
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr className="text-xs text-base-content/40 uppercase">
                    <th>Do'kon</th>
                    <th className="text-right">Mahsulotlar</th>
                    <th className="text-right">Sotuv</th>
                    <th>Ulush</th>
                  </tr>
                </thead>
                <tbody>
                  {marketData.shops?.slice(0, 20).map((s, i) => (
                    <tr key={i} className="hover:bg-base-300/20 transition-colors">
                      <td className="text-sm">{s.name || "Noma'lum"}</td>
                      <td className="text-right tabular-nums text-sm">{s.product_count}</td>
                      <td className="text-right tabular-nums text-sm">{s.total_sales}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <progress className="progress progress-primary w-20 h-2" value={s.market_share_pct} max="100" />
                          <span className="text-xs tabular-nums">{s.market_share_pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState text="Kategoriya ID kiritib, bozor ulushini hisoblang" icon="📊" />
        )}
      </SectionCard>
    </div>
  );
}
