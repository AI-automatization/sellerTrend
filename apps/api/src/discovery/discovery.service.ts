import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { enqueueDiscovery } from './discovery.queue';

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a DB record and enqueue to BullMQ worker.
   * Uses ReadCommitted transaction to prevent duplicate run creation.
   */
  async startRun(accountId: string, categoryId: number, categoryUrl?: string, categoryName?: string, fromSearch?: boolean): Promise<string> {
    const run = await this.prisma.$transaction(async (tx) => {
      // Prevent duplicate runs for same category while one is still pending/running
      const existing = await tx.categoryRun.findFirst({
        where: {
          account_id: accountId,
          category_id: BigInt(categoryId),
          status: { in: ['PENDING', 'RUNNING'] },
        },
      });
      if (existing) {
        throw new ConflictException(
          `Bu kategoriya uchun allaqachon ishlamoqda (run: ${existing.id}). Tugashini kuting.`,
        );
      }

      return tx.categoryRun.create({
        data: {
          account_id: accountId,
          category_id: BigInt(categoryId),
          status: 'PENDING',
          ...(categoryName ? { category_name: categoryName } : {}),
        },
      });
    }, { isolationLevel: 'ReadCommitted' });

    await enqueueDiscovery({ categoryId, runId: run.id, accountId, categoryUrl, categoryName, fromSearch });
    this.logger.log(`[run:${run.id}] Enqueued category ${categoryId} → BullMQ`);

    return run.id;
  }

  /** List runs for an account */
  async listRuns(accountId: string) {
    const runs = await this.prisma.categoryRun.findMany({
      where: { account_id: accountId },
      orderBy: { created_at: 'desc' },
      take: 20,
      include: { _count: { select: { winners: true } } },
    });

    return runs.map((r) => ({
      id: r.id,
      category_id: r.category_id.toString(),
      category_name: r.category_name,
      status: r.status,
      total_products: r.total_products,
      processed: r.processed,
      winner_count: r._count.winners,
      started_at: r.started_at,
      finished_at: r.finished_at,
      created_at: r.created_at,
    }));
  }

  /** Delete a run and its winners */
  async deleteRun(runId: string, accountId: string) {
    const run = await this.prisma.categoryRun.findFirst({
      where: { id: runId, account_id: accountId },
    });
    if (!run) throw new NotFoundException('Run not found');

    await this.prisma.categoryWinner.deleteMany({ where: { run_id: runId } });
    await this.prisma.categoryRun.delete({ where: { id: runId } });
    return { deleted: true };
  }

  /** Get run details with winners */
  async getRun(runId: string, accountId: string) {
    const run = await this.prisma.categoryRun.findFirst({
      where: { id: runId, account_id: accountId },
      include: {
        winners: {
          orderBy: { rank: 'asc' },
          include: {
            product: {
              select: {
                title: true,
                rating: true,
                feedback_quantity: true,
                photo_url: true,
                total_available_amount: true,
                shop: { select: { title: true, rating: true } },
              },
            },
          },
        },
      },
    });

    if (!run) throw new NotFoundException('Run not found');

    return {
      id: run.id,
      category_id: run.category_id.toString(),
      category_name: run.category_name,
      status: run.status,
      total_products: run.total_products,
      processed: run.processed,
      started_at: run.started_at,
      finished_at: run.finished_at,
      created_at: run.created_at,
      winners: run.winners.map((w) => ({
        rank: w.rank,
        product_id: w.product_id.toString(),
        title: w.product.title,
        score: w.score ? Number(w.score) : null,
        weekly_bought: w.weekly_bought,
        orders_quantity: w.orders_quantity?.toString(),
        sell_price: w.sell_price?.toString(),
        rating: w.product.rating ? Number(w.product.rating) : null,
        feedback_quantity: w.product.feedback_quantity,
        photo_url: w.product.photo_url,
        total_available_amount: w.product.total_available_amount?.toString() ?? null,
        shop_title: w.product.shop?.title ?? null,
        shop_rating: w.product.shop?.rating ? Number(w.product.shop.rating) : null,
      })),
    };
  }

  /** Latest completed run winners (leaderboard) */
  async getLeaderboard(accountId: string, categoryId?: number) {
    const latestRun = await this.prisma.categoryRun.findFirst({
      where: {
        account_id: accountId,
        status: 'DONE',
        ...(categoryId && { category_id: BigInt(categoryId) }),
      },
      orderBy: { finished_at: 'desc' },
      include: {
        winners: {
          orderBy: { rank: 'asc' },
          include: {
            product: {
              select: {
                title: true,
                rating: true,
                feedback_quantity: true,
                photo_url: true,
                total_available_amount: true,
                shop: { select: { title: true, rating: true } },
              },
            },
          },
        },
      },
    });

    if (!latestRun) return { run_id: null, category_id: null, category_name: null, winners: [] };

    return {
      run_id: latestRun.id,
      category_id: latestRun.category_id.toString(),
      category_name: latestRun.category_name,
      finished_at: latestRun.finished_at,
      winners: latestRun.winners.map((w) => ({
        rank: w.rank,
        product_id: w.product_id.toString(),
        title: w.product.title,
        score: w.score ? Number(w.score) : null,
        weekly_bought: w.weekly_bought,
        orders_quantity: w.orders_quantity?.toString(),
        sell_price: w.sell_price?.toString(),
        rating: w.product.rating ? Number(w.product.rating) : null,
        feedback_quantity: w.product.feedback_quantity,
        photo_url: w.product.photo_url,
        total_available_amount: w.product.total_available_amount?.toString() ?? null,
        shop_title: w.product.shop?.title ?? null,
        shop_rating: w.product.shop?.rating ? Number(w.product.shop.rating) : null,
      })),
    };
  }

  /** Seasonal calendar — list all seasonal trends */
  async getSeasonalCalendar(limit?: number) {
    const MAX_SEASONAL_TRENDS = 500;
    const take = Math.min(limit ?? MAX_SEASONAL_TRENDS, MAX_SEASONAL_TRENDS);

    const trends = await this.prisma.seasonalTrend.findMany({
      orderBy: { season_start: 'asc' },
      take,
    });

    return {
      events: trends.map((t) => ({
        id: t.id,
        season_name: t.season_name,
        season_start: t.season_start,
        season_end: t.season_end,
        avg_score_boost: t.avg_score_boost ? Number(t.avg_score_boost) : null,
        peak_week: t.peak_week,
        category_id: t.category_id?.toString() ?? null,
      })),
    };
  }

  /** Upcoming seasons — current + next month */
  async getUpcomingSeasons() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;

    const MAX_SEASONAL_TRENDS = 500;
    const trends = await this.prisma.seasonalTrend.findMany({
      orderBy: { season_start: 'asc' },
      take: MAX_SEASONAL_TRENDS,
    });

    const upcoming = trends.filter((t) => {
      if (t.season_start <= t.season_end) {
        return (
          (currentMonth >= t.season_start && currentMonth <= t.season_end) ||
          (nextMonth >= t.season_start && nextMonth <= t.season_end)
        );
      }
      return (
        currentMonth >= t.season_start ||
        currentMonth <= t.season_end ||
        nextMonth >= t.season_start ||
        nextMonth <= t.season_end
      );
    });

    return {
      current_month: currentMonth,
      events: upcoming.map((t) => ({
        id: t.id,
        season_name: t.season_name,
        season_start: t.season_start,
        season_end: t.season_end,
        avg_score_boost: t.avg_score_boost ? Number(t.avg_score_boost) : null,
        peak_week: t.peak_week,
      })),
    };
  }

  /**
   * Kategoriya intelligence: growing/saturating/declining/emerging klassifikatsiya.
   * category_metric_snapshots dan so'nggi 14 kun dinamikasiga qarab.
   */
  async getCategoryIntelligence(limit = 50): Promise<{
    categories: Array<{
      category_id: string;
      product_count: number;
      avg_score: number;
      avg_weekly_sold: number;
      weekly_sold_change_pct: number | null;
      trend: 'growing' | 'saturating' | 'declining' | 'emerging';
    }>;
    generated_at: string;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    // Her kategoriya uchun so'nggi 2 ta snapshot
    const rows = await this.prisma.$queryRaw<Array<{
      category_id: bigint;
      product_count: number;
      avg_score: number;
      avg_weekly_sold: number;
      snapshot_at: Date;
      rn: bigint;
    }>>`
      SELECT category_id, product_count,
             CAST(avg_score AS DOUBLE PRECISION) AS avg_score,
             avg_weekly_sold,
             snapshot_at,
             ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY snapshot_at DESC) AS rn
      FROM category_metric_snapshots
      WHERE snapshot_at >= ${since}
      ORDER BY category_id, snapshot_at DESC
    `;

    // Kategoriya bo'yicha guruhlashtirish
    const byCategory = new Map<string, { latest: typeof rows[0]; prev: typeof rows[0] | null }>();
    for (const row of rows) {
      const key = row.category_id.toString();
      const rn = Number(row.rn);
      if (rn === 1) {
        byCategory.set(key, { latest: row, prev: null });
      } else if (rn === 2) {
        const existing = byCategory.get(key);
        if (existing) existing.prev = row;
      }
    }

    const categories = Array.from(byCategory.entries())
      .map(([catId, { latest, prev }]) => {
        const currentWb = latest.avg_weekly_sold;
        const prevWb = prev?.avg_weekly_sold ?? null;

        let changePct: number | null = null;
        if (prevWb !== null && prevWb > 0) {
          changePct = ((currentWb - prevWb) / prevWb) * 100;
        }

        // Klassifikatsiya
        let trend: 'growing' | 'saturating' | 'declining' | 'emerging';
        if (latest.product_count < 10) {
          trend = 'emerging';
        } else if (changePct !== null && changePct > 10) {
          trend = 'growing';
        } else if (changePct !== null && changePct < -10) {
          trend = 'declining';
        } else {
          trend = 'saturating';
        }

        return {
          category_id: catId,
          product_count: latest.product_count,
          avg_score: Number(latest.avg_score.toFixed(4)),
          avg_weekly_sold: Math.round(currentWb),
          weekly_sold_change_pct: changePct !== null ? Math.round(changePct * 10) / 10 : null,
          trend,
        };
      })
      .sort((a, b) => b.avg_weekly_sold - a.avg_weekly_sold)
      .slice(0, limit);

    return {
      categories,
      generated_at: new Date().toISOString(),
    };
  }
}
