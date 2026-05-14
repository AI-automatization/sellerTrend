import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { AiQuotaService } from './ai-quota.service';

@Injectable()
export class AiContentService {
  private readonly logger = new Logger(AiContentService.name);
  private readonly client: Anthropic;

  constructor(private readonly quotaService: AiQuotaService) {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async generateSearchQuery(
    productTitle: string,
  ): Promise<{ cn_query: string; en_query: string; keywords: string[] }> {
    const fallback = {
      cn_query: productTitle,
      en_query: productTitle,
      keywords: productTitle.split(/\s+/).slice(0, 5),
    };

    const startMs = Date.now();
    try {
      const message = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content:
            `Mahsulot nomi: "${productTitle}"\n\n` +
            `Quyidagi JSON formatida qidiruv so'rovlari yarat (boshqa hech narsa yozmang):\n` +
            `{\n` +
            `  "cn_query": "Xitoy marketplace (1688/Taobao) uchun qisqa inglizcha yoki xitoycha qidiruv",\n` +
            `  "en_query": "Amazon/AliExpress uchun inglizcha qidiruv",\n` +
            `  "keywords": ["asosiy", "kalit", "sozlar"]\n` +
            `}`,
        }],
      });

      await this.quotaService.logCall({ method: 'generateSearchQuery', model: 'claude-haiku-4-5-20251001', inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens, durationMs: Date.now() - startMs });

      const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
      try {
        const parsed = JSON.parse(text);
        return {
          cn_query: parsed.cn_query || fallback.cn_query,
          en_query: parsed.en_query || fallback.en_query,
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords : fallback.keywords,
        };
      } catch {
        this.logger.warn(`AI search query parse failed: ${text.slice(0, 100)}`);
        return fallback;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.quotaService.logCall({ method: 'generateSearchQuery', model: 'claude-haiku-4-5-20251001', inputTokens: 0, outputTokens: 0, durationMs: Date.now() - startMs, error: msg });
      this.logger.error(`generateSearchQuery failed: ${msg}`);
      return fallback;
    }
  }

  async generateDescription(opts: {
    title: string;
    attributes?: Record<string, string | null>;
    category?: string;
    keywords?: string[];
  }): Promise<{ title_optimized: string; description: string; bullets: string[]; seo_keywords: string[] }> {
    const fallback = { title_optimized: opts.title, description: '', bullets: [], seo_keywords: opts.keywords ?? [] };

    try {
      const attrs = opts.attributes
        ? Object.entries(opts.attributes).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ')
        : 'N/A';

      const startMs = Date.now();
      const message = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content:
            `Uzum.uz marketplace uchun mahsulot tavsifnomasi yozib ber.\n\n` +
            `Mahsulot: ${opts.title}\n` +
            `Attributlar: ${attrs}\n` +
            `Kategoriya: ${opts.category ?? 'Noma\'lum'}\n\n` +
            `Quyidagi JSON formatida qaytir:\n` +
            `{\n` +
            `  "title_optimized": "SEO-optimallashtirilgan sarlavha (max 120 belgi)",\n` +
            `  "description": "Batafsil mahsulot tavsifi (200-400 so'z, o'zbekcha)",\n` +
            `  "bullets": ["Asosiy xususiyat 1", "Xususiyat 2", "Xususiyat 3", "Xususiyat 4", "Xususiyat 5"],\n` +
            `  "seo_keywords": ["kalit", "so'z", "lar"]\n` +
            `}`,
        }],
      });

      await this.quotaService.logCall({ method: 'generateDescription', model: 'claude-haiku-4-5-20251001', inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens, durationMs: Date.now() - startMs });

      const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
      try {
        const parsed = JSON.parse(text);
        return {
          title_optimized: parsed.title_optimized || opts.title,
          description: parsed.description || '',
          bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [],
          seo_keywords: Array.isArray(parsed.seo_keywords) ? parsed.seo_keywords : [],
        };
      } catch {
        this.logger.warn(`AI description parse failed: ${text.slice(0, 100)}`);
        return fallback;
      }
    } catch (err: unknown) {
      this.logger.error(`generateDescription failed: ${err instanceof Error ? err.message : String(err)}`);
      return fallback;
    }
  }

  async analyzeSentiment(opts: {
    productTitle: string;
    reviews: string[];
  }): Promise<{
    overall: 'positive' | 'neutral' | 'negative' | 'mixed';
    score: number;
    summary: string;
    pros: string[];
    cons: string[];
    keywords: Array<{ word: string; sentiment: 'positive' | 'negative'; count: number }>;
  }> {
    const fallback = { overall: 'neutral' as const, score: 0.5, summary: 'Tahlil mavjud emas', pros: [], cons: [], keywords: [] };

    if (opts.reviews.length === 0) return fallback;

    try {
      const reviewText = opts.reviews.slice(0, 20).map((r, i) => `${i + 1}. ${r}`).join('\n');
      const startMs = Date.now();

      const message = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content:
            `Mahsulot: "${opts.productTitle}"\n\n` +
            `Quyidagi sharhlarni sentiment tahlil qil:\n${reviewText}\n\n` +
            `JSON formatida qaytir:\n` +
            `{\n` +
            `  "overall": "positive|neutral|negative|mixed",\n` +
            `  "score": 0.0-1.0,\n` +
            `  "summary": "Qisqa xulosa (1-2 jumla, o'zbekcha)",\n` +
            `  "pros": ["Ijobiy jihat 1", "Ijobiy jihat 2"],\n` +
            `  "cons": ["Salbiy jihat 1", "Salbiy jihat 2"],\n` +
            `  "keywords": [{"word": "sifat", "sentiment": "positive", "count": 5}]\n` +
            `}`,
        }],
      });

      await this.quotaService.logCall({ method: 'analyzeSentiment', model: 'claude-haiku-4-5-20251001', inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens, durationMs: Date.now() - startMs });

      const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
      try {
        const parsed = JSON.parse(text);
        return {
          overall: ['positive', 'neutral', 'negative', 'mixed'].includes(parsed.overall) ? parsed.overall : 'neutral',
          score: typeof parsed.score === 'number' ? Math.min(1, Math.max(0, parsed.score)) : 0.5,
          summary: parsed.summary || '',
          pros: Array.isArray(parsed.pros) ? parsed.pros : [],
          cons: Array.isArray(parsed.cons) ? parsed.cons : [],
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        };
      } catch {
        this.logger.warn(`AI sentiment parse failed: ${text.slice(0, 100)}`);
        return fallback;
      }
    } catch (err: unknown) {
      this.logger.error(`analyzeSentiment failed: ${err instanceof Error ? err.message : String(err)}`);
      return fallback;
    }
  }

  async analyzeTrend(opts: {
    productTitle: string;
    snapshots: Array<{ date: string; score: number; weekly_bought: number }>;
    forecastTrend: string;
  }): Promise<{ analysis: string; factors: string[]; recommendation: string }> {
    const fallback = { analysis: '', factors: [], recommendation: '' };

    if (opts.snapshots.length < 3) {
      return {
        analysis: 'Mahsulot hali yetarli tarixiy ma\'lumotga ega emas. Bir necha kun kuzatuvdan so\'ng to\'liq tahlil paydo bo\'ladi.',
        factors: ['Yangi mahsulot — ma\'lumot to\'planmoqda'],
        recommendation: 'Mahsulotni kuzatuvda ushlab turing',
      };
    }

    try {
      const dataPoints = opts.snapshots.slice(-14).map(
        (s) => `${s.date.split('T')[0]}: score=${s.score.toFixed(2)}, sold=${s.weekly_bought}`,
      ).join('\n');

      const startMs = Date.now();
      const message = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content:
            `Mahsulot: "${opts.productTitle}"\n` +
            `Prognoz trendi: ${opts.forecastTrend}\n\n` +
            `So'nggi ma'lumotlar:\n${dataPoints}\n\n` +
            `Trend tahlili qil. JSON qaytir:\n` +
            `{"analysis": "1-2 jumla tahlil", "factors": ["sabab1", "sabab2"], "recommendation": "Tavsiya"}`,
        }],
      });

      await this.quotaService.logCall({ method: 'analyzeTrend', model: 'claude-haiku-4-5-20251001', inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens, durationMs: Date.now() - startMs });

      const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
      const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      this.logger.debug(`analyzeTrend raw response: ${text.substring(0, 200)}`);
      try {
        const parsed = JSON.parse(text);
        return {
          analysis: parsed.analysis || '',
          factors: Array.isArray(parsed.factors) ? parsed.factors : [],
          recommendation: parsed.recommendation || '',
        };
      } catch {
        this.logger.warn(`analyzeTrend JSON parse failed, raw: ${raw.substring(0, 100)}`);
        return fallback;
      }
    } catch (err: unknown) {
      this.logger.error(`analyzeTrend failed: ${err instanceof Error ? err.message : String(err)}`);
      return fallback;
    }
  }
}
