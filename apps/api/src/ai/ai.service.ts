import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';

// Haiku pricing per 1M tokens (USD)
const HAIKU_INPUT_COST = 0.80 / 1_000_000;
const HAIKU_OUTPUT_COST = 4.00 / 1_000_000;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: Anthropic;

  constructor(private readonly prisma: PrismaService) {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Check if an account has exceeded its monthly AI budget.
   * Throws ForbiddenException if over limit. No-op if limit is NULL (unlimited).
   */
  async checkAiQuota(accountId: string): Promise<void> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { ai_monthly_limit_usd: true },
    });
    if (!account?.ai_monthly_limit_usd) return; // unlimited

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const usage = await this.prisma.aiUsageLog.aggregate({
      where: { account_id: accountId, created_at: { gte: monthStart } },
      _sum: { cost_usd: true },
    });

    const usedUsd = Number(usage._sum.cost_usd ?? 0);
    const limitUsd = Number(account.ai_monthly_limit_usd);

    if (usedUsd >= limitUsd) {
      throw new ForbiddenException(
        `AI oylik budget tugagan: $${usedUsd.toFixed(4)} / $${limitUsd.toFixed(2)}. Keyingi oyda yangilanadi.`,
      );
    }
  }

  /**
   * Get current month AI usage for an account.
   */
  async getAiUsage(accountId: string): Promise<{
    used_usd: number;
    limit_usd: number | null;
    remaining_usd: number | null;
    calls_this_month: number;
  }> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { ai_monthly_limit_usd: true },
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const usage = await this.prisma.aiUsageLog.aggregate({
      where: { account_id: accountId, created_at: { gte: monthStart } },
      _sum: { cost_usd: true },
      _count: true,
    });

    const usedUsd = Number(usage._sum.cost_usd ?? 0);
    const limitUsd = account?.ai_monthly_limit_usd ? Number(account.ai_monthly_limit_usd) : null;

    return {
      used_usd: usedUsd,
      limit_usd: limitUsd,
      remaining_usd: limitUsd !== null ? Math.max(0, limitUsd - usedUsd) : null,
      calls_this_month: usage._count ?? 0,
    };
  }

  /** Log AI usage to database for cost tracking */
  private async logUsage(opts: {
    method: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    productId?: string;
    accountId?: string;
    userId?: string;
    durationMs?: number;
    error?: string;
  }): Promise<void> {
    try {
      const costUsd = opts.inputTokens * HAIKU_INPUT_COST + opts.outputTokens * HAIKU_OUTPUT_COST;
      await this.prisma.aiUsageLog.create({
        data: {
          method: opts.method,
          model: opts.model,
          input_tokens: opts.inputTokens,
          output_tokens: opts.outputTokens,
          cost_usd: costUsd,
          product_id: opts.productId,
          account_id: opts.accountId,
          user_id: opts.userId,
          duration_ms: opts.durationMs,
          error: opts.error,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to log AI usage: ${err.message}`);
    }
  }

  /**
   * Extract structured attributes from a product title.
   * Results are cached in product_ai_attributes (runs once per product).
   */
  async extractAttributes(productId: bigint, title: string): Promise<{
    brand: string | null;
    model: string | null;
    type: string | null;
    color: string | null;
    raw_json: any;
  } | null> {
    // Check cache first
    const cached = await this.prisma.productAiAttribute.findUnique({
      where: { product_id: productId },
    });
    if (cached) return cached;

    const startMs = Date.now();
    try {
      const message = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content:
              `Mahsulot nomi: "${title}"\n\n` +
              `Quyidagi JSON formatida qaytaring (boshqa hech narsa yozmang):\n` +
              `{"brand":null,"model":null,"type":null,"color":null}`,
          },
        ],
      });

      await this.logUsage({
        method: 'extractAttributes',
        model: 'claude-haiku-4-5-20251001',
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        productId: productId.toString(),
        durationMs: Date.now() - startMs,
      });

      let text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
      // Strip markdown code fences (```json ... ```)
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      let parsed: any = {};
      try {
        parsed = JSON.parse(text);
      } catch {
        this.logger.warn(`AI parse failed for product ${productId}: ${text}`);
        return null;
      }

      const attrs = await this.prisma.productAiAttribute.upsert({
        where: { product_id: productId },
        update: {
          brand: parsed.brand ?? null,
          model: parsed.model ?? null,
          type: parsed.type ?? null,
          color: parsed.color ?? null,
          raw_json: parsed,
        },
        create: {
          product_id: productId,
          brand: parsed.brand ?? null,
          model: parsed.model ?? null,
          type: parsed.type ?? null,
          color: parsed.color ?? null,
          raw_json: parsed,
        },
      });

      this.logger.log(`Attributes extracted for product ${productId}`);
      return attrs;
    } catch (err: any) {
      await this.logUsage({ method: 'extractAttributes', model: 'claude-haiku-4-5-20251001', inputTokens: 0, outputTokens: 0, productId: productId.toString(), durationMs: Date.now() - startMs, error: err.message });
      this.logger.error(`extractAttributes failed for ${productId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Generate a "why is this hot" explanation for a winner product.
   * Cached per snapshot_id — runs once per snapshot.
   */
  async explainWinner(opts: {
    productId: bigint;
    snapshotId: string;
    title: string;
    score: number;
    weeklyBought: number | null;
    ordersQuantity: number;
    discountPercent?: number;
    rating: number;
  }): Promise<string[] | null> {
    // Check cache by snapshot_id
    const cached = await this.prisma.productAiExplanation.findFirst({
      where: { snapshot_id: opts.snapshotId },
    });
    if (cached?.explanation) {
      try { return JSON.parse(cached.explanation); } catch { return null; }
    }

    const startMs = Date.now();
    try {
      const message = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content:
              `Mahsulot: ${opts.title}\n` +
              `Score: ${opts.score.toFixed(2)}\n` +
              `So'nggi faollik (weekly_bought): ${opts.weeklyBought ?? 'N/A'}\n` +
              `Jami buyurtmalar: ${opts.ordersQuantity.toLocaleString()}\n` +
              `Chegirma: ${opts.discountPercent ?? 0}%\n` +
              `Reyting: ${opts.rating}\n\n` +
              `Nima uchun bu mahsulot "hot" ekanligini 2-4 ta qisqa bulletda tushuntir.\n` +
              `Faqat JSON massiv qaytir: ["...", "...", "..."]`,
          },
        ],
      });

      await this.logUsage({
        method: 'explainWinner',
        model: 'claude-haiku-4-5-20251001',
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        productId: opts.productId.toString(),
        durationMs: Date.now() - startMs,
      });

      let text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
      // Strip markdown code fences (```json ... ```)
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      let bullets: string[] = [];
      try {
        bullets = JSON.parse(text);
        if (!Array.isArray(bullets)) throw new Error('not array');
      } catch {
        bullets = text.split('\n').filter((l) => l.trim().length > 0).slice(0, 4);
      }

      await this.prisma.productAiExplanation.create({
        data: {
          product_id: opts.productId,
          snapshot_id: opts.snapshotId,
          explanation: JSON.stringify(bullets),
        },
      });

      this.logger.log(`Explanation generated for product ${opts.productId}`);
      return bullets;
    } catch (err: any) {
      await this.logUsage({ method: 'explainWinner', model: 'claude-haiku-4-5-20251001', inputTokens: 0, outputTokens: 0, productId: opts.productId.toString(), durationMs: Date.now() - startMs, error: err.message });
      this.logger.error(`explainWinner failed for ${opts.productId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Batch: extract attributes for multiple products (with rate limiting).
   */
  async batchExtractAttributes(
    products: Array<{ id: bigint; title: string }>,
  ): Promise<void> {
    for (const p of products) {
      // Skip if already cached
      const exists = await this.prisma.productAiAttribute.findUnique({
        where: { product_id: p.id },
        select: { id: true },
      });
      if (exists) continue;

      await this.extractAttributes(p.id, p.title);
      // Rate limit: ~3 req/sec with Haiku
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  /**
   * Generate optimized search queries for external marketplace search.
   * Uses Haiku for speed and cost efficiency.
   */
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
        messages: [
          {
            role: 'user',
            content:
              `Mahsulot nomi: "${productTitle}"\n\n` +
              `Quyidagi JSON formatida qidiruv so'rovlari yarat (boshqa hech narsa yozmang):\n` +
              `{\n` +
              `  "cn_query": "Xitoy marketplace (1688/Taobao) uchun qisqa inglizcha yoki xitoycha qidiruv",\n` +
              `  "en_query": "Amazon/AliExpress uchun inglizcha qidiruv",\n` +
              `  "keywords": ["asosiy", "kalit", "sozlar"]\n` +
              `}`,
          },
        ],
      });

      await this.logUsage({ method: 'generateSearchQuery', model: 'claude-haiku-4-5-20251001', inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens, durationMs: Date.now() - startMs });

      const text =
        message.content[0].type === 'text' ? message.content[0].text.trim() : '';
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
    } catch (err: any) {
      await this.logUsage({ method: 'generateSearchQuery', model: 'claude-haiku-4-5-20251001', inputTokens: 0, outputTokens: 0, durationMs: Date.now() - startMs, error: err.message });
      this.logger.error(`generateSearchQuery failed: ${err.message}`);
      return fallback;
    }
  }

  /**
   * Feature 12: Generate optimized product description for Uzum marketplace.
   */
  async generateDescription(opts: {
    title: string;
    attributes?: Record<string, string | null>;
    category?: string;
    keywords?: string[];
  }): Promise<{ title_optimized: string; description: string; bullets: string[]; seo_keywords: string[] }> {
    const fallback = {
      title_optimized: opts.title,
      description: '',
      bullets: [],
      seo_keywords: opts.keywords ?? [],
    };

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

      await this.logUsage({ method: 'generateDescription', model: 'claude-haiku-4-5-20251001', inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens, durationMs: Date.now() - startMs });

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
    } catch (err: any) {
      this.logger.error(`generateDescription failed: ${err.message}`);
      return fallback;
    }
  }

  /**
   * Feature 13: Analyze review/feedback sentiment for a product.
   */
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
    const fallback = {
      overall: 'neutral' as const,
      score: 0.5,
      summary: 'Tahlil mavjud emas',
      pros: [],
      cons: [],
      keywords: [],
    };

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

      await this.logUsage({ method: 'analyzeSentiment', model: 'claude-haiku-4-5-20251001', inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens, durationMs: Date.now() - startMs });

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
    } catch (err: any) {
      this.logger.error(`analyzeSentiment failed: ${err.message}`);
      return fallback;
    }
  }

  /**
   * Feature 11: AI trend analysis for a product's historical data.
   */
  async analyzeTrend(opts: {
    productTitle: string;
    snapshots: Array<{ date: string; score: number; weekly_bought: number }>;
    forecastTrend: string;
  }): Promise<{ analysis: string; factors: string[]; recommendation: string }> {
    const fallback = {
      analysis: '',
      factors: [],
      recommendation: '',
    };

    if (opts.snapshots.length < 3) return fallback;

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

      await this.logUsage({ method: 'analyzeTrend', model: 'claude-haiku-4-5-20251001', inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens, durationMs: Date.now() - startMs });

      const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
      try {
        const parsed = JSON.parse(text);
        return {
          analysis: parsed.analysis || '',
          factors: Array.isArray(parsed.factors) ? parsed.factors : [],
          recommendation: parsed.recommendation || '',
        };
      } catch {
        return fallback;
      }
    } catch (err: any) {
      this.logger.error(`analyzeTrend failed: ${err.message}`);
      return fallback;
    }
  }

  /**
   * Score external search results for match quality against a Uzum product.
   * Uses Sonnet for better accuracy. Batch processes up to 20 results.
   */
  async scoreExternalResults(
    uzumTitle: string,
    results: Array<{ index: number; title: string; price: string; platform: string }>,
  ): Promise<Array<{ index: number; match_score: number; note: string }>> {
    if (results.length === 0) return [];

    const fallback = results.map((r) => ({
      index: r.index,
      match_score: 0.5,
      note: 'AI scoring unavailable',
    }));

    try {
      const resultsList = results
        .map((r) => `${r.index}. [${r.platform}] ${r.title} — ${r.price}`)
        .join('\n');

      const startMs = Date.now();
      const message = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content:
              `Uzum mahsuloti: "${uzumTitle}"\n\n` +
              `Quyidagi tashqi platformalardan topilgan mahsulotlarni tahlil qil.\n` +
              `Har biriga 0.0-1.0 oraligida match_score ber.\n` +
              `Bir xil mahsulotga 0.8+, oxshashiga 0.5-0.8, boshqasiga 0.5 dan past.\n\n` +
              `Mahsulotlar:\n${resultsList}\n\n` +
              `Faqat JSON massiv qaytir:\n` +
              `[{"index": 0, "match_score": 0.95, "note": "Xuddi shu model"}, ...]`,
          },
        ],
      });

      await this.logUsage({ method: 'scoreExternalResults', model: 'claude-haiku-4-5-20251001', inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens, durationMs: Date.now() - startMs });

      const text =
        message.content[0].type === 'text' ? message.content[0].text.trim() : '';
      try {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) return fallback;
        return parsed.map((item: any) => ({
          index: typeof item.index === 'number' ? item.index : 0,
          match_score: typeof item.match_score === 'number'
            ? Math.min(1, Math.max(0, item.match_score))
            : 0.5,
          note: item.note || '',
        }));
      } catch {
        this.logger.warn(`AI scoring parse failed: ${text.slice(0, 100)}`);
        return fallback;
      }
    } catch (err: any) {
      this.logger.error(`scoreExternalResults failed: ${err.message}`);
      return fallback;
    }
  }
}
