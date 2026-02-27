import React from 'react';

export interface SectionCardProps {
  children: React.ReactNode;
}

export function SectionCard({ children }: SectionCardProps) {
  return (
    <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-4 lg:p-6">
      {children}
    </div>
  );
}
