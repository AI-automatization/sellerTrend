import { Queue } from 'bullmq';
import { getBullMQConnection } from '../common/redis/redis.module';

export const VISUAL_SOURCING_QUEUE = 'visual-sourcing-search';

let queue: Queue | null = null;

function getQueue(): Queue {
  if (!queue) {
    queue = new Queue(VISUAL_SOURCING_QUEUE, getBullMQConnection());
  }
  return queue;
}

/**
 * Mahsulot track qilinganda vizual qidiruv jobini navbatga qo'shadi.
 * Sprint 2 da processor bu jobni qayta ishlaydi (Bing Visual Search).
 */
export async function enqueueVisualSourcing(data: {
  productId: number;
  productTitle: string;
  imageUrl: string;
  accountId: string;
}): Promise<void> {
  await getQueue().add(
    'visual-search',
    data,
    {
      attempts: 2,
      backoff: { type: 'exponential', delay: 10_000 },
      removeOnComplete: { age: 86_400, count: 500 },
      removeOnFail: { age: 7 * 86_400, count: 200 },
    },
  );
}

export async function closeVisualSourcingQueue(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = null;
  }
}
