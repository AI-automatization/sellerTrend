import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

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

  // ─── External Price Search ─────────────────────────────────────────────────

  async searchExternalPrices(
    query: string,
    source: string,
    account_id: string,
  ) {
    const serpApiKey = this.config.get<string>('SERPAPI_KEY');

    if (!serpApiKey) {
      // SerpAPI kalit yo'q — demo ma'lumotlar qaytaramiz
      const demoResults = this.getDemoResults(query, source);
      await this.prisma.externalPriceSearch.create({
        data: { account_id, query, source, results: demoResults },
      });
      return { results: demoResults, note: 'Demo ma\'lumotlar. SERPAPI_KEY sozlang.' };
    }

    try {
      const engine = source === 'ALIEXPRESS' ? 'aliexpress' : 'alibaba';
      const url = `https://serpapi.com/search.json?engine=${engine}&query=${encodeURIComponent(query)}&api_key=${serpApiKey}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('SerpAPI error: ' + res.status);
      const data = await res.json() as any;

      const items = (data.organic_results ?? data.products ?? []).slice(0, 12).map((item: any) => ({
        title: item.title ?? item.name ?? '',
        price: item.price ?? item.min_price ?? '',
        source: item.source ?? source,
        link: item.link ?? item.product_link ?? '',
        image: item.thumbnail ?? item.image ?? '',
        store: item.seller ?? item.store_name ?? '',
      }));

      await this.prisma.externalPriceSearch.create({
        data: { account_id, query, source, results: items },
      });

      return { results: items };
    } catch (e) {
      const demoResults = this.getDemoResults(query, source);
      await this.prisma.externalPriceSearch.create({
        data: { account_id, query, source, results: demoResults },
      });
      return { results: demoResults, note: 'SerpAPI xatosi. Demo ma\'lumotlar ko\'rsatilmoqda.' };
    }
  }

  private getDemoResults(query: string, source: string) {
    const prices = [2.5, 3.8, 5.2, 1.9, 4.1, 3.3];
    return Array.from({ length: 6 }, (_, i) => ({
      title: `${query} - ${source} variant ${i + 1}`,
      price: `$${prices[i]}`,
      source,
      link: '#',
      image: '',
      store: `Demo Store ${i + 1}`,
    }));
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
