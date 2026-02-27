// ─── DepositModal ────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { adminApi } from '../../api/client';
import { getErrorMessage } from '../../utils/getErrorMessage';
import type { Account } from './types';
import { Modal } from './Modal';

export interface DepositModalProps {
  account: Account;
  onClose: () => void;
  onDone: () => void;
}

export function DepositModal({ account, onClose, onDone }: DepositModalProps) {
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseInt(amount.replace(/\s/g, ''));
    if (!num || num <= 0) { setError("Miqdor noto'g'ri"); return; }
    setLoading(true); setError('');
    try { await adminApi.deposit(account.id, num, desc || undefined); toast.success(`${num.toLocaleString()} so'm balansga qo'shildi`); onDone(); onClose(); }
    catch (err: unknown) { const msg = getErrorMessage(err, 'Deposit amalga oshmadi'); setError(msg); toast.error(msg); }
    finally { setLoading(false); }
  }

  return (
    <Modal title={`Balans to'ldirish — ${account.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input className="input input-bordered w-full" placeholder="Miqdor (so'm)" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <input className="input input-bordered w-full" placeholder="Izoh (ixtiyoriy)" value={desc} onChange={(e) => setDesc(e.target.value)} />
        {error && <p className="text-error text-sm">{error}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Bekor</button>
          <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
            {loading && <span className="loading loading-spinner loading-xs" />} Qo'shish
          </button>
        </div>
      </form>
    </Modal>
  );
}
