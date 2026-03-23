import { Queue } from 'bullmq';
import { redisConnection } from '../redis';

const QUEUE_NAME = 'marketplace-intelligence-queue';

export async function scheduleMarketplaceIntelligence(): Promise<void> {
  const queue = new Queue(QUEUE_NAME, redisConnection);

  const existing = await queue.getRepeatableJobs();
  for (const job of existing) {
    await queue.removeRepeatableByKey(job.key);
  }

  // Kuniga 2 marta: 08:00 va 20:00
  await queue.add(
    'top-products',
    {},
    { repeat: { pattern: '0 8,20 * * *' }, removeOnComplete: 10, removeOnFail: 5 },
  );

  await queue.close();
}
