export function SkeletonCard() {
  return (
    <div className="card bg-base-200/50 border border-base-300/30">
      <div className="card-body gap-3">
        <div className="skeleton h-4 w-2/3" />
        <div className="space-y-2">
          <div className="skeleton h-3 w-full" />
          <div className="skeleton h-3 w-5/6" />
          <div className="skeleton h-3 w-3/4" />
        </div>
      </div>
    </div>
  );
}
