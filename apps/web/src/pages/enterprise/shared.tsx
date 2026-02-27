import type { ReactNode } from 'react';

export function SectionCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6">
      {children}
    </div>
  );
}

export function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg lg:text-xl font-bold">{title}</h2>
      <p className="text-base-content/50 text-sm mt-0.5">{desc}</p>
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex justify-center py-12">
      <span className="loading loading-dots loading-lg text-primary" />
    </div>
  );
}

export function EmptyState({ text, icon }: { text: string; icon?: string }) {
  return (
    <div className="text-center py-12 text-base-content/30">
      <p className="text-4xl mb-2">{icon ?? '📭'}</p>
      <p className="text-sm">{text}</p>
    </div>
  );
}
