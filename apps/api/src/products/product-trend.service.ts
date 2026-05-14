import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function generateSellerAdvice(
  weeklySold: number | null,
  prevWeeklySold: number | null,
  delta: number | null,
  deltaPct: number | null,
  trend: 'up' | 'flat' | 'down',
  score: number,
): { type: string; title: string; message: string; urgency: 'high' | 'medium' | 'low' } {
  if (trend === 'up' && delta != null && delta > 50) {
    return { type: 'growth', title: "Kuchli o'sish!", message: `Haftalik sotuv +${delta} ta o'sdi (${deltaPct != null ? deltaPct + '%' : ''}). Bu mahsulotga talab oshmoqda. Stokni ko'paytiring va narxni biroz oshirishni ko'rib chiqing — talab yuqori bo'lganda margin yaxshilash imkoniyati.`, urgency: 'high' };
  }
  if (trend === 'up' && delta != null && delta > 10) {
    return { type: 'growth', title: 'Sotuv o\'smoqda', message: `Haftalik sotuv +${delta} ta. Barqaror o'sish ko'rsatmoqda. Reklama xarajatlarini oshirib, o'sishni tezlashtirish mumkin.`, urgency: 'medium' };
  }
  if (trend === 'flat' && weeklySold != null && weeklySold > 20) {
    return { type: 'stable', title: 'Barqaror sotuv', message: `Haftalik ${weeklySold} ta sotuv — barqaror darajada. Raqobatchilarga e'tibor bering.`, urgency: 'low' };
  }
  if (trend === 'down' && delta != null && delta < -20) {
    return { type: 'decline', title: 'Sotuv tushmoqda!', message: `Haftalik sotuv ${delta} ta kamaydi (${deltaPct != null ? deltaPct + '%' : ''}). Shoshilinch: narxni qayta ko'rib chiqing yoki aksiya e'lon qiling.`, urgency: 'high' };
  }
  if (trend === 'down') {
    return { type: 'decline', title: 'Sekinlashish', message: `Sotuv biroz kamaymoqda. Raqiblar narxini tekshiring va mahsulot rasmlarini yangilang.`, urgency: 'medium' };
  }
  if (weeklySold != null && weeklySold < 5) {
    return { type: 'low', title: 'Past sotuv', message: `Haftalik faqat ${weeklySold} ta sotuv. Narxni pasaytiring, SEO sarlavhani optimallang, yoki Uzum reklamasini yoqing.`, urgency: 'medium' };
  }
  if (weeklySold == null) {
    return { type: 'info', title: "Ma'lumot to'planmoqda", message: "Tizim 24 soatdan keyin avtomatik qayta tahlil qiladi.", urgency: 'low' };
  }
  if (score >= 5) {
    return { type: 'success', title: 'Yaxshi natija', message: `Mahsulot yaxshi ko'rsatkich ko'rsatmoqda. Hozirgi strategiyani davom ettiring.`, urgency: 'low' };
  }
  return { type: 'info', title: 'Tahlil davom etmoqda', message: 'Tizim har 24 soatda mahsulotni qayta tahlil qiladi.', urgency: 'low' };
}

@Injectable()
export class ProductTrendService {
  private readonly logger = new Logger(ProductTrendService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getWeeklyTrend(productId: bigint, accountId: string): Promise<{
    weekly_sold: number | null; prev_weekly_sold: number | null; delta: number | null;
    delta_pct: number | null; trend: 'up' | 'flat' | 'down';
    daily_breakdown: Array<{ date: string; orders: number; daily_sold: number }>;
    advice: { type: string; title: string; message: string; urgency: 'high' | 'medium' | 'low' };
    score_change: number | null; last_updated: string | null;
  }> {
    const trackedRow = await this.prisma.trackedProduct.findUnique({
      where: { account_id_product_id: { account_id: accountId, product_id: productId } },
      select: { created_at: true },
    });
    if (!trackedRow) throw new NotFoundException('Product not found');

    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const snapshotsFrom = trackedRow.created_at > twoWeeksAgo ? trackedRow.created_at : twoWeeksAgo;

    const snapshots = await this.prisma.productSnapshot.findMany({
      where: { product_id: productId, snapshot_at: { gte: snapshotsFrom } },
      orderBy: { snapshot_at: 'asc' },
      select: { orders_quantity: true, weekly_bought: true, score: true, snapshot_at: true },
    });

    if (snapshots.length < 2) {
      return {
        weekly_sold: null, prev_weekly_sold: null, delta: null, delta_pct: null, trend: 'flat',
        daily_breakdown: [],
        advice: { type: 'info', title: 'Birinchi tahlil', message: "Hali yetarli ma'lumot yo'q. 24 soatdan keyin avtomatik yangilanadi.", urgency: 'low' },
        score_change: null,
        last_updated: snapshots[snapshots.length - 1]?.snapshot_at?.toISOString() ?? null,
      };
    }

    const latest = snapshots[snapshots.length - 1];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    let weekAgoSnapshot = snapshots[0];
    for (const snap of snapshots) { if (snap.snapshot_at <= sevenDaysAgo) weekAgoSnapshot = snap; }

    const latestOrders = Number(latest.orders_quantity ?? 0);
    const weekAgoOrders = Number(weekAgoSnapshot.orders_quantity ?? 0);
    const daysSinceWeekAgo = (latest.snapshot_at.getTime() - weekAgoSnapshot.snapshot_at.getTime()) / (1000 * 60 * 60 * 24);

    let weeklySold: number | null = null;
    if (daysSinceWeekAgo > 0 && latestOrders >= weekAgoOrders) {
      weeklySold = Math.round(((latestOrders - weekAgoOrders) * 7) / daysSinceWeekAgo);
    }
    if ((weeklySold === null || weeklySold === 0) && latest.weekly_bought != null && latest.weekly_bought > 0) {
      weeklySold = latest.weekly_bought;
    }

    let twoWeekAgoSnapshot = snapshots[0];
    for (const snap of snapshots) { if (snap.snapshot_at <= fourteenDaysAgo) twoWeekAgoSnapshot = snap; }

    const twoWeekOrders = Number(twoWeekAgoSnapshot.orders_quantity ?? 0);
    const daysBetweenWeeks = (weekAgoSnapshot.snapshot_at.getTime() - twoWeekAgoSnapshot.snapshot_at.getTime()) / (1000 * 60 * 60 * 24);
    let prevWeeklySold: number | null = null;
    const hasRealPrevData = daysBetweenWeeks > 1;
    if (hasRealPrevData && weekAgoOrders >= twoWeekOrders) {
      prevWeeklySold = Math.round(((weekAgoOrders - twoWeekOrders) * 7) / daysBetweenWeeks);
    }

    const delta = weeklySold != null && prevWeeklySold != null ? weeklySold - prevWeeklySold : null;
    const deltaPct = delta != null && prevWeeklySold != null && prevWeeklySold > 0
      ? Number(((delta / prevWeeklySold) * 100).toFixed(1)) : null;
    const trend: 'up' | 'flat' | 'down' = delta != null && delta > 5 ? 'up' : delta != null && delta < -5 ? 'down' : 'flat';

    const dayMap = new Map<string, { orders: number; snapshot_at: Date }>();
    for (const snap of snapshots) {
      const day = snap.snapshot_at.toISOString().split('T')[0];
      const curr = Number(snap.orders_quantity ?? 0);
      const existing = dayMap.get(day);
      if (!existing || curr > existing.orders) dayMap.set(day, { orders: curr, snapshot_at: snap.snapshot_at });
    }
    const dayEntries = Array.from(dayMap.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-8);
    const dailyBreakdown = dayEntries.map(([date, val], i, arr) => {
      const prevOrders = i > 0 ? arr[i - 1][1].orders : val.orders;
      return { date, orders: val.orders, daily_sold: i > 0 ? Math.max(0, val.orders - prevOrders) : 0 };
    });

    const latestScore = Number(latest.score ?? 0);
    const weekAgoScore = Number(weekAgoSnapshot.score ?? 0);
    const scoreChange = latestScore - weekAgoScore;
    const advice = generateSellerAdvice(weeklySold, prevWeeklySold, delta, deltaPct, trend, latestScore);

    return {
      weekly_sold: weeklySold, prev_weekly_sold: prevWeeklySold, delta, delta_pct: deltaPct, trend,
      daily_breakdown: dailyBreakdown.slice(1),
      advice, score_change: scoreChange !== 0 ? Number(scoreChange.toFixed(4)) : null,
      last_updated: latest.snapshot_at.toISOString(),
    };
  }

  async getDailyComparison(productId: bigint, accountId: string): Promise<{
    today_sold: number | null; yesterday_sold: number | null; delta: number | null;
    delta_pct: number | null; trend: 'up' | 'flat' | 'down';
    today_date: string | null; yesterday_date: string | null; last_updated: string | null;
  }> {
    const tracked = await this.prisma.trackedProduct.findUnique({
      where: { account_id_product_id: { account_id: accountId, product_id: productId } },
      select: { id: true },
    });
    if (!tracked) throw new NotFoundException('Product not found');

    const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
    const nowUtc = new Date();
    const nowTashkent = new Date(nowUtc.getTime() + TASHKENT_OFFSET_MS);
    const todayTashkent = new Date(nowTashkent);
    todayTashkent.setUTCHours(0, 0, 0, 0);
    const todayStartUtc = new Date(todayTashkent.getTime() - TASHKENT_OFFSET_MS);
    const yesterdayStartUtc = new Date(todayStartUtc.getTime() - 24 * 60 * 60 * 1000);
    const todayStr = todayTashkent.toISOString().split('T')[0];
    const yesterdayStr = new Date(todayTashkent.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [yesterdayDaily, latestSnapshot] = await Promise.all([
      this.prisma.productSnapshotDaily.findFirst({
        where: { product_id: productId, day: { gte: yesterdayStartUtc, lt: todayStartUtc } },
        select: { daily_orders_delta: true, max_orders: true },
      }),
      this.prisma.productSnapshot.findFirst({
        where: { product_id: productId },
        orderBy: { snapshot_at: 'desc' },
        select: { orders_quantity: true, snapshot_at: true },
      }),
    ]);

    if (!latestSnapshot) {
      return { today_sold: null, yesterday_sold: null, delta: null, delta_pct: null, trend: 'flat', today_date: todayStr, yesterday_date: yesterdayStr, last_updated: null };
    }

    const todaySold: number | null = yesterdayDaily?.max_orders != null
      ? Math.max(0, Number(latestSnapshot.orders_quantity ?? 0) - Number(yesterdayDaily.max_orders)) : null;
    const yesterdaySold: number | null = yesterdayDaily?.daily_orders_delta != null
      ? Number(yesterdayDaily.daily_orders_delta) : null;

    const delta = todaySold !== null && yesterdaySold !== null ? todaySold - yesterdaySold : null;
    const deltaPct = delta !== null && yesterdaySold !== null && yesterdaySold > 0
      ? Number(((delta / yesterdaySold) * 100).toFixed(1)) : null;
    const trend: 'up' | 'flat' | 'down' = delta !== null && delta > 2 ? 'up' : delta !== null && delta < -2 ? 'down' : 'flat';

    return { today_sold: todaySold, yesterday_sold: yesterdaySold, delta, delta_pct: deltaPct, trend, today_date: todayStr, yesterday_date: yesterdayStr, last_updated: latestSnapshot.snapshot_at.toISOString() };
  }
}
