import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { feedbackApi } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';

type Ticket = {
  id: string;
  subject: string;
  type: string;
  priority: string;
  status: string;
  created_at: string;
  message_count?: number;
  last_message?: string;
};

type Message = {
  id: string;
  content: string;
  is_admin: boolean;
  sender_email?: string;
  created_at: string;
};

const TYPE_OPTIONS = [
  { value: 'BUG', label: 'Bug report', color: 'badge-error' },
  { value: 'FEATURE', label: 'Yangi funksiya', color: 'badge-info' },
  { value: 'QUESTION', label: 'Savol', color: 'badge-warning' },
  { value: 'OTHER', label: 'Boshqa', color: 'badge-ghost' },
];

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Past', color: 'badge-ghost' },
  { value: 'MEDIUM', label: "O'rta", color: 'badge-warning' },
  { value: 'HIGH', label: 'Yuqori', color: 'badge-error' },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Ochiq', color: 'badge-info' },
  IN_PROGRESS: { label: 'Jarayonda', color: 'badge-warning' },
  RESOLVED: { label: 'Hal qilindi', color: 'badge-success' },
  CLOSED: { label: 'Yopildi', color: 'badge-ghost' },
};

export function FeedbackPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
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
    } catch (err: unknown) { toast.error(getErrorMessage(err)); }
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
    } catch (err: unknown) { toast.error(getErrorMessage(err)); }
    setSubmitting(false);
  }

  async function openTicket(ticketId: string) {
    setSelectedTicket(ticketId);
    setMsgLoading(true);
    try {
      const r = await feedbackApi.getTicket(ticketId);
      setTicketDetail(r.data);
      setMessages(r.data.messages || []);
    } catch (err: unknown) { toast.error(getErrorMessage(err)); }
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
    } catch (err: unknown) { toast.error(getErrorMessage(err)); }
    setSending(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feedback & Yordam</h1>
          <p className="text-sm text-base-content/60 mt-1">Savol, taklif yoki xatolik haqida yozing</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Bekor' : '+ Yangi ticket'}
        </button>
      </div>

      {/* New Ticket Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card bg-base-200 shadow">
          <div className="card-body gap-3">
            <h3 className="card-title text-base">Yangi Ticket</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs">Mavzu</span></label>
                <input
                  type="text"
                  className="input input-bordered input-sm"
                  placeholder="Qisqa mavzu..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs">Tur</span></label>
                <select className="select select-bordered select-sm" value={type} onChange={(e) => setType(e.target.value)}>
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs">Ustuvorlik</span></label>
                <select className="select select-bordered select-sm" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-control">
              <label className="label py-1"><span className="label-text text-xs">Xabar</span></label>
              <textarea
                className="textarea textarea-bordered text-sm"
                rows={4}
                placeholder="Batafsil yozing..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>
            <div className="card-actions justify-end">
              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                {submitting ? <span className="loading loading-spinner loading-xs" /> : 'Yuborish'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Ticket List */}
        <div className="lg:col-span-1 space-y-2">
          <h3 className="font-semibold text-sm text-base-content/60">Mening ticketlarim ({tickets.length})</h3>
          {loading ? (
            <div className="flex justify-center py-8"><span className="loading loading-spinner" /></div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8 text-base-content/40 text-sm">Hali ticket yo'q</div>
          ) : (
            tickets.map((t) => (
              <div
                key={t.id}
                onClick={() => openTicket(t.id)}
                className={`card bg-base-200 cursor-pointer hover:bg-base-300 transition-colors ${
                  selectedTicket === t.id ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div className="card-body p-3 gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium line-clamp-1">{t.subject}</h4>
                    <span className={`badge badge-xs ${STATUS_MAP[t.status]?.color || 'badge-ghost'}`}>
                      {STATUS_MAP[t.status]?.label || t.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-base-content/50">
                    <span className={`badge badge-xs ${TYPE_OPTIONS.find((o) => o.value === t.type)?.color || ''}`}>
                      {TYPE_OPTIONS.find((o) => o.value === t.type)?.label || t.type}
                    </span>
                    <span>{new Date(t.created_at).toLocaleDateString()}</span>
                    {t.message_count != null && <span>{t.message_count} xabar</span>}
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
              <p className="text-base-content/40 text-sm">Ticket tanlang yoki yangi yarating</p>
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
                    <span className={`badge badge-xs ${STATUS_MAP[ticketDetail?.status]?.color || ''}`}>
                      {STATUS_MAP[ticketDetail?.status]?.label || ticketDetail?.status}
                    </span>
                    <span className={`badge badge-xs ${PRIORITY_OPTIONS.find((o) => o.value === ticketDetail?.priority)?.color || ''}`}>
                      {PRIORITY_OPTIONS.find((o) => o.value === ticketDetail?.priority)?.label || ticketDetail?.priority}
                    </span>
                  </div>
                </div>
                <button className="btn btn-ghost btn-xs" onClick={() => { setSelectedTicket(null); setMessages([]); }}>
                  X
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className={`chat ${m.is_admin ? 'chat-start' : 'chat-end'}`}>
                    <div className="chat-header text-xs text-base-content/50">
                      {m.is_admin ? 'Admin' : 'Siz'}
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
                    placeholder="Xabar yozing..."
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <button className="btn btn-primary btn-sm" onClick={sendMessage} disabled={sending}>
                    {sending ? <span className="loading loading-spinner loading-xs" /> : 'Yuborish'}
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
