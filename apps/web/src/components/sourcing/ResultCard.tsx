import { fmt, fmtUSD, fmtUZS, marginColor } from './types';
import type { CalcResult } from './types';
import { useI18n } from '../../i18n/I18nContext';

export interface ResultCardProps {
  result: CalcResult;
}

export function ResultCard({ result }: ResultCardProps) {
  const { t } = useI18n();
  const perUnit = result.total_item_cost_usd / result.item_cost_usd;
  const landedPerUnit = result.landed_cost_usd / perUnit;
  const landedUzsPerUnit = result.landed_cost_uzs / perUnit;

  const mColor = marginColor(result.gross_margin_pct ?? null);

  const rows = [
    { label: t('sourcing.result.itemCostTotal'), usd: result.total_item_cost_usd },
    { label: t('sourcing.result.cargoRow').replace('{provider}', result.provider_name), usd: result.cargo_cost_usd },
    { label: t('sourcing.result.customs'), usd: result.customs_usd },
    { label: t('sourcing.result.vat'), usd: result.vat_usd },
  ];

  return (
    <div className="space-y-4">
      <div className="card bg-base-200/60 border border-base-300/50 rounded-2xl">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-lg">{t('sourcing.result.title')}</h2>
            <span className="badge badge-outline text-xs">{t('sourcing.result.deliveryDays').replace('{n}', String(result.delivery_days))}</span>
          </div>

          <table className="table table-sm mt-2">
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="text-base-content/60">{r.label}</td>
                  <td className="text-right font-mono text-sm">{fmtUSD(r.usd)}</td>
                  <td className="text-right font-mono text-xs text-base-content/40">
                    {fmtUZS(r.usd * result.usd_rate)}
                  </td>
                </tr>
              ))}
              <tr className="font-bold bg-base-300">
                <td>{t('sourcing.result.landedTotal')}</td>
                <td className="text-right font-mono">{fmtUSD(result.landed_cost_usd)}</td>
                <td className="text-right font-mono text-sm">{fmtUZS(result.landed_cost_uzs)}</td>
              </tr>
            </tbody>
          </table>

          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center mt-2">
            <p className="text-xs text-base-content/50 mb-1">{t('sourcing.result.perUnitLabel')}</p>
            <p className="text-3xl font-bold text-primary">{fmtUZS(landedUzsPerUnit)}</p>
            <p className="text-sm text-base-content/50 mt-1">≈ {fmtUSD(landedPerUnit)}</p>
            <p className="text-xs text-base-content/30 mt-1">
              {t('sourcing.result.usdRate').replace('{rate}', fmt(result.usd_rate))}
            </p>
          </div>

          {result.sell_price_uzs != null && (
            <>
              <div className="divider text-xs mt-1">{t('sourcing.result.profitabilityHeader')}</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="stat bg-base-300 rounded-xl p-3">
                  <div className="stat-title text-xs">{t('sourcing.result.netProfit')}</div>
                  <div className={`stat-value text-base ${result.profit_uzs! > 0 ? 'text-success' : 'text-error'}`}>
                    {result.profit_uzs! > 0 ? '+' : ''}{fmt(result.profit_uzs!)}
                  </div>
                  <div className="stat-desc text-xs">{t('sourcing.result.profitUnit')}</div>
                </div>
                <div className="stat bg-base-300 rounded-xl p-3">
                  <div className="stat-title text-xs">{t('sourcing.result.grossMargin')}</div>
                  <div className={`stat-value text-base ${mColor}`}>
                    {result.gross_margin_pct!.toFixed(1)}%
                  </div>
                  <div className="stat-desc text-xs">
                    {result.gross_margin_pct! >= 30 ? t('sourcing.result.marginGreat') : result.gross_margin_pct! >= 15 ? t('sourcing.result.marginGood') : t('sourcing.result.marginLow')}
                  </div>
                </div>
                <div className="stat bg-base-300 rounded-xl p-3">
                  <div className="stat-title text-xs">{t('sourcing.result.roi')}</div>
                  <div className={`stat-value text-base ${result.roi_pct! > 0 ? 'text-success' : 'text-error'}`}>
                    {result.roi_pct!.toFixed(1)}%
                  </div>
                  <div className="stat-desc text-xs">{t('sourcing.result.roiDesc')}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
