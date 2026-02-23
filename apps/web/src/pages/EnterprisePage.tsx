import { useState, useEffect } from 'react';
import {
  adsApi,
  teamApi,
  reportsApi,
  watchlistApi,
  communityApi,
} from '../api/client';

type Tab = 'ads' | 'team' | 'reports' | 'watchlist' | 'community';

const TABS: { key: Tab; label: string; feat: string }[] = [
  { key: 'ads', label: 'Ads ROI', feat: '31' },
  { key: 'team', label: 'Jamoa', feat: '33' },
  { key: 'reports', label: 'Hisobotlar', feat: '34' },
  { key: 'watchlist', label: 'Watchlist', feat: '36' },
  { key: 'community', label: 'Jamiyat', feat: '38' },
];

export function EnterprisePage() {
  const [tab, setTab] = useState<Tab>('ads');

  return (
    <div className="w-full space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Enterprise</h1>
        <p className="text-base-content/60 text-sm mt-1">v4.0 — Korporativ funksiyalar</p>
      </div>

      <div className="bg-base-200/60 border border-base-300/50 rounded-2xl p-2">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}
            >
              <span className="badge badge-xs badge-outline mr-1">{t.feat}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-base-200/60 border border-base-300/50 rounded-2xl p-4 lg:p-6">
        {tab === 'ads' && <AdsTab />}
        {tab === 'team' && <TeamTab />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'watchlist' && <WatchlistTab />}
        {tab === 'community' && <CommunityTab />}
      </div>
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

  if (loading) return <Loading />;

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Uzum Ads ROI Tracker</h2>
      <p className="text-base-content/60 text-sm mb-4">Reklama kampaniyalarini kuzatib, ROI hisoblang</p>

      <div className="flex flex-wrap gap-2 mb-6">
        <input className="input input-bordered input-sm w-48" placeholder="Kampaniya nomi" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input input-bordered input-sm w-36" placeholder="Byudjet (so'm)" type="number" value={form.budget_uzs}
          onChange={(e) => setForm({ ...form, budget_uzs: e.target.value })} />
        <button className="btn btn-primary btn-sm" onClick={createCampaign} disabled={creating}>
          {creating ? <span className="loading loading-spinner loading-xs" /> : 'Yaratish'}
        </button>
      </div>

      {roiData && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'CTR', value: `${roiData.ctr}%` },
            { label: 'CPC', value: `${Number(roiData.cpc).toLocaleString()} so'm` },
            { label: 'ROAS', value: `${roiData.roas}x` },
            { label: 'ROI', value: `${roiData.roi}%` },
            { label: 'CPA', value: `${Number(roiData.cpa).toLocaleString()} so'm` },
          ].map((s) => (
            <div key={s.label} className="stat bg-base-300/50 rounded-xl p-3">
              <div className="stat-title text-xs">{s.label}</div>
              <div className="stat-value text-lg">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {campaigns.length === 0 ? (
        <EmptyState text="Hali kampaniya yo'q" />
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Nomi</th>
                <th>Byudjet</th>
                <th>Sarflandi</th>
                <th>Klik</th>
                <th>Konversiya</th>
                <th>Daromad</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c: any) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td>{Number(c.budget_uzs).toLocaleString()}</td>
                  <td>{Number(c.spent_uzs).toLocaleString()}</td>
                  <td>{c.clicks}</td>
                  <td>{c.conversions}</td>
                  <td>{Number(c.revenue_uzs).toLocaleString()}</td>
                  <td><span className={`badge badge-sm ${c.status === 'ACTIVE' ? 'badge-success' : 'badge-ghost'}`}>{c.status}</span></td>
                  <td><button className="btn btn-xs btn-info" onClick={() => showROI(c.id)}>ROI</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
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

  if (loading) return <Loading />;

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Jamoa Boshqaruvi</h2>
      <p className="text-base-content/60 text-sm mb-4">Jamoangizga a'zolar taklif qiling</p>

      <div className="flex flex-wrap gap-2 mb-6">
        <input className="input input-bordered input-sm w-56" placeholder="Email" type="email" value={form.email}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-3">A'zolar ({members.length})</h3>
          <div className="space-y-2">
            {members.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-base-300/50 rounded-lg">
                <div>
                  <span className="text-sm font-medium">{m.email}</span>
                  <span className={`badge badge-xs ml-2 ${m.is_active ? 'badge-success' : 'badge-error'}`}>{m.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-3">Takliflar ({invites.length})</h3>
          <div className="space-y-2">
            {invites.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-base-300/50 rounded-lg">
                <div>
                  <span className="text-sm">{inv.email}</span>
                  <span className={`badge badge-xs ml-2 ${inv.status === 'PENDING' ? 'badge-warning' : inv.status === 'ACCEPTED' ? 'badge-success' : 'badge-error'}`}>{inv.status}</span>
                </div>
                {inv.status === 'PENDING' && (
                  <button className="btn btn-xs btn-error" onClick={() => teamApi.cancelInvite(inv.id).then(() => setInvites(invites.filter((i: any) => i.id !== inv.id)))}>
                    Bekor
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
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

  if (loading) return <Loading />;

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Hisobot Yaratish</h2>

      <div className="flex flex-wrap gap-2 mb-4">
        <input className="input input-bordered input-sm w-48" placeholder="Hisobot nomi" value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <select className="select select-bordered select-sm" value={form.report_type}
          onChange={(e) => setForm({ ...form, report_type: e.target.value })}>
          <option value="product">Mahsulot</option>
          <option value="category">Kategoriya</option>
          <option value="market">Bozor</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={createReport} disabled={creating}>Yaratish</button>
      </div>

      {reports.length > 0 && (
        <div className="overflow-x-auto mb-6">
          <table className="table table-sm">
            <thead><tr><th>Nomi</th><th>Turi</th><th>Sana</th><th /></tr></thead>
            <tbody>
              {reports.map((r: any) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
                  <td><span className="badge badge-sm badge-outline">{r.report_type}</span></td>
                  <td className="text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td><button className="btn btn-xs btn-info" onClick={() => generateReport(r.id)}>Generatsiya</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {generated && (
        <div className="bg-base-300/50 rounded-xl p-4 mb-6">
          <h3 className="font-bold mb-2">{generated.title}</h3>
          <p className="text-xs text-base-content/60 mb-3">Yaratildi: {generated.generated_at}</p>
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

      {/* Market Share section */}
      <div className="border-t border-base-300/50 pt-4 mt-4">
        <h3 className="font-bold mb-3">Bozor Ulushi (Feature 35)</h3>
        <div className="flex gap-2 mb-4">
          <input className="input input-bordered input-sm w-40" placeholder="Kategoriya ID" value={marketCatId}
            onChange={(e) => setMarketCatId(e.target.value)} />
          <button className="btn btn-sm btn-primary" onClick={loadMarketShare}>Hisoblash</button>
        </div>
        {marketData && (
          <div>
            <div className="flex gap-4 text-sm mb-3">
              <span>Jami mahsulot: <strong>{marketData.total_products}</strong></span>
              <span>Jami sotuv: <strong>{marketData.total_sales}</strong>/hafta</span>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead><tr><th>Do'kon</th><th>Mahsulotlar</th><th>Sotuv</th><th>Ulush</th></tr></thead>
                <tbody>
                  {marketData.shops?.slice(0, 20).map((s: any, i: number) => (
                    <tr key={i}>
                      <td>{s.name || 'Noma\'lum'}</td>
                      <td>{s.product_count}</td>
                      <td>{s.total_sales}</td>
                      <td><progress className="progress progress-primary w-20" value={s.market_share_pct} max="100" />
                        <span className="ml-2 text-xs">{s.market_share_pct}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
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

  if (loading) return <Loading />;

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Watchlist Ulashish</h2>
      <p className="text-base-content/60 text-sm mb-4">Kuzatuv ro'yxatlarini boshqalar bilan ulashing</p>

      <div className="flex flex-wrap gap-2 mb-6">
        <input className="input input-bordered input-sm w-48" placeholder="Ro'yxat nomi" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input input-bordered input-sm w-64" placeholder="Product ID'lar (vergul bilan)" value={form.product_ids}
          onChange={(e) => setForm({ ...form, product_ids: e.target.value })} />
        <button className="btn btn-primary btn-sm" onClick={create} disabled={creating}>Yaratish</button>
      </div>

      {lists.length === 0 ? (
        <EmptyState text="Hali watchlist yo'q" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {lists.map((l: any) => (
            <div key={l.id} className="card bg-base-300/50 p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold">{l.name}</h3>
                <div className="flex gap-1">
                  {l.is_public ? (
                    <button className="btn btn-xs btn-success" onClick={() => copyLink(l.share_token)}>
                      {copiedId === l.share_token ? 'Nusxalandi!' : 'Link'}
                    </button>
                  ) : (
                    <button className="btn btn-xs btn-info" onClick={() => share(l.id)}>Ulashish</button>
                  )}
                </div>
              </div>
              <div className="flex gap-3 text-xs text-base-content/60">
                <span>{l.is_public ? 'Ommaviy' : 'Shaxsiy'}</span>
                <span>{l.views || 0} ko'rish</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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

  if (loading) return <Loading />;

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Jamiyat Intellekti</h2>
      <p className="text-base-content/60 text-sm mb-4">Bozor haqidagi bilimlar va tajribalarni ulashing</p>

      {/* Create insight */}
      <div className="bg-base-300/50 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-2 mb-2">
          <input className="input input-bordered input-sm w-48" placeholder="Sarlavha" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="input input-bordered input-sm w-36" placeholder="Kategoriya" value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <button className="btn btn-primary btn-sm" onClick={create} disabled={creating}>Yuborish</button>
        </div>
        <textarea className="textarea textarea-bordered w-full textarea-sm" rows={2} placeholder="Fikringizni yozing..."
          value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
      </div>

      {/* Filter */}
      <div className="flex gap-1 mb-4 flex-wrap">
        <button className={`btn btn-xs ${!filter ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('')}>Hammasi</button>
        {categories.map((cat: string) => (
          <button key={cat} className={`btn btn-xs ${filter === cat ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(cat)}>{cat}</button>
        ))}
      </div>

      {/* Insights list */}
      {insights.length === 0 ? (
        <EmptyState text="Hali fikrlar yo'q" />
      ) : (
        <div className="space-y-3">
          {insights.map((ins: any) => (
            <div key={ins.id} className="card bg-base-300/50 p-4">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-1">
                  <button className="btn btn-xs btn-ghost" onClick={() => vote(ins.id, 1)}>+</button>
                  <span className="font-bold text-sm">{(ins.upvotes || 0) - (ins.downvotes || 0)}</span>
                  <button className="btn btn-xs btn-ghost" onClick={() => vote(ins.id, -1)}>-</button>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{ins.title}</h3>
                    <span className="badge badge-xs badge-outline">{ins.category}</span>
                  </div>
                  <p className="text-sm text-base-content/70">{ins.content}</p>
                  <p className="text-xs text-base-content/40 mt-1">{new Date(ins.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ Shared components ============ */
function Loading() {
  return <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg" /></div>;
}
function EmptyState({ text }: { text: string }) {
  return <div className="text-center py-8 text-base-content/50">{text}</div>;
}
