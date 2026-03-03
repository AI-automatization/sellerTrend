import { Queue } from 'bullmq';
import type { CategoryDiscoveryJobData } from '@uzum/types';
import { getBullMQConnection } from '../common/redis/redis.module';

let _queue: Queue<CategoryDiscoveryJobData> | null = null;

function getQueue(): Queue<CategoryDiscoveryJobData> {
  if (!_queue) _queue = new Queue('discovery-queue', getBullMQConnection());
  return _queue;
}

export async function enqueueDiscovery(data: CategoryDiscoveryJobData) {
  return getQueue().add('category-discovery', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400, count: 500 },
  });
}
