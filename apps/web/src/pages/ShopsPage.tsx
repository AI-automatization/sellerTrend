import { useState } from 'react';
import { Link } from 'react-router-dom';
import { shopsApi } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';

interface ShopProduct {
  product_id: string;
  title: string;
  score: number | null;
  weekly_bought: number | null;
  sell_price: number | null;
  orders_quantity: string | null;
}

interface ShopData {
  shop_id: string;
  shop_title: string;
  trust_score: number;
  product_count: number;
  growth_30d: number | null;
  top_products: ShopProduct[];
}

function TrustBadge({ score }: { score: number }) {
  let color = 'badge-ghost';
  let label = 'Past';
  if (score >= 0.7) { color = 'badge-success'; label = 'Yuqori'; }
  else if (score >= 0.4) { color = 'badge-warning'; label = "O'rta"; }
  else { color = 'badge-error'; label = 'Past'; }
  return (
    <span className={`badge ${color} gap-1`}>
      {label} — {(score * 100).toFixed(0)}%
    </span>
  );
}

export function ShopsPage() {
  const [shopId, setShopId] = useState('');
  const [shop, setShop] = useState<ShopData | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const id = shopId.trim();
    if (!id) { setError("Do'kon ID kiriting"); return; }
    setError('');
    setLoading(true);
    setShop(null);
    setProducts([]);
    setShowAll(false);
    try {
      const [shopRes, prodsRes] = await Promise.all([
        shopsApi.getShop(id),
        shopsApi.getShopProducts(id),
      ]);
      setShop(shopRes.data);
      setProducts(prodsRes.data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Do'kon topilmadi"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full space-y-4 lg:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 lg:w-7 lg:h-7 text-info">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.15c0 .415.336.75.75.75z" />
          </svg>
          Do'kon Analitikasi
        </h1>
        <p className="text-base-content/50 text-sm mt-1">
          Do'kon bo'yicha ishonch darajasi va mahsulot tahlili
        </p>
      </div>

      {/* Search */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
        <div className="card-body">
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={shopId}
              onChange={(e) => setShopId(e.target.value)}
              placeholder="Do'kon ID raqamini kiriting"
              className="input input-bordered flex-1"
            />
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? <span className="loading loading-spinner loading-sm" /> : 'Qidirish'}
            </button>
          </form>
          {error && <p className="text-error text-sm mt-2">{error}</p>}
          <p className="text-xs text-base-content/40 mt-1">
            Do'kon ID ni mahsulot sahifasidan topishingiz mumkin
          </p>
        </div>
      </div>

      {/* Shop info */}
      {shop && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="stat bg-base-200/60 border border-base-300/50 rounded-2xl">
              <div className="stat-title text-xs">Do'kon</div>
              <div className="stat-value text-lg truncate">{shop.shop_title}</div>
              <div className="stat-desc">#{shop.shop_id}</div>
            </div>
            <div className="stat bg-base-200/60 border border-base-300/50 rounded-2xl">
              <div className="stat-title text-xs">Ishonch darajasi</div>
              <div className="stat-value text-lg">
                <TrustBadge score={shop.trust_score} />
              </div>
              <div className="stat-desc">trust score</div>
            </div>
            <div className="stat bg-base-200/60 border border-base-300/50 rounded-2xl">
              <div className="stat-title text-xs">Mahsulotlar</div>
              <div className="stat-value text-xl">{shop.product_count}</div>
              <div className="stat-desc">kuzatilgan</div>
            </div>
            <div className="stat bg-base-200/60 border border-base-300/50 rounded-2xl">
              <div className="stat-title text-xs">30 kunlik o'sish</div>
              <div className={`stat-value text-xl ${(shop.growth_30d ?? 0) > 0 ? 'text-success' : (shop.growth_30d ?? 0) < 0 ? 'text-error' : ''}`}>
                {shop.growth_30d != null ? `${shop.growth_30d > 0 ? '+' : ''}${shop.growth_30d.toFixed(1)}%` : '—'}
              </div>
              <div className="stat-desc">sotuv o'zgarishi</div>
            </div>
          </div>

          {/* Top-5 */}
          {shop.top_products.length > 0 && (
            <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
              <div className="card-body p-4">
                <h3 className="font-bold text-sm">Top mahsulotlar</h3>
                <div className="space-y-2 mt-2">
                  {shop.top_products.map((p, i) => (
                    <div key={p.product_id} className="flex items-center gap-3 text-sm">
                      <span className="font-bold text-base-content/40 w-5 text-right">{i + 1}</span>
                      <Link
                        to={`/products/${p.product_id}`}
                        className="flex-1 truncate hover:text-primary transition-colors"
                      >
                        {p.title}
                      </Link>
                      <span className={`font-bold tabular-nums ${(p.score ?? 0) >= 6 ? 'text-success' : (p.score ?? 0) >= 4 ? 'text-warning' : 'text-base-content/50'}`}>
                        {p.score?.toFixed(2) ?? '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* All products */}
          {products.length > 0 && (
            <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
              <div className="card-body p-0">
                <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-base-300">
                  <h3 className="font-bold text-sm">Barcha mahsulotlar</h3>
                  <span className="badge badge-neutral badge-sm">{products.length}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="table table-sm table-zebra">
                    <thead>
                      <tr>
                        <th>Mahsulot</th>
                        <th className="text-right">Score</th>
                        <th className="text-right">Haftalik</th>
                        <th className="text-right">Narx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showAll ? products : products.slice(0, 10)).map((p) => (
                        <tr key={p.product_id} className="hover">
                          <td>
                            <Link
                              to={`/products/${p.product_id}`}
                              className="text-sm font-medium hover:text-primary transition-colors"
                            >
                              {p.title}
                            </Link>
                          </td>
                          <td className="text-right">
                            <span className={`font-bold tabular-nums text-sm ${(p.score ?? 0) >= 6 ? 'text-success' : (p.score ?? 0) >= 4 ? 'text-warning' : 'text-base-content/50'}`}>
                              {p.score?.toFixed(2) ?? '—'}
                            </span>
                          </td>
                          <td className="text-right tabular-nums text-sm text-success">
                            {p.weekly_bought?.toLocaleString() ?? '—'}
                          </td>
                          <td className="text-right tabular-nums text-xs text-base-content/60">
                            {p.sell_price ? `${p.sell_price.toLocaleString()} so'm` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!showAll && products.length > 10 && (
                  <div className="p-3 text-center">
                    <button onClick={() => setShowAll(true)} className="btn btn-ghost btn-sm">
                      Hammasini ko'rish ({products.length})
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
