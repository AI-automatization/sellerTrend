/**
 * Embedding batch processor (T-485).
 *
 * Kunlik kechasi barcha tracked product larning embedding larini yangilaydi.
 * OpenAI text-embedding-3-small → product_embeddings jadvaliga saqlaydi.
 *
 * Cron: 05:00 UTC (ml-prediction 04:00 dan keyin)
 */

import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';

const QUEUE_NAME = 'embedding-queue';
const OPENAI_EMBED_URL = 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 10; // parallel per round
const REQUEST_TIMEOUT_MS = 20_000;

async function getEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(OPENAI_EMBED_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data: Array<{ embedding: number[] }> };
    return data.data[0]?.embedding ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function buildProductText(product: {
  title: string;
  category_path?: string[] | null;
  orders_quantity?: bigint | null;
  score?: number | null;
  weekly_bought?: number | null;
  sell_price?: bigint | null;
}): string {
  const parts: string[] = [`Mahsulot: ${product.title}`];
  if (product.category_path?.length) parts.push(`Kategoriya: ${product.category_path.join(' > ')}`);
  if (product.sell_price != null) parts.push(`Narx: ${Number(product.sell_price).toLocaleString()} so'm`);
  if (product.weekly_bought != null) parts.push(`Haftalik sotuv: ${product.weekly_bought} ta`);
  if (product.orders_quantity != null) parts.push(`Jami buyurtma: ${product.orders_quantity.toString()}`);
  if (product.score != null) parts.push(`Reyting ball: ${product.score.toFixed(2)}`);
  return parts.join('. ');
}

async function runEmbeddingBatch(jobId: string, jobName: string): Promise<{
  total: number;
  success: number;
  skipped: number;
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logJobInfo(QUEUE_NAME, jobId, jobName, 'OPENAI_API_KEY yo\'q — skip');
    return { total: 0, success: 0, skipped: 0 };
  }

  // Aktiv tracked product lar
  const tracked = await prisma.trackedProduct.findMany({
    where: { is_active: true },
    select: { product_id: true },
    distinct: ['product_id'],
  });

  const total = tracked.length;
  logJobInfo(QUEUE_NAME, jobId, jobName, `${total} ta product embedding boshlanmoqda`);

  let success = 0;
  let skipped = 0;

  for (let i = 0; i < tracked.length; i += BATCH_SIZE) {
    const batch = tracked.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async ({ product_id }) => {
        try {
          const product = await prisma.product.findUnique({
            where: { id: product_id },
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

          if (!product) { skipped++; return; }

          const snap = product.snapshots[0];
          const sku = product.skus[0];
          const content = buildProductText({
            title: product.title,
            category_path: Array.isArray(product.category_path) ? (product.category_path as string[]) : null,
            orders_quantity: product.orders_quantity,
            score: snap?.score ? Number(snap.score) : null,
            weekly_bought: snap?.weekly_bought ?? null,
            sell_price: sku?.min_sell_price ?? null,
          });

          const vector = await getEmbedding(content, apiKey);
          if (!vector) { skipped++; return; }

          await prisma.$executeRaw`
            INSERT INTO product_embeddings (id, product_id, content, embedding, updated_at)
            VALUES (
              gen_random_uuid()::text,
              ${product_id},
              ${content},
              ${`[${vector.join(',')}]`}::vector,
              now()
            )
            ON CONFLICT (product_id) DO UPDATE
              SET content    = EXCLUDED.content,
                  embedding  = EXCLUDED.embedding,
                  updated_at = now()
          `;

          success++;
        } catch {
          skipped++;
        }
      }),
    );
  }

  return { total, success, skipped };
}

export function createEmbeddingWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const start = Date.now();
      logJobStart(QUEUE_NAME, job.id ?? '-', job.name);
      try {
        const result = await runEmbeddingBatch(job.id ?? '-', job.name);
        logJobDone(QUEUE_NAME, job.id ?? '-', job.name, Date.now() - start, result);
        return result;
      } catch (err) {
        logJobError(QUEUE_NAME, job.id ?? '-', job.name, err, Date.now() - start);
        throw err;
      }
    },
    { ...redisConnection, concurrency: 1 },
  );

  worker.on('error', (err) => logJobError(QUEUE_NAME, '-', 'worker', err));
  worker.on('failed', (job, err) =>
    logJobError(QUEUE_NAME, job?.id ?? '-', job?.name ?? '-', err),
  );

  return worker;
}
