import 'dotenv/config';
import http from 'http';
import { createBillingWorker } from './processors/billing.processor';
import { createDiscoveryWorker } from './processors/discovery.processor';
import { createSourcingWorker } from './processors/sourcing.processor';
import { createCompetitorWorker } from './processors/competitor.processor';
import { createImportWorker } from './processors/import.processor';
import { createWeeklyScrapeWorker } from './processors/weekly-scrape.processor';
import { createAlertDeliveryWorker } from './processors/alert-delivery.processor';
import { scheduleDailyBilling } from './jobs/billing.job';
import { scheduleCompetitorSnapshots } from './jobs/competitor-snapshot.job';
import { scheduleWeeklyScrape } from './jobs/weekly-scrape.job';
import { scheduleAlertDelivery } from './jobs/alert-delivery.job';
import { logProcess } from './logger';
import { browserPool } from './browser-pool';
import { prisma } from './prisma';
import { getHealthRedis } from './redis';

// T-349: Global crash handlers — log but do NOT exit.
// For truly fatal errors (ENOMEM), trigger graceful shutdown instead of hard exit.
let shutdownFn: ((signal: string) => Promise<void>) | null = null;

process.on('uncaughtException', (err) => {
  logProcess('error', 'uncaughtException', err);
  // ENOMEM or similar fatal → graceful shutdown (Railway will restart)
  const isFatal = err && ('code' in err) && (err as NodeJS.ErrnoException).code === 'ERR_WORKER_OUT_OF_MEMORY'
    || err?.message?.includes('ENOMEM')
    || err?.message?.includes('allocation failed');
  if (isFatal && shutdownFn) {
    logProcess('error', 'Fatal memory error detected, initiating graceful shutdown');
    shutdownFn('ENOMEM').catch(() => process.exit(1));
  }
  // Otherwise let the process continue — Railway will restart if truly broken
});
process.on('unhandledRejection', (reason) => {
  logProcess('error', 'unhandledRejection', reason instanceof Error ? reason : new Error(String(reason)));
  // Do NOT exit — one rejected promise should not kill all 6 workers
});

async function bootstrap() {
  logProcess('info', 'Worker starting...');

  // Start workers (consumers)
  const billingWorker = createBillingWorker();
  const discoveryWorker = createDiscoveryWorker();
  const sourcingWorker = createSourcingWorker();
  const competitorWorker = createCompetitorWorker();
  const importWorker = createImportWorker();
  const weeklyScrapeWorker = createWeeklyScrapeWorker();
  const alertDeliveryWorker = createAlertDeliveryWorker();

  // Schedule cron jobs
  await scheduleDailyBilling();
  await scheduleCompetitorSnapshots();
  await scheduleWeeklyScrape();
  await scheduleAlertDelivery();

  logProcess('info', 'Workers running: billing-queue, discovery-queue, sourcing-search, competitor-queue, import-batch, weekly-scrape-queue, alert-delivery-queue');
  logProcess('info', 'Crons: billing daily 00:00, competitor every 6h, weekly-scrape every 15min, alert-delivery every 5min');

  // Health check HTTP server — reuse shared Redis from redis.ts
  const healthPort = parseInt(process.env.PORT || process.env.WORKER_HEALTH_PORT || '3001', 10);
  const redis = getHealthRedis();

  const server = http.createServer(async (req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      let redisOk = false;
      try {
        await redis.ping();
        redisOk = true;
      } catch { /* redis down */ }

      const status = redisOk ? 'ok' : 'degraded';
      res.writeHead(redisOk ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status,
        redis: redisOk ? 'ok' : 'unreachable',
        workers: 7,
        timestamp: new Date().toISOString(),
      }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(healthPort, () => {
    logProcess('info', `Worker health check: http://localhost:${healthPort}/health`);
  });

  // Graceful shutdown (SIGTERM + SIGINT + fatal errors via shutdownFn)
  const shutdown = async (signal: string) => {
    logProcess('info', `[${signal}] Worker graceful shutdown...`);
    const timeout = setTimeout(() => {
      logProcess('error', 'Worker shutdown timeout (30s), forcing exit');
      process.exit(1);
    }, 30_000);
    try {
      server.close();
      await Promise.allSettled([
        billingWorker.close(),
        discoveryWorker.close(),
        sourcingWorker.close(),
        competitorWorker.close(),
        importWorker.close(),
        weeklyScrapeWorker.close(),
        alertDeliveryWorker.close(),
      ]);
      await browserPool.shutdown();
      await redis.quit();
      await prisma.$disconnect();
      clearTimeout(timeout);
      logProcess('info', 'Worker shutdown complete');
      process.exit(0);
    } catch (err) {
      logProcess('error', 'Worker shutdown error', err);
      process.exit(1);
    }
  };

  // Wire up shutdownFn for fatal error handler (uncaughtException ENOMEM)
  shutdownFn = shutdown;

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => logProcess('error', 'Bootstrap failed', err));
