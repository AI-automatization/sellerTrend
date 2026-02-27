import { Queue } from 'bullmq';
import type { CategoryDiscoveryJobData } from '@uzum/types';

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

let _queue: Queue<CategoryDiscoveryJobData> | null = null;

function getQueue(): Queue<CategoryDiscoveryJobData> {
  if (!_queue) _queue = new Queue('discovery-queue', getRedisConnection());
  return _queue;
}

export async function enqueueDiscovery(data: CategoryDiscoveryJobData) {
  return getQueue().add('category-discovery', data, {
    attempts: 1,
  });
}
