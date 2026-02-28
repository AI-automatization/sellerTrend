import { COUNTRY_FLAGS, fmtUSD, matchColor, marginColor } from './types';
import type { SourcingResult } from './types';
import { useI18n } from '../../i18n/I18nContext';

export interface SourcingResultCardProps {
  result: SourcingResult;
}

export function SourcingResultCard({ result: r }: SourcingResultCardProps) {
  const { t } = useI18n();
  const flag = COUNTRY_FLAGS[r.country] ?? '';

  return (
    <div className="card bg-base-200/60 border border-base-300/50 rounded-2xl hover:bg-base-300/60 transition-colors">
      <div className="card-body p-4">
        <div className="flex gap-4">
          {/* Image */}
          {r.image_url && (
            <img
              src={r.image_url}
              alt={r.title}
              className="w-20 h-20 object-contain rounded-lg bg-base-300 flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {r.rank && <span className="badge badge-sm badge-primary">#{r.rank}</span>}
                  <span className="badge badge-sm badge-outline">{flag} {r.platform_name}</span>
                  {r.ai_match_score != null && (
                    <span className={`badge badge-sm ${matchColor(r.ai_match_score)}`}>
                      AI: {(r.ai_match_score * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium line-clamp-2 leading-snug">{r.title}</p>
              </div>

              {/* Price */}
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-primary">{fmtUSD(r.price_usd)}</p>
                {r.seller_name && (
                  <p className="text-xs text-base-content/50">{r.seller_name}</p>
                )}
              </div>
            </div>

            {/* AI Notes */}
            {r.ai_notes && (
              <p className="text-xs text-base-content/60 mt-1 italic">AI: {r.ai_notes}</p>
            )}

            {/* Cargo & Margin info */}
            {r.cargo && (
              <div className="flex gap-4 mt-2 text-xs">
                <span>
                  Landed: <b>{fmtUSD(r.cargo.landed_cost_usd)}</b>
                </span>
                {r.cargo.margin_pct != null && (
                  <span className={marginColor(r.cargo.margin_pct)}>
                    Margin: <b>{r.cargo.margin_pct.toFixed(1)}%</b>
                  </span>
                )}
                {r.cargo.roi_pct != null && (
                  <span className={r.cargo.roi_pct > 0 ? 'text-success' : 'text-error'}>
                    ROI: <b>{r.cargo.roi_pct.toFixed(1)}%</b>
                  </span>
                )}
                {r.cargo.provider && (
                  <span className="text-base-content/40">{r.cargo.provider}</span>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-2">
              {r.url && r.url !== '#' && (
                <a href={r.url} target="_blank" rel="noopener noreferrer"
                  className="btn btn-outline btn-xs">
                  {t('sourcing.import.viewBtn')}
                </a>
              )}
              {r.min_order_qty && r.min_order_qty > 1 && (
                <span className="badge badge-sm badge-warning">MOQ: {r.min_order_qty}</span>
              )}
              {r.shipping_days && (
                <span className="badge badge-sm badge-ghost">{t('sourcing.import.shippingDays').replace('{n}', String(r.shipping_days))}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
