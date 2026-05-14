import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { forecastEnsemble, calcInstallmentRate, recalcWeeklyBoughtSeries } from '@uzum/utils';

function assertOwnership(tracked: unknown): asserts tracked is NonNullable<typeof tracked> {
  if (!tracked) throw new NotFoundException('Product not found');
}

@Injectable()
export class ProductAnalyticsService {
  private readonly logger = new Logger(ProductAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProductSnapshots(productId: bigint, accountId: string, limit = 30) {
    const tracked = await this.prisma.trackedProduct.findUnique({
      where: { account_id_product_id: { account_id: accountId, product_id: productId } },
      select: { id: true },
    });
    assertOwnership(tracked);

    const rows = await this.prisma.productSnapshot.findMany({
      where: { product_id: productId },
      orderBy: { snapshot_at: 'desc' },
      take: limit,
      select: { score: true, weekly_bought: true, weekly_bought_source: true, orders_quantity: true, rating: true, snapshot_at: true },
    });

    return rows.map((s) => ({
      score: s.score ? Number(s.score) : null,
      weekly_bought: s.weekly_bought ?? 0,
      orders_quantity: s.orders_quantity ? Number(s.orders_quantity) : null,
      rating: s.rating ? Number(s.rating) : null,
      snapshot_at: s.snapshot_at,
    }));
  }

  async getForecast(productId: bigint, accountId: string): Promise<{
    forecast_7d: number; trend: 'up' | 'flat' | 'down'; slope: number;
    snapshots: Array<{ date: string; score: number }>;
  }> {
    const tracked = await this.prisma.trackedProduct.findUnique({
      where: { account_id_product_id: { account_id: accountId, product_id: productId } },
      select: { id: true },
    });
    assertOwnership(tracked);

    const rows = await this.prisma.productSnapshot.findMany({
      where: { product_id: productId },
      orderBy: { snapshot_at: 'asc' },
      take: 30,
      select: { score: true, snapshot_at: true },
    });

    const snapshots = rows.map((s) => ({ date: s.snapshot_at.toISOString(), score: Number(s.score ?? 0) }));
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
    const trend: 'up' | 'flat' | 'down' = slope > 0.01 ? 'up' : slope < -0.01 ? 'down' : 'flat';

    return { forecast_7d: Number(forecast7d.toFixed(4)), trend, slope: Number(slope.toFixed(6)), snapshots };
  }

  async getAdvancedForecast(productId: bigint, accountId: string) {
    const tracked = await this.prisma.trackedProduct.findUnique({
      where: { account_id_product_id: { account_id: accountId, product_id: productId } },
      select: { id: true },
    });
    assertOwnership(tracked);

    const rows = await this.prisma.productSnapshot.findMany({
      where: { product_id: productId },
      orderBy: { snapshot_at: 'asc' },
      take: 60,
      select: { score: true, weekly_bought: true, orders_quantity: true, snapshot_at: true },
    });

    const scoreValues = rows.map((s) => Number(s.score ?? 0));
    const dates = rows.map((s) => s.snapshot_at.toISOString());
    const storedWb = rows.map((s) => s.weekly_bought ?? 0);
    const recalcWb = recalcWeeklyBoughtSeries(rows);
    const wbValues = storedWb.map((v, i) => v > 0 ? v : (recalcWb[i] ?? 0));

    return {
      score_forecast: forecastEnsemble(scoreValues, dates, 7),
      sales_forecast: forecastEnsemble(wbValues, dates, 7),
      snapshots: rows.map((s, i) => ({ date: s.snapshot_at.toISOString(), score: Number(s.score ?? 0), weekly_bought: wbValues[i] })),
      data_points: rows.length,
    };
  }

  async detectAnomaly(productId: bigint, currentScore: number): Promise<boolean> {
    const history = await this.prisma.productSnapshot.findMany({
      where: { product_id: productId },
      orderBy: { snapshot_at: 'desc' },
      skip: 1,
      take: 7,
      select: { score: true },
    });
    if (history.length < 3) return false;
    const scores = history.map((s) => Number(s.score ?? 0));
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
    return currentScore > avg + 2 * Math.sqrt(variance) && currentScore - avg > 1.0;
  }

  async fireScoreSpikeAlerts(productId: bigint, currentScore: number, message: string) {
    const rules = await this.prisma.alertRule.findMany({
      where: { product_id: productId, rule_type: 'SCORE_SPIKE', is_active: true },
      select: { id: true },
    });
    if (rules.length === 0) return;
    await this.prisma.alertEvent.createMany({
      data: rules.map((r) => ({ rule_id: r.id, product_id: productId, message })),
    });
  }

  async getDailySalesHistory(productId: bigint, accountId: string): Promise<Array<{
    date: string; daily_orders_delta: number | null; max_orders: number | null; avg_score: number | null;
  }>> {
    const tracked = await this.prisma.trackedProduct.findUnique({
      where: { account_id_product_id: { account_id: accountId, product_id: productId } },
      select: { id: true },
    });
    assertOwnership(tracked);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.productSnapshotDaily.findMany({
      where: { product_id: productId, day: { gte: thirtyDaysAgo } },
      orderBy: { day: 'asc' },
      select: { day: true, daily_orders_delta: true, max_orders: true, avg_score: true },
    });

    return rows.map((r) => ({
      date: r.day.toISOString().split('T')[0],
      daily_orders_delta: r.daily_orders_delta != null ? Number(r.daily_orders_delta) : null,
      max_orders: r.max_orders != null ? Number(r.max_orders) : null,
      avg_score: r.avg_score != null ? Number(r.avg_score) : null,
    }));
  }

  async getInstallments(productId: bigint, accountId: string) {
    const tracked = await this.prisma.trackedProduct.findUnique({
      where: { account_id_product_id: { account_id: accountId, product_id: productId } },
      select: { id: true },
    });
    assertOwnership(tracked);

    const skus = await this.prisma.sku.findMany({
      where: { product_id: productId },
      select: {
        id: true, min_sell_price: true,
        sku_snapshots: {
          orderBy: { snapshot_at: 'desc' },
          take: 1,
          select: { sell_price: true, installment_3m: true, installment_6m: true, installment_12m: true, installment_24m: true, snapshot_at: true },
        },
      },
    });

    return skus.filter((s) => s.sku_snapshots.length > 0).map((s) => {
      const snap = s.sku_snapshots[0];
      const price = Number(snap.sell_price ?? s.min_sell_price ?? 0);
      const toNum = (v: bigint | null): number | null => v != null ? Number(v) : null;
      const m3 = toNum(snap.installment_3m);
      const m6 = toNum(snap.installment_6m);
      const m12 = toNum(snap.installment_12m);
      const m24 = toNum(snap.installment_24m);
      return {
        sku_id: s.id.toString(),
        sell_price: price,
        installments: {
          m3:  m3  != null ? { monthly: m3,  total: m3  * 3,  rate: calcInstallmentRate(price, m3,  3)  } : null,
          m6:  m6  != null ? { monthly: m6,  total: m6  * 6,  rate: calcInstallmentRate(price, m6,  6)  } : null,
          m12: m12 != null ? { monthly: m12, total: m12 * 12, rate: calcInstallmentRate(price, m12, 12) } : null,
          m24: m24 != null ? { monthly: m24, total: m24 * 24, rate: calcInstallmentRate(price, m24, 24) } : null,
        },
        snapshot_at: snap.snapshot_at,
      };
    });
  }
}
