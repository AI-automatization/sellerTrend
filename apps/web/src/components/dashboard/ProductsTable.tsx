import { Link } from 'react-router-dom';
import type { TrackedProduct } from '../../api/types';
import { FireIcon, MagnifyingGlassIcon } from '../icons';
import { useI18n } from '../../i18n/I18nContext';
import { ScorePill, TrendChip, FadeIn } from './index';

type SortKey = 'score' | 'weekly' | 'price';

interface Props {
  products: TrackedProduct[];
  sortedProducts: TrackedProduct[];
  sortKey: SortKey;
  setSortKey: (key: SortKey) => void;
}

export function ProductsTable({ products, sortedProducts, sortKey, setSortKey }: Props) {
  const { t } = useI18n();

  return (
    <FadeIn delay={400}>
      <div className="rounded-2xl bg-base-200/50 border border-base-300/40 overflow-hidden ventra-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-300/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/8 flex items-center justify-center">
              <FireIcon className="w-4 h-4 text-orange-400/80" />
            </div>
            <div>
              <h2 className="font-semibold text-sm font-heading">{t('dashboard.trackedProducts')}</h2>
              <p className="text-[10px] text-base-content/25">{products.length} {t('common.unit')} {t('dashboard.products')}</p>
            </div>
          </div>
          {products.length > 0 && (
            <div className="flex gap-1">
              {([['score', t('dashboard.sortScore')], ['weekly', t('dashboard.sortSales')], ['price', t('dashboard.sortPrice')]] as [string, string][]).map(([key, label]) => (
                <button key={key}
                  onClick={() => setSortKey(key as SortKey)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                    sortKey === key
                      ? 'bg-primary/10 text-primary border border-primary/15'
                      : 'text-base-content/30 hover:text-base-content/50 border border-transparent'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-base-300/20 flex items-center justify-center">
                <MagnifyingGlassIcon className="w-10 h-10 text-base-content/10" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="text-sm">+</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-base-content/50 text-sm font-medium">{t('dashboard.emptyPortfolio')}</p>
              <p className="text-base-content/20 text-xs mt-1 max-w-xs">{t('dashboard.emptyDesc')}</p>
            </div>
            <Link to="/analyze" className="btn btn-primary btn-sm gap-1.5 shadow-md shadow-primary/15">
              <MagnifyingGlassIcon className="w-3.5 h-3.5" /> {t('dashboard.firstAnalysis')}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr className="bg-base-300/10 text-[9px] text-base-content/30 uppercase tracking-[0.12em]">
                  <th className="font-bold pl-5">{t('dashboard.product')}</th>
                  <th className="font-bold text-center">{t('dashboard.score')}</th>
                  <th className="font-bold text-center">{t('dashboard.trend')}</th>
                  <th className="font-bold text-right">{t('dashboard.weekly')}</th>
                  <th className="font-bold text-right hidden md:table-cell">{t('dashboard.orders')}</th>
                  <th className="font-bold text-right">{t('dashboard.price')}</th>
                  <th className="font-bold text-right hidden sm:table-cell">{t('dashboard.rating')}</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map((p, idx) => (
                  <tr key={p.product_id}
                    className="hover:bg-base-300/15 transition-colors group/row border-b border-base-300/10 last:border-0"
                    style={{ animationDelay: `${idx * 20}ms` }}>
                    <td className="pl-5">
                      <div className="max-w-xs lg:max-w-sm xl:max-w-md">
                        <Link to={`/products/${p.product_id}`}
                          className="font-medium text-sm truncate block hover:text-primary transition-colors">
                          {p.title}
                        </Link>
                        <p className="text-[10px] text-base-content/20 mt-0.5 tabular-nums">
                          #{p.product_id}
                          {p.feedback_quantity ? ` · ${p.feedback_quantity.toLocaleString()} ${t('dashboard.review')}` : ''}
                        </p>
                      </div>
                    </td>
                    <td className="text-center"><ScorePill score={p.score} /></td>
                    <td className="text-center"><TrendChip trend={p.trend} /></td>
                    <td className="text-right tabular-nums text-sm">
                      {p.weekly_bought != null
                        ? <span className="text-success font-medium">{p.weekly_bought.toLocaleString()}</span>
                        : <span className="text-base-content/10">—</span>
                      }
                    </td>
                    <td className="text-right tabular-nums text-sm text-base-content/50 hidden md:table-cell">
                      {p.orders_quantity ? Number(p.orders_quantity).toLocaleString() : '—'}
                    </td>
                    <td className="text-right tabular-nums text-sm">
                      {p.sell_price != null
                        ? <span className="text-accent font-medium">{p.sell_price.toLocaleString()}</span>
                        : <span className="text-base-content/10">—</span>
                      }
                    </td>
                    <td className="text-right text-sm hidden sm:table-cell">
                      <span className="text-yellow-400/60">★</span>
                      <span className="ml-0.5 text-base-content/40 tabular-nums">{p.rating ?? '—'}</span>
                    </td>
                    <td>
                      <Link to={`/products/${p.product_id}`}
                        className="btn btn-ghost btn-xs opacity-0 group-hover/row:opacity-100 transition-opacity">
                        →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </FadeIn>
  );
}
