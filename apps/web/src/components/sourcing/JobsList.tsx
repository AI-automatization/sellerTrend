import { useState, useEffect } from 'react';
import { sourcingApi } from '../../api/client';
import type { SourcingJob, SourcingJobDetail } from './types';
import { StatusBadge } from './StatusBadge';
import { SourcingResultCard } from './SourcingResultCard';

export function JobsList() {
  const [jobs, setJobs] = useState<SourcingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<SourcingJobDetail | null>(null);

  useEffect(() => {
    sourcingApi.listJobs().then((r) => setJobs(r.data)).finally(() => setLoading(false));
  }, []);

  async function viewJob(id: string) {
    const res = await sourcingApi.getJob(id);
    setSelectedJob(res.data);
  }

  if (loading) return <div className="flex justify-center py-16"><span className="loading loading-spinner loading-lg" /></div>;

  if (selectedJob) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedJob(null)} className="btn btn-ghost btn-sm">&larr; Orqaga</button>

        <div className="card bg-base-200/60 border border-base-300/50 rounded-2xl">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <StatusBadge status={selectedJob.status} />
              <h2 className="card-title text-lg flex-1">{selectedJob.query}</h2>
              <span className="text-sm text-base-content/50">
                {selectedJob.results.length} natija
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
      <p>Hali qidiruvlar yo'q</p>
      <p className="text-sm mt-1">"Import Tahlil" tabidan birinchi qidiruvni boshlang</p>
    </div>
  );

  return (
    <div className="card bg-base-200/60 border border-base-300/50 rounded-2xl">
      <div className="card-body">
        <h2 className="card-title text-lg">Qidiruvlar Tarixi</h2>
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>So'rov</th>
                <th>Status</th>
                <th>Natijalar</th>
                <th>Platformalar</th>
                <th>Sana</th>
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
                      Ko'rish
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
