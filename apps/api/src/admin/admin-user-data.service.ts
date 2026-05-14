import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminUserDataService {
  constructor(private readonly prisma: PrismaService) {}

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

    let trendUp = 0;
    let trendDown = 0;
    let trendStable = 0;
    for (const item of items) {
      if (item.score >= 5) trendUp++;
      else if (item.score <= 2) trendDown++;
      else trendStable++;
    }

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

  async getAccountTransactions(accountId: string, page = 1, limit = 20) {
    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { account_id: accountId },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where: { account_id: accountId } }),
    ]);

    return {
      items: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount.toString(),
        description: t.description,
        created_at: t.created_at,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }
}
