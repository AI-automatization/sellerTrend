import { useState, useEffect } from 'react';
import { seasonalApi } from '../../api/client';
import { logError } from '../../utils/handleError';
import { useI18n } from '../../i18n/I18nContext';
import type { SeasonalEvent } from './types';
import { MONTH_NAMES } from './types';

export function SeasonalCalendarTab() {
  const { t } = useI18n();
  const [events, setEvents] = useState<SeasonalEvent[]>([]);
  const [upcoming, setUpcoming] = useState<SeasonalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      seasonalApi.getCalendar().then((r) => setEvents(r.data?.events ?? r.data ?? [])),
      seasonalApi.getUpcoming().then((r) => setUpcoming(r.data?.events ?? r.data ?? [])),
    ]).catch(logError).finally(() => setLoading(false));
  }, []);

  const currentMonth = new Date().getMonth() + 1;

  function isActiveMonth(ev: SeasonalEvent, month: number) {
    if (ev.season_start <= ev.season_end) {
      return month >= ev.season_start && month <= ev.season_end;
    }
    return month >= ev.season_start || month <= ev.season_end;
  }

  if (loading) {
    return <div className="flex justify-center py-16"><span className="loading loading-dots loading-lg text-primary" /></div>;
  }

  const boostLabel = (boost: number | null) => {
    if (!boost) return null;
    if (boost >= 1.3) return { text: 'Yuqori talab', cls: 'badge-error' };
    if (boost >= 1.15) return { text: "O'rta talab", cls: 'badge-warning' };
    return { text: 'Oddiy', cls: 'badge-ghost' };
  };

  return (
    <div className="space-y-6">
      {/* Upcoming — joriy va keyingi oy */}
      {upcoming.length > 0 && (
        <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
          <div className="card-body p-4">
            <h2 className="card-title text-base gap-2">
              <span className="text-lg">{'\u{1F4C5}'}</span> {t('discovery.seasonal.next30')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
              {upcoming.map((ev) => {
                const bl = boostLabel(ev.avg_score_boost);
                return (
                  <div key={ev.id} className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-sm">{ev.season_name}</p>
                      {bl && <span className={`badge badge-sm shrink-0 ${bl.cls}`}>{bl.text}</span>}
                    </div>
                    <p className="text-xs text-base-content/50 mt-1">
                      {MONTH_NAMES[ev.season_start - 1]} — {MONTH_NAMES[ev.season_end - 1]}
                    </p>
                    {ev.avg_score_boost && (
                      <p className="text-xs text-success mt-2 font-medium">
                        Sotuv +{((ev.avg_score_boost - 1) * 100).toFixed(0)}% oshadi
                      </p>
                    )}
                    <p className="text-xs text-base-content/40 mt-1">
                      Bu mavsumga tayyor bo'ling — stok va narxni ko'rib chiqing
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Yillik kalendar — kartochkalar ko'rinishida */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
        <div className="card-body">
          <h2 className="card-title text-base">{t('discovery.seasonal.yearlyCalendar')}</h2>
          <p className="text-xs text-base-content/40">{t('discovery.seasonal.desc')}</p>

          {events.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center text-base-content/40">
              <p>{t('discovery.seasonal.empty')}</p>
              <div className="text-xs bg-base-300/50 rounded-xl p-4 max-w-sm text-left space-y-1">
                <p className="font-semibold text-base-content/60 mb-2">Mavsum misoli:</p>
                <p>Yangi Yil (Dek–Yan) — sotuv +35%</p>
                <p>Maktab mavsumi (Avg–Sen) — sotuv +30%</p>
                <p className="text-base-content/30 mt-2 text-xs">Mavsumiy trend = sotuvingizni rejalashtirish uchun eng muhim signal</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {events.map((ev) => {
                const bl = boostLabel(ev.avg_score_boost);
                const activeNow = isActiveMonth(ev, currentMonth);
                return (
                  <div
                    key={ev.id}
                    className={`rounded-xl border px-4 py-3 ${activeNow ? 'bg-primary/10 border-primary/30' : 'bg-base-300/40 border-base-300/60'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-sm">{ev.season_name}</p>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {bl && <span className={`badge badge-xs ${bl.cls}`}>{bl.text}</span>}
                        {activeNow && <span className="badge badge-xs badge-primary">Hozir aktiv</span>}
                      </div>
                    </div>
                    <p className="text-xs text-base-content/50 mt-1">
                      {MONTH_NAMES[ev.season_start - 1]} — {MONTH_NAMES[ev.season_end - 1]}
                    </p>
                    {ev.avg_score_boost && (
                      <p className="text-xs text-success mt-2 font-medium">
                        Sotuv +{((ev.avg_score_boost - 1) * 100).toFixed(0)}% oshadi
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
