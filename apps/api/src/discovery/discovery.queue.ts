import { Queue } from 'bullmq';
import type { CategoryDiscoveryJobData } from '@uzum/types';

const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');

const redisConnection = {
  connection: {
    host: redisUrl.hostname,
    port: parseInt(redisUrl.port || '6379', 10),
    maxRetriesPerRequest: null, // Required for BullMQ
  },
};

export const discoveryQueue = new Queue<CategoryDiscoveryJobData>(
  'discovery-queue',
  redisConnection,
);

export async function enqueueDiscovery(data: CategoryDiscoveryJobData) {
  return discoveryQueue.add('category-discovery', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
}
