import { useState, useEffect } from 'react';
import { sourcingApi } from '../../api/client';
import { logError } from '../../utils/handleError';
import type { SourcingJob, SourcingJobDetail } from './types';
import { StatusBadge } from './StatusBadge';
import { SourcingResultCard } from './SourcingResultCard';
import { useI18n } from '../../i18n/I18nContext';

export function JobsList() {
  const { t } = useI18n();
  const [jobs, setJobs] = useState<SourcingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<SourcingJobDetail | null>(null);

  useEffect(() => {
    sourcingApi.listJobs().then((r) => setJobs(r.data)).catch(logError).finally(() => setLoading(false));
  }, []);

  async function viewJob(id: string) {
    try {
      const res = await sourcingApi.getJob(id);
      setSelectedJob(res.data);
    } catch (err: unknown) {
      logError(err);
    }
  }

  if (loading) return <div className="flex justify-center py-16"><span className="loading loading-spinner loading-lg" /></div>;

  if (selectedJob) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedJob(null)} className="btn btn-ghost btn-sm">{t('sourcing.jobs.backBtn')}</button>

        <div className="card bg-base-200/60 border border-base-300/50 rounded-2xl">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <StatusBadge status={selectedJob.status} />
              <h2 className="card-title text-lg flex-1">{selectedJob.query}</h2>
              <span className="text-sm text-base-content/50">
                {t('sourcing.jobs.resultsCount').replace('{n}', String(selectedJob.results.length))}
              </span>
            </div>
          </div>
        </div>

        {selectedJob.results.map((r) => (
          <SourcingResultCard key={r.id} result={r} />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) return (
    <div className="text-center py-20 text-base-content/40">
      <p className="text-5xl mb-4">📊</p>
      <p>{t('sourcing.jobs.empty')}</p>
      <p className="text-sm mt-1">{t('sourcing.jobs.emptyHint')}</p>
    </div>
  );

  return (
    <div className="card bg-base-200/60 border border-base-300/50 rounded-2xl">
      <div className="card-body">
        <h2 className="card-title text-lg">{t('sourcing.jobs.historyTitle')}</h2>
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>{t('sourcing.jobs.col.query')}</th>
                <th>{t('sourcing.jobs.col.status')}</th>
                <th>{t('sourcing.jobs.col.results')}</th>
                <th>{t('sourcing.jobs.col.platforms')}</th>
                <th>{t('sourcing.jobs.col.date')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="hover">
                  <td className="max-w-48 truncate text-sm">{j.query}</td>
                  <td><StatusBadge status={j.status} /></td>
                  <td>{j.result_count}</td>
                  <td className="text-xs text-base-content/50">{j.platforms?.join(', ') ?? '\u2014'}</td>
                  <td className="text-xs text-base-content/40">
                    {new Date(j.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td>
                    <button onClick={() => viewJob(j.id)} className="btn btn-ghost btn-xs">
                      {t('sourcing.jobs.viewBtn')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
