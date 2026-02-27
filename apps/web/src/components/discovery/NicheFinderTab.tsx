import { useState } from 'react';
import { Link } from 'react-router-dom';
import { nicheApi } from '../../api/client';
import type { NicheItem, GapItem } from './types';
import { POPULAR_CATEGORIES } from './types';

export function NicheFinderTab() {
  const [niches, setNiches] = useState<NicheItem[]>([]);
  const [gaps, setGaps] = useState<GapItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [catId, setCatId] = useState('');
  const [subTab, setSubTab] = useState<'niches' | 'gaps'>('niches');
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    const id = catId.trim() ? Number(catId.trim()) : undefined;
    try {
      const [nichesRes, gapsRes] = await Promise.all([
        nicheApi.findNiches(id),
        nicheApi.findGaps(id),
      ]);
      setNiches(nichesRes.data?.niches ?? nichesRes.data ?? []);
      setGaps(gapsRes.data?.gaps ?? gapsRes.data ?? []);
    } catch {}
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
        <div className="card-body">
          <h2 className="card-title text-base">Niche qidirish</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {POPULAR_CATEGORIES.map((cat) => (
              <button key={cat.id} onClick={() => setCatId(String(cat.id))}
                className="btn btn-xs btn-ghost border border-base-300">
                {cat.label} <span className="text-base-content/40 ml-1">#{cat.id}</span>
              </button>
            ))}
          </div>
          <form onSubmit={handleSearch} className="flex gap-3">
            <input type="text" value={catId} onChange={(e) => setCatId(e.target.value)}
              placeholder="Kategoriya ID (ixtiyoriy — hamma uchun)" className="input input-bordered flex-1" />
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? <span className="loading loading-spinner loading-sm" /> : 'Topish'}
            </button>
          </form>
        </div>
      </div>

      {searched && (
        <>
          {/* Sub-tabs */}
          <div role="tablist" className="tabs tabs-boxed bg-base-200 w-fit">
            <button role="tab" onClick={() => setSubTab('niches')}
              className={`tab ${subTab === 'niches' ? 'tab-active' : ''}`}>
              Niche'lar ({niches.length})
            </button>
            <button role="tab" onClick={() => setSubTab('gaps')}
              className={`tab ${subTab === 'gaps' ? 'tab-active' : ''}`}>
              Gap'lar ({gaps.length})
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><span className="loading loading-dots loading-lg text-primary" /></div>
          ) : subTab === 'niches' ? (
            <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
              <div className="card-body p-0">
                <div className="px-4 pt-4 pb-3 border-b border-base-300">
                  <h3 className="font-bold text-sm">Niche imkoniyatlari</h3>
                  <p className="text-xs text-base-content/40">Yuqori talab + past raqobat = yaxshi niche</p>
                </div>
                {niches.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-base-content/40">
                    <p>Niche topilmadi. Boshqa kategoriya sinab ko'ring.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>#</th><th>Mahsulot</th><th className="text-right">Niche Score</th>
                          <th className="text-right">Haftalik</th><th className="text-right">Narx</th>
                        </tr>
                      </thead>
                      <tbody>
                        {niches.map((n, i) => (
                          <tr key={n.product_id} className="hover">
                            <td className="text-base-content/40 font-bold text-sm">{i + 1}</td>
                            <td>
                              <Link to={`/products/${n.product_id}`} className="text-sm font-medium hover:text-primary transition-colors">
                                {n.title}
                              </Link>
                            </td>
                            <td className="text-right">
                              <span className={`font-bold tabular-nums ${n.niche_score >= 0.65 ? 'text-success' : n.niche_score >= 0.4 ? 'text-warning' : 'text-base-content/50'}`}>
                                {(n.niche_score * 100).toFixed(0)}%
                              </span>
                            </td>
                            <td className="text-right tabular-nums text-sm text-success">
                              {n.weekly_bought?.toLocaleString() ?? '—'}
                            </td>
                            <td className="text-right tabular-nums text-xs text-base-content/60">
                              {n.sell_price ? `${n.sell_price.toLocaleString()} so'm` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
              <div className="card-body p-0">
                <div className="px-4 pt-4 pb-3 border-b border-base-300">
                  <h3 className="font-bold text-sm">Demand-Supply Gap'lar</h3>
                  <p className="text-xs text-base-content/40">Talab yuqori lekin sotuvchilar kam bo'lgan mahsulotlar</p>
                </div>
                {gaps.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-base-content/40">
                    <p>Gap topilmadi.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>#</th><th>Mahsulot</th><th className="text-right">Haftalik talab</th>
                          <th className="text-right">Sotuvchilar</th><th className="text-right">Gap nisbati</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gaps.map((g, i) => (
                          <tr key={g.product_id} className="hover">
                            <td className="text-base-content/40 font-bold text-sm">{i + 1}</td>
                            <td>
                              <Link to={`/products/${g.product_id}`} className="text-sm font-medium hover:text-primary transition-colors">
                                {g.title}
                              </Link>
                            </td>
                            <td className="text-right tabular-nums text-sm text-success">
                              {g.weekly_bought?.toLocaleString() ?? '—'}
                            </td>
                            <td className="text-right tabular-nums text-sm">{g.seller_count ?? '—'}</td>
                            <td className="text-right">
                              <span className="badge badge-success badge-sm">{g.gap_ratio.toFixed(1)}x</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
