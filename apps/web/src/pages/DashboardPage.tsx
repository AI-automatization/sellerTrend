import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productsApi, billingApi } from '../api/client';
import { ScoreChart } from '../components/ScoreChart';

interface TrackedProduct {
  product_id: string;
  title: string;
  rating: number;
  orders_quantity: string;
  score: number | null;
  weekly_bought: number | null;
  tracked_since: string;
}

interface Balance {
  balance: string;
  status: string;
  daily_fee: string;
}

export function DashboardPage() {
  const [products, setProducts] = useState<TrackedProduct[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      productsApi.getTracked().then((r) => setProducts(r.data)),
      billingApi.getBalance().then((r) => setBalance(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-slate-500">Yuklanmoqda...</div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link
          to="/analyze"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          + URL Tahlil qilish
        </Link>
      </div>

      {/* Balance card */}
      {balance && (
        <div className={`rounded-xl p-4 ${balance.status === 'PAYMENT_DUE' ? 'bg-red-50 border border-red-200' : 'bg-white shadow'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Balans</p>
              <p className="text-2xl font-bold">
                {Number(balance.balance).toLocaleString()} so'm
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Kunlik to'lov</p>
              <p className="font-medium">{Number(balance.daily_fee).toLocaleString()} so'm</p>
              {balance.status === 'PAYMENT_DUE' && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded mt-1 inline-block">
                  To'lov kerak!
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Products table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Kuzatilayotgan mahsulotlar ({products.length})</h2>
        </div>

        {products.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p>Hali mahsulot qo'shilmagan.</p>
            <Link to="/analyze" className="text-blue-600 text-sm hover:underline mt-2 block">
              Birinchi mahsulotni tahlil qiling
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Mahsulot</th>
                <th className="px-4 py-3 text-right">Score</th>
                <th className="px-4 py-3 text-right">Bu hafta</th>
                <th className="px-4 py-3 text-right">Jami buyurtma</th>
                <th className="px-4 py-3 text-right">Reyting</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((p) => (
                <tr key={p.product_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium line-clamp-1">{p.title}</p>
                    <p className="text-slate-400 text-xs">ID: {p.product_id}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.score !== null ? (
                      <span className={`font-bold ${p.score > 3 ? 'text-green-600' : p.score > 2 ? 'text-yellow-600' : 'text-slate-500'}`}>
                        {p.score.toFixed(2)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {p.weekly_bought ? p.weekly_bought.toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {p.orders_quantity ? Number(p.orders_quantity).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-yellow-500">★</span> {p.rating ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
