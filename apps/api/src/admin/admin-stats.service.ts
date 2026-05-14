import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SUPER_ADMIN_ACCOUNT_ID = process.env.SUPER_ADMIN_ACCOUNT_ID ?? 'aaaaaaaa-0000-0000-0000-000000000001';

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatsOverview() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [accountsByStatus, planBreakdown, totalUsers, activeUsers, todayActiveSessions, totalTrackedProducts, todayAnalyzes, todayCategoryRuns] = await Promise.all([
      this.prisma.account.groupBy({ by: ['status'], where: { id: { not: SUPER_ADMIN_ACCOUNT_ID } }, _count: { id: true } }),
      this.prisma.account.groupBy({ by: ['plan'], where: { id: { not: SUPER_ADMIN_ACCOUNT_ID } }, _count: { id: true } }),
      this.prisma.user.count({ where: { account_id: { not: SUPER_ADMIN_ACCOUNT_ID } } }),
      this.prisma.user.count({ where: { is_active: true, account_id: { not: SUPER_ADMIN_ACCOUNT_ID } } }),
      this.prisma.userSession.count({
        where: { logged_in_at: { gte: todayStart }, revoked_at: null, OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }] },
      }),
      this.prisma.trackedProduct.count(),
      this.prisma.userActivity.count({ where: { action: 'ANALYZE', created_at: { gte: todayStart } } }),
      this.prisma.categoryRun.count({ where: { created_at: { gte: todayStart } } }),
    ]);

    const statusMap: Record<string, number> = { ACTIVE: 0, SUSPENDED: 0 };
    for (const row of accountsByStatus) statusMap[row.status] = row._count.id;

    const planMap: Record<string, number> = {};
    for (const row of planBreakdown) planMap[row.plan] = row._count.id;

    return {
      accounts: { active: statusMap.ACTIVE, suspended: statusMap.SUSPENDED, total: statusMap.ACTIVE + statusMap.SUSPENDED },
      plan_breakdown: planMap,
      users: { total: totalUsers, active: activeUsers, blocked: totalUsers - activeUsers },
      today_active_users: todayActiveSessions,
      total_tracked_products: totalTrackedProducts,
      today_analyzes: todayAnalyzes,
      today_category_runs: todayCategoryRuns,
    };
  }

  async getStatsRevenue(period: number) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [mrrResult, todayRevResult] = await Promise.all([
      this.prisma.transaction.aggregate({ where: { type: 'SUBSCRIPTION', created_at: { gte: monthStart } }, _sum: { amount: true } }),
      this.prisma.transaction.aggregate({ where: { type: 'SUBSCRIPTION', created_at: { gte: todayStart } }, _sum: { amount: true } }),
    ]);

    void period;
    return {
      daily: [],
      today_revenue: (todayRevResult._sum.amount ?? BigInt(0)).toString(),
      mrr: (mrrResult._sum.amount ?? BigInt(0)).toString(),
    };
  }

  async getStatsGrowth(period: number) {
    const since = new Date();
    since.setDate(since.getDate() - period);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [weekNew, monthNew, activeAccounts, churnedAccounts, planBreakdown, mrrResult, avgDaysToRenewal] = await Promise.all([
      this.prisma.user.count({ where: { created_at: { gte: weekAgo }, account_id: { not: SUPER_ADMIN_ACCOUNT_ID } } }),
      this.prisma.user.count({ where: { created_at: { gte: monthAgo }, account_id: { not: SUPER_ADMIN_ACCOUNT_ID } } }),
      this.prisma.account.count({ where: { status: 'ACTIVE', id: { not: SUPER_ADMIN_ACCOUNT_ID } } }),
      this.prisma.account.count({ where: { id: { not: SUPER_ADMIN_ACCOUNT_ID }, plan_expires_at: { lt: sevenDaysAgo }, status: { not: 'ACTIVE' }, plan: { not: 'FREE' } } }),
      this.prisma.account.groupBy({ by: ['plan'], where: { id: { not: SUPER_ADMIN_ACCOUNT_ID } }, _count: { id: true } }),
      this.prisma.transaction.aggregate({ where: { type: 'SUBSCRIPTION', created_at: { gte: monthAgo } }, _sum: { amount: true } }),
      this.prisma.$queryRaw<{ avg_days: number | null }[]>`
        SELECT AVG(EXTRACT(EPOCH FROM (plan_expires_at - NOW())) / 86400)::float as avg_days
        FROM accounts
        WHERE status = 'ACTIVE' AND plan != 'FREE' AND plan_expires_at IS NOT NULL
          AND plan_expires_at > NOW() AND id != ${SUPER_ADMIN_ACCOUNT_ID}
      `,
    ]);

    const dailyNewUsers: { date: string; count: number }[] = await this.prisma.$queryRaw`
      SELECT DATE(created_at) as date, COUNT(*)::int as count
      FROM users
      WHERE created_at >= ${since} AND account_id != ${SUPER_ADMIN_ACCOUNT_ID}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const totalRelevant = activeAccounts + churnedAccounts;
    const churnRatePct = totalRelevant > 0 ? Number(((churnedAccounts / totalRelevant) * 100).toFixed(2)) : 0;

    const planBreakdownMap: Record<string, number> = { FREE: 0, PRO: 0, MAX: 0, COMPANY: 0 };
    for (const row of planBreakdown) planBreakdownMap[row.plan] = row._count.id;

    return {
      daily_new_users: dailyNewUsers,
      week_new: weekNew,
      month_new: monthNew,
      churn_rate_pct: churnRatePct,
      churned_accounts: churnedAccounts,
      active_accounts: activeAccounts,
      plan_breakdown: planBreakdownMap,
      mrr: (mrrResult._sum.amount ?? BigInt(0)).toString(),
      avg_days_to_renewal: avgDaysToRenewal[0]?.avg_days != null ? Number(avgDaysToRenewal[0].avg_days.toFixed(1)) : null,
    };
  }

  async getPopularProducts(limit: number) {
    const grouped = await this.prisma.trackedProduct.groupBy({
      by: ['product_id'], _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: limit,
    });

    const productIds = grouped.map((g) => g.product_id);
    if (productIds.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, title: true, category_id: true, snapshots: { orderBy: { snapshot_at: 'desc' }, take: 1, select: { score: true, weekly_bought: true } } },
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

  async getPopularCategories(limit: number) {
    const grouped: { category_id: bigint; run_count: number }[] = await this.prisma.$queryRaw`
      SELECT category_id, COUNT(*)::int as run_count
      FROM category_runs GROUP BY category_id ORDER BY run_count DESC LIMIT ${limit}
    `;
    if (grouped.length === 0) return [];

    const categoryIds = grouped.map((g) => g.category_id);
    const winnerCounts: { category_id: bigint; winner_count: number; last_run_at: Date }[] = await this.prisma.$queryRaw`
      SELECT cr.category_id,
             COALESCE(SUM(wc.cnt), 0)::int as winner_count,
             MAX(cr.created_at) as last_run_at
      FROM category_runs cr
      LEFT JOIN (SELECT run_id, COUNT(*)::int as cnt FROM category_winners GROUP BY run_id) wc ON wc.run_id = cr.id
      WHERE cr.category_id = ANY(${categoryIds})
      GROUP BY cr.category_id
    `;

    const winnerMap = new Map(winnerCounts.map((w) => [w.category_id.toString(), w]));
    return grouped.map((g) => {
      const w = winnerMap.get(g.category_id.toString());
      return { category_id: g.category_id.toString(), run_count: g.run_count, winner_count: w?.winner_count ?? 0, last_run_at: w?.last_run_at ?? null };
    });
  }
}
