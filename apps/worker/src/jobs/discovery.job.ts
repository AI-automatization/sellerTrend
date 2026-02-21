import { Queue } from 'bullmq';
import { redisConnection } from '../redis';
import type { CategoryDiscoveryJobData } from '@uzum/types';

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
