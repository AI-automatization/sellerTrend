import { Injectable, Inject, Logger } from '@nestjs/common';
import { calculateProfit, ProfitInput, calculateElasticity, ElasticityInput } from '@uzum/utils';
import { AiService } from '../ai/ai.service';
import { REDIS_CLIENT } from '../common/redis/redis.module';
import type Redis from 'ioredis';

const CBU_API = 'https://cbu.uz/uz/arkhiv-kursov-valyut/json/';
const RATES_CACHE_KEY = 'tools:exchange_rates';
const RATES_CACHE_TTL = 60 * 60; // 1 soat

interface CbuRate {
  Ccy: string;
  Rate: string;
  Date: string;
}

@Injectable()
export class ToolsService {
  private readonly logger = new Logger(ToolsService.name);

  constructor(
    private readonly aiService: AiService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  calculateProfit(input: ProfitInput) {
    return calculateProfit(input);
  }

  calculateElasticity(input: ElasticityInput) {
    return calculateElasticity(input);
  }

  generateDescription(opts: {
    title: string;
    attributes?: Record<string, string | null>;
    category?: string;
    keywords?: string[];
  }) {
    return this.aiService.generateDescription(opts);
  }

  analyzeSentiment(opts: { productTitle: string; reviews: string[] }) {
    return this.aiService.analyzeSentiment(opts);
  }

  async getExchangeRates(): Promise<{ usd: number; eur: number; date: string }> {
    const cached = await this.redis.get(RATES_CACHE_KEY);
    if (cached) return JSON.parse(cached) as { usd: number; eur: number; date: string };

    try {
      const res = await fetch(CBU_API);
      if (!res.ok) throw new Error(`CBU API xatosi: ${res.status}`);
      const data = (await res.json()) as CbuRate[];

      const usdRow = data.find((r) => r.Ccy === 'USD');
      const eurRow = data.find((r) => r.Ccy === 'EUR');

      const rates = {
        usd: usdRow ? parseFloat(usdRow.Rate) : 12800,
        eur: eurRow ? parseFloat(eurRow.Rate) : 14000,
        date: usdRow?.Date ?? new Date().toLocaleDateString('ru-RU'),
      };

      await this.redis.set(RATES_CACHE_KEY, JSON.stringify(rates), 'EX', RATES_CACHE_TTL);
      return rates;
    } catch (err) {
      this.logger.warn(`CBU kurs olishda xato, fallback ishlatiladi: ${err}`);
      return { usd: 12800, eur: 14000, date: '—' };
    }
  }
}
