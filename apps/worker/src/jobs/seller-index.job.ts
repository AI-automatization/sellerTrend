import { Queue } from 'bullmq';
import { redisConnection } from '../redis';

const sellerIndexQueue = new Queue('seller-index-queue', {
  ...redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 10_000 },
    removeOnComplete: { age: 86400, count: 10 },
    removeOnFail: { age: 86400, count: 10 },
  },
});

/** Yakshanba 01:00 UTC — barcha Uzum sellerlarni indekslash */
export async function scheduleSellerIndex() {
  const repeatableJobs = await sellerIndexQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'seller-index') {
      await sellerIndexQueue.removeRepeatableByKey(job.key);
    }
  }

  await sellerIndexQueue.add(
    'seller-index',
    {},
    {
      repeat: { pattern: '0 1 * * 0' }, // Yakshanba 01:00 UTC
      jobId: 'seller-index-cron',
    },
  );

  console.log('Seller index cron registered: 0 1 * * 0 (Yakshanba 01:00 UTC)');
}

/** Bir martalik manual trigger uchun */
export async function triggerSellerIndexNow() {
  await sellerIndexQueue.add('seller-index', {}, { jobId: `seller-index-manual-${Date.now()}` });
  console.log('Seller index job qo\'shildi (manual)');
}
