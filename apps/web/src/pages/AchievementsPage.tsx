import { useState, useEffect } from 'react';
import { achievementsApi } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';
import {
  TrophyIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  ArrowTrendingUpIcon,
  GlobeAltIcon,
  CalculatorIcon,
  CheckIcon,
} from '../components/icons';
import { useI18n } from '../i18n/I18nContext';
import type { Achievement } from '../api/types';

/** Map achievement icon names to React components */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'magnifying-glass': MagnifyingGlassIcon,
  'trending-up': ArrowTrendingUpIcon,
  'globe': GlobeAltIcon,
  'calculator': CalculatorIcon,
  'trophy': TrophyIcon,
  'check': CheckIcon,
};

function AchievementIcon({ icon, className }: { icon: string; className?: string }) {
  const IconComponent = ICON_MAP[icon];
  if (IconComponent) {
    return <IconComponent className={className} />;
  }
  // Fallback to trophy icon for unknown icon names
  return <TrophyIcon className={className} />;
}

export function AchievementsPage() {
  const { t } = useI18n();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    achievementsApi
      .getAll()
      .then((res) => {
        setAchievements(res.data as Achievement[]);
      })
      .catch((err: unknown) => {
        setError(getErrorMessage(err, t('common.error')));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [t]);

  const earnedCount = achievements.filter((a) => a.earned).length;
  const totalCount = achievements.length;
  const progressPct = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  return (
    <div className="w-full space-y-4 lg:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
          <TrophyIcon className="w-6 h-6 lg:w-7 lg:h-7 text-primary" />
          {t('achievements.title')}
        </h1>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div role="alert" className="alert alert-error alert-soft">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Progress bar */}
      {!loading && !error && totalCount > 0 && (
        <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-base-content/70">
              {t('achievements.progress')
                .replace('{earned}', String(earnedCount))
                .replace('{total}', String(totalCount))}
            </span>
            <span className="text-sm font-bold text-primary">{progressPct}%</span>
          </div>
          <progress
            className="progress progress-primary w-full"
            value={earnedCount}
            max={totalCount}
          />
        </div>
      )}

      {/* Achievement grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {achievements.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && achievements.length === 0 && (
        <div className="text-center py-12">
          <TrophyIcon className="w-12 h-12 text-base-content/20 mx-auto mb-3" />
          <p className="text-base-content/50">{t('common.noData')}</p>
        </div>
      )}
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const { t } = useI18n();
  const isEarned = achievement.earned;

  const earnedDate = achievement.earned_at
    ? new Date(achievement.earned_at).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div
      className={`rounded-2xl border p-4 lg:p-5 transition-all duration-200 ${
        isEarned
          ? 'bg-base-200/60 border-warning/40 shadow-sm shadow-warning/10'
          : 'bg-base-200/30 border-base-300/30 opacity-60'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            isEarned
              ? 'bg-gradient-to-br from-warning/30 to-warning/10 ring-1 ring-warning/30'
              : 'bg-base-300/50 grayscale'
          }`}
        >
          {isEarned ? (
            <AchievementIcon
              icon={achievement.icon}
              className="w-6 h-6 text-warning"
            />
          ) : (
            <LockClosedIcon className="w-5 h-5 text-base-content/30" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3
            className={`font-bold text-sm leading-tight ${
              isEarned ? 'text-base-content' : 'text-base-content/50'
            }`}
          >
            {t(achievement.title_key)}
          </h3>
          <p
            className={`text-xs mt-1 leading-relaxed ${
              isEarned ? 'text-base-content/60' : 'text-base-content/35'
            }`}
          >
            {t(achievement.description_key)}
          </p>

          {/* Status badge */}
          <div className="mt-2">
            {isEarned ? (
              <span className="badge badge-warning badge-sm gap-1 font-semibold">
                <CheckIcon className="w-3 h-3" />
                {t('achievements.earned')}
                {earnedDate && (
                  <span className="text-warning-content/60 ml-1">{earnedDate}</span>
                )}
              </span>
            ) : (
              <span className="badge badge-ghost badge-sm gap-1 text-base-content/40">
                <LockClosedIcon className="w-3 h-3" />
                {t('achievements.locked')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
