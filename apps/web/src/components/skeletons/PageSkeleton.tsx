import { SkeletonCard } from './SkeletonCard';
import { SkeletonStat } from './SkeletonStat';

export function PageSkeleton() {
  return (
    <div className="space-y-6 p-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonCard />
    </div>
  );
}
