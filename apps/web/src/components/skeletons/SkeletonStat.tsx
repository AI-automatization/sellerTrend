export function SkeletonStat() {
  return (
    <div className="stat bg-base-200/50 border border-base-300/30 rounded-2xl animate-pulse">
      <div className="stat-title h-3 bg-base-300/40 rounded w-1/3 mb-3" />
      <div className="stat-value h-7 bg-base-300/60 rounded w-2/3 mb-2" />
      <div className="stat-desc h-2 bg-base-300/30 rounded w-1/2" />
    </div>
  );
}
