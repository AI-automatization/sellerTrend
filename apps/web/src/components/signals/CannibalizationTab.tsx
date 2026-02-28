import { useState, useEffect } from 'react';
import { signalsApi } from '../../api/client';
import { logError } from '../../utils/handleError';
import { useI18n } from '../../i18n/I18nContext';
import { SectionCard } from './SectionCard';
import { SectionHeader } from './SectionHeader';
import { EmptyState } from './EmptyState';
import { LoadingSpinner } from './LoadingSpinner';
import type { CannibalizationPair } from './types';

export function CannibalizationTab() {
  const { t } = useI18n();
  const [data, setData] = useState<CannibalizationPair[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    signalsApi.getCannibalization()
      .then((r) => setData(r.data))
      .catch(logError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SectionCard><LoadingSpinner /></SectionCard>;

  return (
    <SectionCard>
      <SectionHeader
        title={t('signals.cann.title')}
        desc={t('signals.cann.desc')}
      />
      {data.length === 0 ? (
        <EmptyState text={t('signals.cann.empty')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs text-base-content/40 uppercase">
                <th>{t('signals.cann.col.productA')}</th>
                <th>{t('signals.cann.col.productB')}</th>
                <th className="text-center">{t('signals.cann.col.overlap')}</th>
                <th>{t('signals.cann.col.reason')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((pair, i) => (
                <tr key={i} className="hover:bg-base-300/20 transition-colors">
                  <td className="max-w-[200px] truncate text-sm">{pair.product_a_title}</td>
                  <td className="max-w-[200px] truncate text-sm">{pair.product_b_title}</td>
                  <td className="text-center">
                    <div className="radial-progress text-xs text-warning" style={{ '--value': pair.overlap_score * 100, '--size': '2.5rem' } as React.CSSProperties}>
                      {(pair.overlap_score * 100).toFixed(0)}%
                    </div>
                  </td>
                  <td className="text-xs text-base-content/60 max-w-[200px]">{pair.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
