const SKELETON_COUNT = 8;

export function SearchSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <div key={i} className="card bg-base-200/60 border border-base-300/50">
          <div className="card-body p-4 gap-3">
            <div className="skeleton h-40 w-full rounded-lg" />
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
            <div className="flex justify-between">
              <div className="skeleton h-5 w-20" />
              <div className="skeleton h-8 w-24 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
