import { useState, useEffect } from 'react';
import { communityApi } from '../../api/client';
import { SectionCard, SectionHeader, Loading, EmptyState } from './shared';
import { logError, toastError } from '../../utils/handleError';
import { useI18n } from '../../i18n/I18nContext';

interface Insight {
  id: string;
  title: string;
  content: string;
  category: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
}

export function CommunityTab() {
  const { t } = useI18n();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({ title: '', content: '', category: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([
      communityApi.listInsights(filter || undefined),
      communityApi.getCategories(),
    ])
      .then(([i, c]) => { setInsights(i.data); setCategories(c.data); })
      .catch(logError)
      .finally(() => setLoading(false));
  }, [filter]);

  function create() {
    if (!form.title || !form.content || !form.category) return;
    setCreating(true);
    communityApi.createInsight(form)
      .then((r) => { setInsights([r.data, ...insights]); setForm({ title: '', content: '', category: '' }); })
      .catch((e) => toastError(e))
      .finally(() => setCreating(false));
  }

  function vote(id: string, v: number) {
    communityApi.vote(id, v).then(() => {
      setInsights(insights.map((ins) =>
        ins.id === id
          ? { ...ins, upvotes: ins.upvotes + (v === 1 ? 1 : 0), downvotes: ins.downvotes + (v === -1 ? 1 : 0) }
          : ins,
      ));
    }).catch((e) => toastError(e));
  }

  if (loading) return <SectionCard><Loading /></SectionCard>;

  return (
    <SectionCard>
      <SectionHeader
        title={t('community.title')}
        desc={t('community.desc')}
      />

      {/* Create insight */}
      <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4 mb-6">
        <p className="text-xs text-base-content/50 mb-3">{t('community.newPostBtn')}</p>
        <div className="flex flex-wrap gap-2 mb-2">
          <input className="input input-bordered input-sm flex-1 min-w-40" placeholder={t('community.form.title')} value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="input input-bordered input-sm w-36" placeholder={t('community.form.category')} value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <button className="btn btn-primary btn-sm" onClick={create} disabled={creating}>
            {creating ? <span className="loading loading-spinner loading-xs" /> : t('community.submitBtn')}
          </button>
        </div>
        <textarea className="textarea textarea-bordered w-full textarea-sm" rows={2} placeholder={t('community.form.content')}
          value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
      </div>

      {/* Category filter */}
      <div className="flex gap-1 mb-4 flex-wrap">
        <button className={`btn btn-xs ${!filter ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('')}>{t('community.filterAll')}</button>
        {categories.map((cat) => (
          <button key={cat} className={`btn btn-xs ${filter === cat ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(cat)}>{cat}</button>
        ))}
      </div>

      {/* Insights list */}
      {insights.length === 0 ? (
        <EmptyState text={t('community.empty')} icon="💡" />
      ) : (
        <div className="space-y-3">
          {insights.map((ins) => (
            <div key={ins.id} className="rounded-xl bg-base-300/40 border border-base-300/30 p-4 hover:bg-base-300/60 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <button className="btn btn-xs btn-ghost text-success" onClick={() => vote(ins.id, 1)}>▲</button>
                  <span className="font-bold text-sm tabular-nums">{(ins.upvotes || 0) - (ins.downvotes || 0)}</span>
                  <button className="btn btn-xs btn-ghost text-error" onClick={() => vote(ins.id, -1)}>▼</button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-sm">{ins.title}</h3>
                    <span className="badge badge-xs badge-outline">{ins.category}</span>
                  </div>
                  <p className="text-sm text-base-content/60">{ins.content}</p>
                  <p className="text-xs text-base-content/30 mt-2">{new Date(ins.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
