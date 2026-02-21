import { useState } from 'react';
import { uzumApi, productsApi } from '../api/client';

interface AnalyzeResult {
  product_id: number;
  title: string;
  rating: number;
  feedback_quantity: number;
  orders_quantity: number;
  weekly_bought: number | null;
  score: number;
  snapshot_id: string;
  sell_price: number | null;
}

export function AnalyzePage() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tracked, setTracked] = useState(false);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);
    setTracked(false);
    setLoading(true);

    try {
      const res = await uzumApi.analyzeUrl(url);
      setResult(res.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message ??
          "Tahlil vaqtida xato yuz berdi. URL to'g'riligini tekshiring."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleTrack() {
    if (!result) return;
    try {
      await productsApi.track(String(result.product_id));
      setTracked(true);
    } catch {
      // Already tracked or error
      setTracked(true);
    }
  }

  function getScoreColor(score: number) {
    if (score >= 3.5) return 'text-green-600 bg-green-50';
    if (score >= 2.5) return 'text-yellow-600 bg-yellow-50';
    return 'text-slate-600 bg-slate-50';
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">URL Tahlil</h1>

      <form onSubmit={handleAnalyze} className="bg-white rounded-xl shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Uzum mahsulot URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://uzum.uz/product/12345"
          />
          <p className="text-xs text-slate-400 mt-1">
            Uzum mahsulot sahifasining URL'ini kiriting
          </p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Tahlil qilinmoqda...' : 'Tahlil qilish'}
        </button>
      </form>

      {error && (
        <div className="mt-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 bg-white rounded-xl shadow p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="font-semibold text-lg">{result.title}</h2>
              <p className="text-slate-400 text-sm mt-1">ID: {result.product_id}</p>
            </div>
            <span
              className={`ml-4 px-4 py-2 rounded-lg font-bold text-xl ${getScoreColor(result.score)}`}
            >
              {result.score.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat label="Jami buyurtmalar" value={result.orders_quantity.toLocaleString()} />
            <Stat
              label="Bu hafta sotilgan"
              value={result.weekly_bought ? result.weekly_bought.toLocaleString() : 'N/A'}
            />
            <Stat label="Reyting" value={`★ ${result.rating}`} />
            <Stat label="Sharhlar" value={result.feedback_quantity.toLocaleString()} />
            {result.sell_price && (
              <Stat
                label="Narx"
                value={`${result.sell_price.toLocaleString()} so'm`}
              />
            )}
          </div>

          <div className="pt-2 border-t">
            <button
              onClick={handleTrack}
              disabled={tracked}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {tracked ? 'Kuzatuvga qo\'shildi ✓' : 'Kuzatuvga qo\'shish'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold mt-1">{value}</p>
    </div>
  );
}
