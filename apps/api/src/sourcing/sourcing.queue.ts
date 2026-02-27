import { Queue, QueueEvents } from 'bullmq';

function getRedisConnection() {
  const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
  return {
    connection: {
      host: redisUrl.hostname,
      port: parseInt(redisUrl.port || '6379', 10),
      username: redisUrl.username || undefined,
      password: redisUrl.password || undefined,
      maxRetriesPerRequest: null,
    },
  };
}

let _queue: Queue | null = null;
let _queueEvents: QueueEvents | null = null;

function getQueue(): Queue {
  if (!_queue) _queue = new Queue('sourcing-search', getRedisConnection());
  return _queue;
}

function getQueueEvents(): QueueEvents {
  if (!_queueEvents) _queueEvents = new QueueEvents('sourcing-search', getRedisConnection());
  return _queueEvents;
}

export interface SourcingSearchJobData {
  query: string;
  // Full mode fields
  jobId?: string;
  productId?: number;
  productTitle?: string;
  accountId?: string;
  platforms?: string[];
}

export interface ExternalProduct {
  title: string;
  price: string;
  source: string; // 'ALIEXPRESS' | 'ALIBABA' | 'BANGGOOD' | 'SHOPEE' | '1688' | ...
  link: string;
  image: string;
  store: string;
}

/**
 * Quick search — Job yuboramiz va natijasini kutamiz (max 60 soniya).
 */
export async function enqueueSourcingSearch(
  query: string,
): Promise<ExternalProduct[]> {
  const job = await getQueue().add(
    'search',
    { query } satisfies SourcingSearchJobData,
    { attempts: 1, removeOnComplete: 50, removeOnFail: 20 },
  );

  try {
    const result = await job.waitUntilFinished(getQueueEvents(), 60_000);
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

/**
 * Full pipeline — fire-and-forget job (results saved to DB).
 * Client polls GET /sourcing/jobs/:id for status.
 */
export async function enqueueSourcingJob(
  data: SourcingSearchJobData,
): Promise<void> {
  await getQueue().add('full-search', data, {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  });
}
