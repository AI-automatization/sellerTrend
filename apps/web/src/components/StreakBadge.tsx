import { useState, useEffect } from 'react';
import { api } from '../api/base';
import { useI18n } from '../i18n/I18nContext';
import { FireIcon } from './icons';

interface StreakResponse {
  streak: number;
}

export function StreakBadge() {
  const { t } = useI18n();
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    api.get<StreakResponse>('/auth/streak')
      .then((res) => {
        if (res.data?.streak && res.data.streak > 0) {
          setStreak(res.data.streak);
        }
      })
      .catch(() => {
        // Graceful degradation — API may not be implemented yet
      });
  }, []);

  if (streak === null || streak <= 0) return null;

  const tooltipText = t('streak.days').replace('{n}', String(streak));

  return (
    <div
      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/10 text-orange-500 tooltip tooltip-top cursor-default"
      data-tip={tooltipText}
    >
      <FireIcon className="w-4 h-4" />
      <span className="text-xs font-bold">{streak}</span>
    </div>
  );
}
