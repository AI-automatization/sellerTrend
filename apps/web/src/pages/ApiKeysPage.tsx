import { useState, useEffect } from 'react';
import { apiKeysApi } from '../api/client';

interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  daily_limit: number;
  requests_today: number;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
}

export function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadKeys() {
    try { const res = await apiKeysApi.list(); setKeys(res.data); }
    catch {} finally { setLoading(false); }
  }

  useEffect(() => { loadKeys(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const res = await apiKeysApi.create(newKeyName.trim());
      setNewKeyValue(res.data.key);
      setNewKeyName('');
      setShowCreate(false);
      await loadKeys();
    } catch {}
    finally { setCreating(false); }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try { await apiKeysApi.remove(id); await loadKeys(); }
    catch {} finally { setDeletingId(null); }
  }

  function copyKey() {
    if (!newKeyValue) return;
    navigator.clipboard.writeText(newKeyValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="w-full space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 lg:w-7 lg:h-7 text-warning">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
            API Kalitlari
          </h1>
          <p className="text-base-content/50 text-sm mt-1">
            API kalitlarini boshqaring (Dev Plan)
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm">
          + Yangi kalit
        </button>
      </div>

      {/* New key reveal */}
      {newKeyValue && (
        <div className="alert alert-warning">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div className="flex-1">
            <p className="font-bold text-sm">Yangi API kalit yaratildi!</p>
            <p className="text-xs mt-1">Bu kalitni saqlang — qayta ko'rsatilmaydi!</p>
            <div className="bg-base-100 rounded-lg p-3 mt-2 font-mono text-xs break-all select-all">
              {newKeyValue}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={copyKey} className="btn btn-sm">
              {copied ? 'Nusxalandi!' : 'Nusxalash'}
            </button>
            <button onClick={() => setNewKeyValue(null)} className="btn btn-sm btn-ghost">Yopish</button>
          </div>
        </div>
      )}

      {/* Create form modal */}
      {showCreate && (
        <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
          <div className="card-body">
            <h2 className="card-title text-base">Yangi API kalit</h2>
            <form onSubmit={handleCreate} className="flex gap-3">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Kalit nomi (masalan: Production Bot)"
                className="input input-bordered flex-1"
                required
                autoFocus
              />
              <button type="submit" disabled={creating} className="btn btn-primary">
                {creating ? <span className="loading loading-spinner loading-sm" /> : 'Yaratish'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn btn-ghost">
                Bekor
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Keys list */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
        <div className="card-body p-0">
          <div className="px-4 pt-4 pb-3 border-b border-base-300">
            <h2 className="card-title text-base">Kalitlar</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-dots loading-lg text-primary" />
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2 text-base-content/40">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
              <p>Hali API kalit yo'q</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Nomi</th>
                    <th>Prefix</th>
                    <th className="text-center">Bugungi</th>
                    <th className="text-center">Limit</th>
                    <th>Oxirgi ishlatilgan</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id} className="hover">
                      <td className="font-medium text-sm">{k.name}</td>
                      <td className="font-mono text-xs text-base-content/50">{k.key_prefix}...</td>
                      <td className="text-center">
                        <span className={`tabular-nums text-sm ${k.requests_today >= k.daily_limit * 0.8 ? 'text-warning font-bold' : ''}`}>
                          {k.requests_today}
                        </span>
                      </td>
                      <td className="text-center tabular-nums text-sm text-base-content/50">{k.daily_limit}</td>
                      <td className="text-xs text-base-content/50">
                        {k.last_used_at ? new Date(k.last_used_at).toLocaleString('uz-UZ') : 'Hali yo\'q'}
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(k.id)}
                          disabled={deletingId === k.id}
                          className="btn btn-ghost btn-xs text-error"
                        >
                          {deletingId === k.id ? <span className="loading loading-spinner loading-xs" /> : 'O\'chirish'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
        <div className="card-body p-4">
          <h3 className="font-bold text-sm">Foydalanish</h3>
          <div className="bg-base-300 rounded-lg p-3 mt-2 font-mono text-xs">
            <p className="text-base-content/50"># Har bir requestda X-API-Key header yuboring:</p>
            <p className="mt-1">curl -H "X-API-Key: utf_..." https://api.example.com/api/v1/...</p>
          </div>
          <p className="text-xs text-base-content/40 mt-2">
            Kunlik limit: {keys[0]?.daily_limit ?? 1000} request. Limit har kuni 00:00 da yangilanadi.
          </p>
        </div>
      </div>
    </div>
  );
}
