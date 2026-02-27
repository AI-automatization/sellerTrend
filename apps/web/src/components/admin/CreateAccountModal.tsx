// ─── CreateAccountModal ──────────────────────────────────────────────────────

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { adminApi } from '../../api/client';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { type Role, ROLES, ROLE_META } from './types';
import { Modal } from './Modal';

export interface CreateAccountModalProps {
  onClose: () => void;
  onDone: () => void;
}

export function CreateAccountModal({ onClose, onDone }: CreateAccountModalProps) {
  const [form, setForm] = useState({ company_name: '', email: '', password: '', role: 'USER' as Role });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try { await adminApi.createAccount(form); toast.success('Yangi account yaratildi'); onDone(); onClose(); }
    catch (err: unknown) { const msg = getErrorMessage(err, 'Account yaratib bo\'lmadi'); setError(msg); toast.error(msg); }
    finally { setLoading(false); }
  }

  return (
    <Modal title="Yangi Account" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input className="input input-bordered w-full" required value={form.company_name} onChange={(e) => set('company_name', e.target.value)} placeholder="Kompaniya nomi" />
        <input className="input input-bordered w-full" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Email" />
        <input className="input input-bordered w-full" type="password" required minLength={6} value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Parol" />
        <select className="select select-bordered w-full" value={form.role} onChange={(e) => set('role', e.target.value)}>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
        </select>
        {error && <p className="text-error text-sm">{error}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Bekor</button>
          <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
            {loading && <span className="loading loading-spinner loading-xs" />} Yaratish
          </button>
        </div>
      </form>
    </Modal>
  );
}
