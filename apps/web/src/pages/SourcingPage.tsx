import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { sourcingApi } from '../api/client';
import { logError } from '../utils/handleError';
import {
  ImportAnalysis,
  JobsList,
  CargoCalculator,
  ExternalSearch,
  CalculationHistory,
  fmt,
} from '../components/sourcing';
import type { CurrencyRates, CargoProvider, Tab } from '../components/sourcing';

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SourcingPage() {
  const [searchParams] = useSearchParams();
  const prefillName = searchParams.get('q') ?? '';
  const prefillPrice = searchParams.get('price') ?? '';
  const prefillProductId = searchParams.get('product_id') ?? '';

  const [tab, setTab] = useState<Tab>(prefillProductId ? 'import' : prefillName ? 'calculator' : 'calculator');
  const [rates, setRates] = useState<CurrencyRates | null>(null);
  const [providers, setProviders] = useState<CargoProvider[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      sourcingApi.getCurrencyRates(),
      sourcingApi.getCargoProviders(),
    ]).then(([r, p]) => {
      setRates(r.data);
      setProviders(p.data);
    }).catch(logError)
      .finally(() => setRatesLoading(false));
  }, []);

  async function refreshRates() {
    setRatesLoading(true);
    try {
      const r = await sourcingApi.refreshRates();
      setRates(r.data);
    } catch (err: unknown) {
      logError(err);
    } finally {
      setRatesLoading(false);
    }
  }

  return (
    <div className="w-full space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Sourcing Engine</h1>
          <p className="text-base-content/60 text-sm mt-1">
            Xitoy / Yevropa narxlarini solishtiring, AI orqali eng yaxshi variantni toping
          </p>
        </div>

        {/* Live currency rates */}
        <div className="flex items-center gap-3 bg-base-200 rounded-xl px-4 py-2 text-sm">
          {ratesLoading ? (
            <span className="loading loading-spinner loading-xs" />
          ) : rates ? (
            <>
              <span className="font-medium">USD</span>
              <span className="text-primary font-bold">{fmt(rates.USD)}</span>
              <span className="text-base-content/30">|</span>
              <span className="font-medium">CNY</span>
              <span className="text-warning font-bold">{fmt(rates.CNY)}</span>
              <span className="text-base-content/30">|</span>
              <span className="font-medium">EUR</span>
              <span className="text-success font-bold">{fmt(rates.EUR)}</span>
              <span className="text-xs text-base-content/40">so'm</span>
            </>
          ) : <span className="text-base-content/40 text-xs">Kurslar yuklanmadi</span>}
          <button onClick={refreshRates} className="btn btn-ghost btn-xs" title="CBU dan yangilash">↻</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-base-200 w-fit">
        {([
          ['calculator', '🧮 Kalkulyator'],
          ['search', '🔍 Tez Qidirish'],
          ['import', '🌍 Import Tahlil'],
          ['jobs', '📊 Qidiruvlar'],
          ['history', '📋 Tarix'],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`tab ${tab === t ? 'tab-active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'calculator' && (
        <CargoCalculator
          providers={providers}
          rates={rates}
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
  );
}
