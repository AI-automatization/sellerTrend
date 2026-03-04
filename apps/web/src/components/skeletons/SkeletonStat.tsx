export function SkeletonStat() {
  return (
    <div className="stat bg-base-200/50 border border-base-300/30 rounded-2xl">
      <div className="skeleton h-3 w-1/3 mb-3" />
      <div className="skeleton h-7 w-2/3 mb-2" />
      <div className="skeleton h-2 w-1/2" />
    </div>
  );
}
