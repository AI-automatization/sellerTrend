import { fmt, fmtUSD, fmtUZS, marginColor } from './types';
import type { CalcResult } from './types';

export interface ResultCardProps {
  result: CalcResult;
}

export function ResultCard({ result }: ResultCardProps) {
  const perUnit = result.total_item_cost_usd / result.item_cost_usd;
  const landedPerUnit = result.landed_cost_usd / perUnit;
  const landedUzsPerUnit = result.landed_cost_uzs / perUnit;

  const mColor = marginColor(result.gross_margin_pct ?? null);

  const rows = [
    { label: 'Mahsulot narxi (jami)', usd: result.total_item_cost_usd },
    { label: `Cargo — ${result.provider_name}`, usd: result.cargo_cost_usd },
    { label: 'Bojxona to\'lovi', usd: result.customs_usd },
    { label: 'QQS (12%)', usd: result.vat_usd },
  ];

  return (
    <div className="space-y-4">
      <div className="card bg-base-200/60 border border-base-300/50 rounded-2xl">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-lg">Natija</h2>
            <span className="badge badge-outline text-xs">{result.delivery_days} kun</span>
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
                <td>Tushib kelish narxi (jami)</td>
                <td className="text-right font-mono">{fmtUSD(result.landed_cost_usd)}</td>
                <td className="text-right font-mono text-sm">{fmtUZS(result.landed_cost_uzs)}</td>
              </tr>
            </tbody>
          </table>

          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center mt-2">
            <p className="text-xs text-base-content/50 mb-1">1 dona landed cost</p>
            <p className="text-3xl font-bold text-primary">{fmtUZS(landedUzsPerUnit)}</p>
            <p className="text-sm text-base-content/50 mt-1">≈ {fmtUSD(landedPerUnit)}</p>
            <p className="text-xs text-base-content/30 mt-1">
              1 USD = {fmt(result.usd_rate)} so'm (CBU kursi)
            </p>
          </div>

          {result.sell_price_uzs != null && (
            <>
              <div className="divider text-xs mt-1">Foydalilik tahlili</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="stat bg-base-300 rounded-xl p-3">
                  <div className="stat-title text-xs">Sof foyda</div>
                  <div className={`stat-value text-base ${result.profit_uzs! > 0 ? 'text-success' : 'text-error'}`}>
                    {result.profit_uzs! > 0 ? '+' : ''}{fmt(result.profit_uzs!)}
                  </div>
                  <div className="stat-desc text-xs">so'm / dona</div>
                </div>
                <div className="stat bg-base-300 rounded-xl p-3">
                  <div className="stat-title text-xs">Gross Margin</div>
                  <div className={`stat-value text-base ${mColor}`}>
                    {result.gross_margin_pct!.toFixed(1)}%
                  </div>
                  <div className="stat-desc text-xs">
                    {result.gross_margin_pct! >= 30 ? 'Zo\'r!' : result.gross_margin_pct! >= 15 ? 'Yaxshi' : 'Kam'}
                  </div>
                </div>
                <div className="stat bg-base-300 rounded-xl p-3">
                  <div className="stat-title text-xs">ROI</div>
                  <div className={`stat-value text-base ${result.roi_pct! > 0 ? 'text-success' : 'text-error'}`}>
                    {result.roi_pct!.toFixed(1)}%
                  </div>
                  <div className="stat-desc text-xs">kapital daromadi</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
