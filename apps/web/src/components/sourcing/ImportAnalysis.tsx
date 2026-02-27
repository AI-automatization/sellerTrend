import { useState, useEffect } from 'react';
import { sourcingApi } from '../../api/client';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { COUNTRY_FLAGS } from './types';
import type { SourcingJobDetail } from './types';
import { StatusBadge } from './StatusBadge';
import { SourcingResultCard } from './SourcingResultCard';

export interface ImportAnalysisProps {
  initialProductId?: number;
  initialTitle?: string;
}

export function ImportAnalysis({
  initialProductId,
  initialTitle,
}: ImportAnalysisProps) {
  const [productId, setProductId] = useState(initialProductId ? String(initialProductId) : '');
  const [title, setTitle] = useState(initialTitle ?? '');
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SourcingJobDetail | null>(null);
  const [error, setError] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  // Auto-start if we have product_id from URL
  useEffect(() => {
    if (initialProductId && initialTitle && !jobId) {
      handleStart();
    }
  }, []); // eslint-disable-line

  async function handleStart() {
    if (!productId || !title) {
      setError('Product ID va nomi kerak');
      return;
    }
    setLoading(true);
    setError('');
    setJob(null);
    try {
      const res = await sourcingApi.createJob({
        product_id: parseInt(productId),
        product_title: title,
      });
      setJobId(res.data.job_id);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // Poll for job completion
  useEffect(() => {
    if (!jobId) return;
    let active = true;

    async function poll() {
      while (active) {
        try {
          const res = await sourcingApi.getJob(jobId!);
          if (!active) return;
          setJob(res.data);
          if (res.data.status === 'DONE' || res.data.status === 'FAILED') return;
        } catch { /* ignore */ }
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    poll();
    return () => { active = false; };
  }, [jobId]);

  const filteredResults = job?.results?.filter((r) =>
    platformFilter === 'all' || r.platform === platformFilter
  ) ?? [];

  const platforms = [...new Set(job?.results?.map((r) => r.platform) ?? [])];

  return (
    <div className="space-y-4">
      {/* Search form */}
      <div className="card bg-base-200/60 border border-base-300/50 rounded-2xl">
        <div className="card-body">
          <h2 className="card-title text-lg">🌍 Import Tahlil — AI orqali global narx qidirish</h2>
          <p className="text-sm text-base-content/60">
            Mahsulot nomini kiriting — AI qidiruv so'rovini optimallashtiradi, 1688, Taobao, Banggood, Shopee dan narxlarni topadi va eng yaxshi variantni tavsiya qiladi
          </p>
          <div className="flex gap-2 mt-3 flex-wrap">
            <input
              type="number"
              placeholder="Product ID"
              className="input input-bordered input-sm w-32"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            />
            <input
              type="text"
              placeholder="Mahsulot nomi (masalan: Samsung Galaxy Buds2)"
              className="input input-bordered input-sm flex-1 min-w-48"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <button
              onClick={handleStart}
              className="btn btn-primary btn-sm"
              disabled={loading || (!!jobId && job?.status !== 'DONE' && job?.status !== 'FAILED')}
            >
              {loading ? <span className="loading loading-spinner loading-xs" /> : '🚀 Qidirish'}
            </button>
          </div>
          {error && <p className="text-error text-sm mt-2">{error}</p>}
        </div>
      </div>

      {/* Job Status */}
      {jobId && job && (
        <>
          <div className="flex items-center gap-3 text-sm">
            <StatusBadge status={job.status} />
            <span className="text-base-content/50">
              Topildi: {job.results.length} ta natija
              {job.results.filter((r) => (r.ai_match_score ?? 0) >= 0.5).length > 0 &&
                ` (${job.results.filter((r) => (r.ai_match_score ?? 0) >= 0.5).length} ta mos)`
              }
            </span>
            {job.status === 'RUNNING' && <span className="loading loading-spinner loading-xs" />}
          </div>

          {/* Platform filter */}
          {platforms.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setPlatformFilter('all')}
                className={`btn btn-xs ${platformFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              >
                Hammasi ({job.results.length})
              </button>
              {platforms.map((p) => {
                const count = job.results.filter((r) => r.platform === p).length;
                const plat = job.results.find((r) => r.platform === p);
                const flag = COUNTRY_FLAGS[plat?.country ?? ''] ?? '';
                return (
                  <button
                    key={p}
                    onClick={() => setPlatformFilter(p)}
                    className={`btn btn-xs ${platformFilter === p ? 'btn-primary' : 'btn-ghost'}`}
                  >
                    {flag} {plat?.platform_name ?? p} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Results */}
          {filteredResults.length > 0 && (
            <div className="space-y-3">
              {filteredResults.map((r) => (
                <SourcingResultCard key={r.id} result={r} />
              ))}
            </div>
          )}

          {job.status === 'DONE' && filteredResults.length === 0 && (
            <div className="text-center py-12 text-base-content/40">
              <p className="text-4xl mb-2">🔍</p>
              <p>Hech narsa topilmadi</p>
            </div>
          )}
        </>
      )}

      {!jobId && (
        <div className="text-center py-16 text-base-content/30">
          <p className="text-5xl mb-3">🌍</p>
          <p>Mahsulot kiritib "Qidirish" tugmasini bosing</p>
          <p className="text-xs mt-2">AI optimallashtirilgan qidiruv + narx taqqoslash + ROI hisoblash</p>
        </div>
      )}
    </div>
  );
}
