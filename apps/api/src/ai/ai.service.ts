import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';

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

      const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
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

      const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
      let bullets: string[] = [];
      try {
        bullets = JSON.parse(text);
        if (!Array.isArray(bullets)) throw new Error('not array');
      } catch {
        // Fallback: split by newline
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
      this.logger.error(`generateSearchQuery failed: ${err.message}`);
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
