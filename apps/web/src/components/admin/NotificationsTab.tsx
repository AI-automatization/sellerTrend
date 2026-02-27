// ─── NotificationsTab ────────────────────────────────────────────────────────

import type { Account } from './types';

export interface NotificationsTabProps {
  accounts: Account[];
  notifMsg: string;
  notifType: string;
  notifSending: boolean;
  notifTarget: 'all' | 'selected';
  notifSelectedAccounts: string[];
  templates: Record<string, unknown>[];
  newTmplName: string;
  newTmplMsg: string;
  newTmplType: string;
  onNotifMsgChange: (val: string) => void;
  onNotifTypeChange: (val: string) => void;
  onNotifTargetChange: (val: 'all' | 'selected') => void;
  onNotifSelectedAccountsChange: (val: string[]) => void;
  onSendNotification: () => void;
  onNewTmplNameChange: (val: string) => void;
  onNewTmplMsgChange: (val: string) => void;
  onNewTmplTypeChange: (val: string) => void;
  onCreateTemplate: () => void;
  onDeleteTemplate: (id: string) => void;
  onUseTemplate: (message: string, type: string) => void;
}

export function NotificationsTab({
  accounts,
  notifMsg, notifType, notifSending, notifTarget, notifSelectedAccounts,
  templates, newTmplName, newTmplMsg, newTmplType,
  onNotifMsgChange, onNotifTypeChange, onNotifTargetChange, onNotifSelectedAccountsChange,
  onSendNotification,
  onNewTmplNameChange, onNewTmplMsgChange, onNewTmplTypeChange,
  onCreateTemplate, onDeleteTemplate, onUseTemplate,
}: NotificationsTabProps) {
  return (
    <div className="space-y-4">
      {/* Xabar yuborish */}
      <div className="card bg-base-200">
        <div className="card-body p-4">
          <h3 className="font-semibold text-sm">Xabar yuborish</h3>
          <div className="space-y-3 mt-2">
            <textarea className="textarea textarea-bordered w-full text-sm" rows={3} placeholder="Xabar matni..."
              value={notifMsg} onChange={(e) => onNotifMsgChange(e.target.value)} />
            <div className="flex flex-col md:flex-row gap-3">
              <select className="select select-bordered select-sm w-32" value={notifType} onChange={(e) => onNotifTypeChange(e.target.value)}>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="success">Success</option>
              </select>
              <select className="select select-bordered select-sm w-40" value={notifTarget} onChange={(e) => onNotifTargetChange(e.target.value as 'all' | 'selected')}>
                <option value="all">Barchaga</option>
                <option value="selected">Tanlangan accountlar</option>
              </select>
              <button className="btn btn-primary btn-sm" onClick={onSendNotification} disabled={notifSending}>
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
                          if (e.target.checked) onNotifSelectedAccountsChange([...notifSelectedAccounts, a.id]);
                          else onNotifSelectedAccountsChange(notifSelectedAccounts.filter((x) => x !== a.id));
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

      {/* Shablonlar */}
      <div className="card bg-base-200">
        <div className="card-body p-4">
          <h3 className="font-semibold text-sm">Xabar shablonlari</h3>

          {/* Yangi shablon yaratish */}
          <div className="flex flex-col md:flex-row gap-2 mt-2">
            <input className="input input-bordered input-sm flex-1" placeholder="Shablon nomi"
              value={newTmplName} onChange={(e) => onNewTmplNameChange(e.target.value)} />
            <input className="input input-bordered input-sm flex-[2]" placeholder="Xabar matni"
              value={newTmplMsg} onChange={(e) => onNewTmplMsgChange(e.target.value)} />
            <select className="select select-bordered select-sm w-24" value={newTmplType} onChange={(e) => onNewTmplTypeChange(e.target.value)}>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="success">Success</option>
            </select>
            <button className="btn btn-sm btn-primary" onClick={onCreateTemplate}>+ Shablon</button>
          </div>

          {/* Shablonlar ro'yxati */}
          {templates.length > 0 ? (
            <div className="space-y-2 mt-3">
              {templates.map((t) => (
                <div key={t.id as string} className="flex items-center gap-2 bg-base-300/50 rounded-lg px-3 py-2">
                  <span className={`badge badge-xs ${t.type === 'error' ? 'badge-error' : t.type === 'warning' ? 'badge-warning' : t.type === 'success' ? 'badge-success' : 'badge-info'}`}>{t.type as string}</span>
                  <span className="font-semibold text-sm">{t.name as string}</span>
                  <span className="text-xs text-base-content/50 flex-1 truncate">{t.message as string}</span>
                  <button className="btn btn-ghost btn-xs text-primary" onClick={() => onUseTemplate(t.message as string, t.type as string)}>
                    Ishlat
                  </button>
                  <button className="btn btn-ghost btn-xs text-error" onClick={() => onDeleteTemplate(t.id as string)}>
                    X
                  </button>
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
