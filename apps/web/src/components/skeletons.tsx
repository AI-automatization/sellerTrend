export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-2">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-base-300/50" />
        <div className="space-y-2">
          <div className="h-5 w-48 rounded-lg bg-base-300/50" />
          <div className="h-3 w-32 rounded-lg bg-base-300/30" />
        </div>
      </div>
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-base-300/30" />
        ))}
      </div>
      {/* Table skeleton */}
      <div className="space-y-3">
        <div className="h-10 rounded-lg bg-base-300/40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-base-300/20" />
        ))}
      </div>
    </div>
  );
}
