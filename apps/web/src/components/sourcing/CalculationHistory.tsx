import { useState, useEffect } from 'react';
import { sourcingApi } from '../../api/client';
import { logError } from '../../utils/handleError';
import { fmtUZS, marginColor } from './types';
import type { HistoryItem } from './types';

export function CalculationHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sourcingApi.getHistory().then((r) => setHistory(r.data)).catch(logError).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-16"><span className="loading loading-spinner loading-lg" /></div>;

  if (history.length === 0) return (
    <div className="text-center py-20 text-base-content/40">
      <p className="text-5xl mb-4">📋</p>
      <p>Hali hech qanday hisoblash yo'q</p>
      <p className="text-sm mt-1">Kalkulyator tabida birinchi hisoblashni bajaring</p>
    </div>
  );

  return (
    <div className="card bg-base-200/60 border border-base-300/50 rounded-2xl">
      <div className="card-body">
        <h2 className="card-title text-lg">Oxirgi Hisoblashlar</h2>
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Mahsulot</th>
                <th>Narx × Dona</th>
                <th>Og'irlik</th>
                <th>Landed (so'm)</th>
                <th>Margin</th>
                <th>ROI</th>
                <th>Yo'nalish</th>
                <th>Sana</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => {
                const mc = marginColor(h.gross_margin_pct);
                return (
                  <tr key={h.id} className="hover">
                    <td className="max-w-36 truncate text-sm">{h.item_name || '\u2014'}</td>
                    <td className="text-sm">${h.item_cost_usd.toFixed(2)} × {h.quantity}</td>
                    <td>{h.weight_kg} kg</td>
                    <td className="font-medium">{fmtUZS(h.landed_cost_uzs)}</td>
                    <td className={mc}>{h.gross_margin_pct != null ? h.gross_margin_pct.toFixed(1) + '%' : '\u2014'}</td>
                    <td className={mc}>{h.roi_pct != null ? h.roi_pct.toFixed(1) + '%' : '\u2014'}</td>
                    <td className="text-xs text-base-content/50">{h.provider ?? '\u2014'}</td>
                    <td className="text-xs text-base-content/40">
                      {new Date(h.created_at).toLocaleDateString('ru-RU')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
