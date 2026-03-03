import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConcurrencyTrackerInterceptor } from '../interceptors/concurrency-tracker.interceptor';
import Redis from 'ioredis';

const MAX_HEAP_MB = parseInt(process.env.MAX_HEAP_MB || '2048', 10);
const RING_BUFFER_SIZE = 240; // 240 x 15s = 1 hour
const COLLECT_INTERVAL_MS = 15_000; // 15 seconds
const PERSIST_INTERVAL_MS = 5 * 60_000; // 5 minutes

const QUEUE_NAMES = [
  'discovery-queue',
  'sourcing-search',
  'import-batch',
  'billing-queue',
  'competitor-queue',
  'weekly-scrape-queue',
];

export interface MetricsSnapshot {
  heap_used_mb: number;
  heap_total_mb: number;
  rss_mb: number;
  external_mb: number;
  cpu_pct: number;
  active_requests: number;
  peak_concurrent: number;
  event_loop_lag_ms: number;
  db_pool_active: number;
  queue_depths: Record<string, number>;
  collected_at: string;
}

@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetricsService.name);
  private readonly ringBuffer: MetricsSnapshot[] = [];
  private collectInterval: ReturnType<typeof setInterval> | null = null;
  private persistInterval: ReturnType<typeof setInterval> | null = null;
  private prevCpuUsage: NodeJS.CpuUsage | null = null;
  private prevCpuTime = 0;
  private redis: Redis | null = null;
  private lastDbPoolActive = 0;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Initialize Redis connection (eager connect to avoid blocking on first call)
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 0,
      connectTimeout: 3000,
      enableOfflineQueue: false,
      lazyConnect: false,
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
    });

    // Initialize CPU tracking
    this.prevCpuUsage = process.cpuUsage();
    this.prevCpuTime = Date.now();

    // Start collection loop
    this.collectInterval = setInterval(() => {
      this.collectSnapshot().catch((err) => {
        this.logger.error('Failed to collect metrics snapshot', err);
      });
    }, COLLECT_INTERVAL_MS);

    // Start persistence loop
    this.persistInterval = setInterval(() => {
      this.persistLatest().catch((err) => {
        this.logger.error('Failed to persist metrics', err);
      });
    }, PERSIST_INTERVAL_MS);

    this.logger.log('MetricsService initialized — collecting every 15s, persisting every 5m');
  }

  onModuleDestroy() {
    if (this.collectInterval) clearInterval(this.collectInterval);
    if (this.persistInterval) clearInterval(this.persistInterval);
    this.redis?.disconnect();
  }

  /** Collect a single snapshot and push to ring buffer */
  private async collectSnapshot(): Promise<void> {
    const mem = process.memoryUsage();
    const cpuPct = this.computeCpuPercent();
    const eventLoopLag = await this.measureEventLoopLag();
    // Skip DB query in background loop — use cached value (updated on-demand)
    const dbPoolActive = this.lastDbPoolActive;
    const queueDepths = await this.getQueueDepths();

    const snapshot: MetricsSnapshot = {
      heap_used_mb: Math.round((mem.heapUsed / (1024 * 1024)) * 100) / 100,
      heap_total_mb: Math.round((mem.heapTotal / (1024 * 1024)) * 100) / 100,
      rss_mb: Math.round((mem.rss / (1024 * 1024)) * 100) / 100,
      external_mb: Math.round((mem.external / (1024 * 1024)) * 100) / 100,
      cpu_pct: cpuPct,
      active_requests: ConcurrencyTrackerInterceptor.getActiveRequests(),
      peak_concurrent: ConcurrencyTrackerInterceptor.getPeakConcurrent(),
      event_loop_lag_ms: eventLoopLag,
      db_pool_active: dbPoolActive,
      queue_depths: queueDepths,
      collected_at: new Date().toISOString(),
    };

    // Push to ring buffer
    this.ringBuffer.push(snapshot);
    if (this.ringBuffer.length > RING_BUFFER_SIZE) {
      this.ringBuffer.shift();
    }

    // Check alert thresholds
    await this.checkAlerts(snapshot);
  }

  /** Compute CPU usage percentage since last measurement */
  private computeCpuPercent(): number {
    const now = Date.now();
    const currentCpu = process.cpuUsage();

    if (!this.prevCpuUsage || now === this.prevCpuTime) {
      this.prevCpuUsage = currentCpu;
      this.prevCpuTime = now;
      return 0;
    }

    const userDelta = currentCpu.user - this.prevCpuUsage.user;
    const systemDelta = currentCpu.system - this.prevCpuUsage.system;
    const totalCpuMicros = userDelta + systemDelta;
    const elapsedMs = now - this.prevCpuTime;
    const elapsedMicros = elapsedMs * 1000;

    this.prevCpuUsage = currentCpu;
    this.prevCpuTime = now;

    if (elapsedMicros === 0) return 0;
    return Math.round((totalCpuMicros / elapsedMicros) * 100 * 100) / 100;
  }

  /** Measure event loop lag using setTimeout(0) probe */
  private measureEventLoopLag(): Promise<number> {
    const start = Date.now();
    return new Promise<number>((resolve) => {
      setTimeout(() => {
        resolve(Date.now() - start);
      }, 0);
    });
  }

  /** Get active DB connections from pg_stat_activity (on-demand, updates cache) */
  async refreshDbPoolActive(): Promise<number> {
    try {
      const result: { count: number }[] = await this.prisma.$queryRaw`
        SELECT count(*)::int as count
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND state = 'active'
      `;
      this.lastDbPoolActive = result[0]?.count ?? 0;
    } catch {
      // Keep last known value
    }
    return this.lastDbPoolActive;
  }

  /** Get queue depths from Redis using pipeline (single round-trip) */
  private async getQueueDepths(): Promise<Record<string, number>> {
    const depths: Record<string, number> = {};
    if (!this.redis || this.redis.status !== 'ready') return depths;

    try {
      const pipeline = this.redis.pipeline();
      for (const name of QUEUE_NAMES) {
        pipeline.llen(`bull:${name}:wait`);
        pipeline.llen(`bull:${name}:active`);
      }
      const results = await pipeline.exec();
      if (!results) return depths;

      for (let i = 0; i < QUEUE_NAMES.length; i++) {
        const waitResult = results[i * 2];
        const activeResult = results[i * 2 + 1];
        const waiting = (waitResult?.[1] as number) ?? 0;
        const active = (activeResult?.[1] as number) ?? 0;
        depths[QUEUE_NAMES[i]] = waiting + active;
      }
    } catch {
      // Redis unavailable — return empty
    }

    return depths;
  }

  /** Persist latest snapshot to system_metrics table */
  private async persistLatest(): Promise<void> {
    const latest = this.ringBuffer[this.ringBuffer.length - 1];
    if (!latest) return;

    try {
      await this.prisma.systemMetric.create({
        data: {
          heap_used_mb: latest.heap_used_mb,
          heap_total_mb: latest.heap_total_mb,
          rss_mb: latest.rss_mb,
          external_mb: latest.external_mb,
          cpu_pct: latest.cpu_pct,
          active_requests: latest.active_requests,
          peak_concurrent: latest.peak_concurrent,
          event_loop_lag_ms: latest.event_loop_lag_ms,
          db_pool_active: latest.db_pool_active,
          queue_depths: latest.queue_depths,
        },
      });
    } catch (err) {
      this.logger.error('Failed to persist metric to DB', err);
    }
  }

  /** Check thresholds and create alerts if needed */
  private async checkAlerts(snapshot: MetricsSnapshot): Promise<void> {
    const heapPct = (snapshot.heap_used_mb / MAX_HEAP_MB) * 100;

    if (heapPct > 85) {
      await this.createAlert(
        'critical',
        'HEAP_CRITICAL',
        `Heap usage at ${heapPct.toFixed(1)}% (${snapshot.heap_used_mb}MB / ${MAX_HEAP_MB}MB)`,
        snapshot.heap_used_mb,
        MAX_HEAP_MB * 0.85,
      );
    } else if (heapPct > 70) {
      await this.createAlert(
        'warning',
        'HEAP_WARNING',
        `Heap usage at ${heapPct.toFixed(1)}% (${snapshot.heap_used_mb}MB / ${MAX_HEAP_MB}MB)`,
        snapshot.heap_used_mb,
        MAX_HEAP_MB * 0.7,
      );
    }

    if (snapshot.event_loop_lag_ms > 200) {
      await this.createAlert(
        'warning',
        'EVENT_LOOP_LAG',
        `Event loop lag ${snapshot.event_loop_lag_ms}ms (threshold: 200ms)`,
        snapshot.event_loop_lag_ms,
        200,
      );
    }

    // T-314: CPU alerts
    if (snapshot.cpu_pct > 200) {
      await this.createAlert(
        'critical',
        'CPU_CRITICAL',
        `CPU usage at ${snapshot.cpu_pct.toFixed(1)}% (threshold: 200%)`,
        snapshot.cpu_pct,
        200,
      );
    } else if (snapshot.cpu_pct > 150) {
      await this.createAlert(
        'warning',
        'CPU_WARNING',
        `CPU usage at ${snapshot.cpu_pct.toFixed(1)}% (threshold: 150%)`,
        snapshot.cpu_pct,
        150,
      );
    }
  }

  /** Create alert (deduplicates: skip if same type+level exists within last 5 minutes) */
  private async createAlert(
    level: string,
    type: string,
    message: string,
    value: number,
    threshold: number,
  ): Promise<void> {
    try {
      const fiveMinAgo = new Date(Date.now() - 5 * 60_000);
      const recent = await this.prisma.systemAlert.findFirst({
        where: {
          type,
          level,
          created_at: { gte: fiveMinAgo },
        },
      });

      if (recent) return; // Deduplicate — don't spam alerts

      await this.prisma.systemAlert.create({
        data: { level, type, message, value, threshold },
      });
    } catch (err) {
      this.logger.error(`Failed to create alert: ${type}`, err);
    }
  }

  /** Get the latest snapshot from ring buffer */
  getLatestSnapshot(): MetricsSnapshot | null {
    return this.ringBuffer[this.ringBuffer.length - 1] ?? null;
  }

  /** Get ring buffer entries (optionally filtered by period) */
  getRingBuffer(period?: string): MetricsSnapshot[] {
    if (!period) return [...this.ringBuffer];

    const periodMs = this.parsePeriodMs(period);
    const cutoff = Date.now() - periodMs;

    return this.ringBuffer.filter(
      (s) => new Date(s.collected_at).getTime() >= cutoff,
    );
  }

  /** Get persisted history from DB */
  async getHistory(period: string): Promise<unknown[]> {
    const periodMs = this.parsePeriodMs(period);
    const since = new Date(Date.now() - periodMs);

    return this.prisma.systemMetric.findMany({
      where: { created_at: { gte: since } },
      orderBy: { created_at: 'asc' },
      take: 500,
    });
  }

  /** Get max heap setting */
  getMaxHeapMb(): number {
    return MAX_HEAP_MB;
  }

  private parsePeriodMs(period: string): number {
    switch (period) {
      case '1h':
        return 60 * 60_000;
      case '6h':
        return 6 * 60 * 60_000;
      case '24h':
        return 24 * 60 * 60_000;
      case '7d':
        return 7 * 24 * 60 * 60_000;
      default:
        return 60 * 60_000;
    }
  }
}
