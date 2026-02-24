import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateNicheScore } from '@uzum/utils';

@Injectable()
export class NicheService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find niches in a given category based on last discovery run winners.
   */
  async findNiches(accountId: string, categoryId?: number) {
    const latestRun = await this.prisma.categoryRun.findFirst({
      where: {
        account_id: accountId,
        status: 'DONE',
        ...(categoryId && { category_id: BigInt(categoryId) }),
      },
      orderBy: { finished_at: 'desc' },
      include: {
        winners: {
          include: {
            product: {
              select: {
                title: true,
                shop_id: true,
                category_id: true,
                feedback_quantity: true,
              },
            },
          },
        },
      },
    });

    if (!latestRun || latestRun.winners.length === 0) {
      return { run_id: null, niches: [] };
    }

    const winners = latestRun.winners;

    // Compute normalization bounds
    const weeklyBoughts = winners.map((w) => w.weekly_bought ?? 0);
    const maxWb = Math.max(...weeklyBoughts, 1);

    // Seller count per category: count distinct shop_ids
    const shopIds = new Set(
      winners.map((w) => w.product.shop_id?.toString()),
    );
    const sellerCount = shopIds.size;
    const maxSellers = Math.max(sellerCount, 1);

    // Score growth: compare rank position (higher rank = lower growth potential)
    const scores = winners.map((w) => Number(w.score ?? 0));
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length || 1;

    const niches = winners.map((w) => {
      const wb = w.weekly_bought ?? 0;
      const score = Number(w.score ?? 0);

      const nicheScore = calculateNicheScore({
        demand: wb / maxWb,
        competition: sellerCount / (maxSellers * 2), // normalize down
        growth: score > avgScore ? Math.min((score - avgScore) / avgScore, 1) : 0,
        margin: 0.5, // default estimate without price data
      });

      return {
        product_id: w.product_id.toString(),
        title: w.product.title,
        score: Number(w.score),
        weekly_bought: wb,
        niche_score: Number(nicheScore.toFixed(4)),
        is_opportunity: nicheScore > 0.65,
        category_id: w.product.category_id?.toString() ?? null,
      };
    });

    niches.sort((a, b) => b.niche_score - a.niche_score);

    return {
      run_id: latestRun.id,
      category_id: latestRun.category_id.toString(),
      total: niches.length,
      opportunities: niches.filter((n) => n.is_opportunity).length,
      niches,
    };
  }

  /**
   * Find demand-supply gaps: high demand + low seller count.
   */
  async findGaps(accountId: string, categoryId?: number) {
    const latestRun = await this.prisma.categoryRun.findFirst({
      where: {
        account_id: accountId,
        status: 'DONE',
        ...(categoryId && { category_id: BigInt(categoryId) }),
      },
      orderBy: { finished_at: 'desc' },
      include: {
        winners: {
          include: {
            product: {
              select: { title: true, shop_id: true },
            },
          },
        },
      },
    });

    if (!latestRun || latestRun.winners.length === 0) {
      return { run_id: null, gaps: [] };
    }

    const winners = latestRun.winners;
    const weeklyBoughts = winners.map((w) => w.weekly_bought ?? 0);
    const avgWb =
      weeklyBoughts.reduce((a, b) => a + b, 0) / weeklyBoughts.length || 1;

    // Count sellers (distinct shops)
    const shopCounts = new Map<string, number>();
    for (const w of winners) {
      const sid = w.product.shop_id?.toString() ?? 'unknown';
      shopCounts.set(sid, (shopCounts.get(sid) ?? 0) + 1);
    }
    const avgSellerProducts =
      [...shopCounts.values()].reduce((a, b) => a + b, 0) /
        shopCounts.size || 1;

    // Gaps: high demand (>1.5x avg) AND low competition
    const gaps = winners
      .filter((w) => {
        const wb = w.weekly_bought ?? 0;
        return wb > avgWb * 1.5;
      })
      .map((w) => ({
        product_id: w.product_id.toString(),
        title: w.product.title,
        weekly_bought: w.weekly_bought ?? 0,
        score: Number(w.score),
        demand_ratio: Number(
          ((w.weekly_bought ?? 0) / avgWb).toFixed(2),
        ),
      }))
      .sort((a, b) => b.demand_ratio - a.demand_ratio);

    return {
      run_id: latestRun.id,
      category_id: latestRun.category_id.toString(),
      avg_weekly_bought: Math.round(avgWb),
      seller_count: shopCounts.size,
      gaps,
    };
  }
}
