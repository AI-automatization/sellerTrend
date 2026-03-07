import { toast } from 'react-toastify';
import { useAuthStore } from '../stores/authStore';
import { CheckIcon, BanknotesIcon } from '../components/icons';
import { useI18n } from '../i18n/I18nContext';

type PlanTier = 'FREE' | 'PRO' | 'MAX' | 'COMPANY';

interface PlanCard {
  key: PlanTier;
  i18nKey: string;
  price: number;
  featureKeys: string[];
  highlight: boolean;
}

const PLANS: PlanCard[] = [
  {
    key: 'FREE',
    i18nKey: 'billing.free',
    price: 0,
    featureKeys: ['billing.feature.free.1', 'billing.feature.free.2'],
    highlight: false,
  },
  {
    key: 'PRO',
    i18nKey: 'billing.pro',
    price: 150_000,
    featureKeys: ['billing.feature.pro.1', 'billing.feature.pro.2', 'billing.feature.pro.3'],
    highlight: true,
  },
  {
    key: 'MAX',
    i18nKey: 'billing.max',
    price: 350_000,
    featureKeys: ['billing.feature.max.1', 'billing.feature.max.2', 'billing.feature.max.3'],
    highlight: false,
  },
  {
    key: 'COMPANY',
    i18nKey: 'billing.company',
    price: 990_000,
    featureKeys: ['billing.feature.company.1', 'billing.feature.company.2', 'billing.feature.company.3'],
    highlight: false,
  },
];

function formatPrice(price: number): string {
  return price.toLocaleString('uz-UZ');
}

export function BillingPage() {
  const { t } = useI18n();
  const payload = useAuthStore((s) => s.payload);
  const currentPlan: PlanTier = ((payload as Record<string, unknown>)?.plan as PlanTier) || 'FREE';

  function handleSelectPlan(plan: PlanTier) {
    if (plan === currentPlan) return;
    toast.info(t('billing.comingSoon'));
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <BanknotesIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-heading">{t('billing.title')}</h1>
          <p className="text-sm text-base-content/50">
            {t('billing.currentPlan')}: <span className="font-semibold text-primary">{t(`billing.${currentPlan.toLowerCase()}`)}</span>
          </p>
        </div>
      </div>

      {/* Plan cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentPlan;

          return (
            <div
              key={plan.key}
              className={`card border transition-all duration-200 ${
                plan.highlight
                  ? 'border-primary/40 shadow-lg shadow-primary/10 bg-base-100'
                  : 'border-base-300/50 bg-base-100'
              } ${isCurrent ? 'ring-2 ring-primary/30' : 'hover:border-primary/20 hover:shadow-md'}`}
            >
              <div className="card-body gap-5">
                {/* Plan name + badge */}
                <div className="flex items-center justify-between">
                  <h2 className={`font-heading font-bold text-lg ${plan.highlight ? 'text-primary' : ''}`}>
                    {t(plan.i18nKey)}
                  </h2>
                  {isCurrent && (
                    <span className="badge badge-primary badge-sm text-[10px] font-bold">
                      {t('billing.currentPlan')}
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black font-heading">
                    {plan.price === 0 ? '0' : formatPrice(plan.price)}
                  </span>
                  <span className="text-sm text-base-content/50">
                    {t('common.som')}{t('billing.perMonth')}
                  </span>
                </div>

                {/* Divider */}
                <div className="h-px bg-base-300/40" />

                {/* Features */}
                <div>
                  <p className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-3">
                    {t('billing.features')}
                  </p>
                  <ul className="space-y-2.5">
                    {plan.featureKeys.map((fk) => (
                      <li key={fk} className="flex items-start gap-2 text-sm">
                        <CheckIcon className="w-4 h-4 text-success shrink-0 mt-0.5" />
                        <span className="text-base-content/75">{t(fk)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action button */}
                <div className="mt-auto pt-2">
                  {isCurrent ? (
                    <button className="btn btn-ghost btn-sm w-full" disabled>
                      {t('billing.currentPlan')}
                    </button>
                  ) : (
                    <button
                      className={`btn btn-sm w-full ${plan.highlight ? 'btn-primary' : 'btn-outline btn-primary'}`}
                      onClick={() => handleSelectPlan(plan.key)}
                    >
                      {t('billing.select')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
