import { useState } from 'react';
import { adminApi } from '../../api/client';
import { toast } from 'react-toastify';
import { logError } from '../../utils/handleError';
import type { MlAuditStats } from './adminTypes';

interface Props {
  stats: MlAuditStats | null;
  loading: boolean;
  period: number;
  onPeriodChange: (p: number) => void;
}

function StatCard({ label, value, sub, color = '' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl bg-base-200/60 border border-base-300/40 p-4">
      <p className="text-xs text-base-content/50 mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-xs text-base-content/40 mt-0.5">{sub}</p>}
    </div>
  );
}

function mapeColor(mape: number | null): string {
  if (mape == null) return '';
  if (mape < 15) return 'text-success';
  if (mape < 30) return 'text-warning';
  return 'text-error';
}

function dirColor(acc: number | null): string {
  if (acc == null) return '';
  if (acc >= 70) return 'text-success';
  if (acc >= 50) return 'text-warning';
  return 'text-error';
}

export function MlAuditTab({ stats, loading, period, onPeriodChange }: Props) {
  const [retraining, setRetraining] = useState(false);

  const handleRetrain = async () => {
    if (!confirm('Barcha ML modellari qayta o\'qitilsinmi? Bu bir necha daqiqa davom etishi mumkin.')) return;
    setRetraining(true);
    try {
      const r = await adminApi.triggerMlRetrain();
      toast.success(r.data?.message ?? 'Qayta o\'qitish ishga tushirildi');
    } catch (err: unknown) {
      logError(err);
      toast.error('Qayta o\'qitishni ishga tushirib bo\'lmadi');
    } finally {
      setRetraining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <span className="loading loading-ring loading-md text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-semibold text-base">ML Prognoz Modellari Sifati</h2>
          <p className="text-xs text-base-content/40">MAPE (xatolik %), yo'nalish aniqligi, model holati</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => onPeriodChange(d)}
                className={`btn btn-xs ${period === d ? 'btn-primary' : 'btn-ghost'}`}
              >
                {d}k
              </button>
            ))}
          </div>
          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="btn btn-sm btn-warning gap-1"
          >
            {retraining && <span className="loading loading-spinner loading-xs" />}
            🔄 Qayta o'qitish
          </button>
        </div>
      </div>

      {!stats || stats.models.length === 0 ? (
        <div className="alert alert-info text-sm">Hali ML audit ma'lumotlari yo'q.</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Jami prognozlar"
              value={stats.total_predictions.toLocaleString()}
              sub={`${stats.period_days} kun ichida`}
            />
            <StatCard
              label="O'rtacha MAPE"
              value={stats.avg_mape != null ? `${stats.avg_mape.toFixed(1)}%` : '—'}
              sub="Xatolik darajasi (pastroq = yaxshiroq)"
              color={mapeColor(stats.avg_mape)}
            />
            <StatCard
              label="Yo'nalish aniqligi"
              value={stats.avg_direction_accuracy != null ? `${stats.avg_direction_accuracy.toFixed(1)}%` : '—'}
              sub="O'sish/pasayish to'g'ri bashorat"
              color={dirColor(stats.avg_direction_accuracy)}
            />
            <StatCard
              label="Modellar soni"
              value={stats.models.length}
              sub="Turli kategoriya modellari"
            />
          </div>

          {/* MAPE alert */}
          {stats.avg_mape != null && stats.avg_mape >= 30 && (
            <div className="alert alert-error text-sm gap-2">
              <span>🚨</span>
              <span>
                O'rtacha MAPE <strong>{stats.avg_mape.toFixed(1)}%</strong> — 30% dan yuqori.
                Modellarni qayta o'qitish tavsiya etiladi.
              </span>
            </div>
          )}
          {stats.avg_mape != null && stats.avg_mape >= 15 && stats.avg_mape < 30 && (
            <div className="alert alert-warning text-sm gap-2">
              <span>⚠️</span>
              <span>
                O'rtacha MAPE <strong>{stats.avg_mape.toFixed(1)}%</strong> — 15-30% oralig'ida.
                Prognoz sifatini yaxshilash mumkin.
              </span>
            </div>
          )}

          {/* Models table */}
          <div className="rounded-xl bg-base-200/60 border border-base-300/40 overflow-hidden">
            <div className="p-4 border-b border-base-300/40">
              <p className="text-sm font-semibold">Model tafsiloti</p>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr className="text-xs text-base-content/50">
                    <th>Model nomi</th>
                    <th className="text-right">MAPE %</th>
                    <th className="text-right">Yo'nalish %</th>
                    <th className="text-right">Prognozlar</th>
                    <th className="text-right">Oxirgi audit</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.models.map((m) => (
                    <tr key={m.model_name} className="hover">
                      <td className="font-mono text-xs">{m.model_name}</td>
                      <td className="text-right">
                        <span className={`font-semibold tabular-nums ${mapeColor(m.mape)}`}>
                          {m.mape != null ? `${m.mape.toFixed(1)}%` : '—'}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className={`font-semibold tabular-nums ${dirColor(m.direction_accuracy)}`}>
                          {m.direction_accuracy != null ? `${m.direction_accuracy.toFixed(1)}%` : '—'}
                        </span>
                      </td>
                      <td className="text-right tabular-nums">{m.audit_count.toLocaleString()}</td>
                      <td className="text-right text-base-content/50 text-xs">
                        {m.last_audit_date
                          ? new Date(m.last_audit_date).toLocaleDateString('uz-UZ')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs text-base-content/50">
            <span><span className="text-success font-semibold">Yashil</span>: MAPE &lt;15% / Yo'nalish ≥70%</span>
            <span><span className="text-warning font-semibold">Sariq</span>: MAPE 15-30% / Yo'nalish 50-70%</span>
            <span><span className="text-error font-semibold">Qizil</span>: MAPE ≥30% / Yo'nalish &lt;50%</span>
          </div>
        </>
      )}
    </div>
  );
}
