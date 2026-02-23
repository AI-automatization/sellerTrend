import { useState, useEffect } from 'react';
import { consultationApi } from '../api/client';

interface ConsultationItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  price_uzs: string;
  duration_min: number;
  consultant_name?: string;
  client_name?: string;
  status?: string;
  scheduled_at?: string;
  rating?: number;
  created_at: string;
}

type Tab = 'marketplace' | 'my-listings' | 'my-bookings';

export function ConsultationPage() {
  const [tab, setTab] = useState<Tab>('marketplace');
  const [items, setItems] = useState<ConsultationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'Uzum strategiya', price_uzs: '', duration_min: '60' });

  useEffect(() => {
    loadData();
  }, [tab]);

  async function loadData() {
    setLoading(true);
    try {
      let res;
      if (tab === 'marketplace') res = await consultationApi.list();
      else if (tab === 'my-listings') res = await consultationApi.getMyListings();
      else res = await consultationApi.getMyBookings();
      setItems(res.data);
    } catch {}
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await consultationApi.create({
        title: form.title,
        description: form.description || undefined,
        category: form.category,
        price_uzs: Number(form.price_uzs),
        duration_min: Number(form.duration_min),
      });
      setShowCreate(false);
      setForm({ title: '', description: '', category: 'Uzum strategiya', price_uzs: '', duration_min: '60' });
      loadData();
    } catch {}
    finally { setCreating(false); }
  }

  async function handleBook(id: string) {
    const date = prompt('Sana va vaqt (YYYY-MM-DD HH:mm):');
    if (!date) return;
    try {
      await consultationApi.book(id, new Date(date).toISOString());
      loadData();
    } catch {}
  }

  const categories = ['Uzum strategiya', 'Mahsulot tanlash', 'Reklama', 'Logistika', 'Narxlash', 'Boshqa'];

  return (
    <div className="w-full space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 lg:w-7 lg:h-7 text-primary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
            Konsultatsiya
          </h1>
          <p className="text-base-content/50 text-sm mt-1">
            Uzum ekspertlaridan maslahat oling yoki o'zingiz xizmat ko'rsating
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm">
          + E'lon berish
        </button>
      </div>

      {/* Tabs */}
      <div role="tablist" className="tabs tabs-box">
        {([['marketplace', 'Bozor'], ['my-listings', 'Mening e\'lonlarim'], ['my-bookings', 'Mening bronlarim']] as const).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            className={`tab ${tab === key ? 'tab-active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
          <div className="card-body">
            <h2 className="card-title text-base">Yangi e'lon</h2>
            <form onSubmit={handleCreate} className="space-y-3 mt-2">
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-xs">Sarlavha *</legend>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required className="input input-bordered w-full"
                  placeholder="Uzum'da 0 dan 100 ta sotuvga strategiya"
                />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-xs">Tavsif</legend>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  placeholder="Konsultatsiya haqida batafsil..."
                />
              </fieldset>
              <div className="grid grid-cols-3 gap-3">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-xs">Kategoriya</legend>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="select select-bordered w-full"
                  >
                    {categories.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-xs">Narx (so'm)</legend>
                  <input
                    type="number"
                    value={form.price_uzs}
                    onChange={(e) => setForm((f) => ({ ...f, price_uzs: e.target.value }))}
                    required min={1000}
                    className="input input-bordered w-full"
                    placeholder="200000"
                  />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-xs">Davomiylik (min)</legend>
                  <input
                    type="number"
                    value={form.duration_min}
                    onChange={(e) => setForm((f) => ({ ...f, duration_min: e.target.value }))}
                    required min={15}
                    className="input input-bordered w-full"
                  />
                </fieldset>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={creating} className="btn btn-primary">
                  {creating ? <span className="loading loading-spinner loading-sm" /> : 'Yaratish'}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-ghost">Bekor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Items */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-dots loading-lg text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
          <div className="card-body items-center py-12 text-base-content/40">
            <p>{tab === 'marketplace' ? "Hozircha e'lonlar yo'q" : "Hali ma'lumot yo'q"}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl bg-base-200/60 border border-base-300/50">
              <div className="card-body p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm">{item.title}</h3>
                    <p className="text-xs text-base-content/50 mt-0.5">
                      {item.consultant_name ?? item.client_name ?? ''}
                    </p>
                  </div>
                  <span className="badge badge-outline badge-sm">{item.category}</span>
                </div>
                {item.description && (
                  <p className="text-xs text-base-content/60 mt-2 line-clamp-2">{item.description}</p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <span className="text-lg font-bold">{Number(item.price_uzs).toLocaleString()}</span>
                    <span className="text-xs text-base-content/50 ml-1">so'm / {item.duration_min} min</span>
                  </div>
                  {item.status && (
                    <span className={`badge badge-sm ${
                      item.status === 'AVAILABLE' ? 'badge-success' :
                      item.status === 'BOOKED' ? 'badge-info' :
                      item.status === 'COMPLETED' ? 'badge-ghost' :
                      'badge-error'
                    }`}>
                      {item.status === 'AVAILABLE' ? 'Mavjud' :
                       item.status === 'BOOKED' ? 'Band' :
                       item.status === 'COMPLETED' ? 'Yakunlangan' :
                       item.status === 'CANCELLED' ? 'Bekor' : item.status}
                    </span>
                  )}
                </div>
                {tab === 'marketplace' && (
                  <button
                    onClick={() => handleBook(item.id)}
                    className="btn btn-primary btn-sm w-full mt-2"
                  >
                    Bron qilish
                  </button>
                )}
                {item.rating && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-warning text-sm">{'★'.repeat(Math.round(item.rating))}</span>
                    <span className="text-xs text-base-content/50">{item.rating}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
