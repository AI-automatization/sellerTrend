export function SkeletonCard() {
  return (
    <div className="card bg-base-200/50 border border-base-300/30 animate-pulse">
      <div className="card-body gap-3">
        <div className="h-4 bg-base-300/60 rounded w-2/3" />
        <div className="space-y-2">
          <div className="h-3 bg-base-300/40 rounded" />
          <div className="h-3 bg-base-300/40 rounded w-5/6" />
          <div className="h-3 bg-base-300/40 rounded w-3/4" />
        </div>
      </div>
    </div>
  );
}
