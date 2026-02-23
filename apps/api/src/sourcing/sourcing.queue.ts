import { Queue, QueueEvents } from 'bullmq';

const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');

const redisConnection = {
  connection: {
    host: redisUrl.hostname,
    port: parseInt(redisUrl.port || '6379', 10),
    maxRetriesPerRequest: null,
  },
};

export const sourcingSearchQueue = new Queue('sourcing-search', redisConnection);

const queueEvents = new QueueEvents('sourcing-search', redisConnection);

export interface SourcingSearchJobData {
  query: string;
}

export interface ExternalProduct {
  title: string;
  price: string;
  source: string; // 'ALIEXPRESS' | 'ALIBABA'
  link: string;
  image: string;
  store: string;
}

/**
 * Job yuboramiz va natijasini kutamiz (max 30 soniya).
 * Agar vaqt o'tsa yoki xato bo'lsa — bo'sh massiv qaytaramiz.
 */
export async function enqueueSourcingSearch(
  query: string,
): Promise<ExternalProduct[]> {
  const job = await sourcingSearchQueue.add(
    'search',
    { query } satisfies SourcingSearchJobData,
    { attempts: 1, removeOnComplete: 50, removeOnFail: 20 },
  );

  try {
    const result = await job.waitUntilFinished(queueEvents, 30_000);
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}
