import { Queue } from 'bullmq';
import type { CategoryDiscoveryJobData } from '@uzum/types';

const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');

const redisConnection = {
  connection: {
    host: redisUrl.hostname,
    port: parseInt(redisUrl.port || '6379', 10),
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    maxRetriesPerRequest: null, // Required for BullMQ
  },
};

export const discoveryQueue = new Queue<CategoryDiscoveryJobData>(
  'discovery-queue',
  redisConnection,
);

export async function enqueueDiscovery(data: CategoryDiscoveryJobData) {
  return discoveryQueue.add('category-discovery', data, {
    attempts: 1, // Playwright scraping: no retry (Uzum service outage = persistent error)
  });
}
