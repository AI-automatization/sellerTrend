import { useState } from 'react';
import { AdsTab } from './enterprise/AdsTab';
import { TeamTab } from './enterprise/TeamTab';
import { ReportsTab } from './enterprise/ReportsTab';
import { WatchlistTab } from './enterprise/WatchlistTab';
import { CommunityTab } from './enterprise/CommunityTab';

type Tab = 'ads' | 'team' | 'reports' | 'watchlist' | 'community';

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'ads', label: 'Ads ROI', emoji: '📢' },
  { key: 'team', label: 'Jamoa', emoji: '👥' },
  { key: 'reports', label: 'Hisobotlar', emoji: '📄' },
  { key: 'watchlist', label: 'Watchlist', emoji: '👁' },
  { key: 'community', label: 'Jamiyat', emoji: '💡' },
];

export function EnterprisePage() {
  const [tab, setTab] = useState<Tab>('ads');

  return (
    <div className="w-full space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 lg:w-7 lg:h-7 text-secondary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
            Enterprise
          </h1>
          <p className="text-base-content/50 text-sm mt-1">v4.0 — Korporativ funksiyalar (Features 31-43)</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-2">
        <div className="flex gap-1 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`btn btn-sm gap-1.5 flex-1 min-w-fit transition-all ${
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
      {tab === 'ads' && <AdsTab />}
      {tab === 'team' && <TeamTab />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'watchlist' && <WatchlistTab />}
      {tab === 'community' && <CommunityTab />}
    </div>
  );
}
