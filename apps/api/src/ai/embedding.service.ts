/**
 * EmbeddingService — OpenAI text-embedding-3-small orqali
 * product matnini vektorga aylantiradi va product_embeddings jadvaliga saqlaydi.
 *
 * RAG pipeline uchun: embed → store → pgvector similarity search.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

const EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536 dimensions
const OPENAI_EMBED_URL = 'https://api.openai.com/v1/embeddings';
const REQUEST_TIMEOUT_MS = 30_000;
const SIMILARITY_LIMIT = 5;

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly apiKey: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!this.apiKey) {
      this.logger.warn('OPENAI_API_KEY not set — embeddings will be skipped');
    }
  }

  /** Matn uchun OpenAI embedding vektori olish */
  async getEmbedding(text: string): Promise<number[] | null> {
    if (!this.apiKey) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(OPENAI_EMBED_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
        signal: controller.signal,
      });

      if (!res.ok) {
        this.logger.warn(`OpenAI embedding error: ${res.status}`);
        return null;
      }

      const data = (await res.json()) as {
        data: Array<{ embedding: number[] }>;
      };
      return data.data[0]?.embedding ?? null;
    } catch (err: unknown) {
      this.logger.warn(
        `Embedding fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Mahsulot uchun matn tayyorlash */
  buildProductText(product: {
    title: string;
    score?: number | null;
    weekly_bought?: number | null;
    orders_quantity?: string | null;
    sell_price?: number | null;
    category_path?: string[];
  }): string {
    const parts: string[] = [];
    parts.push(`Mahsulot: ${product.title}`);
    if (product.category_path?.length) {
      parts.push(`Kategoriya: ${product.category_path.join(' > ')}`);
    }
    if (product.sell_price != null) {
      parts.push(`Narx: ${product.sell_price.toLocaleString()} so'm`);
    }
    if (product.weekly_bought != null) {
      parts.push(`Haftalik sotuv: ${product.weekly_bought} ta`);
    }
    if (product.orders_quantity != null) {
      parts.push(`Jami buyurtma: ${product.orders_quantity}`);
    }
    if (product.score != null) {
      parts.push(`Reyting ball: ${Number(product.score).toFixed(2)}`);
    }
    return parts.join('. ');
  }

  /**
   * Mahsulot uchun embedding yaratish va saqlash.
   * `product_embeddings` jadvalida UPSERT qiladi.
   */
  async embedAndStoreProduct(productId: bigint): Promise<boolean> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        title: true,
        category_path: true,
        orders_quantity: true,
        snapshots: {
          orderBy: { snapshot_at: 'desc' },
          take: 1,
          select: { score: true, weekly_bought: true },
        },
        skus: {
          where: { is_available: true },
          orderBy: { min_sell_price: 'asc' },
          take: 1,
          select: { min_sell_price: true },
        },
      },
    });

    if (!product) return false;

    const snap = product.snapshots[0];
    const sku = product.skus[0];
    const content = this.buildProductText({
      title: product.title,
      category_path: Array.isArray(product.category_path) ? (product.category_path as string[]) : [],
      orders_quantity: product.orders_quantity?.toString() ?? null,
      score: snap?.score ? Number(snap.score) : null,
      weekly_bought: snap?.weekly_bought ?? null,
      sell_price: sku?.min_sell_price ? Number(sku.min_sell_price) : null,
    });

    const vector = await this.getEmbedding(content);
    if (!vector) return false;

    // Prisma vector(1536) Unsupported — raw SQL bilan upsert
    await this.prisma.$executeRaw`
      INSERT INTO product_embeddings (id, product_id, content, embedding, updated_at)
      VALUES (
        gen_random_uuid()::text,
        ${productId},
        ${content},
        ${`[${vector.join(',')}]`}::vector,
        now()
      )
      ON CONFLICT (product_id) DO UPDATE
        SET content    = EXCLUDED.content,
            embedding  = EXCLUDED.embedding,
            updated_at = now()
    `;

    return true;
  }

  /**
   * pgvector cosine similarity search — eng o'xshash mahsulotlarni topish.
   * @param queryText — qidirish matni
   * @param accountId — faqat shu account tracked mahsulotlari
   */
  async similaritySearch(
    queryText: string,
    accountId: string,
  ): Promise<Array<{ product_id: bigint; title: string; score: number }>> {
    const vector = await this.getEmbedding(queryText);
    if (!vector) return [];

    const rows = await this.prisma.$queryRaw<
      Array<{ product_id: bigint; title: string; similarity: number }>
    >`
      SELECT
        pe.product_id,
        p.title,
        1 - (pe.embedding <=> ${`[${vector.join(',')}]`}::vector) AS similarity
      FROM product_embeddings pe
      JOIN products p ON p.id = pe.product_id
      JOIN tracked_products tp ON tp.product_id = pe.product_id
        AND tp.account_id = ${accountId}
        AND tp.is_active = true
      WHERE pe.embedding IS NOT NULL
      ORDER BY pe.embedding <=> ${`[${vector.join(',')}]`}::vector
      LIMIT ${SIMILARITY_LIMIT}
    `;

    return rows.map((r) => ({
      product_id: r.product_id,
      title: r.title,
      score: Number(r.similarity),
    }));
  }
}
