import { useState } from 'react';
import { sourcingApi } from '../../api/client';
import { logError } from '../../utils/handleError';
import type { SearchItem } from './types';

export interface ExternalSearchProps {
  initialQuery?: string;
}

export function ExternalSearch({ initialQuery }: ExternalSearchProps) {
  const [query, setQuery] = useState(initialQuery ?? '');
  const [source, setSource] = useState('BOTH');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setResults([]); setNote('');
    try {
      const r = await sourcingApi.searchPrices(query, source);
      setResults(r.data.results ?? []);
      setNote(r.data.note ?? '');
    } catch (err: unknown) {
      logError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card bg-base-200/60 border border-base-300/50 rounded-2xl">
        <div className="card-body">
          <h2 className="card-title text-lg">Tez Narx Qidirish (Playwright)</h2>
          <p className="text-sm text-base-content/60">
            Banggood va Shopee'dan real-time narxlarni scraping orqali topadi
          </p>
          <form onSubmit={handleSearch} className="flex gap-2 mt-2 flex-wrap">
            <select className="select select-bordered select-sm" value={source}
              onChange={(e) => setSource(e.target.value)}>
              <option value="BOTH">🌍 Hammasi (Banggood + Shopee)</option>
              <option value="ALIBABA">🛍️ Faqat Banggood</option>
              <option value="ALIEXPRESS">🛒 Faqat Shopee</option>
            </select>
            <input type="text" placeholder="Masalan: wireless earphones"
              className="input input-bordered input-sm flex-1 min-w-48"
              value={query} onChange={(e) => setQuery(e.target.value)} />
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? <span className="loading loading-spinner loading-xs" /> : 'Qidirish'}
            </button>
          </form>
        </div>
      </div>

      {note && <div className="alert bg-base-200 text-sm"><span>ℹ️ {note}</span></div>}

      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((item, i) => (
            <div key={i} className="card bg-base-200/60 border border-base-300/50 rounded-2xl hover:bg-base-300/60 transition-colors">
              <div className="card-body p-4">
                {item.image && (
                  <img src={item.image} alt={item.title}
                    className="w-full h-28 object-contain rounded-lg bg-base-300 mb-2"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <p className="text-sm font-medium line-clamp-2 leading-snug">{item.title}</p>
                <p className="text-xl font-bold text-primary mt-1">{item.price}</p>
                <p className="text-xs text-base-content/50">{item.store}</p>
                {item.link && item.link !== '#' && (
                  <a href={item.link} target="_blank" rel="noopener noreferrer"
                    className="btn btn-outline btn-xs mt-2 w-fit">Ko'rish ↗</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && query && (
        <div className="text-center py-16 text-base-content/40">
          <p className="text-5xl mb-3">🔍</p>
          <p>Hech narsa topilmadi</p>
        </div>
      )}
    </div>
  );
}
