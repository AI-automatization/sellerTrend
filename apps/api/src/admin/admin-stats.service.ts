import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';

// SUPER_ADMIN account excluded from stats — set via env or fallback to seed value
const SUPER_ADMIN_ACCOUNT_ID = process.env.SUPER_ADMIN_ACCOUNT_ID ?? 'aaaaaaaa-0000-0000-0000-000000000001';

const QUEUE_NAMES = [
  'discovery-queue',
  'sourcing-search',
  'import-batch',
  'billing-queue',
  'competitor-queue',
  'reanalysis-queue',
];

@Injectable()
export class AdminStatsService {
  private readonly redis: Redis;

  constructor(private readonly prisma: PrismaService) {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this.redis = new Redis(url, {
      maxRetriesPerRequest: 0,
      connectTimeout: 3000,
      enableOfflineQueue: false,
      lazyConnect: true,
      retryStrategy: () => null,
    });
  }

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

  /** Stats Overview */
  async getStatsOverview() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      accountsByStatus,
      totalUsers,
      activeUsers,
      todayActiveSessions,
      totalTrackedProducts,
      todayAnalyzes,
      todayCategoryRuns,
    ] = await Promise.all([
      this.prisma.account.groupBy({
        by: ['status'],
        where: { id: { not: SUPER_ADMIN_ACCOUNT_ID } },
        _count: { id: true },
      }),
      this.prisma.user.count({ where: { account_id: { not: SUPER_ADMIN_ACCOUNT_ID } } }),
      this.prisma.user.count({ where: { is_active: true, account_id: { not: SUPER_ADMIN_ACCOUNT_ID } } }),
      this.prisma.userSession.count({
        where: {
          logged_in_at: { gte: todayStart },
          revoked_at: null,
          OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
        },
      }),
      this.prisma.trackedProduct.count(),
      this.prisma.userActivity.count({
        where: { action: 'ANALYZE', created_at: { gte: todayStart } },
      }),
      this.prisma.categoryRun.count({
        where: { created_at: { gte: todayStart } },
      }),
    ]);

    const statusMap: Record<string, number> = { ACTIVE: 0, PAYMENT_DUE: 0, SUSPENDED: 0 };
    for (const row of accountsByStatus) {
      statusMap[row.status] = row._count.id;
    }

    return {
      accounts: {
        active: statusMap.ACTIVE,
        payment_due: statusMap.PAYMENT_DUE,
        suspended: statusMap.SUSPENDED,
        total: statusMap.ACTIVE + statusMap.PAYMENT_DUE + statusMap.SUSPENDED,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        blocked: totalUsers - activeUsers,
      },
      today_active_users: todayActiveSessions,
      total_tracked_products: totalTrackedProducts,
      today_analyzes: todayAnalyzes,
      today_category_runs: todayCategoryRuns,
    };
  }

  /** Revenue Stats */
  async getStatsRevenue(period: number) {
    const since = new Date();
    since.setDate(since.getDate() - period);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [dailyCharges, mrrResult, avgBalance, paymentDueThisMonth] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { type: 'CHARGE', created_at: { gte: since } },
        select: { amount: true, created_at: true },
        orderBy: { created_at: 'asc' },
      }),
      this.prisma.transaction.aggregate({
        where: { type: 'CHARGE', created_at: { gte: monthStart } },
        _sum: { amount: true },
      }),
      this.prisma.account.aggregate({
        where: { id: { not: SUPER_ADMIN_ACCOUNT_ID } },
        _avg: { balance: true },
      }),
      this.prisma.account.count({
        where: { status: 'PAYMENT_DUE', id: { not: SUPER_ADMIN_ACCOUNT_ID } },
      }),
    ]);

    // Group charges by date
    const dailyMap: Record<string, bigint> = {};
    for (const t of dailyCharges) {
      const dateKey = t.created_at.toISOString().split('T')[0];
      dailyMap[dateKey] = (dailyMap[dateKey] ?? BigInt(0)) + t.amount;
    }

    const dailyData = Object.entries(dailyMap).map(([date, amount]) => ({
      date,
      amount: amount.toString(),
    }));

    // Calculate today's revenue
    const todayKey = new Date().toISOString().split('T')[0];
    const todayRevenue = dailyMap[todayKey] ?? BigInt(0);

    return {
      daily: dailyData,
      today_revenue: todayRevenue.toString(),
      mrr: (mrrResult._sum.amount ?? BigInt(0)).toString(),
      avg_balance: (avgBalance._avg.balance ?? 0).toString(),
      payment_due_count: paymentDueThisMonth,
    };
  }

  /** Growth Stats */
  async getStatsGrowth(period: number) {
    const since = new Date();
    since.setDate(since.getDate() - period);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const [weekNew, monthNew, activeAccounts, paymentDueAccounts] = await Promise.all([
      this.prisma.user.count({ where: { created_at: { gte: weekAgo }, account_id: { not: SUPER_ADMIN_ACCOUNT_ID } } }),
      this.prisma.user.count({ where: { created_at: { gte: monthAgo }, account_id: { not: SUPER_ADMIN_ACCOUNT_ID } } }),
      this.prisma.account.count({ where: { status: 'ACTIVE', id: { not: SUPER_ADMIN_ACCOUNT_ID } } }),
      this.prisma.account.count({ where: { status: 'PAYMENT_DUE', id: { not: SUPER_ADMIN_ACCOUNT_ID } } }),
    ]);

    // Use raw SQL for daily grouping — avoids loading all users into memory
    const dailyNewUsers: { date: string; count: number }[] = await this.prisma.$queryRaw`
      SELECT DATE(created_at) as date, COUNT(*)::int as count
      FROM users
      WHERE created_at >= ${since} AND account_id != ${SUPER_ADMIN_ACCOUNT_ID}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const churnRatePct = activeAccounts > 0
      ? Number(((paymentDueAccounts / activeAccounts) * 100).toFixed(2))
      : 0;

    return {
      daily_new_users: dailyNewUsers,
      week_new: weekNew,
      month_new: monthNew,
      churn_rate_pct: churnRatePct,
      active_accounts: activeAccounts,
      payment_due_accounts: paymentDueAccounts,
    };
  }

  /** Popular Products */
  async getPopularProducts(limit: number) {
    const grouped = await this.prisma.trackedProduct.groupBy({
      by: ['product_id'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    const productIds = grouped.map((g) => g.product_id);
    if (productIds.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        title: true,
        category_id: true,
        snapshots: {
          orderBy: { snapshot_at: 'desc' },
          take: 1,
          select: { score: true, weekly_bought: true },
        },
      },
    });

    const productMap = new Map(products.map((p) => [p.id.toString(), p]));

    return grouped.map((g) => {
      const prod = productMap.get(g.product_id.toString());
      const snap = prod?.snapshots?.[0];
      return {
        product_id: g.product_id.toString(),
        title: prod?.title ?? 'Unknown',
        category_id: prod?.category_id?.toString() ?? null,
        tracker_count: g._count.id,
        avg_score: snap?.score?.toString() ?? null,
        weekly_bought: snap?.weekly_bought ?? null,
      };
    });
  }

  /** Popular Categories */
  async getPopularCategories(limit: number) {
    const grouped = await this.prisma.categoryRun.groupBy({
      by: ['category_id'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    const categoryIds = grouped.map((g) => g.category_id);
    if (categoryIds.length === 0) return [];

    // Count winners per category via their runs
    const runs = await this.prisma.categoryRun.findMany({
      where: { category_id: { in: categoryIds } },
      select: {
        id: true,
        category_id: true,
        created_at: true,
        _count: { select: { winners: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    // Build per-category stats
    const catStats: Record<string, { run_count: number; winner_count: number; last_run_at: Date | null }> = {};
    for (const g of grouped) {
      catStats[g.category_id.toString()] = { run_count: g._count.id, winner_count: 0, last_run_at: null };
    }
    for (const r of runs) {
      const key = r.category_id.toString();
      if (catStats[key]) {
        catStats[key].winner_count += r._count.winners;
        if (!catStats[key].last_run_at || r.created_at > catStats[key].last_run_at!) {
          catStats[key].last_run_at = r.created_at;
        }
      }
    }

    return Object.entries(catStats).map(([categoryId, stats]) => ({
      category_id: categoryId,
      run_count: stats.run_count,
      winner_count: stats.winner_count,
      last_run_at: stats.last_run_at,
    }));
  }

  /** Realtime Stats (optimized — limited queries, no full scans) */
  async getRealtimeStats() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Use lightweight parallel queries — avoid heavy count() on large tables
    const [activeSessions, activityFeed, queuePending] = await Promise.all([
      this.prisma.userSession.count({
        where: {
          logged_in_at: { gte: oneHourAgo },
          revoked_at: null,
        },
      }),
      this.prisma.userActivity.findMany({
        where: { created_at: { gte: oneHourAgo } },
        orderBy: { created_at: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          details: true,
          ip: true,
          created_at: true,
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

  /** Product Heatmap (optimized — SQL aggregation instead of loading all rows) */
  async getProductHeatmap(period: string) {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Use SQL for aggregation — avoids loading all tracked products into memory
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

  /** Category Trends (optimized — single queries instead of loop) */
  async getCategoryTrends(weeks: number) {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);

    // Single query for all weeks of category runs
    const runsData: { week: Date | string; category_id: bigint; runs: number }[] = await this.prisma.$queryRaw`
      SELECT DATE(date_trunc('week', created_at)) as week,
             category_id,
             COUNT(*)::int as runs
      FROM category_runs
      WHERE created_at >= ${since}
      GROUP BY week, category_id
      ORDER BY week ASC
    `;

    // Single query for tracked products per week per category
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

    // Build result by week
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

  /** Top Users (batch queries to avoid N+1) */
  async getTopUsers(period: string, limit: number) {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Limit to 100 most recently active users to avoid loading entire table
    const users = await this.prisma.user.findMany({
      where: { is_active: true },
      take: 100,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        email: true,
        account_id: true,
        account: {
          select: {
            name: true,
            tracked_products: {
              select: {
                product: {
                  select: { snapshots: { orderBy: { snapshot_at: 'desc' as const }, take: 1 } },
                },
              },
              where: { is_active: true },
            },
            category_runs: {
              select: { id: true },
              where: { created_at: { gte: since } },
            },
          },
        },
        activities: {
          select: { id: true },
          where: { created_at: { gte: since } },
        },
      },
    });

    const userScores = users.map((user) => {
      const trackedCount = user.account.tracked_products.length;
      const discoveryRuns = user.account.category_runs.length;
      const activityCount = user.activities.length;

      let totalScore = 0;
      let totalWeekly = 0;
      let scoreCount = 0;
      for (const tp of user.account.tracked_products) {
        const snap = tp.product.snapshots[0];
        if (snap) {
          totalScore += Number(snap.score ?? 0);
          totalWeekly += snap.weekly_bought ?? 0;
          scoreCount++;
        }
      }

      const activityScore = activityCount * 1 + discoveryRuns * 5 + trackedCount * 3;

      return {
        id: user.id,
        email: user.email,
        account_name: user.account.name,
        tracked_products: trackedCount,
        avg_score: scoreCount > 0 ? totalScore / scoreCount : 0,
        total_weekly: totalWeekly,
        discovery_runs: discoveryRuns,
        activity_count: activityCount,
        activity_score: activityScore,
      };
    });

    userScores.sort((a, b) => b.activity_score - a.activity_score);

    return userScores.slice(0, limit);
  }

  /** System Health */
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

  /** AI usage stats */
  async getAiUsageStats(period = 30) {
    const since = new Date();
    since.setDate(since.getDate() - period);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalLogs, todayLogs, byMethod, byDay, recentErrors] = await Promise.all([
      this.prisma.aiUsageLog.aggregate({
        where: { created_at: { gte: since } },
        _sum: { input_tokens: true, output_tokens: true, cost_usd: true },
        _count: { id: true },
      }),
      this.prisma.aiUsageLog.aggregate({
        where: { created_at: { gte: todayStart } },
        _sum: { input_tokens: true, output_tokens: true, cost_usd: true },
        _count: { id: true },
      }),
      this.prisma.aiUsageLog.groupBy({
        by: ['method'],
        where: { created_at: { gte: since } },
        _sum: { input_tokens: true, output_tokens: true, cost_usd: true },
        _count: { id: true },
        _avg: { duration_ms: true },
      }),
      this.prisma.$queryRaw`
        SELECT DATE(created_at) as date,
               COUNT(*)::int as calls,
               COALESCE(SUM(input_tokens), 0)::int as input_tokens,
               COALESCE(SUM(output_tokens), 0)::int as output_tokens,
               COALESCE(SUM(cost_usd), 0)::float as cost_usd
        FROM ai_usage_logs
        WHERE created_at >= ${since}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      ` as Promise<{ date: Date; calls: number; input_tokens: number; output_tokens: number; cost_usd: number }[]>,
      this.prisma.aiUsageLog.findMany({
        where: { error: { not: null }, created_at: { gte: since } },
        orderBy: { created_at: 'desc' },
        take: 20,
        select: { id: true, method: true, error: true, created_at: true },
      }),
    ]);

    // byDay is already grouped by SQL
    const daily = byDay.map((row) => ({
      date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date),
      calls: row.calls,
      input_tokens: row.input_tokens,
      output_tokens: row.output_tokens,
      cost_usd: Number(Number(row.cost_usd).toFixed(6)),
    }));

    return {
      period: {
        calls: totalLogs._count.id,
        input_tokens: totalLogs._sum.input_tokens ?? 0,
        output_tokens: totalLogs._sum.output_tokens ?? 0,
        cost_usd: Number(totalLogs._sum.cost_usd ?? 0).toFixed(4),
      },
      today: {
        calls: todayLogs._count.id,
        input_tokens: todayLogs._sum.input_tokens ?? 0,
        output_tokens: todayLogs._sum.output_tokens ?? 0,
        cost_usd: Number(todayLogs._sum.cost_usd ?? 0).toFixed(4),
      },
      by_method: byMethod.map((m) => ({
        method: m.method,
        calls: m._count.id,
        input_tokens: m._sum.input_tokens ?? 0,
        output_tokens: m._sum.output_tokens ?? 0,
        cost_usd: Number(m._sum.cost_usd ?? 0).toFixed(4),
        avg_duration_ms: Math.round(m._avg.duration_ms ?? 0),
      })),
      daily,
      recent_errors: recentErrors,
    };
  }

  /** System errors for error tracking */
  async getSystemErrors(opts: {
    page?: number;
    limit?: number;
    endpoint?: string;
    status_gte?: number;
    account_id?: string;
    period?: number;
  }) {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 50;
    const since = new Date();
    since.setDate(since.getDate() - (opts.period ?? 7));

    const where: any = { created_at: { gte: since } };
    if (opts.endpoint) where.endpoint = { contains: opts.endpoint };
    if (opts.status_gte) where.status = { gte: opts.status_gte };
    if (opts.account_id) where.account_id = opts.account_id;

    const [items, total, byEndpoint, byStatus] = await Promise.all([
      this.prisma.systemError.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.systemError.count({ where }),
      this.prisma.systemError.groupBy({
        by: ['endpoint'],
        where: { created_at: { gte: since } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      }),
      this.prisma.systemError.groupBy({
        by: ['status'],
        where: { created_at: { gte: since } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    return {
      items: items.map((e) => ({
        id: e.id,
        endpoint: e.endpoint,
        method: e.method,
        status: e.status,
        message: e.message,
        stack: e.stack,
        account_id: e.account_id,
        user_id: e.user_id,
        ip: e.ip,
        created_at: e.created_at,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
      by_endpoint: byEndpoint.map((e) => ({ endpoint: e.endpoint, count: e._count.id })),
      by_status: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
    };
  }
}
