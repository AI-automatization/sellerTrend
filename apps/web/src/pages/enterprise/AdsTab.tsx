import { useState, useEffect } from 'react';
import { adsApi } from '../../api/client';
import { SectionCard, SectionHeader, Loading, EmptyState } from './shared';
import { logError, toastError } from '../../utils/handleError';
import { useI18n } from '../../i18n/I18nContext';

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
  const { t } = useI18n();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', budget_uzs: '' });
  const [creating, setCreating] = useState(false);
  const [roiData, setRoiData] = useState<RoiMetrics | null>(null);

  useEffect(() => {
    adsApi.listCampaigns()
      .then((r) => setCampaigns(r.data))
      .catch(logError)
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
      .catch((e) => toastError(e))
      .finally(() => setCreating(false));
  }

  function showROI(id: string) {
    adsApi.getCampaignROI(id).then((r) => setRoiData(r.data)).catch((e) => toastError(e));
  }

  if (loading) return <SectionCard><Loading /></SectionCard>;

  return (
    <SectionCard>
      <SectionHeader
        title={t('ads.title')}
        desc={t('ads.desc')}
      />

      {/* Create form */}
      <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4 mb-6">
        <p className="text-xs text-base-content/50 mb-3">{t('ads.newCampaignBtn')}</p>
        <div className="flex flex-wrap gap-2">
          <input className="input input-bordered input-sm flex-1 min-w-40" placeholder={t('ads.form.name')} value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input input-bordered input-sm w-36" placeholder={t('ads.form.budget')} type="number" value={form.budget_uzs}
            onChange={(e) => setForm({ ...form, budget_uzs: e.target.value })} />
          <button className="btn btn-primary btn-sm" onClick={createCampaign} disabled={creating}>
            {creating ? <span className="loading loading-spinner loading-xs" /> : t('ads.form.createBtn')}
          </button>
        </div>
      </div>

      {/* ROI metrics */}
      {roiData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'CTR', value: `${roiData.ctr}%`, color: '' },
            { label: 'CPC', value: `${Number(roiData.cpc).toLocaleString()} ${t('common.som')}`, color: '' },
            { label: 'ROAS', value: `${roiData.roas}x`, color: roiData.roas >= 2 ? 'text-success' : 'text-warning' },
            { label: 'ROI', value: `${roiData.roi}%`, color: roiData.roi > 0 ? 'text-success' : 'text-error' },
            { label: 'CPA', value: `${Number(roiData.cpa).toLocaleString()} ${t('common.som')}`, color: '' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-base-300/40 border border-base-300/30 p-3">
              <p className="text-xs text-base-content/40">{s.label}</p>
              <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {campaigns.length === 0 ? (
        <EmptyState text={t('ads.empty')} icon="📢" />
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs text-base-content/40 uppercase">
                <th>{t('ads.col.name')}</th>
                <th className="text-right">{t('ads.col.budget')}</th>
                <th className="text-right">{t('ads.col.spent')}</th>
                <th className="text-right">{t('ads.col.clicks')}</th>
                <th className="text-right">{t('ads.col.conversions')}</th>
                <th className="text-right">{t('ads.col.revenue')}</th>
                <th className="text-center">{t('ads.col.status')}</th>
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
