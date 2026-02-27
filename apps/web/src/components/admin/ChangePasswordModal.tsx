// ─── ChangePasswordModal ─────────────────────────────────────────────────────

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { adminApi } from '../../api/client';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { Modal } from './Modal';

export interface ChangePasswordModalProps {
  user: { id: string; email: string };
  onClose: () => void;
}

export function ChangePasswordModal({ user, onClose }: ChangePasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast.error('Parol kamida 6 ta belgidan iborat bo\'lishi kerak'); return; }
    if (password !== confirm) { toast.error('Parollar mos kelmadi'); return; }
    setLoading(true);
    try {
      await adminApi.changeUserPassword(user.id, password);
      toast.success(`${user.email} uchun parol o'zgartirildi`);
      onClose();
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Parolni o\'zgartirib bo\'lmadi')); }
    finally { setLoading(false); }
  }

  return (
    <Modal title={`Parol o'zgartirish — ${user.email}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="relative">
          <input className="input input-bordered w-full pr-12" type={show ? 'text' : 'password'}
            placeholder="Yangi parol (min 6)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <button type="button" className="btn btn-ghost btn-xs absolute right-2 top-1/2 -translate-y-1/2"
            onClick={() => setShow(!show)}>{show ? 'Yashirish' : 'Ko\'rish'}</button>
        </div>
        <input className="input input-bordered w-full" type={show ? 'text' : 'password'}
          placeholder="Parolni tasdiqlang" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        {password && confirm && password !== confirm && (
          <p className="text-error text-xs">Parollar mos kelmadi</p>
        )}
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Bekor</button>
          <button type="submit" disabled={loading || password !== confirm} className="btn btn-primary btn-sm">
            {loading && <span className="loading loading-spinner loading-xs" />} O'zgartirish
          </button>
        </div>
      </form>
    </Modal>
  );
}
