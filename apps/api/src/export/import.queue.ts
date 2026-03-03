import { Queue } from 'bullmq';
import { getBullMQConnection } from '../common/redis/redis.module';

const QUEUE_NAME = 'import-batch';

let queue: Queue | null = null;

function getQueue(): Queue {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, getBullMQConnection());
  }
  return queue;
}

export interface ImportBatchJobData {
  accountId: string;
  urls: string[];
}

export async function enqueueImportBatch(data: ImportBatchJobData) {
  await getQueue().add('import-batch', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400, count: 500 },
  });
}
