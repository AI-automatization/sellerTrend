import { Injectable, Logger } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { SignalsService } from '../signals/signals.service';
import { DiscoveryService } from '../discovery/discovery.service';
import { NicheService } from '../discovery/niche.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeadStockResult, FlashSaleResult } from '@uzum/utils';
import { ChatIntent, ClassifiedIntent, RetrievedContext } from './types/chat.types';

const MAX_CONTEXT_CHARS = 3000;

@Injectable()
export class ChatRetrieverService {
  private readonly logger = new Logger(ChatRetrieverService.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly signalsService: SignalsService,
    private readonly discoveryService: DiscoveryService,
    private readonly nicheService: NicheService,
    private readonly prisma: PrismaService,
  ) {}

  async retrieve(classified: ClassifiedIntent, accountId: string): Promise<RetrievedContext> {
    const { intent, product_ids } = classified;

    switch (intent) {
      case ChatIntent.PRODUCT_ANALYSIS:
        return this.retrieveProductAnalysis(product_ids, accountId);
      case ChatIntent.CATEGORY_TREND:
        return this.retrieveCategoryTrend(accountId);
      case ChatIntent.PRICE_ADVICE:
        return this.retrievePriceAdvice(product_ids, accountId);
      case ChatIntent.RECOMMENDATION:
        return this.retrieveRecommendations(accountId);
      case ChatIntent.DEAD_STOCK:
        return this.retrieveDeadStock(accountId);
      case ChatIntent.COMPETITOR:
        return this.retrieveCompetitor(accountId);
      case ChatIntent.REVENUE:
        return this.retrieveRevenue(product_ids, accountId);
      case ChatIntent.FORECAST:
        return this.retrieveForecast(product_ids, accountId);
      case ChatIntent.NICHE:
        return this.retrieveNiche(accountId);
      case ChatIntent.GENERAL:
      default:
        return this.retrievePortfolioSummary(accountId);
    }
  }

  private async retrieveProductAnalysis(productIds: bigint[], accountId: string): Promise<RetrievedContext> {
    if (productIds.length === 0) return this.retrievePortfolioSummary(accountId);
    const pid = productIds[0];

    const [trend, forecast] = await Promise.allSettled([
      this.productsService.getWeeklyTrend(pid, accountId),
      this.productsService.getAdvancedForecast(pid, accountId),
    ]);

    const data: Record<string, unknown> = {};
    const parts: string[] = [];

    if (trend.status === 'fulfilled') {
      data.weekly_trend = trend.value;
      const t = trend.value;
      const pct = t.delta_pct != null ? `(${t.delta_pct > 0 ? '+' : ''}${t.delta_pct}%)` : '';
      parts.push(`Haftalik savdo: ${t.weekly_sold ?? '?'} ta ${pct}. Trend: ${t.trend}.`);
      if (t.advice) parts.push(`Maslahat: ${t.advice.message}`);
    }
    if (forecast.status === 'fulfilled') {
      data.forecast = forecast.value;
      const lastScore = forecast.value.score_forecast?.predictions?.slice(-1)?.[0]?.value;
      parts.push(`7 kunlik bashorat: score ${lastScore?.toFixed(1) ?? '?'}`);
    }

    const summary = parts.join('\n').slice(0, MAX_CONTEXT_CHARS);
    return {
      intent: ChatIntent.PRODUCT_ANALYSIS,
      summary,
      data,
      token_estimate: Math.ceil(summary.length / 4),
      sources: ['getWeeklyTrend', 'getAdvancedForecast'],
    };
  }

  private async retrieveCategoryTrend(accountId: string): Promise<RetrievedContext> {
    const leaderboard = await this.discoveryService.getLeaderboard(accountId).catch(() => []);
    const items = Array.isArray(leaderboard) ? leaderboard : [];
    const summary = items.length === 0
      ? 'Kategoriya liderlari topilmadi.'
      : items.slice(0, 5).map((p: Record<string, unknown>) =>
          `• ${p.title ?? p.product_id}: score=${p.score}, haftalik=${p.weekly_bought}`
        ).join('\n');

    return {
      intent: ChatIntent.CATEGORY_TREND,
      summary: summary.slice(0, MAX_CONTEXT_CHARS),
      data: { leaderboard: items },
      token_estimate: Math.ceil(summary.length / 4),
      sources: ['getLeaderboard'],
    };
  }

  private async retrievePriceAdvice(productIds: bigint[], accountId: string): Promise<RetrievedContext> {
    void productIds;
    const flashSalesResult = await Promise.allSettled([
      this.signalsService.getFlashSales(accountId),
    ]);

    const data: Record<string, unknown> = {};
    const parts: string[] = [];

    const flashSales = flashSalesResult[0];
    if (flashSales.status === 'fulfilled') {
      data.flash_sales = flashSales.value;
      const items = Array.isArray(flashSales.value) ? flashSales.value : [];
      if (items.length > 0) {
        parts.push(`Flash sale mahsulotlar (${items.length} ta):`);
        (items as FlashSaleResult[]).slice(0, 3).forEach(p =>
          parts.push(`• ${p.title}: narx ${p.old_price} → ${p.new_price} (-${p.price_drop_pct.toFixed(0)}%)`)
        );
      }
    }

    const summary = parts.join('\n') || 'Narx ma\'lumotlari topilmadi.';
    return {
      intent: ChatIntent.PRICE_ADVICE,
      summary: summary.slice(0, MAX_CONTEXT_CHARS),
      data,
      token_estimate: Math.ceil(summary.length / 4),
      sources: ['getFlashSales'],
    };
  }

  private async retrieveRecommendations(accountId: string): Promise<RetrievedContext> {
    const recs = await this.productsService.getRecommendations(accountId).catch(() => []);
    const items = Array.isArray(recs) ? recs : [];
    const summary = items.length === 0
      ? 'Tavsiyalar topilmadi.'
      : `Top tavsiyalar (${items.length} ta):\n` +
        items.slice(0, 5).map((r: Record<string, unknown>) =>
          `• ${r.title ?? r.product_id}: score=${r.score}`
        ).join('\n');

    return {
      intent: ChatIntent.RECOMMENDATION,
      summary: summary.slice(0, MAX_CONTEXT_CHARS),
      data: { recommendations: items },
      token_estimate: Math.ceil(summary.length / 4),
      sources: ['getRecommendations'],
    };
  }

  private async retrieveDeadStock(accountId: string): Promise<RetrievedContext> {
    const result = await this.signalsService.getDeadStockRisk(accountId).catch(() => []);
    const items = Array.isArray(result) ? result : [];
    const summary = items.length === 0
      ? 'Sotilmayotgan tovar topilmadi.'
      : (items as DeadStockResult[]).slice(0, 5).map(d =>
          `• ${d.title}: risk=${d.risk_level}, score=${d.risk_score.toFixed(2)}, ${d.days_to_dead} kunga yetadi`
        ).join('\n');

    return {
      intent: ChatIntent.DEAD_STOCK,
      summary: summary.slice(0, MAX_CONTEXT_CHARS),
      data: { dead_stock: items },
      token_estimate: Math.ceil(summary.length / 4),
      sources: ['getDeadStockRisk'],
    };
  }

  private async retrieveCompetitor(accountId: string): Promise<RetrievedContext> {
    const tracked = await this.productsService.getTrackedProducts(accountId).catch(() => []);
    const trackedIds = (tracked as Array<{ id: bigint }>).map(p => p.id);

    type TrackingRow = {
      product_id: bigint;
      competitor_product_id: bigint;
      product: { title: string };
      competitor: { title: string; orders_quantity: bigint | null };
    };

    const trackings: TrackingRow[] = trackedIds.length > 0
      ? await this.prisma.competitorTracking.findMany({
          where: { account_id: accountId, product_id: { in: trackedIds }, is_active: true },
          select: {
            product_id: true,
            competitor_product_id: true,
            product: { select: { title: true } },
            competitor: { select: { title: true, orders_quantity: true } },
          },
          take: 15,
        }).catch(() => []) as TrackingRow[]
      : [];

    const data: Record<string, unknown> = {};
    const parts: string[] = [];

    if (trackings.length > 0) {
      data.competitors = trackings;
      parts.push(`Kuzatilayotgan raqobatchilar (${trackings.length} ta):`);
      trackings.forEach(t => {
        const orders = t.competitor.orders_quantity != null ? `, buyurtma ${t.competitor.orders_quantity}` : '';
        parts.push(`• ${t.product.title} uchun raqobatchi: ${t.competitor.title}${orders}`);
      });
    } else {
      // Fallback: kategoriya liderlari
      const leaderboard = await this.discoveryService.getLeaderboard(accountId).catch(() => []);
      const items = Array.isArray(leaderboard) ? leaderboard : [];
      data.leaderboard = items;
      if (items.length > 0) {
        parts.push(`Kategoriya liderlari (raqobatchilar sifatida, ${items.length} ta):`);
        (items as Array<Record<string, unknown>>).slice(0, 5).forEach(p =>
          parts.push(`• ${p.title ?? p.product_id}: score=${p.score}, haftalik=${p.weekly_bought}`)
        );
      } else {
        parts.push('Raqobatchi ma\'lumotlari topilmadi.');
      }
    }

    // Cannibalization qo'shimcha bo'lim sifatida
    const cannibalization = await this.signalsService.getCannibalization(accountId).catch(() => ({ groups: [] }));
    const groups = (cannibalization as Record<string, unknown[]>).groups ?? [];
    if (groups.length > 0) {
      data.cannibalization = groups;
      parts.push(`\nO'z mahsulotlari orasidagi raqobat (${groups.length} ta guruh) — narx kanibalizmiga e'tibor bering.`);
    }

    const summary = parts.join('\n');
    return {
      intent: ChatIntent.COMPETITOR,
      summary: summary.slice(0, MAX_CONTEXT_CHARS),
      data,
      token_estimate: Math.ceil(summary.length / 4),
      sources: ['competitorTracking', 'getLeaderboard', 'getCannibalization'],
    };
  }

  private async retrieveRevenue(productIds: bigint[], accountId: string): Promise<RetrievedContext> {
    return this.retrieveProductAnalysis(productIds, accountId);
  }

  private async retrieveForecast(productIds: bigint[], accountId: string): Promise<RetrievedContext> {
    if (productIds.length === 0) return this.retrievePortfolioSummary(accountId);
    const pid = productIds[0];

    const [forecast, trend] = await Promise.allSettled([
      this.productsService.getAdvancedForecast(pid, accountId),
      this.productsService.getWeeklyTrend(pid, accountId),
    ]);

    const data: Record<string, unknown> = {};
    const parts: string[] = [];

    if (forecast.status === 'fulfilled') {
      data.forecast = forecast.value;
      const predictions = forecast.value.score_forecast?.predictions ?? [];
      const vals = predictions.map(p => p.value);
      parts.push(`7 kunlik score bashorati: [${vals.map(v => v.toFixed(1)).join(', ')}]`);
    }
    if (trend.status === 'fulfilled') {
      data.trend = trend.value;
      parts.push(`Joriy trend: ${trend.value.trend}. ${trend.value.advice?.message ?? ''}`);
    }

    const summary = parts.join('\n') || 'Bashorat ma\'lumotlari topilmadi.';
    return {
      intent: ChatIntent.FORECAST,
      summary: summary.slice(0, MAX_CONTEXT_CHARS),
      data,
      token_estimate: Math.ceil(summary.length / 4),
      sources: ['getAdvancedForecast', 'getWeeklyTrend'],
    };
  }

  private async retrieveNiche(accountId: string): Promise<RetrievedContext> {
    const niches = await this.nicheService.findNiches(accountId).catch(() => []);
    const items = Array.isArray(niches) ? niches : [];
    const summary = items.length === 0
      ? 'Niche imkoniyatlar topilmadi.'
      : `Niche imkoniyatlar (${items.length} ta):\n` +
        items.slice(0, 5).map((n: Record<string, unknown>) =>
          `• ${n.category_name ?? n.category_id}: score=${n.opportunity_score}`
        ).join('\n');

    return {
      intent: ChatIntent.NICHE,
      summary: summary.slice(0, MAX_CONTEXT_CHARS),
      data: { niches: items },
      token_estimate: Math.ceil(summary.length / 4),
      sources: ['findNiches'],
    };
  }

  private async retrievePortfolioSummary(accountId: string): Promise<RetrievedContext> {
    const [tracked, deadStock, flashSales] = await Promise.allSettled([
      this.productsService.getTrackedProducts(accountId),
      this.signalsService.getDeadStockRisk(accountId),
      this.signalsService.getFlashSales(accountId),
    ]);

    const trackedItems = tracked.status === 'fulfilled' ? (tracked.value as Array<Record<string, unknown>>) : [];
    const count = trackedItems.length;
    const avgScore = count > 0
      ? (trackedItems.reduce((s, p) => s + ((p.score as number) ?? 0), 0) / count).toFixed(1)
      : '0';

    const parts: string[] = [];
    parts.push(`Portfolio: ${count} ta mahsulot kuzatilmoqda. O'rtacha score: ${avgScore}.`);

    // Top 3 mahsulot
    const top3 = trackedItems
      .slice()
      .sort((a, b) => ((b.score as number) ?? 0) - ((a.score as number) ?? 0))
      .slice(0, 3);
    if (top3.length > 0) {
      parts.push('Top mahsulotlar:');
      top3.forEach(p =>
        parts.push(`• ${p.title ?? p.product_id}: score=${p.score ?? '?'}, haftalik=${p.weekly_bought ?? '?'} ta`)
      );
    }

    // Dead stock
    if (deadStock.status === 'fulfilled') {
      const ds = Array.isArray(deadStock.value) ? deadStock.value : [];
      if (ds.length > 0) parts.push(`Dead stock xavfi: ${ds.length} ta mahsulot`);
    }

    // Flash sale
    if (flashSales.status === 'fulfilled') {
      const fs = Array.isArray(flashSales.value) ? flashSales.value : [];
      if (fs.length > 0) parts.push(`Flash sale: ${fs.length} ta mahsulot narxi keskin tushgan`);
    }

    const summary = parts.join('\n');
    return {
      intent: ChatIntent.GENERAL,
      summary: summary.slice(0, MAX_CONTEXT_CHARS),
      data: {
        tracked_count: count,
        avg_score: avgScore,
        top_products: top3,
        dead_stock_count: deadStock.status === 'fulfilled' ? (deadStock.value as unknown[]).length : 0,
        flash_sale_count: flashSales.status === 'fulfilled' ? (flashSales.value as unknown[]).length : 0,
      },
      token_estimate: Math.ceil(summary.length / 4),
      sources: ['getTrackedProducts', 'getDeadStockRisk', 'getFlashSales'],
    };
  }
}
