import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { leaderboardApi } from '../api/client';
import { logError } from '../utils/handleError';
import type { LeaderItem, CategoryLeader } from '../api/types';
import { FireIcon, ArrowTrendingUpIcon } from '../components/icons';
import { useI18n } from '../i18n/I18nContext';

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-base-content/30">—</span>;
  const color =
    score >= 6 ? 'text-success' : score >= 4 ? 'text-warning' : 'text-base-content/60';
  return <span className={`font-bold tabular-nums ${color}`}>{score.toFixed(2)}</span>;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="text-base-content/40 font-bold text-sm">{rank}</span>;
}

export function LeaderboardPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<'global' | 'categories'>('global');
  const [leaders, setLeaders] = useState<LeaderItem[]>([]);
  const [catLeaders, setCatLeaders] = useState<CategoryLeader[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (tab === 'global') {
      leaderboardApi.getPublic()
        .then((r) => setLeaders(r.data))
        .catch(logError)
        .finally(() => setLoading(false));
    } else {
      leaderboardApi.getByCategories()
        .then((r) => setCatLeaders(r.data))
        .catch(logError)
        .finally(() => setLoading(false));
    }
  }, [tab]);

  return (
    <div className="w-full space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <FireIcon className="w-6 h-6 lg:w-7 lg:h-7 text-orange-400" />
            {t('leaderboard.title')}
          </h1>
          <p className="text-base-content/50 text-sm mt-1">
            {t('leaderboard.subtitle')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('global')}
          className={`btn btn-sm gap-2 transition-all ${
            tab === 'global'
              ? 'btn-primary shadow-sm'
              : 'btn-ghost bg-base-200 hover:bg-base-300'
          }`}
        >
          <ArrowTrendingUpIcon className="w-4 h-4" />
          {t('leaderboard.globalTop')}
        </button>
        <button
          onClick={() => setTab('categories')}
          className={`btn btn-sm gap-2 transition-all ${
            tab === 'categories'
              ? 'btn-primary shadow-sm'
              : 'btn-ghost bg-base-200 hover:bg-base-300'
          }`}
        >
          <FireIcon className="w-4 h-4" />
          {t('leaderboard.byCategory')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-dots loading-lg text-primary" />
        </div>
      ) : tab === 'global' ? (
        /* Global leaderboard */
        <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
          <div className="card-body p-0">
            <div className="px-4 pt-4 pb-3 border-b border-base-300">
              <h2 className="card-title text-base gap-2">
                <ArrowTrendingUpIcon className="w-5 h-5 text-primary" />
                {t('leaderboard.topProducts24h')}
              </h2>
              <p className="text-xs text-base-content/40 mt-1">
                {t('leaderboard.topInfo')}
              </p>
            </div>

            {leaders.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-2 text-base-content/40">
                <FireIcon className="w-10 h-10" />
                <p>{t('leaderboard.noData')}</p>
              </div>
            ) : (
              <div className="overflow-auto max-h-[480px]">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th className="w-12">#</th>
                      <th>{t('leaderboard.product')}</th>
                      <th className="text-right">{t('leaderboard.score')}</th>
                      <th className="text-right">{t('leaderboard.weekly')}</th>
                      <th className="text-right">{t('leaderboard.price')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaders.map((item) => (
                      <tr key={item.rank} className={item.rank <= 5 ? 'hover' : 'opacity-60'}>
                        <td><RankBadge rank={item.rank} /></td>
                        <td>
                          {item.rank <= 5 && item.product_id ? (
                            <Link
                              to={`/products/${item.product_id}`}
                              className="font-medium text-sm hover:text-primary transition-colors"
                            >
                              {item.title}
                            </Link>
                          ) : (
                            <span className="text-sm text-base-content/50">{item.title}</span>
                          )}
                        </td>
                        <td className="text-right"><ScoreBadge score={item.score} /></td>
                        <td className="text-right tabular-nums text-sm">
                          {item.weekly_bought != null ? (
                            <span className="text-success">{item.weekly_bought.toLocaleString()}</span>
                          ) : '—'}
                        </td>
                        <td className="text-right tabular-nums text-xs text-base-content/60">
                          {item.sell_price ? `${item.sell_price.toLocaleString()} ${t('common.som')}` : '—'}
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
        /* Category leaderboard */
        <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
          <div className="card-body p-0">
            <div className="px-4 pt-4 pb-3 border-b border-base-300">
              <h2 className="card-title text-base gap-2">
                <FireIcon className="w-5 h-5 text-orange-400" />
                {t('leaderboard.topCategories')}
              </h2>
              <p className="text-xs text-base-content/40 mt-1">
                {t('leaderboard.topCategoriesInfo')}
              </p>
            </div>

            {catLeaders.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-2 text-base-content/40">
                <FireIcon className="w-10 h-10" />
                <p>{t('leaderboard.noCatData')}</p>
              </div>
            ) : (
              <div className="overflow-auto max-h-[520px]">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th className="w-12">#</th>
                      <th>{t('leaderboard.category')}</th>
                      <th className="text-right">{t('leaderboard.weeklyTotal')}</th>
                      <th className="hidden sm:table-cell">{t('leaderboard.topProduct')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catLeaders.map((cat) => (
                      <tr key={cat.category_id} className="hover">
                        <td><RankBadge rank={cat.rank} /></td>
                        <td>
                          <span className="font-medium text-sm">{cat.category_name}</span>
                          <span className="text-xs text-base-content/40 ml-2">
                            {cat.product_count} {t('leaderboard.products')}
                          </span>
                        </td>
                        <td className="text-right tabular-nums text-sm">
                          <span className="text-success font-semibold">
                            {cat.total_weekly_sold.toLocaleString()}
                          </span>
                          <span className="text-xs text-base-content/40 ml-1">{t('leaderboard.weeklyUnit')}</span>
                        </td>
                        <td className="hidden sm:table-cell">
                          {cat.top_product ? (
                            <Link
                              to={`/products/${cat.top_product.product_id}`}
                              className="text-xs text-base-content/60 hover:text-primary transition-colors truncate max-w-[200px] block"
                            >
                              {cat.top_product.title}
                            </Link>
                          ) : '—'}
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
    </div>
  );
}
