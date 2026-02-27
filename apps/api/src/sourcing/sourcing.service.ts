import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { enqueueSourcingSearch, enqueueSourcingJob } from './sourcing.queue';

// Cargo yo'nalishlari
export interface CargoCalcInput {
  item_name?: string;
  item_cost_usd: number;     // bitta mahsulot narxi USD da
  weight_kg: number;         // umumiy og'irlik
  quantity: number;
  provider_id: string;
  customs_rate?: number;     // 0.10 = 10%, default 0.10
  sell_price_uzs?: number;   // Uzumda sotish narxi (ixtiyoriy)
  account_id: string;
}

export interface CargoCalcResult {
  item_cost_usd: number;
  total_item_cost_usd: number;
  cargo_cost_usd: number;
  customs_usd: number;
  vat_usd: number;
  landed_cost_usd: number;
  landed_cost_uzs: number;
  usd_rate: number;
  delivery_days: number;
  provider_name: string;
  // Margin (agar sell_price_uzs bo'lsa)
  sell_price_uzs?: number;
  profit_uzs?: number;
  gross_margin_pct?: number;
  roi_pct?: number;
}

@Injectable()
export class SourcingService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Currency Rates ────────────────────────────────────────────────────────

  async getCurrencyRates(): Promise<{ USD: number; CNY: number; EUR: number }> {
    // DB dan cache'dan o'qi
    const rates = await this.prisma.currencyRate.findMany({
      where: { to_code: 'UZS' },
    });

    const map: Record<string, number> = {};
    for (const r of rates) {
      map[r.from_code] = Number(r.rate);
    }

    // Agar DB da yo'q yoki eskiriб qolgan bo'lsa — CBU dan yangilaymiz
    const needRefresh = !map['USD'] || !map['CNY'] || !map['EUR'];
    if (needRefresh) {
      const fresh = await this.fetchCbuRates();
      return fresh;
    }

    return {
      USD: map['USD'] ?? 12900,
      CNY: map['CNY'] ?? 1780,
      EUR: map['EUR'] ?? 14200,
    };
  }

  async refreshCurrencyRates(): Promise<{ USD: number; CNY: number; EUR: number }> {
    return this.fetchCbuRates();
  }

  private async fetchCbuRates(): Promise<{ USD: number; CNY: number; EUR: number }> {
    try {
      const res = await fetch('https://cbu.uz/arkhiv-kursov-valyut/json/');
      if (!res.ok) throw new Error('CBU API unavailable');
      const data = await res.json() as any[];

      const wanted = ['USD', 'CNY', 'EUR'];
      const result: Record<string, number> = {};

      for (const item of data) {
        if (wanted.includes(item.Ccy)) {
          result[item.Ccy] = parseFloat(item.Rate);
        }
      }

      // DB ga saqlash
      for (const [from, rate] of Object.entries(result)) {
        await this.prisma.currencyRate.upsert({
          where: { from_code_to_code: { from_code: from, to_code: 'UZS' } },
          update: { rate },
          create: { from_code: from, to_code: 'UZS', rate },
        });
      }

      return {
        USD: result['USD'] ?? 12900,
        CNY: result['CNY'] ?? 1780,
        EUR: result['EUR'] ?? 14200,
      };
    } catch (e) {
      // Fallback qiymatlari
      return { USD: 12900, CNY: 1780, EUR: 14200 };
    }
  }

  // ─── Cargo Providers ───────────────────────────────────────────────────────

  async getCargoProviders(origin?: string) {
    const providers = await this.prisma.cargoProvider.findMany({
      where: {
        is_active: true,
        ...(origin ? { origin } : {}),
      },
      orderBy: [{ origin: 'asc' }, { delivery_days: 'asc' }],
    });

    return providers.map((p) => ({
      id: p.id,
      name: p.name,
      origin: p.origin,
      destination: p.destination,
      method: p.method,
      rate_per_kg: Number(p.rate_per_kg),
      delivery_days: p.delivery_days,
      min_weight_kg: p.min_weight_kg ? Number(p.min_weight_kg) : null,
    }));
  }

  // ─── Cargo Calculation ─────────────────────────────────────────────────────

  async calculateCargo(input: CargoCalcInput): Promise<CargoCalcResult> {
    const {
      item_name,
      item_cost_usd,
      weight_kg,
      quantity,
      provider_id,
      customs_rate = 0.10,
      sell_price_uzs,
      account_id,
    } = input;

    const VAT_RATE = 0.12;

    const provider = await this.prisma.cargoProvider.findUnique({
      where: { id: provider_id },
    });
    if (!provider) throw new BadRequestException('Cargo provider topilmadi');

    const rates = await this.getCurrencyRates();
    const usd_rate = rates.USD;

    // Hisoblash
    const total_item_cost_usd = item_cost_usd * quantity;
    const cargo_cost_usd = weight_kg * Number(provider.rate_per_kg);
    const customs_base = total_item_cost_usd + cargo_cost_usd;
    const customs_usd = customs_base * customs_rate;
    const vat_base = customs_base + customs_usd;
    const vat_usd = vat_base * VAT_RATE;
    const landed_cost_usd = total_item_cost_usd + cargo_cost_usd + customs_usd + vat_usd;
    const landed_cost_uzs = landed_cost_usd * usd_rate;

    let profit_uzs: number | undefined;
    let gross_margin_pct: number | undefined;
    let roi_pct: number | undefined;

    if (sell_price_uzs && sell_price_uzs > 0) {
      profit_uzs = sell_price_uzs - landed_cost_uzs;
      gross_margin_pct = (profit_uzs / sell_price_uzs) * 100;
      roi_pct = (profit_uzs / landed_cost_uzs) * 100;
    }

    // DB ga saqlash
    await this.prisma.cargoCalculation.create({
      data: {
        account_id,
        provider_id,
        item_name: item_name ?? null,
        item_cost_usd,
        weight_kg,
        quantity,
        customs_rate,
        vat_rate: VAT_RATE,
        cargo_cost_usd,
        customs_usd,
        vat_usd,
        landed_cost_usd,
        landed_cost_uzs,
        sell_price_uzs: sell_price_uzs ?? null,
        gross_margin: gross_margin_pct != null ? gross_margin_pct / 100 : null,
        roi: roi_pct != null ? roi_pct / 100 : null,
        usd_rate,
      },
    });

    return {
      item_cost_usd,
      total_item_cost_usd,
      cargo_cost_usd,
      customs_usd,
      vat_usd,
      landed_cost_usd,
      landed_cost_uzs,
      usd_rate,
      delivery_days: provider.delivery_days,
      provider_name: provider.name,
      sell_price_uzs,
      profit_uzs,
      gross_margin_pct,
      roi_pct,
    };
  }

  // ─── External Price Search (Quick — backward compat) ─────────────────────

  async searchExternalPrices(
    query: string,
    account_id: string,
  ) {
    // Playwright worker orqali real mahsulotlari
    const results = await enqueueSourcingSearch(query);

    await this.prisma.externalPriceSearch.create({
      data: { account_id, query, source: 'PLAYWRIGHT', results: results as any },
    });

    return { results };
  }

  // ─── External Search Job (Full Pipeline) ─────────────────────────────────

  async createSearchJob(params: {
    account_id: string;
    product_id: number;
    product_title: string;
    platforms?: string[];
  }) {
    const { account_id, product_id, product_title, platforms } = params;

    // Create job record
    const job = await this.prisma.externalSearchJob.create({
      data: {
        account_id,
        product_id: BigInt(product_id),
        query: product_title,
        platforms: platforms ?? ['1688', 'taobao', 'alibaba', 'banggood', 'shopee'],
        status: 'PENDING',
      },
    });

    // Enqueue for worker processing
    await enqueueSourcingJob({
      query: product_title,
      jobId: job.id,
      productId: product_id,
      productTitle: product_title,
      accountId: account_id,
      platforms: job.platforms,
    });

    return {
      job_id: job.id,
      status: job.status,
      query: job.query,
      platforms: job.platforms,
    };
  }

  async getSearchJob(jobId: string, accountId?: string) {
    const job = await this.prisma.externalSearchJob.findFirst({
      where: { id: jobId, ...(accountId ? { account_id: accountId } : {}) },
      include: {
        results: {
          orderBy: { rank: 'asc' },
          include: {
            platform: { select: { code: true, name: true, country: true } },
            cargo_calculations: {
              take: 1,
              include: { provider: { select: { name: true, method: true, origin: true } } },
            },
          },
        },
      },
    });

    if (!job) throw new BadRequestException('Job topilmadi');

    return {
      id: job.id,
      status: job.status,
      query: job.query,
      platforms: job.platforms,
      product_id: job.product_id.toString(),
      created_at: job.created_at,
      finished_at: job.finished_at,
      results: job.results.map((r) => ({
        id: r.id,
        platform: r.platform.code,
        platform_name: r.platform.name,
        country: r.platform.country,
        title: r.title,
        price_usd: Number(r.price_usd),
        price_local: r.price_local ? Number(r.price_local) : null,
        currency: r.currency,
        url: r.url,
        image_url: r.image_url,
        seller_name: r.seller_name,
        seller_rating: r.seller_rating ? Number(r.seller_rating) : null,
        min_order_qty: r.min_order_qty,
        shipping_days: r.shipping_days,
        ai_match_score: r.ai_match_score ? Number(r.ai_match_score) : null,
        ai_notes: r.ai_notes,
        rank: r.rank,
        cargo: r.cargo_calculations[0]
          ? {
              landed_cost_usd: Number(r.cargo_calculations[0].landed_cost_usd),
              landed_cost_uzs: Number(r.cargo_calculations[0].landed_cost_uzs),
              cargo_cost_usd: Number(r.cargo_calculations[0].cargo_cost_usd),
              customs_usd: Number(r.cargo_calculations[0].customs_usd),
              vat_usd: Number(r.cargo_calculations[0].vat_usd),
              margin_pct: r.cargo_calculations[0].gross_margin
                ? Number(r.cargo_calculations[0].gross_margin) * 100
                : null,
              roi_pct: r.cargo_calculations[0].roi
                ? Number(r.cargo_calculations[0].roi) * 100
                : null,
              provider: r.cargo_calculations[0].provider
                ? `${r.cargo_calculations[0].provider.name} (${r.cargo_calculations[0].provider.origin})`
                : null,
            }
          : null,
      })),
    };
  }

  async listSearchJobs(account_id: string) {
    const jobs = await this.prisma.externalSearchJob.findMany({
      where: { account_id },
      orderBy: { created_at: 'desc' },
      take: 20,
      include: {
        _count: { select: { results: true } },
      },
    });

    return jobs.map((j) => ({
      id: j.id,
      query: j.query,
      status: j.status,
      platforms: j.platforms,
      product_id: j.product_id.toString(),
      result_count: j._count.results,
      created_at: j.created_at,
      finished_at: j.finished_at,
    }));
  }

  // ─── Platforms ───────────────────────────────────────────────────────────

  async getPlatforms() {
    return this.prisma.externalPlatform.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, country: true, api_type: true },
    });
  }

  // ─── History ───────────────────────────────────────────────────────────────

  async getHistory(account_id: string) {
    const calcs = await this.prisma.cargoCalculation.findMany({
      where: { account_id },
      orderBy: { created_at: 'desc' },
      take: 20,
      include: { provider: { select: { name: true, method: true, origin: true } } },
    });

    return calcs.map((c) => ({
      id: c.id,
      item_name: c.item_name,
      item_cost_usd: Number(c.item_cost_usd),
      weight_kg: Number(c.weight_kg),
      quantity: c.quantity,
      landed_cost_usd: Number(c.landed_cost_usd),
      landed_cost_uzs: Number(c.landed_cost_uzs),
      gross_margin_pct: c.gross_margin ? Number(c.gross_margin) * 100 : null,
      roi_pct: c.roi ? Number(c.roi) * 100 : null,
      provider: c.provider ? `${c.provider.name} (${c.provider.origin})` : null,
      created_at: c.created_at,
    }));
  }
}
