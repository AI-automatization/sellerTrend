import { Queue } from 'bullmq';

const QUEUE_NAME = 'weekly-scrape-queue';

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

let queue: Queue | null = null;

function getQueue(): Queue {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, getRedisConnection());
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
