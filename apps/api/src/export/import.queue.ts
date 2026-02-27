import { Queue } from 'bullmq';

const QUEUE_NAME = 'import-batch';

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

export interface ImportBatchJobData {
  accountId: string;
  urls: string[];
}

export async function enqueueImportBatch(data: ImportBatchJobData) {
  await getQueue().add('import-batch', data, {
    attempts: 1,
    removeOnComplete: 100,
    removeOnFail: 50,
  });
}
