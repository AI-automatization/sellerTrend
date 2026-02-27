export interface EmptyStateProps {
  text: string;
}

export function EmptyState({ text }: EmptyStateProps) {
  return (
    <div className="text-center py-12 text-base-content/30">
      <p className="text-4xl mb-2">{'\u{1F4ED}'}</p>
      <p className="text-sm">{text}</p>
    </div>
  );
}
