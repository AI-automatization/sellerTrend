import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminUserService {
  constructor(private readonly prisma: PrismaService) {}

  /** List all users (paginated) */
  async listUsers(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          role: true,
          is_active: true,
          account_id: true,
          created_at: true,
          account: { select: { name: true } },
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      items: users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        is_active: u.is_active,
        account_id: u.account_id,
        account_name: u.account.name,
        created_at: u.created_at,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
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
      data: { account_id: accountId, email, password_hash, role: role as UserRole },
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

  /** Change user password (admin action) */
  async changeUserPassword(userId: string, newPassword: string, adminUserId: string) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Parol kamida 6 ta belgidan iborat bo\'lishi kerak');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const password_hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password_hash },
    });

    await this.prisma.auditEvent.create({
      data: {
        account_id: user.account_id,
        user_id: adminUserId,
        action: 'PASSWORD_CHANGED',
        new_value: { target_user_id: userId, target_email: user.email },
      },
    });

    return { success: true, message: 'Parol o\'zgartirildi' };
  }

  /** Update user role */
  async updateUserRole(userId: string, role: string, adminUserId: string) {
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'];
    if (!allowedRoles.includes(role)) throw new BadRequestException('Noto\'g\'ri rol');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { role: role as UserRole } }),
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

  /** Impersonate User (returns user data for read-only token) */
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

  /** User Activity */
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

  /** User Tracked Products */
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

  /** User Sessions */
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

  /** User Usage */
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

  /** User Portfolio Summary */
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

  /** User Discovery Results */
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

  /** User Campaigns */
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

  /** User Competitor Stats */
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

  /** Account Transactions */
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
}
