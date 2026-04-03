import { Queue } from 'bullmq';
import { redisConnection } from '../redis';

const mlPredictionQueue = new Queue('ml-prediction-queue', {
  ...redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 10_000 },
    removeOnComplete: { age: 3600, count: 50 },
    removeOnFail: { age: 86400, count: 30 },
  },
});

/** 04:00 UTC — daily-aggregation (03:30) tugaganidan keyin */
export async function scheduleMlPredictions() {
  const repeatableJobs = await mlPredictionQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'ml-prediction-batch') {
      await mlPredictionQueue.removeRepeatableByKey(job.key);
    }
  }

  await mlPredictionQueue.add(
    'ml-prediction-batch',
    {},
    {
      repeat: { pattern: '0 4 * * *' },
      jobId: 'ml-prediction-batch-cron',
    },
  );

  console.log('ML prediction cron registered: 0 4 * * * (04:00 UTC)');
}
