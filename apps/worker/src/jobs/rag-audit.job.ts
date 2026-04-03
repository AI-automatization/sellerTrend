import { Queue } from 'bullmq';
import { redisConnection } from '../redis';

const ragAuditQueue = new Queue('rag-audit-queue', {
  ...redisConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { age: 3600, count: 30 },
    removeOnFail: { age: 86400, count: 20 },
  },
});

/** 06:30 UTC — embedding (05:00) tugaganidan keyin */
export async function scheduleRagAudit() {
  const repeatableJobs = await ragAuditQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'rag-audit-batch') {
      await ragAuditQueue.removeRepeatableByKey(job.key);
    }
  }

  await ragAuditQueue.add(
    'rag-audit-batch',
    {},
    {
      repeat: { pattern: '30 6 * * *' },
      jobId: 'rag-audit-batch-cron',
    },
  );

  console.log('RAG Audit cron registered: 30 6 * * * (06:30 UTC)');
}
