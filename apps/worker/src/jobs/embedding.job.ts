import { Queue } from 'bullmq';
import { redisConnection } from '../redis';

const embeddingQueue = new Queue('embedding-queue', {
  ...redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 10_000 },
    removeOnComplete: { age: 3600, count: 50 },
    removeOnFail: { age: 86400, count: 30 },
  },
});

/** 05:00 UTC — ml-prediction (04:00) tugaganidan keyin */
export async function scheduleEmbeddings() {
  const repeatableJobs = await embeddingQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'embedding-batch') {
      await embeddingQueue.removeRepeatableByKey(job.key);
    }
  }

  await embeddingQueue.add(
    'embedding-batch',
    {},
    {
      repeat: { pattern: '0 5 * * *' },
      jobId: 'embedding-batch-cron',
    },
  );

  console.log('Embedding cron registered: 0 5 * * * (05:00 UTC)');
}
