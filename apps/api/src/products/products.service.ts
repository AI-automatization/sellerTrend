import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTrackedProducts(accountId: string) {
    const tracked = await this.prisma.trackedProduct.findMany({
      where: { account_id: accountId, is_active: true },
      include: {
        product: {
          include: {
            snapshots: {
              orderBy: { snapshot_at: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    return tracked.map((t) => {
      const latest = t.product.snapshots[0];
      return {
        product_id: t.product.id.toString(),
        title: t.product.title,
        rating: t.product.rating,
        orders_quantity: t.product.orders_quantity?.toString(),
        score: latest?.score ? Number(latest.score) : null,
        weekly_bought: latest?.weekly_bought,
        tracked_since: t.created_at,
      };
    });
  }

  async trackProduct(accountId: string, productId: bigint) {
    return this.prisma.trackedProduct.upsert({
      where: {
        account_id_product_id: {
          account_id: accountId,
          product_id: productId,
        },
      },
      update: { is_active: true },
      create: {
        account_id: accountId,
        product_id: productId,
      },
    });
  }

  async getProductSnapshots(productId: bigint, limit = 30) {
    return this.prisma.productSnapshot.findMany({
      where: { product_id: productId },
      orderBy: { snapshot_at: 'desc' },
      take: limit,
      select: {
        score: true,
        weekly_bought: true,
        orders_quantity: true,
        rating: true,
        snapshot_at: true,
      },
    });
  }

  /**
   * 7-day score forecast using simple linear regression on snapshot history.
   */
  async getForecast(productId: bigint): Promise<{
    forecast_7d: number;
    trend: 'up' | 'flat' | 'down';
    slope: number;
    snapshots: Array<{ date: string; score: number }>;
  }> {
    const rows = await this.prisma.productSnapshot.findMany({
      where: { product_id: productId },
      orderBy: { snapshot_at: 'asc' },
      take: 30,
      select: { score: true, snapshot_at: true },
    });

    const snapshots = rows.map((s) => ({
      date: s.snapshot_at.toISOString(),
      score: Number(s.score ?? 0),
    }));

    if (snapshots.length < 2) {
      const latest = snapshots[0]?.score ?? 0;
      return { forecast_7d: latest, trend: 'flat', slope: 0, snapshots };
    }

    const n = snapshots.length;
    const xs = snapshots.map((_, i) => i);
    const ys = snapshots.map((s) => s.score);

    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
    const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);

    const denominator = n * sumX2 - sumX * sumX;
    const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
    const intercept = (sumY - slope * sumX) / n;

    const forecast7d = Math.max(0, intercept + slope * (n + 7));
    const trend: 'up' | 'flat' | 'down' =
      slope > 0.01 ? 'up' : slope < -0.01 ? 'down' : 'flat';

    return {
      forecast_7d: Number(forecast7d.toFixed(4)),
      trend,
      slope: Number(slope.toFixed(6)),
      snapshots,
    };
  }

  /**
   * Anomaly detection: returns true if the current score is a significant spike
   * compared to the last 7 days of history (> avg + 2*stddev, and diff > 1.0).
   */
  async detectAnomaly(productId: bigint, currentScore: number): Promise<boolean> {
    const history = await this.prisma.productSnapshot.findMany({
      where: { product_id: productId },
      orderBy: { snapshot_at: 'desc' },
      // Skip the very latest (just saved) and look at the 7 before it
      skip: 1,
      take: 7,
      select: { score: true },
    });

    if (history.length < 3) return false;

    const scores = history.map((s) => Number(s.score ?? 0));
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    return currentScore > avg + 2 * stdDev && currentScore - avg > 1.0;
  }

  /**
   * Check alert rules for SCORE_SPIKE and fire events when anomaly detected.
   */
  async fireScoreSpikeAlerts(productId: bigint, currentScore: number, message: string) {
    const rules = await this.prisma.alertRule.findMany({
      where: { product_id: productId, rule_type: 'SCORE_SPIKE', is_active: true },
      select: { id: true },
    });

    if (rules.length === 0) return;

    await this.prisma.alertEvent.createMany({
      data: rules.map((r) => ({
        rule_id: r.id,
        product_id: productId,
        message,
      })),
    });
  }
}
