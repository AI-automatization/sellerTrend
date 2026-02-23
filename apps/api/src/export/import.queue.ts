import { Queue } from 'bullmq';

const QUEUE_NAME = 'import-batch';

let queue: Queue | null = null;

function getQueue(): Queue {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });
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
