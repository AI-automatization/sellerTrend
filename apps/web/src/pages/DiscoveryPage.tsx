import { useState } from 'react';
import { ArrowTrendingUpIcon } from '../components/icons';
import { ScannerTab, SeasonalCalendarTab, NicheFinderTab } from '../components/discovery';

export function DiscoveryPage() {
  const [tab, setTab] = useState<'scanner' | 'seasonal' | 'niche'>('scanner');

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
          <ArrowTrendingUpIcon className="w-6 h-6 lg:w-7 lg:h-7 text-primary" />
          Category Discovery
        </h1>
        <p className="text-base-content/50 text-sm mt-1">
          Kategoriya skanerlash, mavsumiy trendlar va niche topish
        </p>
      </div>

      {/* Main tabs */}
      <div role="tablist" className="tabs tabs-boxed bg-base-200 w-fit">
        <button role="tab" onClick={() => setTab('scanner')}
          className={`tab ${tab === 'scanner' ? 'tab-active' : ''}`}>
          Skanerlash
        </button>
        <button role="tab" onClick={() => setTab('seasonal')}
          className={`tab ${tab === 'seasonal' ? 'tab-active' : ''}`}>
          Mavsumiy Kalendar
        </button>
        <button role="tab" onClick={() => setTab('niche')}
          className={`tab ${tab === 'niche' ? 'tab-active' : ''}`}>
          Niche Topish
        </button>
      </div>

      {tab === 'scanner' && <ScannerTab />}
      {tab === 'seasonal' && <SeasonalCalendarTab />}
      {tab === 'niche' && <NicheFinderTab />}
    </div>
  );
}
