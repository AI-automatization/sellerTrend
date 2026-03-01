import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminApi } from '../../api/client';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { StatCard } from './AdminComponents';
import type { FeedbackTicket, FeedbackStats } from './adminTypes';

export function AdminFeedbackTab() {
  const [feedbackTickets, setFeedbackTickets] = useState<FeedbackTicket[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminApi.getAdminFeedback().then((r) => {
        const items = r.data?.items ?? r.data;
        setFeedbackTickets(Array.isArray(items) ? items : []);
      }).catch(() => {}),
      adminApi.getFeedbackStats().then((r) => setFeedbackStats(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  async function handleStatusChange(ticketId: string, status: string) {
    try {
      await adminApi.updateFeedbackStatus(ticketId, status);
      setFeedbackTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status } : t));
      toast.success(`Feedback statusi ${status} ga o'zgartirildi`);
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Statusni o\'zgartirib bo\'lmadi')); }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><span className="loading loading-spinner loading-md" /></div>;
  }

  return (
    <div className="space-y-4">
      {feedbackStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Jami" value={feedbackStats.total ?? 0} />
          <StatCard label="Ochiq" value={feedbackStats.by_status?.OPEN ?? 0} color="text-info" />
          <StatCard label="Jarayonda" value={feedbackStats.by_status?.IN_PROGRESS ?? 0} color="text-warning" />
          <StatCard label="Hal qilindi" value={feedbackStats.by_status?.RESOLVED ?? 0} color="text-success" />
          <StatCard label="Yopildi" value={feedbackStats.by_status?.CLOSED ?? 0} />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead><tr><th>User</th><th>Mavzu</th><th>Tur</th><th>Ustuvorlik</th><th>Status</th><th>Sana</th><th>Amal</th></tr></thead>
          <tbody>
            {feedbackTickets.map((t) => (
              <tr key={t.id} className="hover">
                <td className="text-sm">{t.user_email || t.user?.email || '-'}</td>
                <td className="text-sm max-w-xs truncate">{t.subject}</td>
                <td><span className="badge badge-xs">{t.type}</span></td>
                <td>
                  <span className={`badge badge-xs ${t.priority === 'HIGH' ? 'badge-error' : t.priority === 'MEDIUM' ? 'badge-warning' : 'badge-ghost'}`}>
                    {t.priority}
                  </span>
                </td>
                <td>
                  <span className={`badge badge-xs ${t.status === 'OPEN' ? 'badge-info' : t.status === 'IN_PROGRESS' ? 'badge-warning' : t.status === 'RESOLVED' ? 'badge-success' : 'badge-ghost'}`}>
                    {t.status}
                  </span>
                </td>
                <td className="text-xs text-base-content/50">{new Date(t.created_at).toLocaleDateString()}</td>
                <td>
                  <select className="select select-bordered select-xs"
                    value={t.status} onChange={(e) => handleStatusChange(t.id, e.target.value)}>
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </td>
              </tr>
            ))}
            {!feedbackTickets.length && <tr><td colSpan={7} className="text-center text-base-content/40">Feedback yo'q</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
