// ─── FeedbackTab ─────────────────────────────────────────────────────────────

import { StatCard } from './StatCard';
import type { FeedbackTicket, FeedbackStats } from './adminTypes';

export interface FeedbackTabProps {
  feedbackStats: FeedbackStats | null;
  feedbackTickets: FeedbackTicket[];
  onFeedbackStatus: (ticketId: string, status: string) => void;
}

export function FeedbackTab({ feedbackStats, feedbackTickets, onFeedbackStatus }: FeedbackTabProps) {
  const byStatus = feedbackStats?.by_status;

  return (
    <div className="space-y-4">
      {feedbackStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Jami" value={feedbackStats.total ?? 0} />
          <StatCard label="Ochiq" value={byStatus?.OPEN ?? 0} color="text-info" />
          <StatCard label="Jarayonda" value={byStatus?.IN_PROGRESS ?? 0} color="text-warning" />
          <StatCard label="Hal qilindi" value={byStatus?.RESOLVED ?? 0} color="text-success" />
          <StatCard label="Yopildi" value={byStatus?.CLOSED ?? 0} />
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
                    value={t.status} onChange={(e) => onFeedbackStatus(t.id, e.target.value)}>
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
