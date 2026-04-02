import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { useSearchParams } from 'react-router-dom';
import { sourcingApi } from '../api/client';
import { logError } from '../utils/handleError';
import { PlanGuard } from '../components/PlanGuard';
import {
  ImportAnalysis,
  JobsList,
  CargoCalculator,
  ExternalSearch,
  CalculationHistory,
  fmt,
} from '../components/sourcing';
import { PageHint } from '../components/PageHint';
import type { CurrencyRates, CargoProvider, Tab } from '../components/sourcing';
import {
  RiCalculatorLine,
  RiSearchLine,
  RiGlobalLine,
  RiBarChartLine,
  RiHistoryLine,
  RiRefreshLine,
} from 'react-icons/ri';

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: { key: Tab; icon: React.ReactNode; labelKey: string }[] = [
  { key: 'calculator', icon: <RiCalculatorLine size={15} />, labelKey: 'sourcing.tab.calculator' },
  { key: 'search',     icon: <RiSearchLine size={15} />,     labelKey: 'sourcing.tab.quickSearch' },
  { key: 'import',     icon: <RiGlobalLine size={15} />,     labelKey: 'sourcing.tab.importAnalysis' },
  { key: 'jobs',       icon: <RiBarChartLine size={15} />,   labelKey: 'sourcing.tab.searches' },
  { key: 'history',   icon: <RiHistoryLine size={15} />,    labelKey: 'sourcing.tab.history' },
];

export function SourcingPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const prefillName = searchParams.get('q') ?? '';
  const prefillPrice = searchParams.get('price') ?? '';
  const prefillProductId = searchParams.get('product_id') ?? '';

  const [tab, setTab] = useState<Tab>(prefillProductId ? 'import' : 'calculator');
  const [rates, setRates] = useState<CurrencyRates | null>(null);
  const [providers, setProviders] = useState<CargoProvider[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState(false);

  useEffect(() => {
    Promise.all([
      sourcingApi.getCurrencyRates(),
      sourcingApi.getCargoProviders(),
    ]).then(([r, p]) => {
      setRates(r.data);
      setProviders(p.data);
    }).catch((err) => {
      logError(err);
      setRatesError(true);
    }).finally(() => setRatesLoading(false));
  }, []);

  async function refreshRates() {
    setRatesLoading(true);
    setRatesError(false);
    try {
      const r = await sourcingApi.refreshRates();
      setRates(r.data);
    } catch (err: unknown) {
      logError(err);
      setRatesError(true);
    } finally {
      setRatesLoading(false);
    }
  }

  return (
    <PlanGuard requiredPlan="PRO">
    <div className="w-full space-y-5">
      <PageHint page="sourcing">{t('hints.sourcing')}</PageHint>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('sourcing.title')}</h1>
          <p className="text-base-content/50 text-sm mt-1">{t('sourcing.subtitle')}</p>
        </div>

        {/* Live currency rates */}
        <div className="flex items-center gap-2 bg-base-200 border border-base-300/60 rounded-xl px-3 py-2 text-sm shrink-0">
          {ratesLoading ? (
            <span className="loading loading-spinner loading-xs opacity-50" />
          ) : ratesError ? (
            <span className="text-error text-xs">{t('sourcing.ratesNotLoaded')}</span>
          ) : rates ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-base-content/40 text-xs">USD</span>
                <span className="font-bold text-primary text-sm">{fmt(rates.USD)}</span>
              </div>
              <span className="text-base-content/20">·</span>
              <div className="flex items-center gap-1">
                <span className="text-base-content/40 text-xs">CNY</span>
                <span className="font-bold text-warning text-sm">{fmt(rates.CNY)}</span>
              </div>
              <span className="text-base-content/20">·</span>
              <div className="flex items-center gap-1">
                <span className="text-base-content/40 text-xs">EUR</span>
                <span className="font-bold text-success text-sm">{fmt(rates.EUR)}</span>
              </div>
              <span className="text-base-content/30 text-xs">{t('common.som')}</span>
            </div>
          ) : null}
          <button
            onClick={refreshRates}
            disabled={ratesLoading}
            className="btn btn-ghost btn-xs btn-circle"
            title={t('sourcing.refreshRatesBtn')}
          >
            <RiRefreshLine size={13} className={ratesLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-base-200/60 border border-base-300/50 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(({ key, icon, labelKey }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === key
                ? 'bg-base-100 shadow-sm text-base-content'
                : 'text-base-content/50 hover:text-base-content/80'
            }`}
          >
            {icon}
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'calculator' && (
        <CargoCalculator
          providers={providers}
          rates={rates}
          ratesLoading={ratesLoading}
          prefillName={prefillName}
          prefillItemCostUzs={prefillPrice ? parseFloat(prefillPrice) : undefined}
        />
      )}
      {tab === 'search' && <ExternalSearch initialQuery={prefillName} />}
      {tab === 'import' && (
        <ImportAnalysis
          initialProductId={prefillProductId ? parseInt(prefillProductId) : undefined}
          initialTitle={prefillName}
        />
      )}
      {tab === 'jobs' && <JobsList />}
      {tab === 'history' && <CalculationHistory />}
    </div>
    </PlanGuard>
  );
}
