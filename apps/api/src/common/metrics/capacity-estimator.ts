import { MetricsSnapshot } from './metrics.service';

export interface CapacityEstimate {
  estimated_max_concurrent_users: number;
  memory_headroom_mb: number;
  bottleneck: string;
  recommendations: string[];
  details: {
    max_by_memory: number;
    max_by_db: number;
    max_by_event_loop: number;
    max_by_cpu: number;
    memory_per_user_mb: number;
    heap_used_pct: number;
  };
}

/**
 * Estimate the maximum number of concurrent users the system can support
 * based on the current metrics snapshot.
 */
export function estimateCapacity(
  snapshot: MetricsSnapshot,
  activeSessions: number,
  maxHeapMb: number,
  dbPoolSize = 50,
): CapacityEstimate {
  const recommendations: string[] = [];

  // Memory-based estimate
  const heapAvailable = maxHeapMb - snapshot.heap_used_mb;
  const effectiveSessions = Math.max(activeSessions, 1);
  const memoryPerUser = snapshot.heap_used_mb / effectiveSessions;
  const maxByMemory =
    memoryPerUser > 0
      ? Math.floor(heapAvailable / memoryPerUser) + effectiveSessions
      : 999;

  // DB pool-based estimate (assume avg query holds connection for ~50ms)
  const maxByDb = dbPoolSize * 20; // 20 req/s per pool slot at 50ms avg

  // Event loop-based estimate
  let maxByEventLoop = 999;
  if (snapshot.event_loop_lag_ms > 200) {
    maxByEventLoop = Math.max(1, effectiveSessions - 10);
    recommendations.push(
      'Event loop lag is high — consider optimizing CPU-intensive operations or offloading to worker',
    );
  } else if (snapshot.event_loop_lag_ms > 100) {
    maxByEventLoop = effectiveSessions + 50;
    recommendations.push(
      'Event loop lag is moderate — monitor closely under load',
    );
  }

  // CPU-based estimate
  let maxByCpu = 999;
  if (snapshot.cpu_pct > 200) {
    maxByCpu = Math.max(1, Math.floor(effectiveSessions * (100 / snapshot.cpu_pct)));
    recommendations.push(
      `CPU at ${snapshot.cpu_pct.toFixed(0)}% — critical, scale up or reduce load`,
    );
  } else if (snapshot.cpu_pct > 150) {
    maxByCpu = Math.floor(effectiveSessions * (150 / snapshot.cpu_pct));
    recommendations.push(
      `CPU at ${snapshot.cpu_pct.toFixed(0)}% — high, consider scaling`,
    );
  }

  const estimatedMax = Math.min(maxByMemory, maxByDb, maxByEventLoop, maxByCpu);

  // Determine bottleneck
  let bottleneck = 'none';
  if (estimatedMax === maxByMemory) {
    bottleneck = 'memory';
    if (heapAvailable < 100) {
      recommendations.push(
        `Only ${Math.round(heapAvailable)}MB heap remaining — consider increasing container memory`,
      );
    }
  } else if (estimatedMax === maxByDb) {
    bottleneck = 'database_pool';
    recommendations.push(
      'Database connection pool is the limiting factor — consider PgBouncer or increasing pool size',
    );
  } else if (estimatedMax === maxByCpu) {
    bottleneck = 'cpu';
  } else if (estimatedMax === maxByEventLoop) {
    bottleneck = 'event_loop';
  }

  const heapUsedPct = (snapshot.heap_used_mb / maxHeapMb) * 100;
  if (heapUsedPct > 70) {
    recommendations.push(
      `Heap usage at ${heapUsedPct.toFixed(1)}% — approaching danger zone`,
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('System is healthy — no immediate concerns');
  }

  return {
    estimated_max_concurrent_users: Math.max(1, estimatedMax),
    memory_headroom_mb: Math.round(heapAvailable * 100) / 100,
    bottleneck,
    recommendations,
    details: {
      max_by_memory: Math.max(1, maxByMemory),
      max_by_db: maxByDb,
      max_by_event_loop: maxByEventLoop,
      max_by_cpu: maxByCpu,
      memory_per_user_mb: Math.round(memoryPerUser * 100) / 100,
      heap_used_pct: Math.round(heapUsedPct * 100) / 100,
    },
  };
}
