import { useState, useEffect } from 'react';
import {
  adsApi,
  teamApi,
  reportsApi,
  watchlistApi,
  communityApi,
} from '../api/client';

type Tab = 'ads' | 'team' | 'reports' | 'watchlist' | 'community';

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'ads', label: 'Ads ROI', emoji: '📢' },
  { key: 'team', label: 'Jamoa', emoji: '👥' },
  { key: 'reports', label: 'Hisobotlar', emoji: '📄' },
  { key: 'watchlist', label: 'Watchlist', emoji: '👁' },
  { key: 'community', label: 'Jamiyat', emoji: '💡' },
];

export function EnterprisePage() {
  const [tab, setTab] = useState<Tab>('ads');

  return (
    <div className="w-full space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 lg:w-7 lg:h-7 text-secondary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
            Enterprise
          </h1>
          <p className="text-base-content/50 text-sm mt-1">v4.0 — Korporativ funksiyalar (Features 31-43)</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-2">
        <div className="flex gap-1 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`btn btn-sm gap-1.5 flex-1 min-w-fit transition-all ${
                tab === t.key
                  ? 'btn-primary shadow-md shadow-primary/20'
                  : 'btn-ghost hover:bg-base-300/50'
              }`}
            >
              <span className="text-base">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'ads' && <AdsTab />}
      {tab === 'team' && <TeamTab />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'watchlist' && <WatchlistTab />}
      {tab === 'community' && <CommunityTab />}
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

function Loading() {
  return (
    <div className="flex justify-center py-12">
      <span className="loading loading-dots loading-lg text-primary" />
    </div>
  );
}

function EmptyState({ text, icon }: { text: string; icon?: string }) {
  return (
    <div className="text-center py-12 text-base-content/30">
      <p className="text-4xl mb-2">{icon ?? '📭'}</p>
      <p className="text-sm">{text}</p>
    </div>
  );
}

/* ============ Feature 31 — Ads ROI Tracker ============ */
function AdsTab() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', budget_uzs: '' });
  const [creating, setCreating] = useState(false);
  const [roiData, setRoiData] = useState<any>(null);

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
              {campaigns.map((c: any) => (
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

/* ============ Feature 33 — Team Collaboration ============ */
function TeamTab() {
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: '', role: 'USER' });
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    Promise.all([teamApi.listMembers(), teamApi.listInvites()])
      .then(([m, i]) => { setMembers(m.data); setInvites(i.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function invite() {
    if (!form.email) return;
    setInviting(true);
    teamApi.invite({ email: form.email, role: form.role })
      .then((r) => {
        setInvites([r.data, ...invites]);
        setForm({ email: '', role: 'USER' });
      })
      .catch(() => {})
      .finally(() => setInviting(false));
  }

  if (loading) return <SectionCard><Loading /></SectionCard>;

  return (
    <SectionCard>
      <SectionHeader
        title="Jamoa Boshqaruvi"
        desc="Jamoangizga a'zolar taklif qiling"
      />

      <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4 mb-6">
        <p className="text-xs text-base-content/50 mb-3">A'zo taklif qilish</p>
        <div className="flex flex-wrap gap-2">
          <input className="input input-bordered input-sm flex-1 min-w-48" placeholder="Email" type="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <select className="select select-bordered select-sm" value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="USER">User</option>
            <option value="MODERATOR">Moderator</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={invite} disabled={inviting}>
            {inviting ? <span className="loading loading-spinner loading-xs" /> : 'Taklif'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Members */}
        <div>
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            A'zolar
            <span className="badge badge-sm badge-outline">{members.length}</span>
          </h3>
          {members.length === 0 ? (
            <p className="text-sm text-base-content/30 py-4 text-center">A'zolar yo'q</p>
          ) : (
            <div className="space-y-2">
              {members.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-base-300/40 border border-base-300/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                      {m.email[0].toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-medium">{m.email}</span>
                      <div className="flex gap-1 mt-0.5">
                        <span className={`badge badge-xs ${m.is_active ? 'badge-success' : 'badge-error'}`}>{m.role}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invites */}
        <div>
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            Takliflar
            <span className="badge badge-sm badge-outline">{invites.length}</span>
          </h3>
          {invites.length === 0 ? (
            <p className="text-sm text-base-content/30 py-4 text-center">Takliflar yo'q</p>
          ) : (
            <div className="space-y-2">
              {invites.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-base-300/40 border border-base-300/30">
                  <div>
                    <span className="text-sm">{inv.email}</span>
                    <span className={`badge badge-xs ml-2 ${inv.status === 'PENDING' ? 'badge-warning' : inv.status === 'ACCEPTED' ? 'badge-success' : 'badge-error'}`}>
                      {inv.status}
                    </span>
                  </div>
                  {inv.status === 'PENDING' && (
                    <button className="btn btn-xs btn-ghost text-error" onClick={() => teamApi.cancelInvite(inv.id).then(() => setInvites(invites.filter((i: any) => i.id !== inv.id)))}>
                      Bekor
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

/* ============ Features 34-35 — Custom Reports + Market Share ============ */
function ReportsTab() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', report_type: 'product' });
  const [creating, setCreating] = useState(false);
  const [generated, setGenerated] = useState<any>(null);
  const [marketCatId, setMarketCatId] = useState('');
  const [marketData, setMarketData] = useState<any>(null);

  useEffect(() => {
    reportsApi.list()
      .then((r) => setReports(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function createReport() {
    if (!form.title) return;
    setCreating(true);
    reportsApi.create({ title: form.title, report_type: form.report_type })
      .then((r) => { setReports([r.data, ...reports]); setForm({ title: '', report_type: 'product' }); })
      .catch(() => {})
      .finally(() => setCreating(false));
  }

  function generateReport(id: string) {
    reportsApi.generate(id).then((r) => setGenerated(r.data)).catch(() => {});
  }

  function loadMarketShare() {
    if (!marketCatId) return;
    reportsApi.marketShare(Number(marketCatId)).then((r) => setMarketData(r.data)).catch(() => {});
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
                {reports.map((r: any) => (
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
                  {generated.rows?.slice(0, 20).map((row: any, i: number) => (
                    <tr key={i}>
                      {Object.values(row).map((v: any, j: number) => (
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
                  {marketData.shops?.slice(0, 20).map((s: any, i: number) => (
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

/* ============ Feature 36 — Watchlist Sharing ============ */
function WatchlistTab() {
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', product_ids: '' });
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    watchlistApi.list()
      .then((r) => setLists(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function create() {
    if (!form.name) return;
    const ids = form.product_ids.split(',').map((s) => s.trim()).filter(Boolean);
    setCreating(true);
    watchlistApi.create({ name: form.name, product_ids: ids })
      .then((r) => { setLists([r.data, ...lists]); setForm({ name: '', product_ids: '' }); })
      .catch(() => {})
      .finally(() => setCreating(false));
  }

  function share(id: string) {
    watchlistApi.share(id).then((r) => {
      setLists(lists.map((l) => l.id === id ? { ...l, share_token: r.data.share_token, is_public: true } : l));
    }).catch(() => {});
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/watchlists/shared/${token}`);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) return <SectionCard><Loading /></SectionCard>;

  return (
    <SectionCard>
      <SectionHeader
        title="Watchlist Ulashish"
        desc="Kuzatuv ro'yxatlarini boshqalar bilan ulashing"
      />

      <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4 mb-6">
        <p className="text-xs text-base-content/50 mb-3">Yangi watchlist</p>
        <div className="flex flex-wrap gap-2">
          <input className="input input-bordered input-sm w-48" placeholder="Ro'yxat nomi" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input input-bordered input-sm flex-1 min-w-48" placeholder="Product ID'lar (vergul bilan)" value={form.product_ids}
            onChange={(e) => setForm({ ...form, product_ids: e.target.value })} />
          <button className="btn btn-primary btn-sm" onClick={create} disabled={creating}>
            {creating ? <span className="loading loading-spinner loading-xs" /> : 'Yaratish'}
          </button>
        </div>
      </div>

      {lists.length === 0 ? (
        <EmptyState text="Hali watchlist yo'q" icon="👁" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {lists.map((l: any) => (
            <div key={l.id} className="rounded-xl bg-base-300/40 border border-base-300/30 p-4 hover:bg-base-300/60 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm">{l.name}</h3>
                <div className="flex gap-1">
                  {l.is_public ? (
                    <button className="btn btn-xs btn-success gap-1" onClick={() => copyLink(l.share_token)}>
                      {copiedId === l.share_token ? 'Nusxalandi!' : 'Link nusxalash'}
                    </button>
                  ) : (
                    <button className="btn btn-xs btn-ghost border border-info/20 text-info" onClick={() => share(l.id)}>Ulashish</button>
                  )}
                </div>
              </div>
              <div className="flex gap-3 text-xs text-base-content/50">
                <span className={l.is_public ? 'text-success' : ''}>{l.is_public ? 'Ommaviy' : 'Shaxsiy'}</span>
                <span>{l.views || 0} ko'rish</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

/* ============ Feature 38 — Collective Intelligence ============ */
function CommunityTab() {
  const [insights, setInsights] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({ title: '', content: '', category: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([
      communityApi.listInsights(filter || undefined),
      communityApi.getCategories(),
    ])
      .then(([i, c]) => { setInsights(i.data); setCategories(c.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  function create() {
    if (!form.title || !form.content || !form.category) return;
    setCreating(true);
    communityApi.createInsight(form)
      .then((r) => { setInsights([r.data, ...insights]); setForm({ title: '', content: '', category: '' }); })
      .catch(() => {})
      .finally(() => setCreating(false));
  }

  function vote(id: string, v: number) {
    communityApi.vote(id, v).then(() => {
      setInsights(insights.map((ins) =>
        ins.id === id
          ? { ...ins, upvotes: ins.upvotes + (v === 1 ? 1 : 0), downvotes: ins.downvotes + (v === -1 ? 1 : 0) }
          : ins,
      ));
    }).catch(() => {});
  }

  if (loading) return <SectionCard><Loading /></SectionCard>;

  return (
    <SectionCard>
      <SectionHeader
        title="Jamiyat Intellekti"
        desc="Bozor haqidagi bilimlar va tajribalarni ulashing"
      />

      {/* Create insight */}
      <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4 mb-6">
        <p className="text-xs text-base-content/50 mb-3">Yangi fikr ulashish</p>
        <div className="flex flex-wrap gap-2 mb-2">
          <input className="input input-bordered input-sm flex-1 min-w-40" placeholder="Sarlavha" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="input input-bordered input-sm w-36" placeholder="Kategoriya" value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <button className="btn btn-primary btn-sm" onClick={create} disabled={creating}>
            {creating ? <span className="loading loading-spinner loading-xs" /> : 'Yuborish'}
          </button>
        </div>
        <textarea className="textarea textarea-bordered w-full textarea-sm" rows={2} placeholder="Fikringizni yozing..."
          value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
      </div>

      {/* Category filter */}
      <div className="flex gap-1 mb-4 flex-wrap">
        <button className={`btn btn-xs ${!filter ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('')}>Hammasi</button>
        {categories.map((cat: string) => (
          <button key={cat} className={`btn btn-xs ${filter === cat ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(cat)}>{cat}</button>
        ))}
      </div>

      {/* Insights list */}
      {insights.length === 0 ? (
        <EmptyState text="Hali fikrlar yo'q — birinchi bo'ling!" icon="💡" />
      ) : (
        <div className="space-y-3">
          {insights.map((ins: any) => (
            <div key={ins.id} className="rounded-xl bg-base-300/40 border border-base-300/30 p-4 hover:bg-base-300/60 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <button className="btn btn-xs btn-ghost text-success" onClick={() => vote(ins.id, 1)}>▲</button>
                  <span className="font-bold text-sm tabular-nums">{(ins.upvotes || 0) - (ins.downvotes || 0)}</span>
                  <button className="btn btn-xs btn-ghost text-error" onClick={() => vote(ins.id, -1)}>▼</button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-sm">{ins.title}</h3>
                    <span className="badge badge-xs badge-outline">{ins.category}</span>
                  </div>
                  <p className="text-sm text-base-content/60">{ins.content}</p>
                  <p className="text-xs text-base-content/30 mt-2">{new Date(ins.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
