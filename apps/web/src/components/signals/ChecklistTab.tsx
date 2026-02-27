import { useState, useEffect } from 'react';
import { signalsApi } from '../../api/client';
import { logError, toastError } from '../../utils/handleError';
import { SectionCard } from './SectionCard';
import { LoadingSpinner } from './LoadingSpinner';
import type { ChecklistData } from './types';

export function ChecklistTab() {
  const [checklist, setChecklist] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    signalsApi.getChecklist()
      .then((r) => setChecklist(r.data))
      .catch(logError)
      .finally(() => setLoading(false));
  }, []);

  function toggleItem(key: string) {
    if (!checklist) return;
    const updated = {
      ...checklist,
      items: checklist.items.map((item) =>
        item.key === key ? { ...item, done: !item.done } : item,
      ),
    };
    setChecklist(updated);
  }

  function saveChecklist() {
    if (!checklist) return;
    setSaving(true);
    signalsApi.saveChecklist({
      title: checklist.title,
      items: checklist.items,
    }).then((r) => setChecklist({ ...checklist, id: r.data.id }))
      .catch((e) => toastError(e))
      .finally(() => setSaving(false));
  }

  if (loading) return <SectionCard><LoadingSpinner /></SectionCard>;
  if (!checklist) return null;

  const done = checklist.items.filter((i) => i.done).length;
  const total = checklist.items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <SectionCard>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg lg:text-xl font-bold">{checklist.title}</h2>
          <p className="text-base-content/50 text-sm">{done}/{total} bajarildi ({pct}%)</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={saveChecklist} disabled={saving}>
          {saving ? <span className="loading loading-spinner loading-xs" /> : 'Saqlash'}
        </button>
      </div>
      <progress className="progress progress-primary w-full h-2 mb-5" value={pct} max="100" />
      <div className="space-y-2">
        {checklist.items.map((item) => (
          <label key={item.key} className="flex items-center gap-3 p-3 rounded-xl bg-base-300/40 border border-base-300/30 cursor-pointer hover:bg-base-300/60 transition-colors">
            <input
              type="checkbox"
              className="checkbox checkbox-primary checkbox-sm"
              checked={item.done}
              onChange={() => toggleItem(item.key)}
            />
            <span className={`text-sm ${item.done ? 'line-through text-base-content/30' : ''}`}>
              {item.label}
            </span>
          </label>
        ))}
      </div>
    </SectionCard>
  );
}
