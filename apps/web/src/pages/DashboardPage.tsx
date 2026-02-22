import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productsApi, billingApi } from '../api/client';
import { ScoreChart } from '../components/ScoreChart';
import {
  FireIcon,
  WalletIcon,
  ArrowTrendingUpIcon,
  MagnifyingGlassIcon,
} from '../components/icons';

interface TrackedProduct {
  product_id: string;
  title: string;
  rating: number | string;
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

interface Snapshot {
  score: number;
  snapshot_at: string;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="badge badge-ghost">—</span>;
  if (score >= 6) return <span className="badge badge-success">{score.toFixed(2)}</span>;
  if (score >= 4) return <span className="badge badge-warning">{score.toFixed(2)}</span>;
  return <span className="badge badge-ghost">{score.toFixed(2)}</span>;
}

function ProductDrawer({
  product,
  onClose,
}: {
  product: TrackedProduct;
  onClose: () => void;
}) {
  const [chartData, setChartData] = useState<{ date: string; score: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productsApi
      .getSnapshots(product.product_id)
      .then((r) => {
        const data = r.data
          .slice()
          .reverse()
          .map((s: Snapshot) => ({
            date: new Date(s.snapshot_at).toLocaleDateString('uz-UZ', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            score: Number(Number(s.score).toFixed(4)),
          }));
        setChartData(data);
      })
      .finally(() => setLoading(false));
  }, [product.product_id]);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/50"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="w-full max-w-md bg-base-200 h-full overflow-y-auto flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 p-4 border-b border-base-300">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-base-content/40 mb-0.5">#{product.product_id}</p>
            <h2 className="font-bold text-sm leading-snug">{product.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-square shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 p-4">
          <div className="bg-base-300 rounded-xl p-3">
            <p className="text-xs text-base-content/50 mb-1">Score</p>
            <p className="font-bold text-xl text-primary">
              {product.score != null ? product.score.toFixed(2) : '—'}
            </p>
          </div>
          <div className="bg-base-300 rounded-xl p-3">
            <p className="text-xs text-base-content/50 mb-1">So'nggi faollik</p>
            <p className="font-bold text-xl text-success">
              {product.weekly_bought != null
                ? product.weekly_bought.toLocaleString()
                : '—'}
            </p>
          </div>
          <div className="bg-base-300 rounded-xl p-3">
            <p className="text-xs text-base-content/50 mb-1">Jami buyurtmalar</p>
            <p className="font-bold text-lg">
              {product.orders_quantity
                ? Number(product.orders_quantity).toLocaleString()
                : '—'}
            </p>
          </div>
          <div className="bg-base-300 rounded-xl p-3">
            <p className="text-xs text-base-content/50 mb-1">Reyting</p>
            <p className="font-bold text-lg text-yellow-400">
              ★ {product.rating ?? '—'}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="px-4 pb-4 flex-1">
          <p className="text-xs text-base-content/50 mb-3 font-medium">Score tarixi</p>
          {loading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          ) : (
            <ScoreChart data={chartData} />
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-base-300">
          <Link
            to={`/analyze`}
            onClick={onClose}
            className="btn btn-primary btn-sm w-full gap-2"
          >
            <MagnifyingGlassIcon className="w-4 h-4" />
            Qayta tahlil qilish
          </Link>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [products, setProducts] = useState<TrackedProduct[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TrackedProduct | null>(null);

  useEffect(() => {
    Promise.all([
      productsApi.getTracked().then((r) => setProducts(r.data)),
      billingApi.getBalance().then((r) => setBalance(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-dots loading-lg text-primary" />
      </div>
    );
  }

  const paymentDue = balance?.status === 'PAYMENT_DUE';

  return (
    <>
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-base-content/50 text-sm mt-0.5">
              Mahsulotlar va statistika
            </p>
          </div>
          <Link to="/analyze" className="btn btn-primary btn-sm gap-2">
            <MagnifyingGlassIcon className="w-4 h-4" />
            URL Tahlil
          </Link>
        </div>

        {/* Payment due alert */}
        {paymentDue && (
          <div role="alert" className="alert alert-error">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 shrink-0 stroke-current"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h3 className="font-bold">To'lov kerak!</h3>
              <div className="text-xs">
                Balansingiz yetarli emas. Hisobni to'ldiring.
              </div>
            </div>
            <button className="btn btn-sm btn-ghost">To'ldirish</button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Balance */}
          <div
            className={`stat rounded-2xl ${
              paymentDue
                ? 'bg-error/10 border border-error/30'
                : 'bg-base-200'
            }`}
          >
            <div className="stat-figure text-primary">
              <WalletIcon className="w-8 h-8" />
            </div>
            <div className="stat-title text-xs">Balans</div>
            <div
              className={`stat-value text-xl ${paymentDue ? 'text-error' : ''}`}
            >
              {balance ? Number(balance.balance).toLocaleString() : '—'}
            </div>
            <div className="stat-desc">so'm</div>
          </div>

          {/* Daily fee */}
          <div className="stat bg-base-200 rounded-2xl">
            <div className="stat-figure text-secondary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5"
                />
              </svg>
            </div>
            <div className="stat-title text-xs">Kunlik to'lov</div>
            <div className="stat-value text-xl">
              {balance ? Number(balance.daily_fee).toLocaleString() : '—'}
            </div>
            <div className="stat-desc">so'm / kun</div>
          </div>

          {/* Products count */}
          <div className="stat bg-base-200 rounded-2xl">
            <div className="stat-figure text-accent">
              <ArrowTrendingUpIcon className="w-8 h-8" />
            </div>
            <div className="stat-title text-xs">Kuzatilayotgan</div>
            <div className="stat-value text-xl">{products.length}</div>
            <div className="stat-desc">mahsulot</div>
          </div>
        </div>

        {/* Products table */}
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body p-0">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-base-300">
              <h2 className="card-title text-base gap-2">
                <FireIcon className="w-5 h-5 text-orange-400" />
                Kuzatilayotgan mahsulotlar
              </h2>
              <span className="badge badge-neutral">{products.length}</span>
            </div>

            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <MagnifyingGlassIcon className="w-12 h-12 text-base-content/20" />
                <p className="text-base-content/50">
                  Hali mahsulot qo'shilmagan
                </p>
                <Link to="/analyze" className="btn btn-primary btn-sm">
                  Birinchi tahlil
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra table-sm">
                  <thead>
                    <tr>
                      <th>Mahsulot</th>
                      <th className="text-center">Score</th>
                      <th className="text-right">So'nggi faollik</th>
                      <th className="text-right">Jami</th>
                      <th className="text-right">Reyting</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr
                        key={p.product_id}
                        className="hover cursor-pointer"
                        onClick={() => setSelected(p)}
                      >
                        <td>
                          <div className="max-w-xs">
                            <p className="font-medium truncate">{p.title}</p>
                            <p className="text-xs text-base-content/40">
                              #{p.product_id}
                            </p>
                          </div>
                        </td>
                        <td className="text-center">
                          <ScoreBadge score={p.score} />
                        </td>
                        <td className="text-right tabular-nums">
                          {p.weekly_bought != null ? (
                            <span className="text-success font-medium">
                              {p.weekly_bought.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-base-content/30">—</span>
                          )}
                        </td>
                        <td className="text-right tabular-nums text-sm">
                          {p.orders_quantity
                            ? Number(p.orders_quantity).toLocaleString()
                            : '—'}
                        </td>
                        <td className="text-right">
                          <span className="text-yellow-400">★</span>
                          <span className="ml-1 text-sm">
                            {p.rating ?? '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product detail drawer */}
      {selected && (
        <ProductDrawer
          product={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
