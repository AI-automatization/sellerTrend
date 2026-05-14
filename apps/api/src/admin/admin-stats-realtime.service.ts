import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../common/redis/redis.module';

const SUPER_ADMIN_ACCOUNT_ID = process.env.SUPER_ADMIN_ACCOUNT_ID ?? 'aaaaaaaa-0000-0000-0000-000000000001';

const QUEUE_NAMES = [
  'discovery-queue',
  'sourcing-search',
  'import-batch',
  'billing-queue',
  'competitor-queue',
  'weekly-scrape-queue',
];

@Injectable()
export class AdminStatsRealtimeService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private async getQueuePending(): Promise<number> {
    try {
      let total = 0;
      for (const name of QUEUE_NAMES) {
        const waiting = await this.redis.llen(`bull:${name}:wait`);
        const active = await this.redis.llen(`bull:${name}:active`);
        total += waiting + active;
      }
      return total;
    } catch {
      return 0;
    }
  }

  async getRealtimeStats() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [activeSessions, activityFeed, queuePending] = await Promise.all([
      this.prisma.userSession.count({
        where: { logged_in_at: { gte: oneHourAgo }, revoked_at: null, expires_at: { gt: new Date() } },
      }),
      this.prisma.userActivity.findMany({
        where: { created_at: { gte: oneHourAgo } },
        orderBy: { created_at: 'desc' },
        take: 10,
        select: {
          id: true, action: true, details: true, ip: true, created_at: true,
          user: { select: { email: true } },
        },
      }),
      this.getQueuePending(),
    ]);

    return {
      active_sessions: activeSessions,
      today_requests: activityFeed.length,
      queue_pending: queuePending,
      recent_errors: 0,
      activity_feed: activityFeed.map((a) => ({
        id: a.id,
        user_email: a.user.email,
        action: a.action,
        details: a.details,
        ip: a.ip,
        created_at: a.created_at,
      })),
    };
  }

  async getProductHeatmap(period: string) {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const heatmap: { category_id: bigint | null; count: number; avg_score: number | null }[] = await this.prisma.$queryRaw`
      SELECT p.category_id,
             COUNT(*)::int as count,
             AVG(
               (SELECT ps.score FROM product_snapshots ps
                WHERE ps.product_id = p.id
                ORDER BY ps.snapshot_at DESC LIMIT 1)
             )::float as avg_score
      FROM tracked_products tp
      JOIN products p ON tp.product_id = p.id
      WHERE tp.created_at >= ${since}
      GROUP BY p.category_id
      ORDER BY count DESC
      LIMIT 50
    `;

    return heatmap.map((h) => ({
      category_id: h.category_id?.toString() ?? 'uncategorized',
      count: h.count,
      avg_score: h.avg_score ? Number(h.avg_score.toFixed(4)) : null,
      products: [],
    }));
  }

  async getCategoryTrends(weeks: number) {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);

    const runsData: { week: Date | string; category_id: bigint; runs: number }[] = await this.prisma.$queryRaw`
      SELECT DATE(date_trunc('week', created_at)) as week,
             category_id,
             COUNT(*)::int as runs
      FROM category_runs
      WHERE created_at >= ${since}
      GROUP BY week, category_id
      ORDER BY week ASC
    `;

    const trackedData: { week: Date | string; category_id: bigint; tracked: number }[] = await this.prisma.$queryRaw`
      SELECT DATE(date_trunc('week', tp.created_at)) as week,
             p.category_id,
             COUNT(*)::int as tracked
      FROM tracked_products tp
      JOIN products p ON tp.product_id = p.id
      WHERE tp.created_at >= ${since} AND p.category_id IS NOT NULL
      GROUP BY week, p.category_id
      ORDER BY week ASC
    `;

    const weekMap = new Map<string, Record<string, { runs: number; tracked: number; growth_pct: number | null }>>();

    for (const r of runsData) {
      const wk = r.week instanceof Date ? r.week.toISOString().split('T')[0] : String(r.week);
      if (!weekMap.has(wk)) weekMap.set(wk, {});
      const cats = weekMap.get(wk)!;
      const catId = r.category_id.toString();
      if (!cats[catId]) cats[catId] = { runs: 0, tracked: 0, growth_pct: null };
      cats[catId].runs = r.runs;
    }

    for (const t of trackedData) {
      const wk = t.week instanceof Date ? t.week.toISOString().split('T')[0] : String(t.week);
      if (!weekMap.has(wk)) weekMap.set(wk, {});
      const cats = weekMap.get(wk)!;
      const catId = t.category_id.toString();
      if (!cats[catId]) cats[catId] = { runs: 0, tracked: 0, growth_pct: null };
      cats[catId].tracked = t.tracked;
    }

    const sortedWeeks = [...weekMap.entries()].sort(([a], [b]) => a.localeCompare(b));
    const result: { week: string; categories: Record<string, { runs: number; tracked: number; growth_pct: number | null }> }[] = [];

    for (let i = 0; i < sortedWeeks.length; i++) {
      const [week, categories] = sortedWeeks[i];
      if (i > 0) {
        const prev = sortedWeeks[i - 1][1];
        for (const [catId, data] of Object.entries(categories)) {
          const prevRuns = prev[catId]?.runs ?? 0;
          if (prevRuns > 0) {
            data.growth_pct = Number((((data.runs - prevRuns) / prevRuns) * 100).toFixed(2));
          }
        }
      }
      result.push({ week, categories });
    }

    return result;
  }

  async getTopUsers(period: string, limit: number) {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const users: {
      id: string; email: string; account_name: string;
      tracked_count: number; discovery_runs: number; activity_count: number;
    }[] = await this.prisma.$queryRaw`
      SELECT u.id, u.email, a.name as account_name,
        (SELECT COUNT(*)::int FROM tracked_products tp WHERE tp.account_id = u.account_id AND tp.is_active = true) as tracked_count,
        (SELECT COUNT(*)::int FROM category_runs cr WHERE cr.account_id = u.account_id AND cr.created_at >= ${since}) as discovery_runs,
        (SELECT COUNT(*)::int FROM user_activities ua WHERE ua.user_id = u.id AND ua.created_at >= ${since}) as activity_count
      FROM users u
      JOIN accounts a ON u.account_id = a.id
      WHERE u.is_active = true AND u.account_id != ${SUPER_ADMIN_ACCOUNT_ID}
      ORDER BY activity_count DESC
      LIMIT ${limit}
    `;

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      account_name: user.account_name,
      tracked_products: user.tracked_count,
      avg_score: 0,
      total_weekly: 0,
      discovery_runs: user.discovery_runs,
      activity_count: user.activity_count,
      activity_score: user.activity_count * 1 + user.discovery_runs * 5 + user.tracked_count * 3,
    }));
  }

  async getSystemHealth() {
    let dbOk = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {
      dbOk = false;
    }

    return {
      status: dbOk ? 'healthy' : 'degraded',
      db_connected: dbOk,
      uptime_seconds: Math.floor(process.uptime()),
      memory: {
        rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      timestamp: new Date().toISOString(),
    };
  }
}
