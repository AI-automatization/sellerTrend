/**
 * Visual Sourcing Processor — Sprint 1 stub
 *
 * Bu processor mahsulot rasmi asosida 13 platformada vizual qidiruv o'tkazadi.
 * Sprint 1: Queue infra tayyor, logika Sprint 2 da qo'shiladi.
 *
 * Job payload:
 *   { productId: number; productTitle: string; imageUrl: string; accountId: string }
 */

import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { logJobStart, logJobDone, logJobInfo } from '../logger';

export const VISUAL_SOURCING_QUEUE = 'visual-sourcing-search';

export interface VisualSourcingJobData {
  productId: number;
  productTitle: string;
  imageUrl: string;
  accountId: string;
}

export function createVisualSourcingWorker() {
  const worker = new Worker<VisualSourcingJobData>(
    VISUAL_SOURCING_QUEUE,
    async (job: Job<VisualSourcingJobData>) => {
      const { productId, productTitle, imageUrl } = job.data;
      logJobStart(VISUAL_SOURCING_QUEUE, String(productId), 'visual-search');
      logJobInfo(VISUAL_SOURCING_QUEUE, String(productId), 'visual-search', `Sprint 2 da amalga oshiriladi — product="${productTitle}", imageUrl="${imageUrl}"`);
      logJobDone(VISUAL_SOURCING_QUEUE, String(productId), 'visual-search', 0);
    },
    { ...redisConnection, concurrency: 2 },
  );

  return worker;
}
