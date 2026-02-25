import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import {
  readLogFile,
  getAvailableDates,
  computePerformance,
  type LogFilter,
} from '../common/logger/file-logger';

const SUPER_ADMIN_ACCOUNT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // EXISTING METHODS (unchanged)
  // ============================================================

  async listAccounts() {
    const accounts = await this.prisma.account.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        users: { select: { id: true, email: true, role: true } },
        _count: { select: { transactions: true } },
      },
    });

    return accounts.map((a) => ({
      id: a.id,
      name: a.name,
      status: a.status,
      balance: a.balance.toString(),
      daily_fee: a.daily_fee?.toString() ?? null,
      created_at: a.created_at,
      users: a.users,
      transaction_count: a._count.transactions,
    }));
  }

  async getAccount(accountId: string) {
    const account = await this.prisma.account.findUniqueOrThrow({
      where: { id: accountId },
      include: {
        users: { select: { id: true, email: true, role: true } },
        transactions: {
          orderBy: { created_at: 'desc' },
          take: 20,
        },
      },
    });

    return {
      id: account.id,
      name: account.name,
      status: account.status,
      balance: account.balance.toString(),
      daily_fee: account.daily_fee?.toString() ?? null,
      created_at: account.created_at,
      users: account.users,
      transactions: account.transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount.toString(),
        balance_before: t.balance_before.toString(),
        balance_after: t.balance_after.toString(),
        description: t.description,
        created_at: t.created_at,
      })),
    };
  }

  async setAccountDailyFee(
    accountId: string,
    fee: number | null,
    adminUserId: string,
  ) {
    const old = await this.prisma.account.findUniqueOrThrow({
      where: { id: accountId },
      select: { daily_fee: true },
    });

    const newFee = fee !== null ? BigInt(fee) : null;

    await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id: accountId },
        data: { daily_fee: newFee },
      }),
      this.prisma.auditEvent.create({
        data: {
          account_id: accountId,
          user_id: adminUserId,
          action: 'DAILY_FEE_CHANGED',
          old_value: { fee: old.daily_fee?.toString() ?? null },
          new_value: { fee: fee?.toString() ?? null },
        },
      }),
    ]);

    return { daily_fee: fee?.toString() ?? null };
  }

  async depositToAccount(
    accountId: string,
    amount: number,
    adminUserId: string,
    description?: string,
  ) {
    const account = await this.prisma.account.findUniqueOrThrow({
      where: { id: accountId },
    });

    const bigAmount = BigInt(amount);
    const newBalance = account.balance + bigAmount;

    await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id: accountId },
        data: {
          balance: newBalance,
          ...(account.status === 'PAYMENT_DUE' && { status: 'ACTIVE' }),
        },
      }),
      this.prisma.transaction.create({
        data: {
          account_id: accountId,
          type: 'DEPOSIT',
          amount: bigAmount,
          balance_before: account.balance,
          balance_after: newBalance,
          description: description ?? `Admin deposit by ${adminUserId}`,
        },
      }),
      this.prisma.auditEvent.create({
        data: {
          account_id: accountId,
          user_id: adminUserId,
          action: 'BALANCE_DEPOSITED',
          old_value: { balance: account.balance.toString() },
          new_value: { balance: newBalance.toString(), amount: amount.toString() },
        },
      }),
    ]);

    return {
      balance: newBalance.toString(),
      status: account.status === 'PAYMENT_DUE' ? 'ACTIVE' : account.status,
    };
  }

  async getGlobalFee() {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'daily_fee_default' },
    });
    return { daily_fee_default: setting?.value ?? '50000' };
  }

  async setGlobalFee(fee: number, adminUserId: string) {
    const old = await this.prisma.systemSetting.findUnique({
      where: { key: 'daily_fee_default' },
    });

    await this.prisma.$transaction([
      this.prisma.systemSetting.upsert({
        where: { key: 'daily_fee_default' },
        update: { value: String(fee) },
        create: { key: 'daily_fee_default', value: String(fee) },
      }),
      this.prisma.auditEvent.create({
        data: {
          user_id: adminUserId,
          action: 'GLOBAL_FEE_CHANGED',
          old_value: { fee: old?.value ?? '50000' },
          new_value: { fee: String(fee) },
        },
      }),
    ]);

    return { daily_fee_default: String(fee) };
  }

  /** Create a new account + first user */
  async createAccount(
    companyName: string,
    email: string,
    password: string,
    role: string,
    adminUserId: string,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Bu email allaqachon ro\'yxatdan o\'tgan');

    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'];
    if (!allowedRoles.includes(role)) throw new BadRequestException('Noto\'g\'ri rol');

    const account = await this.prisma.account.create({ data: { name: companyName } });
    const password_hash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: { account_id: account.id, email, password_hash, role: role as any },
    });

    await this.prisma.auditEvent.create({
      data: {
        account_id: account.id,
        user_id: adminUserId,
        action: 'ACCOUNT_CREATED',
        new_value: { company: companyName, email, role },
      },
    });

    return { account_id: account.id, user_id: user.id, email: user.email, role: user.role };
  }

  /** Add user to existing account */
  async createUser(
    accountId: string,
    email: string,
    password: string,
    role: string,
    adminUserId: string,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Bu email allaqachon ro\'yxatdan o\'tgan');

    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Account topilmadi');

    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'];
    if (!allowedRoles.includes(role)) throw new BadRequestException('Noto\'g\'ri rol');

    const password_hash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: { account_id: accountId, email, password_hash, role: role as any },
    });

    await this.prisma.auditEvent.create({
      data: {
        account_id: accountId,
        user_id: adminUserId,
        action: 'USER_CREATED',
        new_value: { email, role },
      },
    });

    return { id: user.id, email: user.email, role: user.role, account_id: accountId };
  }

  /** List all users */
  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { created_at: 'desc' },
      include: { account: { select: { name: true } } },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      is_active: u.is_active,
      account_id: u.account_id,
      account_name: u.account.name,
      created_at: u.created_at,
    }));
  }

  /** Update user role */
  async updateUserRole(userId: string, role: string, adminUserId: string) {
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'];
    if (!allowedRoles.includes(role)) throw new BadRequestException('Noto\'g\'ri rol');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { role: role as any } }),
      this.prisma.auditEvent.create({
        data: {
          account_id: user.account_id,
          user_id: adminUserId,
          action: 'USER_ROLE_CHANGED',
          old_value: { role: user.role },
          new_value: { role, target_user: user.email },
        },
      }),
    ]);

    return { id: userId, role };
  }

  /** Toggle user active status */
  async toggleUserActive(userId: string, adminUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (userId === adminUserId) throw new BadRequestException('O\'zingizni o\'chira olmaysiz');

    const newActive = !user.is_active;
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { is_active: newActive } }),
      this.prisma.auditEvent.create({
        data: {
          account_id: user.account_id,
          user_id: adminUserId,
          action: newActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
          new_value: { target_user: user.email },
        },
      }),
    ]);

    return { id: userId, is_active: newActive };
  }

  async getAuditLog(limit = 50) {
    // Combine admin events + user activity into a unified audit log
    const [adminEvents, userActivities] = await Promise.all([
      this.prisma.auditEvent.findMany({
        orderBy: { created_at: 'desc' },
        take: limit,
        include: {
          user: { select: { email: true, role: true } },
          account: { select: { name: true } },
        },
      }),
      this.prisma.userActivity.findMany({
        orderBy: { created_at: 'desc' },
        take: limit,
        include: {
          user: { select: { email: true, role: true } },
          account: { select: { name: true } },
        },
      }),
    ]);

    const combined = [
      ...adminEvents.map((e) => ({
        id: e.id,
        action: e.action,
        account_name: e.account?.name ?? null,
        user_email: e.user?.email ?? null,
        old_value: e.old_value,
        new_value: e.new_value,
        details: null as any,
        ip: null as string | null,
        source: 'admin' as const,
        created_at: e.created_at,
      })),
      ...userActivities.map((a) => ({
        id: a.id,
        action: a.action,
        account_name: a.account?.name ?? null,
        user_email: a.user?.email ?? null,
        old_value: null,
        new_value: null,
        details: a.details,
        ip: a.ip,
        source: 'user' as const,
        created_at: a.created_at,
      })),
    ];

    combined.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    return combined.slice(0, limit);
  }

  // ============================================================
  // A. STATS METHODS
  // ============================================================

  /** A1 — Stats Overview */
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
        where: { logged_in_at: { gte: todayStart } },
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

  /** A2 — Revenue Stats */
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

  /** A3 — Growth Stats */
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

  /** A4 — Popular Products */
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

  /** A5 — Popular Categories */
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

  /** C1 — Realtime Stats */
  async getRealtimeStats() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [activeSessions, todayRequests, recentErrors, activityFeed] = await Promise.all([
      this.prisma.userSession.count({
        where: { logged_in_at: { gte: oneHourAgo } },
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
    ]);

    return {
      active_sessions: activeSessions,
      today_requests: todayRequests,
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

  /** C2 — Product Heatmap */
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

  /** C3 — Category Trends */
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

  /** C4 — System Health */
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

  /** D5 — Top Users */
  async getTopUsers(period: string, limit: number) {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const users = await this.prisma.user.findMany({
      where: { is_active: true },
      select: {
        id: true,
        email: true,
        account_id: true,
        account: { select: { name: true } },
      },
    });

    const userScores: {
      id: string;
      email: string;
      account_name: string;
      tracked_products: number;
      avg_score: number;
      total_weekly: number;
      discovery_runs: number;
      activity_count: number;
      activity_score: number;
    }[] = [];

    for (const user of users) {
      const [trackedCount, discoveryRuns, activityCount, trackedProducts] = await Promise.all([
        this.prisma.trackedProduct.count({
          where: { account_id: user.account_id },
        }),
        this.prisma.categoryRun.count({
          where: { account_id: user.account_id, created_at: { gte: since } },
        }),
        this.prisma.userActivity.count({
          where: { user_id: user.id, created_at: { gte: since } },
        }),
        this.prisma.trackedProduct.findMany({
          where: { account_id: user.account_id, is_active: true },
          include: {
            product: {
              include: { snapshots: { orderBy: { snapshot_at: 'desc' }, take: 1 } },
            },
          },
        }),
      ]);

      // Calculate avg_score and total_weekly from tracked products
      let totalScore = 0;
      let totalWeekly = 0;
      let scoreCount = 0;
      for (const tp of trackedProducts) {
        const snap = tp.product.snapshots[0];
        if (snap) {
          const score = Number(snap.score ?? 0);
          totalScore += score;
          totalWeekly += snap.weekly_bought ?? 0;
          scoreCount++;
        }
      }

      // Weighted composite score
      const activityScore = activityCount * 1 + discoveryRuns * 5 + trackedCount * 3;

      userScores.push({
        id: user.id,
        email: user.email,
        account_name: user.account.name,
        tracked_products: trackedCount,
        avg_score: scoreCount > 0 ? totalScore / scoreCount : 0,
        total_weekly: totalWeekly,
        discovery_runs: discoveryRuns,
        activity_count: activityCount,
        activity_score: activityScore,
      });
    }

    userScores.sort((a, b) => b.activity_score - a.activity_score);

    return userScores.slice(0, limit);
  }

  // ============================================================
  // B. USER MONITORING METHODS
  // ============================================================

  /** B1 — User Activity */
  async getUserActivity(
    userId: string,
    action?: string,
    from?: Date,
    to?: Date,
    page = 1,
    limit = 20,
  ) {
    const where: any = { user_id: userId };
    if (action) where.action = action;
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at.gte = from;
      if (to) where.created_at.lte = to;
    }

    const [items, total] = await Promise.all([
      this.prisma.userActivity.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.userActivity.count({ where }),
    ]);

    return {
      items: items.map((a) => ({
        id: a.id,
        action: a.action,
        details: a.details,
        ip: a.ip,
        user_agent: a.user_agent,
        created_at: a.created_at,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /** B2 — User Tracked Products */
  async getUserTrackedProducts(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { account_id: true },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const tracked = await this.prisma.trackedProduct.findMany({
      where: { account_id: user.account_id },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            category_id: true,
            snapshots: {
              orderBy: { snapshot_at: 'desc' },
              take: 1,
              select: { score: true, weekly_bought: true, snapshot_at: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const products = tracked.map((tp) => {
      const snap = tp.product.snapshots?.[0];
      return {
        tracked_id: tp.id,
        product_id: tp.product.id.toString(),
        title: tp.product.title,
        category_id: tp.product.category_id?.toString() ?? null,
        is_active: tp.is_active,
        score: snap?.score?.toString() ?? null,
        weekly_bought: snap?.weekly_bought ?? null,
        last_snapshot: snap?.snapshot_at ?? null,
        tracked_at: tp.created_at,
      };
    });

    const scores = products.map((p) => Number(p.score)).filter((s) => !isNaN(s));
    const totalWeekly = products.reduce((sum, p) => sum + (p.weekly_bought ?? 0), 0);

    return {
      products,
      summary: {
        total: products.length,
        active: products.filter((p) => p.is_active).length,
        avg_score: scores.length > 0
          ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(4))
          : null,
        total_weekly_bought: totalWeekly,
      },
    };
  }

  /** B3 — User Sessions */
  async getUserSessions(userId: string, limit = 20) {
    const sessions = await this.prisma.userSession.findMany({
      where: { user_id: userId },
      orderBy: { logged_in_at: 'desc' },
      take: limit,
    });

    return sessions.map((s) => ({
      id: s.id,
      ip: s.ip,
      user_agent: s.user_agent,
      device_type: s.device_type,
      logged_in_at: s.logged_in_at,
    }));
  }

  /** B4 — Account Transactions */
  async getAccountTransactions(accountId: string, page = 1, limit = 20) {
    const [transactions, total, account] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { account_id: accountId },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where: { account_id: accountId } }),
      this.prisma.account.findUnique({
        where: { id: accountId },
        select: { balance: true },
      }),
    ]);

    // Calculate summary
    const allTx = await this.prisma.transaction.aggregate({
      where: { account_id: accountId, type: 'CHARGE' },
      _sum: { amount: true },
    });
    const allDeposits = await this.prisma.transaction.aggregate({
      where: { account_id: accountId, type: 'DEPOSIT' },
      _sum: { amount: true },
    });

    return {
      items: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount.toString(),
        balance_before: t.balance_before.toString(),
        balance_after: t.balance_after.toString(),
        description: t.description,
        created_at: t.created_at,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
      summary: {
        total_charges: (allTx._sum.amount ?? BigInt(0)).toString(),
        total_deposits: (allDeposits._sum.amount ?? BigInt(0)).toString(),
        current_balance: (account?.balance ?? BigInt(0)).toString(),
      },
    };
  }

  /** B5 — User Usage */
  async getUserUsage(userId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { account_id: true },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const [todayByAction, allTimeByAction, apiKeys] = await Promise.all([
      this.prisma.userActivity.groupBy({
        by: ['action'],
        where: { user_id: userId, created_at: { gte: todayStart } },
        _count: { id: true },
      }),
      this.prisma.userActivity.groupBy({
        by: ['action'],
        where: { user_id: userId },
        _count: { id: true },
      }),
      this.prisma.apiKey.findMany({
        where: { account_id: user.account_id },
        select: {
          id: true,
          name: true,
          key_prefix: true,
          daily_limit: true,
          requests_today: true,
          is_active: true,
          last_used_at: true,
        },
      }),
    ]);

    return {
      today: todayByAction.map((g) => ({ action: g.action, count: g._count.id })),
      all_time: allTimeByAction.map((g) => ({ action: g.action, count: g._count.id })),
      api_keys: apiKeys,
    };
  }

  /** D1 — User Portfolio Summary */
  async getUserPortfolioSummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { account_id: true },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const tracked = await this.prisma.trackedProduct.findMany({
      where: { account_id: user.account_id, is_active: true },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            snapshots: {
              orderBy: { snapshot_at: 'desc' },
              take: 1,
              select: { score: true, weekly_bought: true },
            },
          },
        },
      },
    });

    const items = tracked.map((tp) => {
      const snap = tp.product.snapshots?.[0];
      return {
        product_id: tp.product.id.toString(),
        title: tp.product.title,
        score: snap?.score ? Number(snap.score) : 0,
        weekly_bought: snap?.weekly_bought ?? 0,
      };
    });

    const scores = items.map((i) => i.score).filter((s) => s > 0);
    const avgScore = scores.length > 0
      ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(4))
      : 0;
    const totalWeekly = items.reduce((sum, i) => sum + i.weekly_bought, 0);

    // Count trend directions (up/down/stable based on score threshold)
    let trendUp = 0;
    let trendDown = 0;
    let trendStable = 0;
    for (const item of items) {
      if (item.score >= 5) trendUp++;
      else if (item.score <= 2) trendDown++;
      else trendStable++;
    }

    // Top 5 by score
    const top5 = [...items].sort((a, b) => b.score - a.score).slice(0, 5);

    return {
      total_products: items.length,
      avg_score: avgScore,
      total_weekly: totalWeekly,
      trends: { up: trendUp, down: trendDown, stable: trendStable },
      top_5: top5.map((i) => ({
        product_id: i.product_id,
        title: i.title,
        score: i.score.toString(),
        weekly_bought: i.weekly_bought,
      })),
    };
  }

  /** D2 — User Discovery Results */
  async getUserDiscoveryResults(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { account_id: true },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const runs = await this.prisma.categoryRun.findMany({
      where: { account_id: user.account_id },
      orderBy: { created_at: 'desc' },
      include: {
        _count: { select: { winners: true } },
      },
    });

    const totalWinners = runs.reduce((sum, r) => sum + r._count.winners, 0);

    // Check how many winners were tracked
    const winnerProductIds = await this.prisma.categoryWinner.findMany({
      where: { run: { account_id: user.account_id } },
      select: { product_id: true },
    });
    const uniqueWinnerIds = [...new Set(winnerProductIds.map((w) => w.product_id))];
    const trackedFromWinners = uniqueWinnerIds.length > 0
      ? await this.prisma.trackedProduct.count({
          where: {
            account_id: user.account_id,
            product_id: { in: uniqueWinnerIds },
          },
        })
      : 0;

    return {
      total_runs: runs.length,
      total_winners: totalWinners,
      tracked_from_winners: trackedFromWinners,
      runs: runs.map((r) => ({
        id: r.id,
        category_id: r.category_id.toString(),
        status: r.status,
        total_products: r.total_products,
        processed: r.processed,
        winner_count: r._count.winners,
        started_at: r.started_at,
        finished_at: r.finished_at,
        created_at: r.created_at,
      })),
    };
  }

  /** D3 — User Campaigns */
  async getUserCampaigns(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { account_id: true },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const campaigns = await this.prisma.adCampaign.findMany({
      where: { account_id: user.account_id },
      orderBy: { created_at: 'desc' },
    });

    const items = campaigns.map((c) => {
      const spent = Number(c.spent_uzs);
      const revenue = Number(c.revenue_uzs);
      const roi = spent > 0 ? Number((((revenue - spent) / spent) * 100).toFixed(2)) : 0;
      const roas = spent > 0 ? Number((revenue / spent).toFixed(2)) : 0;

      return {
        id: c.id,
        name: c.name,
        platform: c.platform,
        status: c.status,
        budget_uzs: c.budget_uzs.toString(),
        spent_uzs: c.spent_uzs.toString(),
        revenue_uzs: c.revenue_uzs.toString(),
        impressions: c.impressions,
        clicks: c.clicks,
        conversions: c.conversions,
        roi,
        roas,
        start_date: c.start_date,
        end_date: c.end_date,
        created_at: c.created_at,
      };
    });

    const totalSpent = campaigns.reduce((s, c) => s + Number(c.spent_uzs), 0);
    const totalRevenue = campaigns.reduce((s, c) => s + Number(c.revenue_uzs), 0);

    return {
      campaigns: items,
      summary: {
        total_campaigns: campaigns.length,
        active_campaigns: campaigns.filter((c) => c.status === 'ACTIVE').length,
        total_spent: totalSpent.toString(),
        total_revenue: totalRevenue.toString(),
        overall_roi: totalSpent > 0
          ? Number((((totalRevenue - totalSpent) / totalSpent) * 100).toFixed(2))
          : 0,
      },
    };
  }

  /** D4 — User Competitor Stats */
  async getUserCompetitorStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { account_id: true },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const trackings = await this.prisma.competitorTracking.findMany({
      where: { account_id: user.account_id },
      include: {
        product: { select: { id: true, title: true } },
        competitor: { select: { id: true, title: true } },
        snapshots: {
          orderBy: { snapshot_at: 'desc' },
          take: 5,
        },
      },
    });

    return {
      total_trackings: trackings.length,
      active_trackings: trackings.filter((t) => t.is_active).length,
      trackings: trackings.map((t) => ({
        id: t.id,
        product: { id: t.product.id.toString(), title: t.product.title },
        competitor: { id: t.competitor.id.toString(), title: t.competitor.title },
        is_active: t.is_active,
        created_at: t.created_at,
        recent_snapshots: t.snapshots.map((s) => ({
          id: s.id,
          sell_price: s.sell_price?.toString() ?? null,
          full_price: s.full_price?.toString() ?? null,
          discount_pct: s.discount_pct,
          snapshot_at: s.snapshot_at,
        })),
      })),
    };
  }

  // ============================================================
  // C. ADMIN ACTIONS
  // ============================================================

  /** E1 — Impersonate User (returns user data for read-only token) */
  async impersonateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { account: { select: { id: true, name: true, status: true } } },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      account_id: user.account_id,
      account_name: user.account.name,
      account_status: user.account.status,
      is_active: user.is_active,
    };
  }

  /** E2 — Bulk Account Action */
  async bulkAccountAction(
    accountIds: string[],
    action: 'DEPOSIT' | 'SUSPEND' | 'ACTIVATE' | 'SET_FEE',
    params: { amount?: number; fee?: number; adminUserId: string },
  ) {
    let success = 0;
    let failed = 0;
    const errors: { account_id: string; error: string }[] = [];

    for (const accountId of accountIds) {
      try {
        switch (action) {
          case 'DEPOSIT': {
            if (!params.amount) throw new Error('Amount is required for DEPOSIT');
            await this.depositToAccount(accountId, params.amount, params.adminUserId);
            break;
          }
          case 'SUSPEND': {
            await this.updateAccountStatus(accountId, 'SUSPENDED', params.adminUserId);
            break;
          }
          case 'ACTIVATE': {
            await this.updateAccountStatus(accountId, 'ACTIVE', params.adminUserId);
            break;
          }
          case 'SET_FEE': {
            if (params.fee === undefined) throw new Error('Fee is required for SET_FEE');
            await this.setAccountDailyFee(accountId, params.fee, params.adminUserId);
            break;
          }
        }
        success++;
      } catch (err: any) {
        failed++;
        errors.push({ account_id: accountId, error: err.message ?? 'Unknown error' });
      }
    }

    return { success, failed, errors };
  }

  /** E3 — Send Notification */
  async sendNotification(
    message: string,
    type: string,
    target: 'all' | string[],
    adminUserId: string,
  ) {
    if (target === 'all') {
      await this.prisma.notification.create({
        data: {
          account_id: null,
          message,
          type,
          created_by: adminUserId,
        },
      });
      return { sent: 1, target: 'all' };
    }

    // target is array of account_ids
    const data = target.map((accountId) => ({
      account_id: accountId,
      message,
      type,
      created_by: adminUserId,
    }));

    await this.prisma.notification.createMany({ data });

    return { sent: target.length, target: 'specific_accounts' };
  }

  /** E4 — Update Account Status */
  async updateAccountStatus(accountId: string, status: string, adminUserId: string) {
    const validStatuses = ['ACTIVE', 'PAYMENT_DUE', 'SUSPENDED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Noto\'g\'ri status');
    }

    const account = await this.prisma.account.findUniqueOrThrow({
      where: { id: accountId },
      select: { status: true },
    });

    await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id: accountId },
        data: { status: status as any },
      }),
      this.prisma.auditEvent.create({
        data: {
          account_id: accountId,
          user_id: adminUserId,
          action: 'ACCOUNT_STATUS_CHANGED',
          old_value: { status: account.status },
          new_value: { status },
        },
      }),
    ]);

    return { id: accountId, status };
  }

  /** E5 — Global Search */
  async globalSearch(query: string) {
    const q = query.trim();
    if (!q) return { users: [], accounts: [], products: [] };

    const [users, accounts, products] = await Promise.all([
      this.prisma.user.findMany({
        where: { email: { contains: q, mode: 'insensitive' } },
        take: 5,
        select: { id: true, email: true, role: true, account_id: true, is_active: true },
      }),
      this.prisma.account.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        take: 5,
        select: { id: true, name: true, status: true, balance: true },
      }),
      this.prisma.product.findMany({
        where: { title: { contains: q, mode: 'insensitive' } },
        take: 5,
        select: { id: true, title: true, category_id: true },
      }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        account_id: u.account_id,
        is_active: u.is_active,
      })),
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        status: a.status,
        balance: a.balance.toString(),
      })),
      products: products.map((p) => ({
        id: p.id.toString(),
        title: p.title,
        category_id: p.category_id?.toString() ?? null,
      })),
    };
  }

  // ============================================================
  // D. FEEDBACK ADMIN METHODS
  // ============================================================

  /** F1 — Admin Feedback List */
  async getAdminFeedback(
    status?: string,
    type?: string,
    page = 1,
    limit = 20,
  ) {
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [tickets, total] = await Promise.all([
      this.prisma.feedbackTicket.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { email: true } },
          account: { select: { name: true } },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.feedbackTicket.count({ where }),
    ]);

    return {
      items: tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        type: t.type,
        priority: t.priority,
        status: t.status,
        user_email: t.user.email,
        account_name: t.account.name,
        message_count: t._count.messages,
        created_at: t.created_at,
        updated_at: t.updated_at,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /** F1 — Feedback Stats */
  async getFeedbackStats() {
    const byStatus = await this.prisma.feedbackTicket.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const statusMap: Record<string, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };
    for (const row of byStatus) {
      statusMap[row.status] = row._count.id;
    }

    const byType = await this.prisma.feedbackTicket.groupBy({
      by: ['type'],
      _count: { id: true },
    });

    const typeMap: Record<string, number> = {};
    for (const row of byType) {
      typeMap[row.type] = row._count.id;
    }

    const byPriority = await this.prisma.feedbackTicket.groupBy({
      by: ['priority'],
      _count: { id: true },
    });

    const priorityMap: Record<string, number> = {};
    for (const row of byPriority) {
      priorityMap[row.priority] = row._count.id;
    }

    return {
      by_status: statusMap,
      by_type: typeMap,
      by_priority: priorityMap,
      total: Object.values(statusMap).reduce((a, b) => a + b, 0),
    };
  }

  /** F1 — Feedback Detail */
  async getFeedbackDetail(ticketId: string) {
    const ticket = await this.prisma.feedbackTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { id: true, email: true } },
        account: { select: { id: true, name: true } },
        messages: {
          orderBy: { created_at: 'asc' },
          include: {
            sender: { select: { id: true, email: true } },
          },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket topilmadi');

    return {
      id: ticket.id,
      subject: ticket.subject,
      type: ticket.type,
      priority: ticket.priority,
      status: ticket.status,
      user: ticket.user,
      account: ticket.account,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
      messages: ticket.messages.map((m) => ({
        id: m.id,
        content: m.content,
        is_admin: m.is_admin,
        sender_email: m.sender.email,
        created_at: m.created_at,
      })),
    };
  }

  /** F1 — Update Feedback Status */
  async updateFeedbackStatus(ticketId: string, status: string, adminUserId: string) {
    const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Noto\'g\'ri status');
    }

    const ticket = await this.prisma.feedbackTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket topilmadi');

    await this.prisma.$transaction([
      this.prisma.feedbackTicket.update({
        where: { id: ticketId },
        data: { status: status as any },
      }),
      this.prisma.auditEvent.create({
        data: {
          account_id: ticket.account_id,
          user_id: adminUserId,
          action: 'FEEDBACK_STATUS_CHANGED',
          old_value: { status: ticket.status, ticket_id: ticketId },
          new_value: { status },
        },
      }),
    ]);

    return { id: ticketId, status };
  }

  /** F1 — Send Feedback Message */
  async sendFeedbackMessage(
    ticketId: string,
    senderId: string,
    content: string,
    isAdmin: boolean,
  ) {
    const ticket = await this.prisma.feedbackTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket topilmadi');

    const message = await this.prisma.feedbackMessage.create({
      data: {
        ticket_id: ticketId,
        sender_id: senderId,
        content,
        is_admin: isAdmin,
      },
    });

    // If admin replies and ticket is OPEN, move to IN_PROGRESS
    if (isAdmin && ticket.status === 'OPEN') {
      await this.prisma.feedbackTicket.update({
        where: { id: ticketId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    return {
      id: message.id,
      ticket_id: message.ticket_id,
      content: message.content,
      is_admin: message.is_admin,
      created_at: message.created_at,
    };
  }

  // ============================================================
  // E. USER NOTIFICATION METHODS
  // ============================================================

  /** E3 user side — Get User Notifications */
  async getUserNotifications(accountId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        OR: [
          { account_id: accountId },
          { account_id: null },
        ],
        is_read: false,
      },
      orderBy: { created_at: 'desc' },
    });

    return notifications.map((n) => ({
      id: n.id,
      message: n.message,
      type: n.type,
      is_read: n.is_read,
      created_at: n.created_at,
    }));
  }

  /** E3 user side — Mark Notification Read */
  async markNotificationRead(notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) throw new NotFoundException('Notification topilmadi');

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { is_read: true },
    });

    return { id: notificationId, is_read: true };
  }

  // ============================================================
  // G. LOG VIEWING METHODS
  // ============================================================

  private get logDir() {
    return path.join(process.cwd(), 'logs');
  }

  /** L1 — API Logs from NDJSON files */
  async getLogs(params: {
    date?: string;
    status?: number;
    status_gte?: number;
    endpoint?: string;
    method?: string;
    min_ms?: number;
    account_id?: string;
    limit: number;
    offset: number;
  }) {
    const date = params.date || new Date().toISOString().split('T')[0];
    const filters: LogFilter = {
      status: params.status,
      status_gte: params.status_gte,
      endpoint: params.endpoint,
      method: params.method,
      min_ms: params.min_ms,
      account_id: params.account_id,
    };

    const { entries, total } = await readLogFile(
      this.logDir,
      'api',
      date,
      filters,
      params.limit,
      params.offset,
    );

    const availableDates = getAvailableDates(this.logDir, 'api');

    return {
      date,
      entries,
      total,
      limit: params.limit,
      offset: params.offset,
      available_dates: availableDates,
    };
  }

  /** L2 — Performance Metrics */
  async getLogsPerformance(date?: string, top = 20) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const perf = await computePerformance(this.logDir, 'api', targetDate, top);
    return { date: targetDate, ...perf };
  }

  // ============================================================
  // F. EXPORT HELPERS
  // ============================================================

  /** Export — Users CSV data */
  async getExportUsersData() {
    const users = await this.prisma.user.findMany({
      orderBy: { created_at: 'desc' },
      include: { account: { select: { name: true, status: true, balance: true } } },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      is_active: u.is_active,
      account_id: u.account_id,
      account_name: u.account.name,
      account_status: u.account.status,
      account_balance: u.account.balance.toString(),
      created_at: u.created_at.toISOString(),
    }));
  }

  /** Export — Revenue CSV data */
  async getExportRevenueData(from?: Date, to?: Date) {
    const where: any = { type: 'CHARGE' };
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at.gte = from;
      if (to) where.created_at.lte = to;
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: { created_at: 'asc' },
      include: { account: { select: { name: true } } },
    });

    return transactions.map((t) => ({
      id: t.id,
      account_id: t.account_id,
      account_name: t.account.name,
      type: t.type,
      amount: t.amount.toString(),
      balance_before: t.balance_before.toString(),
      balance_after: t.balance_after.toString(),
      description: t.description ?? '',
      created_at: t.created_at.toISOString(),
    }));
  }

  /** Export — Activity CSV data */
  async getExportActivityData(from?: Date, to?: Date) {
    const where: any = {};
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at.gte = from;
      if (to) where.created_at.lte = to;
    }

    const activities = await this.prisma.userActivity.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 10000,
      include: { user: { select: { email: true } } },
    });

    return activities.map((a) => ({
      id: a.id,
      user_id: a.user_id,
      user_email: a.user.email,
      account_id: a.account_id,
      action: a.action,
      ip: a.ip ?? '',
      created_at: a.created_at.toISOString(),
    }));
  }

  /** Deposit Log — list all DEPOSIT transactions */
  async getDepositLog(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { type: 'DEPOSIT' as const };
    
    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          account: { select: { id: true, name: true, status: true } },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      items: items.map((t) => ({
        id: t.id,
        account_id: t.account_id,
        account_name: t.account.name,
        account_status: t.account.status,
        amount: t.amount.toString(),
        balance_before: t.balance_before.toString(),
        balance_after: t.balance_after.toString(),
        description: t.description,
        created_at: t.created_at,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /** Delete a single deposit log entry */
  async deleteDepositLog(transactionId: string) {
    const tx = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });
    if (!tx) throw new NotFoundException('Transaction topilmadi');
    if (tx.type !== 'DEPOSIT') throw new BadRequestException('Faqat DEPOSIT turidagi tranzaksiyalarni o\'chirish mumkin');
    
    await this.prisma.transaction.delete({
      where: { id: transactionId },
    });
    
    return { deleted: true };
  }
}
