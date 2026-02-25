import { useState, useEffect } from 'react';
import { teamApi } from '../../api/client';
import { SectionCard, SectionHeader, Loading } from './shared';

interface Member {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface Invite {
  id: string;
  email: string;
  status: string;
}

export function TeamTab() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: '', role: 'USER' });
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    Promise.all([teamApi.listMembers(), teamApi.listInvites()])
      .then(([m, i]) => { setMembers(m.data); setInvites(i.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function invite() {
    if (!form.email) return;
    setInviting(true);
    teamApi.invite({ email: form.email, role: form.role })
      .then((r) => {
        setInvites([r.data, ...invites]);
        setForm({ email: '', role: 'USER' });
      })
      .catch(() => {})
      .finally(() => setInviting(false));
  }

  if (loading) return <SectionCard><Loading /></SectionCard>;

  return (
    <SectionCard>
      <SectionHeader
        title="Jamoa Boshqaruvi"
        desc="Jamoangizga a'zolar taklif qiling"
      />

      <div className="rounded-xl bg-base-300/40 border border-base-300/30 p-4 mb-6">
        <p className="text-xs text-base-content/50 mb-3">A'zo taklif qilish</p>
        <div className="flex flex-wrap gap-2">
          <input className="input input-bordered input-sm flex-1 min-w-48" placeholder="Email" type="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <select className="select select-bordered select-sm" value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="USER">User</option>
            <option value="MODERATOR">Moderator</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={invite} disabled={inviting}>
            {inviting ? <span className="loading loading-spinner loading-xs" /> : 'Taklif'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Members */}
        <div>
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            A'zolar
            <span className="badge badge-sm badge-outline">{members.length}</span>
          </h3>
          {members.length === 0 ? (
            <p className="text-sm text-base-content/30 py-4 text-center">A'zolar yo'q</p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-base-300/40 border border-base-300/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                      {m.email[0].toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-medium">{m.email}</span>
                      <div className="flex gap-1 mt-0.5">
                        <span className={`badge badge-xs ${m.is_active ? 'badge-success' : 'badge-error'}`}>{m.role}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invites */}
        <div>
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            Takliflar
            <span className="badge badge-sm badge-outline">{invites.length}</span>
          </h3>
          {invites.length === 0 ? (
            <p className="text-sm text-base-content/30 py-4 text-center">Takliflar yo'q</p>
          ) : (
            <div className="space-y-2">
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-base-300/40 border border-base-300/30">
                  <div>
                    <span className="text-sm">{inv.email}</span>
                    <span className={`badge badge-xs ml-2 ${inv.status === 'PENDING' ? 'badge-warning' : inv.status === 'ACCEPTED' ? 'badge-success' : 'badge-error'}`}>
                      {inv.status}
                    </span>
                  </div>
                  {inv.status === 'PENDING' && (
                    <button className="btn btn-xs btn-ghost text-error" onClick={() => teamApi.cancelInvite(inv.id).then(() => setInvites(invites.filter((i) => i.id !== inv.id)))}>
                      Bekor
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
