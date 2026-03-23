import { Injectable, Logger } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { SignalsService } from '../signals/signals.service';
import { DiscoveryService } from '../discovery/discovery.service';
import { NicheService } from '../discovery/niche.service';
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

    const [trend, forecast, revenue] = await Promise.allSettled([
      this.productsService.getWeeklyTrend(pid, accountId),
      this.productsService.getAdvancedForecast(pid, accountId),
      this.productsService.getRevenueEstimate(pid, accountId),
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
    if (revenue.status === 'fulfilled') {
      data.revenue = revenue.value;
      const r = revenue.value;
      parts.push(`Oylik daromad: ~${r.estimated_monthly_revenue?.toLocaleString() ?? '?'} so'm. Raqobat: ${r.competition_level}. ${r.recommendation}`);
    }

    const summary = parts.join('\n').slice(0, MAX_CONTEXT_CHARS);
    return {
      intent: ChatIntent.PRODUCT_ANALYSIS,
      summary,
      data,
      token_estimate: Math.ceil(summary.length / 4),
      sources: ['getWeeklyTrend', 'getAdvancedForecast', 'getRevenueEstimate'],
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
    const [flashSales, revenue] = await Promise.allSettled([
      this.signalsService.getFlashSales(accountId),
      productIds[0] ? this.productsService.getRevenueEstimate(productIds[0], accountId) : Promise.resolve(null),
    ]);

    const data: Record<string, unknown> = {};
    const parts: string[] = [];

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
    if (revenue.status === 'fulfilled' && revenue.value) {
      data.revenue = revenue.value;
      parts.push(`Narx tavsiyasi: ${revenue.value.recommendation}`);
    }

    const summary = parts.join('\n') || 'Narx ma\'lumotlari topilmadi.';
    return {
      intent: ChatIntent.PRICE_ADVICE,
      summary: summary.slice(0, MAX_CONTEXT_CHARS),
      data,
      token_estimate: Math.ceil(summary.length / 4),
      sources: ['getFlashSales', 'getRevenueEstimate'],
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
    const result = await this.signalsService.getCannibalization(accountId).catch(() => ({ groups: [] }));
    const groups = (result as Record<string, unknown[]>).groups ?? [];
    const summary = groups.length === 0
      ? 'Raqobat (cannibalization) topilmadi.'
      : `Raqobatdosh mahsulot guruhlari (${groups.length} ta):\n` +
        groups.slice(0, 3).map((g: unknown) => JSON.stringify(g)).join('\n');

    return {
      intent: ChatIntent.COMPETITOR,
      summary: summary.slice(0, MAX_CONTEXT_CHARS),
      data: { cannibalization: groups },
      token_estimate: Math.ceil(summary.length / 4),
      sources: ['getCannibalization'],
    };
  }

  private async retrieveRevenue(productIds: bigint[], accountId: string): Promise<RetrievedContext> {
    if (productIds.length === 0) return this.retrievePortfolioSummary(accountId);

    const results = await Promise.allSettled(
      productIds.slice(0, 3).map(id => this.productsService.getRevenueEstimate(id, accountId))
    );

    const data: Record<string, unknown> = {};
    const parts: string[] = [];

    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        const rev = r.value;
        data[`revenue_${productIds[i].toString()}`] = rev;
        parts.push(`Mahsulot ${productIds[i]}: ~${rev.estimated_monthly_revenue?.toLocaleString()} so'm/oy. ${rev.recommendation}`);
      }
    });

    const summary = parts.join('\n') || 'Daromad ma\'lumotlari topilmadi.';
    return {
      intent: ChatIntent.REVENUE,
      summary: summary.slice(0, MAX_CONTEXT_CHARS),
      data,
      token_estimate: Math.ceil(summary.length / 4),
      sources: ['getRevenueEstimate'],
    };
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
    const tracked = await this.productsService.getTrackedProducts(accountId).catch(() => []);
    const count = tracked.length;
    const avgScore = count > 0
      ? (tracked.reduce((s: number, p: Record<string, unknown>) => s + ((p.score as number) ?? 0), 0) / count).toFixed(1)
      : '0';
    const summary = `Portfolio: ${count} ta mahsulot kuzatilmoqda. O'rtacha score: ${avgScore}.`;

    return {
      intent: ChatIntent.GENERAL,
      summary,
      data: { tracked_count: count, avg_score: avgScore },
      token_estimate: Math.ceil(summary.length / 4),
      sources: ['getTrackedProducts'],
    };
  }
}
