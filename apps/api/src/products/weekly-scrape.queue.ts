import { Queue } from 'bullmq';
import { getBullMQConnection } from '../common/redis/redis.module';

const QUEUE_NAME = 'weekly-scrape-queue';

let queue: Queue | null = null;

function getQueue(): Queue {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, getBullMQConnection());
  }
  return queue;
}

/**
 * Enqueue an immediate weekly scrape for a single product.
 * Fire-and-forget — called after analyzeProduct() or import.
 */
export async function enqueueImmediateScrape(productId: string | bigint) {
  await getQueue().add(
    'immediate-scrape',
    { mode: 'single', productId: productId.toString() },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 86400, count: 500 },
    },
  );
}

/** Close the queue connection (call on app shutdown). */
export async function closeWeeklyScrapeQueue(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = null;
  }
}
