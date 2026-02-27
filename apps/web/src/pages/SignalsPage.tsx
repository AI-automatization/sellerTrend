import { useState } from 'react';
import {
  TABS,
  CannibalizationTab,
  DeadStockTab,
  SaturationTab,
  FlashSalesTab,
  EarlySignalsTab,
  StockCliffsTab,
  RankingTab,
  ChecklistTab,
  PriceTestTab,
  ReplenishmentTab,
} from '../components/signals';
import type { Tab } from '../components/signals';

export function SignalsPage() {
  const [tab, setTab] = useState<Tab>('cannibalization');

  return (
    <div className="w-full space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 lg:w-7 lg:h-7 text-warning">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            Signallar
          </h1>
          <p className="text-base-content/50 text-sm mt-1">
            v3.0 — Ogohlantirish va analitika signallari (Features 21-30)
          </p>
        </div>
        <div className="text-xs text-base-content/30 hidden sm:block">
          {TABS.length} ta signal moduli
        </div>
      </div>

      {/* Tab navigation — dropdown on mobile, scrollable tabs on desktop */}
      <div className="sm:hidden">
        <select
          value={tab}
          onChange={(e) => setTab(e.target.value as Tab)}
          className="select select-bordered w-full"
        >
          {TABS.map((t) => (
            <option key={t.key} value={t.key}>
              {t.emoji} {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="hidden sm:block rounded-2xl bg-base-200/60 border border-base-300/50 p-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`btn btn-sm gap-1.5 whitespace-nowrap transition-all ${
                tab === t.key
                  ? 'btn-primary shadow-md shadow-primary/20'
                  : 'btn-ghost hover:bg-base-300/50'
              }`}
            >
              <span className="text-base">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'cannibalization' && <CannibalizationTab />}
      {tab === 'dead-stock' && <DeadStockTab />}
      {tab === 'saturation' && <SaturationTab />}
      {tab === 'flash-sales' && <FlashSalesTab />}
      {tab === 'early-signals' && <EarlySignalsTab />}
      {tab === 'stock-cliffs' && <StockCliffsTab />}
      {tab === 'ranking' && <RankingTab />}
      {tab === 'checklist' && <ChecklistTab />}
      {tab === 'price-test' && <PriceTestTab />}
      {tab === 'replenishment' && <ReplenishmentTab />}
    </div>
  );
}
