import type { TrackedCompetitor } from '../../api/client';

interface Props {
  competitors: TrackedCompetitor[];
  ourPrice: number | null;
  onUntrack: (competitorProductId: string) => void;
}

export function CompetitorPriceTable({ competitors, ourPrice, onUntrack }: Props) {
  if (competitors.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>#</th>
            <th>Mahsulot</th>
            <th className="text-right">Narx</th>
            <th className="text-right">Farq</th>
            <th className="text-center">O'zgarish (7 kun)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {competitors.map((c, i) => {
            const price = c.latest_price ? Number(c.latest_price) : null;
            const isCheaper = ourPrice !== null && price !== null && price < ourPrice;
            const diffPct =
              ourPrice && price ? ((price - ourPrice) / ourPrice) * 100 : null;

            return (
              <tr
                key={c.tracking_id}
                className={`hover ${isCheaper ? 'bg-error/5' : price ? 'bg-success/5' : ''}`}
              >
                <td className="text-base-content/40 text-xs w-6">{i + 1}</td>

                <td>
                  <a
                    href={`https://uzum.uz/ru/product/${c.competitor_product_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sm hover:text-primary transition-colors truncate block max-w-xs"
                  >
                    {c.competitor_title}
                  </a>
                  {c.last_snapshot_at && (
                    <p className="text-xs text-base-content/30">
                      {new Date(c.last_snapshot_at).toLocaleDateString('uz-UZ', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                </td>

                <td className="text-right tabular-nums">
                  {price !== null ? (
                    <span className={`font-medium ${isCheaper ? 'text-error' : 'text-success'}`}>
                      {price.toLocaleString()} so'm
                    </span>
                  ) : (
                    <span className="text-base-content/20">—</span>
                  )}
                </td>

                <td className="text-right tabular-nums text-sm">
                  {diffPct !== null ? (
                    <span className={diffPct < 0 ? 'text-error' : 'text-success'}>
                      {diffPct > 0 ? '+' : ''}
                      {diffPct.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-base-content/20">—</span>
                  )}
                </td>

                <td className="text-center">
                  {c.trend === 'up' && (
                    <span className="text-error font-bold" title="Narx oshdi">↗</span>
                  )}
                  {c.trend === 'down' && (
                    <span className="text-success font-bold" title="Narx tushdi">↘</span>
                  )}
                  {c.trend === 'stable' && (
                    <span className="text-base-content/30" title="Barqaror">→</span>
                  )}
                </td>

                <td>
                  <button
                    onClick={() => onUntrack(c.competitor_product_id)}
                    className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                    aria-label={`${c.competitor_title} kuzatuvdan chiqarish`}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
