/**
 * Daily Sales cron job — kunlik sotuv delta scraping.
 *
 * Mavjud 15-daqiqalik batch (weekly-scrape.job.ts) ni to'ldiradi:
 * kechasi 02:00 UTC da to'liq batch run qilib, barcha aktiv mahsulotlar
 * uchun ordersAmount delta (weekly_bought) ni yangilaydi.
 *
 * Bu vaqt uzum.uz traffic minimumida (toshkent vaqti 07:00).
 */

import { weeklyScrapeQueue } from './weekly-scrape.job';

export async function scheduleDailySales() {
  const repeatableJobs = await weeklyScrapeQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'daily-sales-full-run') {
      await weeklyScrapeQueue.removeRepeatableByKey(job.key);
    }
  }

  await weeklyScrapeQueue.add(
    'daily-sales-full-run',
    { mode: 'batch' },
    {
      repeat: { pattern: '0 2 * * *' }, // 02:00 UTC har kun
      jobId: 'daily-sales-full-run-cron',
    },
  );

  console.log('Daily sales cron registered: 0 2 * * * (02:00 UTC, toshkent 07:00)');
}
