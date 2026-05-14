import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiQuotaService } from './ai-quota.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: Anthropic;

  constructor(
    private readonly prisma: PrismaService,
    private readonly quotaService: AiQuotaService,
  ) {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async extractAttributes(productId: bigint, title: string): Promise<{
    brand: string | null;
    model: string | null;
    type: string | null;
    color: string | null;
    raw_json: unknown;
  } | null> {
    const cached = await this.prisma.productAiAttribute.findUnique({
      where: { product_id: productId },
    });
    if (cached) return cached;

    const startMs = Date.now();
    try {
      const message = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content:
            `Mahsulot nomi: "${title}"\n\n` +
            `Quyidagi JSON formatida qaytaring (boshqa hech narsa yozmang):\n` +
            `{"brand":null,"model":null,"type":null,"color":null}`,
        }],
      });

      await this.quotaService.logCall({
        method: 'extractAttributes',
        model: 'claude-haiku-4-5-20251001',
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        productId: productId.toString(),
        durationMs: Date.now() - startMs,
      });

      let text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(text) as Record<string, unknown>;
      } catch {
        this.logger.warn(`AI parse failed for product ${productId}: ${text}`);
        return null;
      }

      const attrs = await this.prisma.productAiAttribute.upsert({
        where: { product_id: productId },
        update: {
          brand: typeof parsed.brand === 'string' ? parsed.brand : null,
          model: typeof parsed.model === 'string' ? parsed.model : null,
          type: typeof parsed.type === 'string' ? parsed.type : null,
          color: typeof parsed.color === 'string' ? parsed.color : null,
          raw_json: parsed as Prisma.InputJsonValue,
        },
        create: {
          product_id: productId,
          brand: typeof parsed.brand === 'string' ? parsed.brand : null,
          model: typeof parsed.model === 'string' ? parsed.model : null,
          type: typeof parsed.type === 'string' ? parsed.type : null,
          color: typeof parsed.color === 'string' ? parsed.color : null,
          raw_json: parsed as Prisma.InputJsonValue,
        },
      });

      this.logger.log(`Attributes extracted for product ${productId}`);
      return attrs;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.quotaService.logCall({ method: 'extractAttributes', model: 'claude-haiku-4-5-20251001', inputTokens: 0, outputTokens: 0, productId: productId.toString(), durationMs: Date.now() - startMs, error: msg });
      this.logger.error(`extractAttributes failed for ${productId}: ${msg}`);
      return null;
    }
  }

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
        messages: [{
          role: 'user',
          content:
            `Sen Uzum marketplace sotuvchilariga maslahat beradigan mutaxassissan.\n\n` +
            `Mahsulot: ${opts.title}\n` +
            `Score: ${opts.score.toFixed(2)}\n` +
            `Haftalik sotuv: ${opts.weeklyBought ?? 'noma\'lum'}\n` +
            `Jami buyurtmalar: ${opts.ordersQuantity.toLocaleString()}\n` +
            `Chegirma: ${opts.discountPercent ?? 0}%\n` +
            `Reyting: ${opts.rating}\n\n` +
            `Sotuvchi uchun 3 ta AMALIY maslahat ber:\n` +
            `1. Bu mahsulot nima uchun yaxshi sotilmoqda (sabab)\n` +
            `2. Raqobatchi bo'lsa nima qilish kerak (strategiya)\n` +
            `3. Xavf yoki e'tibor berish kerak bo'lgan narsa\n\n` +
            `Har bir maslahat 1 jumla. O'zbek tilida. Faqat JSON massiv qaytir: ["...", "...", "..."]`,
        }],
      });

      await this.quotaService.logCall({
        method: 'explainWinner',
        model: 'claude-haiku-4-5-20251001',
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        productId: opts.productId.toString(),
        durationMs: Date.now() - startMs,
      });

      let text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      let bullets: string[] = [];
      try {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error('not array');
        bullets = parsed.filter((b: unknown) => typeof b === 'string' && b.trim().length > 0);
      } catch {
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            if (Array.isArray(parsed)) {
              bullets = parsed.filter((b: unknown) => typeof b === 'string' && b.trim().length > 0);
            }
          } catch { /* ignore */ }
        }
        if (bullets.length === 0) {
          bullets = text.split('\n')
            .map((l) => l.replace(/^[\s\-\d\."'\[\],]+/, '').replace(/["\]\[,]+$/, '').trim())
            .filter((l) => l.length > 10)
            .slice(0, 3);
        }
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.quotaService.logCall({ method: 'explainWinner', model: 'claude-haiku-4-5-20251001', inputTokens: 0, outputTokens: 0, productId: opts.productId.toString(), durationMs: Date.now() - startMs, error: msg });
      this.logger.error(`explainWinner failed for ${opts.productId}: ${msg}`);
      return null;
    }
  }

  async batchExtractAttributes(products: Array<{ id: bigint; title: string }>): Promise<void> {
    for (const p of products) {
      const exists = await this.prisma.productAiAttribute.findUnique({
        where: { product_id: p.id },
        select: { id: true },
      });
      if (exists) continue;

      await this.extractAttributes(p.id, p.title);
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  async scoreExternalResults(
    uzumTitle: string,
    results: Array<{ index: number; title: string; price: string; platform: string }>,
  ): Promise<Array<{ index: number; match_score: number; note: string }>> {
    if (results.length === 0) return [];

    const fallback = results.map((r) => ({ index: r.index, match_score: 0.5, note: 'AI scoring unavailable' }));

    try {
      const resultsList = results.map((r) => `${r.index}. [${r.platform}] ${r.title} — ${r.price}`).join('\n');

      const startMs = Date.now();
      const message = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content:
            `Uzum mahsuloti: "${uzumTitle}"\n\n` +
            `Quyidagi tashqi platformalardan topilgan mahsulotlarni tahlil qil.\n` +
            `Har biriga 0.0-1.0 oraligida match_score ber.\n` +
            `Bir xil mahsulotga 0.8+, oxshashiga 0.5-0.8, boshqasiga 0.5 dan past.\n\n` +
            `Mahsulotlar:\n${resultsList}\n\n` +
            `Faqat JSON massiv qaytir:\n` +
            `[{"index": 0, "match_score": 0.95, "note": "Xuddi shu model"}, ...]`,
        }],
      });

      await this.quotaService.logCall({ method: 'scoreExternalResults', model: 'claude-haiku-4-5-20251001', inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens, durationMs: Date.now() - startMs });

      const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
      try {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) return fallback;
        return parsed.map((item: Record<string, unknown>) => ({
          index: typeof item.index === 'number' ? item.index : 0,
          match_score: typeof item.match_score === 'number' ? Math.min(1, Math.max(0, item.match_score)) : 0.5,
          note: typeof item.note === 'string' ? item.note : '',
        }));
      } catch {
        this.logger.warn(`AI scoring parse failed: ${text.slice(0, 100)}`);
        return fallback;
      }
    } catch (err: unknown) {
      this.logger.error(`scoreExternalResults failed: ${err instanceof Error ? err.message : String(err)}`);
      return fallback;
    }
  }
}
