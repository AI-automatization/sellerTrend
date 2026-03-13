import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LockClosedIcon } from './icons';
import { useI18n } from '../i18n/I18nContext';

type PlanTier = 'FREE' | 'PRO' | 'MAX' | 'COMPANY';

const PLAN_HIERARCHY: Record<PlanTier, number> = {
  FREE: 0,
  PRO: 1,
  MAX: 2,
  COMPANY: 3,
};

interface PlanGuardProps {
  requiredPlan: 'PRO' | 'MAX' | 'COMPANY';
  children: ReactNode;
}

/**
 * Wrapper component that checks if the user's plan allows a feature.
 * If the plan is sufficient, renders children; otherwise shows a locked overlay.
 */
export function PlanGuard({ requiredPlan, children }: PlanGuardProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const payload = useAuthStore((s) => s.payload);

  // Extract plan from token payload or default to FREE
  const currentPlan = ((payload as unknown as Record<string, unknown>)?.plan as PlanTier) || 'FREE';
  const currentLevel = PLAN_HIERARCHY[currentPlan] ?? 0;
  const requiredLevel = PLAN_HIERARCHY[requiredPlan];

  if (currentLevel >= requiredLevel) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="opacity-30 pointer-events-none select-none blur-[2px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="card bg-base-200 shadow-xl border border-primary/20 max-w-sm mx-4">
          <div className="card-body items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <LockClosedIcon className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-bold">
              {t('billing.lockedFeature').replace('{plan}', t(`billing.${requiredPlan.toLowerCase()}`))}
            </h3>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/billing')}
            >
              {t('billing.upgrade')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
