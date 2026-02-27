import { useState, useEffect } from 'react';
import { watchlistApi } from '../../api/client';
import { SectionCard, SectionHeader, Loading, EmptyState } from './shared';
import { logError, toastError } from '../../utils/handleError';

interface Watchlist {
  id: string;
  name: string;
  is_public: boolean;
  share_token?: string;
  views?: number;
}

export function WatchlistTab() {
  const [lists, setLists] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', product_ids: '' });
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    watchlistApi.list()
      .then((r) => setLists(r.data))
      .catch(logError)
      .finally(() => setLoading(false));
  }, []);

  function create() {
    if (!form.name) return;
    const ids = form.product_ids.split(',').map((s) => s.trim()).filter(Boolean);
    setCreating(true);
    watchlistApi.create({ name: form.name, product_ids: ids })
      .then((r) => { setLists([r.data, ...lists]); setForm({ name: '', product_ids: '' }); })
      .catch((e) => toastError(e))
      .finally(() => setCreating(false));
  }

  function share(id: string) {
    watchlistApi.share(id).then((r) => {
      setLists(lists.map((l) => l.id === id ? { ...l, share_token: r.data.share_token, is_public: true } : l));
    }).catch((e) => toastError(e));
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
          {lists.map((l) => (
            <div key={l.id} className="rounded-xl bg-base-300/40 border border-base-300/30 p-4 hover:bg-base-300/60 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm">{l.name}</h3>
                <div className="flex gap-1">
                  {l.is_public ? (
                    <button className="btn btn-xs btn-success gap-1" onClick={() => copyLink(l.share_token!)}>
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
