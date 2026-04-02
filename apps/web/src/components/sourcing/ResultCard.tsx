import { fmt, fmtUSD, fmtUZS, marginColor } from './types';
import type { CalcResult } from './types';
import { useI18n } from '../../i18n/I18nContext';
import {
  RiCheckLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiTruckLine,
  RiBarChartBoxLine,
  RiInformationLine,
} from 'react-icons/ri';

export interface ResultCardProps {
  result: CalcResult;
}

function profitLabel(margin: number): { text: string; cls: string } {
  if (margin >= 30) return { text: '🟢 Yaxshi foyda',  cls: 'text-success' };
  if (margin >= 15) return { text: '🟡 O\'rtacha foyda', cls: 'text-warning' };
  if (margin >= 0)  return { text: '🔴 Juda kam foyda', cls: 'text-error' };
  return              { text: '🔴 Zarar',            cls: 'text-error' };
}

export function ResultCard({ result }: ResultCardProps) {
  const { t } = useI18n();
  const qty = result.total_item_cost_usd / result.item_cost_usd;
  const landedPerUnit = result.landed_cost_usd / qty;
  const landedUzsPerUnit = result.landed_cost_uzs / qty;

  const mColor = marginColor(result.gross_margin_pct ?? null);

  const rows = [
    { label: t('sourcing.result.itemCostTotal'),    usd: result.total_item_cost_usd },
    { label: t('sourcing.result.cargoRow').replace('{provider}', result.provider_name), usd: result.cargo_cost_usd },
    { label: t('sourcing.result.customs'),          usd: result.customs_usd },
    { label: t('sourcing.result.vat'),              usd: result.vat_usd },
  ];

  const hasProfitability = result.sell_price_uzs != null
    && result.profit_uzs != null
    && result.gross_margin_pct != null
    && result.roi_pct != null;

  const profitInfo = hasProfitability ? profitLabel(result.gross_margin_pct!) : null;

  return (
    <div className="space-y-4">
      <div className="card bg-base-100 border border-base-300/60 shadow-sm">
        <div className="card-body gap-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center text-success">
                <RiCheckLine size={16} />
              </div>
              <h2 className="font-semibold">{t('sourcing.result.title')}</h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-base-content/50 bg-base-200 rounded-lg px-2.5 py-1">
              <RiTruckLine size={12} />
              {t('sourcing.result.deliveryDays').replace('{n}', String(result.delivery_days))}
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="bg-base-200/40 rounded-xl overflow-hidden">
            <table className="table table-sm w-full">
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} className="border-base-300/30">
                    <td className="text-xs text-base-content/60 py-2">{r.label}</td>
                    <td className="text-right font-mono text-xs py-2">{fmtUSD(r.usd)}</td>
                    <td className="text-right font-mono text-xs text-base-content/40 py-2">
                      {fmtUZS(r.usd * result.usd_rate)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-base-300/50 font-bold bg-base-200/60">
                  <td className="text-sm py-2.5">{t('sourcing.result.landedTotal')}</td>
                  <td className="text-right font-mono text-sm py-2.5">{fmtUSD(result.landed_cost_usd)}</td>
                  <td className="text-right font-mono text-sm py-2.5">{fmtUZS(result.landed_cost_uzs)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Per unit highlight */}
          <div className="bg-primary/8 border border-primary/20 rounded-xl px-5 py-4 text-center">
            <p className="text-xs text-base-content/50 mb-1">{t('sourcing.result.perUnitLabel')}</p>
            <p className="text-3xl font-bold text-primary">{fmtUZS(landedUzsPerUnit)}</p>
            <p className="text-sm text-base-content/50 mt-1">≈ {fmtUSD(landedPerUnit)}</p>
            <p className="text-xs text-base-content/30 mt-1">
              {t('sourcing.result.usdRate').replace('{rate}', fmt(result.usd_rate))}
            </p>
          </div>

          {/* Profitability */}
          {hasProfitability && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RiBarChartBoxLine size={14} className="text-base-content/40" />
                  <span className="text-xs font-medium text-base-content/50 uppercase tracking-wider">
                    {t('sourcing.result.profitabilityHeader')}
                  </span>
                </div>
                {profitInfo && (
                  <span className={`text-xs font-medium ${profitInfo.cls}`}>{profitInfo.text}</span>
                )}
              </div>

              {/* Sell price vs landed cost — visual comparison */}
              <div className="bg-base-200/40 rounded-xl p-3 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-base-content/50 text-xs">Uzumda sotish narxi</span>
                  <span className="font-mono font-semibold">{fmtUZS(result.sell_price_uzs!)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base-content/50 text-xs">Tushib kelish narxi (1 dona)</span>
                  <span className="font-mono text-base-content/70">{fmtUZS(landedUzsPerUnit)}</span>
                </div>
                <div className="border-t border-base-300/40 pt-2 flex justify-between items-center">
                  <span className="text-xs font-medium">
                    {result.profit_uzs! >= 0 ? 'Foyda' : 'Zarar'} (1 dona)
                  </span>
                  <span className={`font-mono font-bold ${result.profit_uzs! >= 0 ? 'text-success' : 'text-error'}`}>
                    {result.profit_uzs! >= 0 ? '+' : '−'}
                    {fmtUZS(Math.abs(result.profit_uzs!))}
                  </span>
                </div>
              </div>

              {/* Metric cards */}
              <div className="grid grid-cols-3 gap-2">
                {/* Gross Margin */}
                <div className="bg-base-200/60 rounded-xl p-3 text-center">
                  <div className={`flex items-center justify-center gap-0.5 text-base font-bold ${mColor}`}>
                    {result.gross_margin_pct! >= 0
                      ? <RiArrowUpLine size={14} />
                      : <RiArrowDownLine size={14} />
                    }
                    {Math.abs(result.gross_margin_pct!).toFixed(1)}%
                  </div>
                  <p className="text-[10px] text-base-content/40 mt-1 uppercase tracking-wider">Margin</p>
                  <p className="text-[10px] text-base-content/30">
                    foyda / sotish narxi
                  </p>
                </div>

                {/* ROI */}
                <div className="bg-base-200/60 rounded-xl p-3 text-center">
                  <div className={`flex items-center justify-center gap-0.5 text-base font-bold ${result.roi_pct! >= 0 ? 'text-success' : 'text-error'}`}>
                    {result.roi_pct! >= 0
                      ? <RiArrowUpLine size={14} />
                      : <RiArrowDownLine size={14} />
                    }
                    {Math.abs(result.roi_pct!).toFixed(1)}%
                  </div>
                  <p className="text-[10px] text-base-content/40 mt-1 uppercase tracking-wider">ROI</p>
                  <p className="text-[10px] text-base-content/30">
                    foyda / sarflangan
                  </p>
                </div>

                {/* Break-even */}
                <div className="bg-base-200/60 rounded-xl p-3 text-center">
                  <div className="text-base font-bold text-base-content/70">
                    {fmtUZS(landedUzsPerUnit).replace(' so\'m', '')}
                  </div>
                  <p className="text-[10px] text-base-content/40 mt-1 uppercase tracking-wider">Break-even</p>
                  <p className="text-[10px] text-base-content/30">
                    min sotish narxi
                  </p>
                </div>
              </div>

              {/* Hint if loss */}
              {result.profit_uzs! < 0 && (
                <div className="flex items-start gap-2 bg-error/8 border border-error/20 rounded-xl px-3 py-2.5 text-xs text-error/80">
                  <RiInformationLine size={14} className="shrink-0 mt-0.5" />
                  <span>
                    Foydali bo'lishi uchun sotish narxini kamida{' '}
                    <strong>{fmtUZS(landedUzsPerUnit)}</strong> dan yuqori belgilang.
                  </span>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
