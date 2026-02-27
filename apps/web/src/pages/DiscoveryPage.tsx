import { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { ArrowTrendingUpIcon } from '../components/icons';
import { ScannerTab, SeasonalCalendarTab, NicheFinderTab } from '../components/discovery';

export function DiscoveryPage() {
  const [tab, setTab] = useState<'scanner' | 'seasonal' | 'niche'>('scanner');
  const { t } = useI18n();

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
          <ArrowTrendingUpIcon className="w-6 h-6 lg:w-7 lg:h-7 text-primary" />
          {t('discovery.title')}
        </h1>
        <p className="text-base-content/50 text-sm mt-1">
          {t('discovery.subtitle')}
        </p>
      </div>

      {/* Main tabs */}
      <div role="tablist" className="tabs tabs-boxed bg-base-200 w-fit">
        <button role="tab" onClick={() => setTab('scanner')}
          className={`tab ${tab === 'scanner' ? 'tab-active' : ''}`}>
          {t('discovery.tabScanner')}
        </button>
        <button role="tab" onClick={() => setTab('seasonal')}
          className={`tab ${tab === 'seasonal' ? 'tab-active' : ''}`}>
          {t('discovery.tabSeasonal')}
        </button>
        <button role="tab" onClick={() => setTab('niche')}
          className={`tab ${tab === 'niche' ? 'tab-active' : ''}`}>
          {t('discovery.tabNiche')}
        </button>
      </div>

      {tab === 'scanner' && <ScannerTab />}
      {tab === 'seasonal' && <SeasonalCalendarTab />}
      {tab === 'niche' && <NicheFinderTab />}
    </div>
  );
}
