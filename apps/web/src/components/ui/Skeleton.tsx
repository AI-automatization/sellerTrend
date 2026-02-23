// Reusable skeleton loading components (DaisyUI v5 `skeleton` class)

export function SkeletonStat() {
  return (
    <div className="stat bg-base-200 rounded-2xl">
      <div className="stat-figure">
        <div className="skeleton w-8 h-8 rounded-full" />
      </div>
      <div className="skeleton w-16 h-3 rounded mb-2" />
      <div className="skeleton w-20 h-6 rounded mb-1" />
      <div className="skeleton w-24 h-3 rounded" />
    </div>
  );
}

export function SkeletonCard({ lines = 3, height = 'h-3' }: { lines?: number; height?: string }) {
  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body gap-3">
        <div className="skeleton w-32 h-4 rounded" />
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`skeleton ${height} rounded`}
            style={{ width: `${85 - i * 10}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  const colWidths = ['40%', '10%', '10%', '15%', '12%'];

  return (
    <div className="overflow-x-auto">
      <table className="table table-sm">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}>
                <div className="skeleton h-3 rounded" style={{ width: colWidths[i] ?? '15%' }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              {Array.from({ length: cols }).map((_, j) => (
                <td key={j}>
                  <div
                    className="skeleton h-3 rounded"
                    style={{ width: j === 0 ? '70%' : `${50 + Math.random() * 30}%` }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
