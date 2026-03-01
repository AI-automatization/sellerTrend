import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { forecastEnsemble, calcWeeklyBought } from '@uzum/utils';

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
              take: 20,
              select: {
                id: true, product_id: true, orders_quantity: true, weekly_bought: true,
                weekly_bought_source: true, rating: true, feedback_quantity: true, score: true, snapshot_at: true,
              },
            },
            skus: {
              where: { is_available: true },
              orderBy: { min_sell_price: 'asc' },
              take: 1,
            },
          },
        },
      },
    });

    return tracked.map((t) => {
      const snaps = t.product.snapshots; // DESC order
      const latest = snaps[0];
      const sku = t.product.skus[0];

      // Score trend from last two snapshots with meaningful gap
      const prev = snaps.length > 1 ? snaps[1] : null;
      const latestScore = latest?.score ? Number(latest.score) : null;
      const prevScore = prev?.score ? Number(prev.score) : null;
      const trend =
        latestScore !== null && prevScore !== null
          ? latestScore > prevScore + 0.05
            ? 'up'
            : latestScore < prevScore - 0.05
            ? 'down'
            : 'flat'
          : null;

      // Prefer stored scraped weekly_bought; fallback to calculated (transitional)
      let weeklyBought: number | null = null;
      const scrapedSnap = snaps.find((s) => (s as any).weekly_bought_source === 'scraped' && s.weekly_bought != null);
      if (scrapedSnap) {
        weeklyBought = scrapedSnap.weekly_bought;
      } else {
        const currentOrders = Number(latest?.orders_quantity ?? t.product.orders_quantity ?? 0);
        const currentTime = latest?.snapshot_at?.getTime() ?? Date.now();
        weeklyBought = calcWeeklyBought(snaps, currentOrders, currentTime);
      }

      return {
        product_id: t.product.id.toString(),
        title: t.product.title,
        rating: t.product.rating,
        feedback_quantity: t.product.feedback_quantity,
        orders_quantity: t.product.orders_quantity?.toString(),
        score: latestScore,
        prev_score: prevScore,
        trend,
        weekly_bought: weeklyBought,
        sell_price: sku?.min_sell_price ? Number(sku.min_sell_price) : null,
        photo_url: t.product.photo_url ?? null,
        tracked_since: t.created_at,
      };
    });
  }

  async getProductById(productId: bigint, _accountId?: string) {
    // Separate queries to avoid N+1 on ai_explanations (was: 20 nested includes → 20 queries)
    const [product, latestAi] = await Promise.all([
      this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          snapshots: {
            orderBy: { snapshot_at: 'desc' },
            take: 20,
            select: {
              id: true, product_id: true, orders_quantity: true, weekly_bought: true,
              weekly_bought_source: true, rating: true, feedback_quantity: true, score: true, snapshot_at: true,
            },
          },
          skus: {
            where: { is_available: true },
            orderBy: { min_sell_price: 'asc' },
            take: 1,
          },
          shop: true,
        },
      }),
      this.prisma.productAiExplanation.findFirst({
        where: { product_id: productId },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    if (!product) return null;

    const snaps = product.snapshots; // DESC order
    const latest = snaps[0];
    const sku = product.skus[0];
    const aiRaw = latestAi?.explanation;
    let ai_explanation: string[] | null = null;
    if (aiRaw) {
      try {
        ai_explanation = JSON.parse(aiRaw);
      } catch {
        ai_explanation = [aiRaw];
      }
    }

    // Prefer stored scraped weekly_bought; fallback to calculated (transitional)
    let weeklyBought: number | null = null;
    const scrapedSnap = snaps.find((s) => s.weekly_bought_source === 'scraped' && s.weekly_bought != null);
    if (scrapedSnap) {
      weeklyBought = scrapedSnap.weekly_bought;
    } else {
      const currentOrders = Number(latest?.orders_quantity ?? product.orders_quantity ?? 0);
      const currentTime = latest?.snapshot_at?.getTime() ?? Date.now();
      weeklyBought = calcWeeklyBought(snaps, currentOrders, currentTime);
    }

    return {
      product_id: product.id.toString(),
      title: product.title,
      rating: product.rating ? Number(product.rating) : null,
      feedback_quantity: product.feedback_quantity,
      orders_quantity: product.orders_quantity?.toString(),
      shop_name: product.shop?.title ?? null,
      score: latest?.score ? Number(latest.score) : null,
      weekly_bought: weeklyBought,
      sell_price: sku?.min_sell_price ? Number(sku.min_sell_price) : null,
      stock_type: sku?.stock_type ?? null,
      photo_url: product.photo_url ?? null,
      total_available_amount: product.total_available_amount?.toString() ?? null,
      ai_explanation,
      last_updated: latest?.snapshot_at ?? product.updated_at,
    };
  }

  async trackProduct(accountId: string, productId: bigint) {
    const tp = await this.prisma.trackedProduct.upsert({
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
    return { ...tp, product_id: tp.product_id.toString() };
  }

  async getProductSnapshots(productId: bigint, limit = 30) {
    const rows = await this.prisma.productSnapshot.findMany({
      where: { product_id: productId },
      orderBy: { snapshot_at: 'desc' },
      take: limit,
      select: {
        score: true,
        weekly_bought: true,
        weekly_bought_source: true,
        orders_quantity: true,
        rating: true,
        snapshot_at: true,
      },
    });

    return rows.map((s) => ({
      score: s.score ? Number(s.score) : null,
      weekly_bought: s.weekly_bought ?? 0,
      orders_quantity: s.orders_quantity ? Number(s.orders_quantity) : null,
      rating: s.rating ? Number(s.rating) : null,
      snapshot_at: s.snapshot_at,
    }));
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
   * ML-enhanced forecast: ensemble of WMA + Holt + Linear with confidence intervals.
   * Returns forecasts for both score and weekly_bought metrics.
   */
  async getAdvancedForecast(productId: bigint) {
    const rows = await this.prisma.productSnapshot.findMany({
      where: { product_id: productId },
      orderBy: { snapshot_at: 'asc' },
      take: 60,
      select: { score: true, weekly_bought: true, orders_quantity: true, snapshot_at: true },
    });

    const scoreValues = rows.map((s) => Number(s.score ?? 0));
    const wbValues = rows.map((s) => s.weekly_bought ?? 0);
    const dates = rows.map((s) => s.snapshot_at.toISOString());

    const scoreForecast = forecastEnsemble(scoreValues, dates, 7);
    const salesForecast = forecastEnsemble(wbValues, dates, 7);

    return {
      score_forecast: scoreForecast,
      sales_forecast: salesForecast,
      snapshots: rows.map((s, i) => ({
        date: s.snapshot_at.toISOString(),
        score: Number(s.score ?? 0),
        weekly_bought: wbValues[i],
      })),
      data_points: rows.length,
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

  /**
   * 7-day weekly trend: orders delta, sales velocity, dynamic seller advice.
   * Calculates actual weekly_bought from ordersAmount delta between snapshots.
   */
  async getWeeklyTrend(productId: bigint): Promise<{
    weekly_sold: number | null;
    prev_weekly_sold: number | null;
    delta: number | null;
    delta_pct: number | null;
    trend: 'up' | 'flat' | 'down';
    daily_breakdown: Array<{ date: string; orders: number; daily_sold: number }>;
    advice: { type: string; title: string; message: string; urgency: 'high' | 'medium' | 'low' };
    score_change: number | null;
    last_updated: string | null;
  }> {
    // Get last 14 days of snapshots for comparison
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const snapshots = await this.prisma.productSnapshot.findMany({
      where: {
        product_id: productId,
        snapshot_at: { gte: twoWeeksAgo },
      },
      orderBy: { snapshot_at: 'asc' },
      select: {
        orders_quantity: true,
        weekly_bought: true,
        score: true,
        snapshot_at: true,
      },
    });

    if (snapshots.length < 2) {
      return {
        weekly_sold: null,
        prev_weekly_sold: null,
        delta: null,
        delta_pct: null,
        trend: 'flat',
        daily_breakdown: [],
        advice: {
          type: 'info',
          title: 'Birinchi tahlil',
          message: "Hali yetarli ma'lumot yo'q. 24 soatdan keyin avtomatik yangilanadi va haftalik trend ko'rsatiladi.",
          urgency: 'low',
        },
        score_change: null,
        last_updated: snapshots[snapshots.length - 1]?.snapshot_at?.toISOString() ?? null,
      };
    }

    const latest = snapshots[snapshots.length - 1];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Find the snapshot closest to 7 days ago
    let weekAgoSnapshot = snapshots[0];
    for (const snap of snapshots) {
      if (snap.snapshot_at <= sevenDaysAgo) {
        weekAgoSnapshot = snap;
      }
    }

    // Calculate current week's orders delta
    const latestOrders = Number(latest.orders_quantity ?? 0);
    const weekAgoOrders = Number(weekAgoSnapshot.orders_quantity ?? 0);
    const daysSinceWeekAgo =
      (latest.snapshot_at.getTime() - weekAgoSnapshot.snapshot_at.getTime()) / (1000 * 60 * 60 * 24);

    let weeklySold: number | null = null;
    if (daysSinceWeekAgo > 0 && latestOrders >= weekAgoOrders) {
      weeklySold = Math.round(((latestOrders - weekAgoOrders) * 7) / daysSinceWeekAgo);
    }

    // Find the snapshot closest to 14 days ago for prev week comparison
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    let twoWeekAgoSnapshot = snapshots[0];
    for (const snap of snapshots) {
      if (snap.snapshot_at <= fourteenDaysAgo) {
        twoWeekAgoSnapshot = snap;
      }
    }

    let prevWeeklySold: number | null = null;
    const twoWeekOrders = Number(twoWeekAgoSnapshot.orders_quantity ?? 0);
    const daysBetweenWeeks =
      (weekAgoSnapshot.snapshot_at.getTime() - twoWeekAgoSnapshot.snapshot_at.getTime()) / (1000 * 60 * 60 * 24);

    if (daysBetweenWeeks > 0 && weekAgoOrders >= twoWeekOrders) {
      prevWeeklySold = Math.round(((weekAgoOrders - twoWeekOrders) * 7) / daysBetweenWeeks);
    }

    // Delta
    const delta = weeklySold != null && prevWeeklySold != null
      ? weeklySold - prevWeeklySold
      : null;
    const deltaPct = delta != null && prevWeeklySold != null && prevWeeklySold > 0
      ? Number(((delta / prevWeeklySold) * 100).toFixed(1))
      : null;

    // Trend
    const trend: 'up' | 'flat' | 'down' =
      delta != null && delta > 5 ? 'up' :
      delta != null && delta < -5 ? 'down' : 'flat';

    // Daily breakdown from snapshots
    const dailyBreakdown = snapshots.slice(-8).map((snap, i, arr) => {
      const prevOrders = i > 0 ? Number(arr[i - 1].orders_quantity ?? 0) : Number(snap.orders_quantity ?? 0);
      const currOrders = Number(snap.orders_quantity ?? 0);
      const prevTime = i > 0 ? arr[i - 1].snapshot_at.getTime() : snap.snapshot_at.getTime();
      const currTime = snap.snapshot_at.getTime();
      const daysDiff = Math.max(0.5, (currTime - prevTime) / (1000 * 60 * 60 * 24));
      const dailySold = i > 0 ? Math.round((currOrders - prevOrders) / daysDiff) : 0;

      return {
        date: snap.snapshot_at.toISOString().split('T')[0],
        orders: currOrders,
        daily_sold: Math.max(0, dailySold),
      };
    });

    // Score change
    const latestScore = Number(latest.score ?? 0);
    const weekAgoScore = Number(weekAgoSnapshot.score ?? 0);
    const scoreChange = latestScore - weekAgoScore;

    // Dynamic seller advice
    const advice = generateSellerAdvice(weeklySold, prevWeeklySold, delta, deltaPct, trend, latestScore);

    return {
      weekly_sold: weeklySold,
      prev_weekly_sold: prevWeeklySold,
      delta,
      delta_pct: deltaPct,
      trend,
      daily_breakdown: dailyBreakdown.slice(1), // Skip first (no delta)
      advice,
      score_change: scoreChange !== 0 ? Number(scoreChange.toFixed(4)) : null,
      last_updated: latest.snapshot_at.toISOString(),
    };
  }
}

/**
 * Generate dynamic seller advice based on weekly trend data.
 */
function generateSellerAdvice(
  weeklySold: number | null,
  prevWeeklySold: number | null,
  delta: number | null,
  deltaPct: number | null,
  trend: 'up' | 'flat' | 'down',
  score: number,
): { type: string; title: string; message: string; urgency: 'high' | 'medium' | 'low' } {

  // Strong growth
  if (trend === 'up' && delta != null && delta > 50) {
    return {
      type: 'growth',
      title: "Kuchli o'sish!",
      message: `Haftalik sotuv +${delta} ta o'sdi (${deltaPct != null ? deltaPct + '%' : ''}). Bu mahsulotga talab oshmoqda. Stokni ko'paytiring va narxni biroz oshirishni ko'rib chiqing — talab yuqori bo'lganda margin yaxshilash imkoniyati.`,
      urgency: 'high',
    };
  }

  // Moderate growth
  if (trend === 'up' && delta != null && delta > 10) {
    return {
      type: 'growth',
      title: 'Sotuv o\'smoqda',
      message: `Haftalik sotuv +${delta} ta. Barqaror o'sish ko'rsatmoqda. Reklama xarajatlarini oshirib, o'sishni tezlashtirish mumkin. FBO ombori bo'lsa, stok yetarliligini tekshiring.`,
      urgency: 'medium',
    };
  }

  // Stable sales
  if (trend === 'flat' && weeklySold != null && weeklySold > 20) {
    return {
      type: 'stable',
      title: 'Barqaror sotuv',
      message: `Haftalik ${weeklySold} ta sotuv — barqaror darajada. Raqobatchilarga e'tibor bering: agar ular narx tushirsa, siz ham moslashishingiz kerak bo'ladi.`,
      urgency: 'low',
    };
  }

  // Declining sales
  if (trend === 'down' && delta != null && delta < -20) {
    return {
      type: 'decline',
      title: 'Sotuv tushmoqda!',
      message: `Haftalik sotuv ${delta} ta kamaydi (${deltaPct != null ? deltaPct + '%' : ''}). Shoshilinch: narxni qayta ko'rib chiqing, rasm va tavsifni yangilang, yoki aksiya e'lon qiling. Raqiblar narx tushirgan bo'lishi mumkin.`,
      urgency: 'high',
    };
  }

  // Moderate decline
  if (trend === 'down') {
    return {
      type: 'decline',
      title: 'Sekinlashish',
      message: `Sotuv biroz kamaymoqda. Raqiblar narxini tekshiring va mahsulot rasmlarini yangilang. Mavsumiy o'zgarish bo'lishi ham mumkin.`,
      urgency: 'medium',
    };
  }

  // Low sales
  if (weeklySold != null && weeklySold < 5) {
    return {
      type: 'low',
      title: 'Past sotuv',
      message: `Haftalik faqat ${weeklySold} ta sotuv. Narxni pasaytiring, SEO sarlavhani optimallang, yoki Uzum reklamasini yoqing. Raqobatli kategoriyada bo'lsangiz niche topishga harakat qiling.`,
      urgency: 'medium',
    };
  }

  // First analysis / not enough data
  if (weeklySold == null) {
    return {
      type: 'info',
      title: "Ma'lumot to'planmoqda",
      message: "Tizim 24 soatdan keyin avtomatik qayta tahlil qiladi. Shu vaqtda haftalik trend va maslahatlar paydo bo'ladi.",
      urgency: 'low',
    };
  }

  // Default: high score product
  if (score >= 5) {
    return {
      type: 'success',
      title: 'Yaxshi natija',
      message: `Mahsulot yaxshi ko'rsatkich ko'rsatmoqda. Hozirgi strategiyani davom ettiring va stokni nazorat qiling.`,
      urgency: 'low',
    };
  }

  return {
    type: 'info',
    title: 'Tahlil davom etmoqda',
    message: 'Tizim har 24 soatda mahsulotni qayta tahlil qiladi. Trend ma\'lumotlari to\'planmoqda.',
    urgency: 'low',
  };
}
