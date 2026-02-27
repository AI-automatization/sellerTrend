import { useState, useEffect } from 'react';
import { seasonalApi } from '../../api/client';
import { logError } from '../../utils/handleError';
import type { SeasonalEvent } from './types';
import { MONTH_NAMES } from './types';

export function SeasonalCalendarTab() {
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

  return (
    <div className="space-y-6">
      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
          <div className="card-body p-4">
            <h2 className="card-title text-base gap-2">
              <span className="text-lg">{'\u{1F4C5}'}</span> Yaqin 30 kunda
            </h2>
            <div className="flex flex-wrap gap-3 mt-2">
              {upcoming.map((ev) => (
                <div key={ev.id} className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 flex-1 min-w-48">
                  <p className="font-bold text-sm">{ev.season_name}</p>
                  <p className="text-xs text-base-content/50 mt-1">
                    {MONTH_NAMES[ev.season_start - 1]} — {MONTH_NAMES[ev.season_end - 1]}
                  </p>
                  {ev.avg_score_boost && (
                    <p className="text-xs text-success mt-1">
                      Score boost: +{Number(ev.avg_score_boost).toFixed(0)}%
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Heatmap calendar */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
        <div className="card-body">
          <h2 className="card-title text-base">Yillik mavsumiy kalendar</h2>
          <p className="text-xs text-base-content/40">
            Qaysi oylarda qaysi trendlar kuchayishini ko'ring
          </p>

          {events.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-base-content/40">
              <p>Mavsumiy ma'lumotlar hali kiritilmagan</p>
            </div>
          ) : (
            <div className="overflow-x-auto mt-4">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th className="min-w-40">Mavsum</th>
                    {MONTH_NAMES.map((m) => (
                      <th key={m} className="text-center text-xs px-1 w-10">{m}</th>
                    ))}
                    <th className="text-right">Boost</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id} className="hover">
                      <td className="font-medium text-sm">{ev.season_name}</td>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                        const active = isActiveMonth(ev, month);
                        const isPeak = ev.peak_week && month === Math.ceil(ev.peak_week / 4.33);
                        return (
                          <td key={month} className="text-center px-1">
                            <div
                              className={`w-6 h-6 rounded mx-auto flex items-center justify-center text-xs ${
                                isPeak
                                  ? 'bg-primary text-primary-content font-bold'
                                  : active
                                  ? 'bg-primary/30'
                                  : month === currentMonth
                                  ? 'bg-base-300'
                                  : ''
                              }`}
                            >
                              {isPeak ? '\u2605' : active ? '\u25CF' : ''}
                            </div>
                          </td>
                        );
                      })}
                      <td className="text-right text-xs">
                        {ev.avg_score_boost ? (
                          <span className="text-success font-bold">+{Number(ev.avg_score_boost).toFixed(0)}%</span>
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
    </div>
  );
}
