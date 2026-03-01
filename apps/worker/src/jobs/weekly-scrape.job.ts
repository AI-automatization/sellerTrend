import { Queue } from 'bullmq';
import { redisConnection } from '../redis';

export const weeklyScrapeQueue = new Queue('weekly-scrape-queue', redisConnection);

/**
 * Schedule weekly scrape batch job every 15 minutes.
 * Picks products where next_scrape_at <= NOW() and scrapes them.
 */
export async function scheduleWeeklyScrape() {
  // Remove old repeatable jobs
  const repeatableJobs = await weeklyScrapeQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'weekly-scrape-batch') {
      await weeklyScrapeQueue.removeRepeatableByKey(job.key);
    }
  }

  await weeklyScrapeQueue.add(
    'weekly-scrape-batch',
    { mode: 'batch' },
    {
      repeat: { pattern: '*/15 * * * *' }, // Every 15 minutes
      jobId: 'weekly-scrape-batch-cron',
    },
  );

  console.log('Weekly scrape cron registered: */15 * * * * (every 15 minutes)');
}
