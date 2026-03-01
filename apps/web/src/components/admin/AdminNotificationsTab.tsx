import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminApi } from '../../api/client';
import { getErrorMessage } from '../../utils/getErrorMessage';
import type { Account, NotificationTemplate } from './adminTypes';

interface Props {
  accounts: Account[];
}

export function AdminNotificationsTab({ accounts }: Props) {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [notifMsg, setNotifMsg] = useState('');
  const [notifType, setNotifType] = useState('info');
  const [notifSending, setNotifSending] = useState(false);
  const [notifTarget, setNotifTarget] = useState<'all' | 'selected'>('all');
  const [notifSelectedAccounts, setNotifSelectedAccounts] = useState<string[]>([]);
  const [newTmplName, setNewTmplName] = useState('');
  const [newTmplMsg, setNewTmplMsg] = useState('');
  const [newTmplType, setNewTmplType] = useState('info');

  useEffect(() => {
    adminApi.listNotificationTemplates().then((r) => setTemplates(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  async function sendNotification() {
    if (!notifMsg.trim()) return;
    if (notifTarget === 'selected' && notifSelectedAccounts.length === 0) {
      toast.error('Kamida bitta account tanlang'); return;
    }
    setNotifSending(true);
    try {
      const target = notifTarget === 'all' ? 'all' as const : notifSelectedAccounts;
      await adminApi.sendNotificationAdvanced({ message: notifMsg, type: notifType, target });
      setNotifMsg(''); setNotifSelectedAccounts([]);
      toast.success('Xabar yuborildi');
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Xabar yuborib bo\'lmadi')); }
    finally { setNotifSending(false); }
  }

  async function createTemplate() {
    if (!newTmplName.trim() || !newTmplMsg.trim()) return;
    try {
      const r = await adminApi.createNotificationTemplate({ name: newTmplName, message: newTmplMsg, type: newTmplType });
      setTemplates((prev) => [r.data, ...prev]);
      setNewTmplName(''); setNewTmplMsg(''); setNewTmplType('info');
      toast.success('Shablon yaratildi');
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Shablon yaratib bo\'lmadi')); }
  }

  async function deleteTemplate(id: string) {
    try {
      await adminApi.deleteNotificationTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success('Shablon o\'chirildi');
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Shablonni o\'chirib bo\'lmadi')); }
  }

  return (
    <div className="space-y-4">
      <div className="card bg-base-200">
        <div className="card-body p-4">
          <h3 className="font-semibold text-sm">Xabar yuborish</h3>
          <div className="space-y-3 mt-2">
            <textarea className="textarea textarea-bordered w-full text-sm" rows={3} placeholder="Xabar matni..."
              value={notifMsg} onChange={(e) => setNotifMsg(e.target.value)} />
            <div className="flex flex-col md:flex-row gap-3">
              <select className="select select-bordered select-sm w-32" value={notifType} onChange={(e) => setNotifType(e.target.value)}>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="success">Success</option>
              </select>
              <select className="select select-bordered select-sm w-40" value={notifTarget} onChange={(e) => setNotifTarget(e.target.value as 'all' | 'selected')}>
                <option value="all">Barchaga</option>
                <option value="selected">Tanlangan accountlar</option>
              </select>
              <button className="btn btn-primary btn-sm" onClick={sendNotification} disabled={notifSending}>
                {notifSending ? <span className="loading loading-spinner loading-xs" /> : 'Yuborish'}
              </button>
            </div>

            {notifTarget === 'selected' && (
              <div className="bg-base-300/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                <p className="text-xs text-base-content/50 mb-2">Accountlarni tanlang:</p>
                <div className="space-y-1">
                  {accounts.map((a) => (
                    <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" className="checkbox checkbox-xs checkbox-primary"
                        checked={notifSelectedAccounts.includes(a.id)}
                        onChange={(e) => {
                          if (e.target.checked) setNotifSelectedAccounts((p) => [...p, a.id]);
                          else setNotifSelectedAccounts((p) => p.filter((x) => x !== a.id));
                        }} />
                      <span>{a.name}</span>
                      {a.phone && <span className="text-xs text-base-content/40 font-mono">{a.phone}</span>}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card bg-base-200">
        <div className="card-body p-4">
          <h3 className="font-semibold text-sm">Xabar shablonlari</h3>
          <div className="flex flex-col md:flex-row gap-2 mt-2">
            <input className="input input-bordered input-sm flex-1" placeholder="Shablon nomi"
              value={newTmplName} onChange={(e) => setNewTmplName(e.target.value)} />
            <input className="input input-bordered input-sm flex-[2]" placeholder="Xabar matni"
              value={newTmplMsg} onChange={(e) => setNewTmplMsg(e.target.value)} />
            <select className="select select-bordered select-sm w-24" value={newTmplType} onChange={(e) => setNewTmplType(e.target.value)}>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="success">Success</option>
            </select>
            <button className="btn btn-sm btn-primary" onClick={createTemplate}>+ Shablon</button>
          </div>

          {templates.length > 0 ? (
            <div className="space-y-2 mt-3">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center gap-2 bg-base-300/50 rounded-lg px-3 py-2">
                  <span className={`badge badge-xs ${t.type === 'error' ? 'badge-error' : t.type === 'warning' ? 'badge-warning' : t.type === 'success' ? 'badge-success' : 'badge-info'}`}>{t.type}</span>
                  <span className="font-semibold text-sm">{t.name}</span>
                  <span className="text-xs text-base-content/50 flex-1 truncate">{t.message}</span>
                  <button className="btn btn-ghost btn-xs text-primary" onClick={() => { setNotifMsg(t.message); setNotifType(t.type); }}>
                    Ishlat
                  </button>
                  <button className="btn btn-ghost btn-xs text-error" onClick={() => deleteTemplate(t.id)}>X</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-base-content/40 mt-2">Shablonlar yo'q</p>
          )}
        </div>
      </div>
    </div>
  );
}
