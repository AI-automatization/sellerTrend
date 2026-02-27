import { useState, useEffect } from 'react';
import { adsApi } from '../../api/client';
import { SectionCard, SectionHeader, Loading, EmptyState } from './shared';

interface Campaign {
  id: string;
  name: string;
  budget_uzs: number;
  spent_uzs: number;
  clicks: number;
  conversions: number;
  revenue_uzs: number;
  status: string;
}

interface RoiMetrics {
  ctr: number;
  cpc: number;
  roas: number;
  roi: number;
  cpa: number;
}

export function AdsTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', budget_uzs: '' });
  const [creating, setCreating] = useState(false);
  const [roiData, setRoiData] = useState<RoiMetrics | null>(null);

  useEffect(() => {
    adsApi.listCampaigns()
      .then((r) => setCampaigns(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function createCampaign() {
    if (!form.name) return;
    setCreating(true);
    adsApi.createCampaign({ name: form.name, budget_uzs: Number(form.budget_uzs) || 0 })
      .then((r) => {
        setCampaigns([r.data, ...campaigns]);
        setForm({ name: '', budget_uzs: '' });
      })
      .catch(() => {})
      .finally(() => setCreating(false));
  }

  function showROI(id: string) {
    adsApi.getCampaignROI(id).then((r) => setRoiData(r.data)).catch(() => {});
  }

  if (loading) return <SectionCard><Loading /></SectionCard>;

  return (
    <SectionCard>
      <SectionHeader
        title="Uzum Ads ROI Tracker"
        desc="Reklama kampaniyalarini kuzatib, ROI hisoblang"
      />

      {/* Create form */}
      <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4 mb-6">
        <p className="text-xs text-base-content/50 mb-3">Yangi kampaniya</p>
        <div className="flex flex-wrap gap-2">
          <input className="input input-bordered input-sm flex-1 min-w-40" placeholder="Kampaniya nomi" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input input-bordered input-sm w-36" placeholder="Byudjet (so'm)" type="number" value={form.budget_uzs}
            onChange={(e) => setForm({ ...form, budget_uzs: e.target.value })} />
          <button className="btn btn-primary btn-sm" onClick={createCampaign} disabled={creating}>
            {creating ? <span className="loading loading-spinner loading-xs" /> : 'Yaratish'}
          </button>
        </div>
      </div>

      {/* ROI metrics */}
      {roiData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'CTR', value: `${roiData.ctr}%`, color: '' },
            { label: 'CPC', value: `${Number(roiData.cpc).toLocaleString()} so'm`, color: '' },
            { label: 'ROAS', value: `${roiData.roas}x`, color: roiData.roas >= 2 ? 'text-success' : 'text-warning' },
            { label: 'ROI', value: `${roiData.roi}%`, color: roiData.roi > 0 ? 'text-success' : 'text-error' },
            { label: 'CPA', value: `${Number(roiData.cpa).toLocaleString()} so'm`, color: '' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-base-300/40 border border-base-300/30 p-3">
              <p className="text-xs text-base-content/40">{s.label}</p>
              <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {campaigns.length === 0 ? (
        <EmptyState text="Hali kampaniya yo'q" icon="📢" />
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs text-base-content/40 uppercase">
                <th>Nomi</th>
                <th className="text-right">Byudjet</th>
                <th className="text-right">Sarflandi</th>
                <th className="text-right">Klik</th>
                <th className="text-right">Konversiya</th>
                <th className="text-right">Daromad</th>
                <th className="text-center">Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-base-300/20 transition-colors">
                  <td className="font-medium text-sm">{c.name}</td>
                  <td className="text-right tabular-nums text-sm">{Number(c.budget_uzs).toLocaleString()}</td>
                  <td className="text-right tabular-nums text-sm">{Number(c.spent_uzs).toLocaleString()}</td>
                  <td className="text-right tabular-nums text-sm">{c.clicks}</td>
                  <td className="text-right tabular-nums text-sm">{c.conversions}</td>
                  <td className="text-right tabular-nums text-sm text-success">{Number(c.revenue_uzs).toLocaleString()}</td>
                  <td className="text-center">
                    <span className={`badge badge-sm ${c.status === 'ACTIVE' ? 'badge-success' : c.status === 'PAUSED' ? 'badge-warning' : 'badge-ghost'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td><button className="btn btn-xs btn-ghost text-info" onClick={() => showROI(c.id)}>ROI</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
