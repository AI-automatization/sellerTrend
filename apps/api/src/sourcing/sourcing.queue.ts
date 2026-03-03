import { Queue, QueueEvents } from 'bullmq';
import { getBullMQConnection } from '../common/redis/redis.module';

let _queue: Queue | null = null;
let _queueEvents: QueueEvents | null = null;

function getQueue(): Queue {
  if (!_queue) _queue = new Queue('sourcing-search', getBullMQConnection());
  return _queue;
}

function getQueueEvents(): QueueEvents {
  if (!_queueEvents) _queueEvents = new QueueEvents('sourcing-search', getBullMQConnection());
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
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 86400, count: 500 },
    },
  );

  try {
    const result = await job.waitUntilFinished(getQueueEvents(), 90_000);
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
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400, count: 500 },
  });
}
