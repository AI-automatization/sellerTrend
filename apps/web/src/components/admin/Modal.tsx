// ─── Modal ───────────────────────────────────────────────────────────────────

import React from 'react';

export interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}

export function Modal({ title, onClose, children, wide }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className={`relative bg-base-200 rounded-2xl p-6 w-full ${wide ? 'max-w-lg' : 'max-w-md'} shadow-2xl border border-base-300/50 max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-square">X</button>
        </div>
        {children}
      </div>
    </div>
  );
}
