export interface SectionHeaderProps {
  title: string;
  desc: string;
}

export function SectionHeader({ title, desc }: SectionHeaderProps) {
  return (
    <div className="mb-4">
      <h2 className="text-lg lg:text-xl font-bold">{title}</h2>
      <p className="text-base-content/50 text-sm mt-0.5">{desc}</p>
    </div>
  );
}
