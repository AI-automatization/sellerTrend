import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService, MetricsSnapshot } from '../common/metrics/metrics.service';
import { estimateCapacity, CapacityEstimate } from '../common/metrics/capacity-estimator';
import * as childProcess from 'child_process';

@Injectable()
export class AdminMonitoringService {
  private readonly logger = new Logger(AdminMonitoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
  ) {}

  /** Get current metrics snapshot + ring buffer history */
  getMetrics(period: string): {
    latest: MetricsSnapshot | null;
    snapshots: MetricsSnapshot[];
    max_heap_mb: number;
  } {
    return {
      latest: this.metricsService.getLatestSnapshot(),
      snapshots: this.metricsService.getRingBuffer(period),
      max_heap_mb: this.metricsService.getMaxHeapMb(),
    };
  }

  /** Per-user health summary — SQL aggregation */
  async getUserHealthSummary(
    period: string,
    limit: number,
    sort: string,
  ): Promise<unknown[]> {
    const hours = this.parsePeriodHours(period);
    const since = new Date(Date.now() - hours * 60 * 60_000);

    // Per-user error counts
    const errorData: {
      user_id: string;
      error_count: number;
      top_error_endpoint: string | null;
    }[] = await this.prisma.$queryRaw`
      SELECT user_id,
             COUNT(*)::int as error_count,
             (ARRAY_AGG(endpoint ORDER BY created_at DESC))[1] as top_error_endpoint
      FROM system_errors
      WHERE created_at >= ${since} AND user_id IS NOT NULL
      GROUP BY user_id
    `;

    // Per-user activity counts (1h and full period)
    const oneHourAgo = new Date(Date.now() - 60 * 60_000);
    const activityData: {
      user_id: string;
      requests_1h: number;
      requests_period: number;
      last_active: Date;
    }[] = await this.prisma.$queryRaw`
      SELECT user_id,
        COUNT(*) FILTER (WHERE created_at >= ${oneHourAgo})::int as requests_1h,
        COUNT(*)::int as requests_period,
        MAX(created_at) as last_active
      FROM user_activities
      WHERE created_at >= ${since}
      GROUP BY user_id
    `;

    // Active sessions per user
    const sessionData: {
      user_id: string;
      active_sessions: number;
    }[] = await this.prisma.$queryRaw`
      SELECT user_id, COUNT(*)::int as active_sessions
      FROM user_sessions
      WHERE revoked_at IS NULL
      GROUP BY user_id
    `;

    // User info lookup
    const allUserIds = new Set<string>();
    for (const e of errorData) allUserIds.add(e.user_id);
    for (const a of activityData) allUserIds.add(a.user_id);
    for (const s of sessionData) allUserIds.add(s.user_id);

    const userIds = [...allUserIds];
    if (userIds.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, account: { select: { name: true } } },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));
    const errorMap = new Map(errorData.map((e) => [e.user_id, e]));
    const activityMap = new Map(activityData.map((a) => [a.user_id, a]));
    const sessionMap = new Map(sessionData.map((s) => [s.user_id, s]));

    // Merge into per-user health rows
    const healthRows = userIds.map((userId) => {
      const user = userMap.get(userId);
      const errors = errorMap.get(userId);
      const activity = activityMap.get(userId);
      const session = sessionMap.get(userId);

      const requestsPeriod = activity?.requests_period ?? 0;
      const errorCount = errors?.error_count ?? 0;
      const errorRate = requestsPeriod > 0 ? errorCount / requestsPeriod : 0;

      return {
        user_id: userId,
        email: user?.email ?? 'unknown',
        account_name: user?.account?.name ?? 'unknown',
        requests_1h: activity?.requests_1h ?? 0,
        requests_24h: requestsPeriod,
        errors_24h: errorCount,
        error_rate_pct: Math.round(errorRate * 10000) / 100,
        top_error_endpoint: errors?.top_error_endpoint ?? null,
        slow_requests_24h: 0,
        avg_response_ms: 0,
        rate_limit_hits_24h: 0,
        last_active: activity?.last_active ?? null,
        active_sessions: session?.active_sessions ?? 0,
      };
    });

    // Sort
    switch (sort) {
      case 'errors':
        healthRows.sort((a, b) => b.errors_24h - a.errors_24h);
        break;
      case 'requests':
        healthRows.sort((a, b) => b.requests_24h - a.requests_24h);
        break;
      case 'error_rate':
        healthRows.sort((a, b) => b.error_rate_pct - a.error_rate_pct);
        break;
      case 'sessions':
        healthRows.sort((a, b) => b.active_sessions - a.active_sessions);
        break;
      default:
        healthRows.sort((a, b) => b.errors_24h - a.errors_24h);
    }

    return healthRows.slice(0, limit);
  }

  /** Single user health detail */
  async getSingleUserHealth(userId: string): Promise<unknown> {
    const since24h = new Date(Date.now() - 24 * 60 * 60_000);

    const [user, errors, activities, sessions] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          is_active: true,
          account: { select: { name: true, status: true } },
        },
      }),
      this.prisma.systemError.findMany({
        where: { user_id: userId, created_at: { gte: since24h } },
        orderBy: { created_at: 'desc' },
        take: 20,
        select: {
          id: true,
          endpoint: true,
          method: true,
          status: true,
          message: true,
          created_at: true,
        },
      }),
      this.prisma.userActivity.findMany({
        where: { user_id: userId, created_at: { gte: since24h } },
        orderBy: { created_at: 'desc' },
        take: 50,
        select: {
          id: true,
          action: true,
          details: true,
          ip: true,
          created_at: true,
        },
      }),
      this.prisma.userSession.findMany({
        where: { user_id: userId, revoked_at: null },
        orderBy: { logged_in_at: 'desc' },
        take: 10,
        select: {
          id: true,
          ip: true,
          device_type: true,
          user_agent: true,
          logged_in_at: true,
          expires_at: true,
        },
      }),
    ]);

    if (!user) {
      return { error: 'User not found' };
    }

    return {
      user,
      recent_errors: errors,
      recent_activities: activities,
      active_sessions: sessions,
      summary: {
        errors_24h: errors.length,
        activities_24h: activities.length,
        session_count: sessions.length,
      },
    };
  }

  /** Get capacity estimate based on current metrics */
  async getCapacityEstimate(): Promise<CapacityEstimate | { error: string }> {
    const snapshot = this.metricsService.getLatestSnapshot();
    if (!snapshot) {
      return {
        estimated_max_concurrent_users: 0,
        memory_headroom_mb: 0,
        bottleneck: 'unknown',
        recommendations: ['Metrics not yet collected — wait 15 seconds'],
        details: {
          max_by_memory: 0,
          max_by_db: 0,
          max_by_event_loop: 0,
          memory_per_user_mb: 0,
          heap_used_pct: 0,
        },
      };
    }

    // Get active sessions as proxy for concurrent users
    const activeSessions = await this.prisma.userSession.count({
      where: {
        revoked_at: null,
        logged_in_at: { gte: new Date(Date.now() - 60 * 60_000) },
      },
    });

    return estimateCapacity(
      snapshot,
      activeSessions,
      this.metricsService.getMaxHeapMb(),
    );
  }

  /** List all capacity baselines */
  async getCapacityBaselines(): Promise<unknown[]> {
    return this.prisma.capacityBaseline.findMany({
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }

  /** Capture a new capacity baseline */
  async captureBaseline(label: string): Promise<unknown> {
    const snapshot = this.metricsService.getLatestSnapshot();

    // Try to get git commit hash
    let commitHash: string | null = null;
    try {
      commitHash = childProcess
        .execSync('git rev-parse --short HEAD', { encoding: 'utf8' })
        .trim();
    } catch {
      // Not a git repo or git not available
    }

    const activeSessions = await this.prisma.userSession.count({
      where: {
        revoked_at: null,
        logged_in_at: { gte: new Date(Date.now() - 60 * 60_000) },
      },
    });

    const capacity = snapshot
      ? estimateCapacity(
          snapshot,
          activeSessions,
          this.metricsService.getMaxHeapMb(),
        )
      : null;

    return this.prisma.capacityBaseline.create({
      data: {
        label,
        commit_hash: commitHash,
        heap_idle_mb: snapshot?.heap_used_mb ?? 0,
        heap_loaded_mb: snapshot?.heap_total_mb ?? 0,
        rss_mb: snapshot?.rss_mb ?? 0,
        estimated_max_users: capacity?.estimated_max_concurrent_users ?? 0,
        event_loop_lag_ms: snapshot?.event_loop_lag_ms ?? 0,
        notes: capacity
          ? `Bottleneck: ${capacity.bottleneck}. ${capacity.recommendations.join('. ')}`
          : 'No metrics available at capture time',
      },
    });
  }

  /** Get recent system alerts */
  async getAlerts(limit: number): Promise<unknown[]> {
    return this.prisma.systemAlert.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  private parsePeriodHours(period: string): number {
    switch (period) {
      case '1h':
        return 1;
      case '6h':
        return 6;
      case '24h':
        return 24;
      case '7d':
        return 7 * 24;
      default:
        return 24;
    }
  }
}
