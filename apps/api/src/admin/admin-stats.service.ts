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

    const [newUsers, weekNew, monthNew, activeAccounts, paymentDueAccounts] = await Promise.all([
      this.prisma.user.findMany({
        where: { created_at: { gte: since }, account_id: { not: SUPER_ADMIN_ACCOUNT_ID } },
        select: { created_at: true },
        orderBy: { created_at: 'asc' },
      }),
      this.prisma.user.count({ where: { created_at: { gte: weekAgo }, account_id: { not: SUPER_ADMIN_ACCOUNT_ID } } }),
      this.prisma.user.count({ where: { created_at: { gte: monthAgo }, account_id: { not: SUPER_ADMIN_ACCOUNT_ID } } }),
      this.prisma.account.count({ where: { status: 'ACTIVE', id: { not: SUPER_ADMIN_ACCOUNT_ID } } }),
      this.prisma.account.count({ where: { status: 'PAYMENT_DUE', id: { not: SUPER_ADMIN_ACCOUNT_ID } } }),
    ]);

    // Group new users by date
    const dailyMap: Record<string, number> = {};
    for (const u of newUsers) {
      const dateKey = u.created_at.toISOString().split('T')[0];
      dailyMap[dateKey] = (dailyMap[dateKey] ?? 0) + 1;
    }

    const dailyNewUsers = Object.entries(dailyMap).map(([date, count]) => ({
      date,
      count,
    }));

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

  /** Realtime Stats */
  async getRealtimeStats() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [activeSessions, todayRequests, recentErrors, activityFeed, queuePending] = await Promise.all([
      this.prisma.userSession.count({
        where: {
          logged_in_at: { gte: oneHourAgo },
          revoked_at: null,
          OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
        },
      }),
      this.prisma.userActivity.count({
        where: { created_at: { gte: todayStart } },
      }),
      this.prisma.auditEvent.count({
        where: {
          action: { contains: 'ERROR' },
          created_at: { gte: todayStart },
        },
      }),
      this.prisma.userActivity.findMany({
        orderBy: { created_at: 'desc' },
        take: 10,
        include: {
          user: { select: { email: true } },
        },
      }),
      this.getQueuePending(),
    ]);

    return {
      active_sessions: activeSessions,
      today_requests: todayRequests,
      queue_pending: queuePending,
      recent_errors: recentErrors,
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

  /** Product Heatmap */
  async getProductHeatmap(period: string) {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get tracked products with their product's category
    const tracked = await this.prisma.trackedProduct.findMany({
      where: { created_at: { gte: since } },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            category_id: true,
            snapshots: {
              orderBy: { snapshot_at: 'desc' },
              take: 1,
              select: { score: true },
            },
          },
        },
      },
    });

    // Group by category_id
    const catMap: Record<string, { count: number; scores: number[]; products: { id: string; title: string }[] }> = {};

    for (const tp of tracked) {
      const catId = tp.product.category_id?.toString() ?? 'uncategorized';
      if (!catMap[catId]) {
        catMap[catId] = { count: 0, scores: [], products: [] };
      }
      catMap[catId].count++;
      const score = tp.product.snapshots?.[0]?.score;
      if (score !== null && score !== undefined) {
        catMap[catId].scores.push(Number(score));
      }
      if (catMap[catId].products.length < 5) {
        catMap[catId].products.push({
          id: tp.product.id.toString(),
          title: tp.product.title,
        });
      }
    }

    return Object.entries(catMap).map(([category_id, data]) => ({
      category_id,
      count: data.count,
      avg_score: data.scores.length > 0
        ? Number((data.scores.reduce((a, b) => a + b, 0) / data.scores.length).toFixed(4))
        : null,
      products: data.products,
    }));
  }

  /** Category Trends */
  async getCategoryTrends(weeks: number) {
    const result: { week: string; categories: Record<string, { runs: number; tracked: number; growth_pct: number | null }> }[] = [];

    for (let w = 0; w < weeks; w++) {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - w * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      const [runs, tracked] = await Promise.all([
        this.prisma.categoryRun.groupBy({
          by: ['category_id'],
          where: { created_at: { gte: weekStart, lte: weekEnd } },
          _count: { id: true },
        }),
        this.prisma.trackedProduct.findMany({
          where: { created_at: { gte: weekStart, lte: weekEnd } },
          include: { product: { select: { category_id: true } } },
        }),
      ]);

      // Count tracked per category
      const trackedByCat: Record<string, number> = {};
      for (const tp of tracked) {
        const catId = tp.product.category_id?.toString() ?? 'unknown';
        trackedByCat[catId] = (trackedByCat[catId] ?? 0) + 1;
      }

      const categories: Record<string, { runs: number; tracked: number; growth_pct: number | null }> = {};
      for (const r of runs) {
        const catId = r.category_id.toString();
        categories[catId] = {
          runs: r._count.id,
          tracked: trackedByCat[catId] ?? 0,
          growth_pct: null,
        };
      }
      // Include categories that have tracked but no runs
      for (const [catId, count] of Object.entries(trackedByCat)) {
        if (!categories[catId]) {
          categories[catId] = { runs: 0, tracked: count, growth_pct: null };
        }
      }

      // Compute growth from previous week
      if (result.length > 0) {
        const prevWeek = result[result.length - 1].categories;
        for (const [catId, data] of Object.entries(categories)) {
          const prevRuns = prevWeek[catId]?.runs ?? 0;
          if (prevRuns > 0) {
            data.growth_pct = Number((((data.runs - prevRuns) / prevRuns) * 100).toFixed(2));
          }
        }
      }

      result.push({
        week: weekStart.toISOString().split('T')[0],
        categories,
      });
    }

    return result;
  }

  /** Top Users (batch queries to avoid N+1) */
  async getTopUsers(period: string, limit: number) {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Single query: users with their tracked products + latest snapshots
    const users = await this.prisma.user.findMany({
      where: { is_active: true },
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
      this.prisma.aiUsageLog.findMany({
        where: { created_at: { gte: since } },
        select: { input_tokens: true, output_tokens: true, cost_usd: true, created_at: true },
        orderBy: { created_at: 'asc' },
      }),
      this.prisma.aiUsageLog.findMany({
        where: { error: { not: null }, created_at: { gte: since } },
        orderBy: { created_at: 'desc' },
        take: 20,
        select: { id: true, method: true, error: true, created_at: true },
      }),
    ]);

    // Group by day
    const dailyMap: Record<string, { calls: number; input: number; output: number; cost: number }> = {};
    for (const log of byDay) {
      const dateKey = log.created_at.toISOString().split('T')[0];
      if (!dailyMap[dateKey]) dailyMap[dateKey] = { calls: 0, input: 0, output: 0, cost: 0 };
      dailyMap[dateKey].calls++;
      dailyMap[dateKey].input += log.input_tokens;
      dailyMap[dateKey].output += log.output_tokens;
      dailyMap[dateKey].cost += Number(log.cost_usd);
    }

    const daily = Object.entries(dailyMap).map(([date, data]) => ({
      date,
      calls: data.calls,
      input_tokens: data.input,
      output_tokens: data.output,
      cost_usd: Number(data.cost.toFixed(6)),
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
