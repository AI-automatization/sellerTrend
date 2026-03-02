import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConcurrencyTrackerInterceptor } from '../interceptors/concurrency-tracker.interceptor';
import Redis from 'ioredis';

const MAX_HEAP_MB = parseInt(process.env.MAX_HEAP_MB || '400', 10);
const RING_BUFFER_SIZE = 240; // 240 x 15s = 1 hour
const COLLECT_INTERVAL_MS = 15_000; // 15 seconds
const PERSIST_INTERVAL_MS = 5 * 60_000; // 5 minutes

const QUEUE_NAMES = [
  'discovery-queue',
  'sourcing-search',
  'import-batch',
  'billing-queue',
  'competitor-queue',
  'reanalysis-queue',
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

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Initialize Redis connection
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 0,
      connectTimeout: 3000,
      enableOfflineQueue: false,
      lazyConnect: true,
      retryStrategy: () => null,
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
    const dbPoolActive = await this.getDbPoolActive();
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

  /** Get active DB connections from pg_stat_activity */
  private async getDbPoolActive(): Promise<number> {
    try {
      const result: { count: number }[] = await this.prisma.$queryRaw`
        SELECT count(*)::int as count
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND state = 'active'
      `;
      return result[0]?.count ?? 0;
    } catch {
      return 0;
    }
  }

  /** Get queue depths from Redis */
  private async getQueueDepths(): Promise<Record<string, number>> {
    const depths: Record<string, number> = {};
    if (!this.redis) return depths;

    try {
      for (const name of QUEUE_NAMES) {
        const waiting = await this.redis.llen(`bull:${name}:wait`);
        const active = await this.redis.llen(`bull:${name}:active`);
        depths[name] = waiting + active;
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
