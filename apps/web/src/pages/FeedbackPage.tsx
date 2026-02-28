import { useState, useEffect, useRef } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { feedbackApi } from '../api/client';
import type { Ticket, TicketMessage } from '../api/types';
import { logError, toastError } from '../utils/handleError';

export function FeedbackPage() {
  const { t } = useI18n();

  const TYPE_OPTIONS = [
    { value: 'BUG', label: t('feedback.type.bug'), color: 'badge-error' },
    { value: 'FEATURE', label: t('feedback.type.feature'), color: 'badge-info' },
    { value: 'QUESTION', label: t('feedback.type.question'), color: 'badge-warning' },
    { value: 'OTHER', label: t('feedback.type.other'), color: 'badge-ghost' },
  ];

  const PRIORITY_OPTIONS = [
    { value: 'LOW', label: t('feedback.priority.low'), color: 'badge-ghost' },
    { value: 'MEDIUM', label: t('feedback.priority.medium'), color: 'badge-warning' },
    { value: 'HIGH', label: t('feedback.priority.high'), color: 'badge-error' },
  ];

  const STATUS_MAP: Record<string, { label: string; color: string }> = {
    OPEN: { label: t('feedback.status.open'), color: 'badge-info' },
    IN_PROGRESS: { label: t('feedback.status.inProgress'), color: 'badge-warning' },
    RESOLVED: { label: t('feedback.status.resolved'), color: 'badge-success' },
    CLOSED: { label: t('feedback.status.closed'), color: 'badge-ghost' },
  };

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [ticketDetail, setTicketDetail] = useState<Ticket | null>(null);
  const [msgLoading, setMsgLoading] = useState(false);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Form state
  const [subject, setSubject] = useState('');
  const [type, setType] = useState('QUESTION');
  const [priority, setPriority] = useState('MEDIUM');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadTickets() {
    setLoading(true);
    try {
      const r = await feedbackApi.getMyTickets();
      setTickets(r.data || []);
    } catch (e) { logError(e); }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      await feedbackApi.create({ subject, type, priority, content });
      setShowForm(false);
      setSubject('');
      setContent('');
      setType('QUESTION');
      setPriority('MEDIUM');
      loadTickets();
    } catch (e) { toastError(e); }
    setSubmitting(false);
  }

  async function openTicket(ticketId: string) {
    setSelectedTicket(ticketId);
    setMsgLoading(true);
    try {
      const r = await feedbackApi.getTicket(ticketId);
      setTicketDetail(r.data);
      setMessages(r.data.messages || []);
    } catch (e) { logError(e); }
    setMsgLoading(false);
  }

  async function sendMessage() {
    if (!newMsg.trim() || !selectedTicket) return;
    setSending(true);
    try {
      await feedbackApi.sendMessage(selectedTicket, newMsg);
      setNewMsg('');
      // Reload messages
      const r = await feedbackApi.getTicket(selectedTicket);
      setMessages(r.data.messages || []);
    } catch (e) { toastError(e); }
    setSending(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('feedback.title')}</h1>
          <p className="text-sm text-base-content/60 mt-1">{t('feedback.subtitle')}</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? t('common.cancel') : t('feedback.newTicketBtn')}
        </button>
      </div>

      {/* New Ticket Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card bg-base-200 shadow">
          <div className="card-body gap-3">
            <h3 className="card-title text-base">{t('feedback.form.title')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs">{t('feedback.form.subject')}</span></label>
                <input
                  type="text"
                  className="input input-bordered input-sm"
                  placeholder={t('feedback.form.subject') + '...'}

                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs">{t('feedback.form.type')}</span></label>
                <select className="select select-bordered select-sm" value={type} onChange={(e) => setType(e.target.value)}>
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs">{t('feedback.form.priority')}</span></label>
                <select className="select select-bordered select-sm" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-control">
              <label className="label py-1"><span className="label-text text-xs">{t('feedback.form.message')}</span></label>
              <textarea
                className="textarea textarea-bordered text-sm"
                rows={4}
                placeholder={t('feedback.form.message') + '...'}

                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>
            <div className="card-actions justify-end">
              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                {submitting ? <span className="loading loading-spinner loading-xs" /> : t('feedback.form.submitBtn')}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Ticket List */}
        <div className="lg:col-span-1 space-y-2">
          <h3 className="font-semibold text-sm text-base-content/60">{t('feedback.myTickets').replace('{n}', String(tickets.length))}</h3>
          {loading ? (
            <div className="flex justify-center py-8"><span className="loading loading-spinner" /></div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8 text-base-content/40 text-sm">{t('feedback.empty')}</div>
          ) : (
            tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => openTicket(ticket.id)}
                className={`card bg-base-200 cursor-pointer hover:bg-base-300 transition-colors ${
                  selectedTicket === ticket.id ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div className="card-body p-3 gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium line-clamp-1">{ticket.subject}</h4>
                    <span className={`badge badge-xs ${STATUS_MAP[ticket.status]?.color || 'badge-ghost'}`}>
                      {STATUS_MAP[ticket.status]?.label || ticket.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-base-content/50">
                    <span className={`badge badge-xs ${TYPE_OPTIONS.find((o) => o.value === ticket.type)?.color || ''}`}>
                      {TYPE_OPTIONS.find((o) => o.value === ticket.type)?.label || ticket.type}
                    </span>
                    <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                    {ticket.message_count != null && <span>{t('feedback.messageCount').replace('{n}', String(ticket.message_count))}</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2">
          {!selectedTicket ? (
            <div className="card bg-base-200 h-96 flex items-center justify-center">
              <p className="text-base-content/40 text-sm">{t('feedback.selectTicket')}</p>
            </div>
          ) : msgLoading ? (
            <div className="card bg-base-200 h-96 flex items-center justify-center">
              <span className="loading loading-spinner" />
            </div>
          ) : (
            <div className="card bg-base-200 flex flex-col h-[500px]">
              {/* Ticket header */}
              <div className="p-3 border-b border-base-300 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{ticketDetail?.subject}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className={`badge badge-xs ${STATUS_MAP[ticketDetail?.status as string]?.color || ''}`}>
                      {STATUS_MAP[ticketDetail?.status as string]?.label || ticketDetail?.status}
                    </span>
                    <span className={`badge badge-xs ${PRIORITY_OPTIONS.find((o) => o.value === ticketDetail?.priority)?.color || ''}`}>
                      {PRIORITY_OPTIONS.find((o) => o.value === ticketDetail?.priority)?.label || ticketDetail?.priority}
                    </span>
                  </div>
                </div>
                <button className="btn btn-ghost btn-xs" onClick={() => { setSelectedTicket(null); setMessages([]); }}>
                  {t('common.close')}
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className={`chat ${m.is_admin ? 'chat-start' : 'chat-end'}`}>
                    <div className="chat-header text-xs text-base-content/50">
                      {m.is_admin ? t('feedback.senderAdmin') : t('feedback.senderYou')}
                      <time className="ml-2">{new Date(m.created_at).toLocaleString()}</time>
                    </div>
                    <div className={`chat-bubble text-sm ${m.is_admin ? 'chat-bubble-primary' : 'chat-bubble-accent'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              {ticketDetail?.status !== 'CLOSED' && (
                <div className="p-3 border-t border-base-300 flex gap-2">
                  <input
                    type="text"
                    className="input input-bordered input-sm flex-1"
                    placeholder={t('feedback.messagePlaceholder')}
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <button className="btn btn-primary btn-sm" onClick={sendMessage} disabled={sending}>
                    {sending ? <span className="loading loading-spinner loading-xs" /> : t('feedback.form.submitBtn')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
