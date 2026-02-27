import 'dotenv/config';
import http from 'http';
import Redis from 'ioredis';
import { createBillingWorker } from './processors/billing.processor';
import { createDiscoveryWorker } from './processors/discovery.processor';
import { createSourcingWorker } from './processors/sourcing.processor';
import { createCompetitorWorker } from './processors/competitor.processor';
import { createImportWorker } from './processors/import.processor';
import { createReanalysisWorker } from './processors/reanalysis.processor';
import { scheduleDailyBilling } from './jobs/billing.job';
import { scheduleCompetitorSnapshots } from './jobs/competitor-snapshot.job';
import { scheduleReanalysis } from './jobs/reanalysis.job';

async function bootstrap() {
  console.log('Worker starting...');

  // Start workers (consumers)
  const billingWorker = createBillingWorker();
  const discoveryWorker = createDiscoveryWorker();
  const sourcingWorker = createSourcingWorker();
  const competitorWorker = createCompetitorWorker();
  const importWorker = createImportWorker();
  const reanalysisWorker = createReanalysisWorker();

  // Schedule cron jobs
  await scheduleDailyBilling();
  await scheduleCompetitorSnapshots();
  await scheduleReanalysis();

  console.log('Workers running:');
  console.log('  - billing-queue');
  console.log('  - discovery-queue');
  console.log('  - sourcing-search');
  console.log('  - competitor-queue');
  console.log('  - import-batch');
  console.log('  - reanalysis-queue');
  console.log('Daily billing cron scheduled at 00:00');
  console.log('Competitor snapshot cron scheduled every 6h');
  console.log('Product reanalysis cron scheduled every 6 hours');

  // Health check HTTP server
  const healthPort = parseInt(process.env.WORKER_HEALTH_PORT || '3001', 10);
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 3000, lazyConnect: true });

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
        workers: 6,
        timestamp: new Date().toISOString(),
      }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(healthPort, () => {
    console.log(`Worker health check: http://localhost:${healthPort}/health`);
  });

  // Graceful shutdown (SIGTERM + SIGINT)
  const shutdown = async (signal: string) => {
    console.log(`[${signal}] Worker graceful shutdown...`);
    const timeout = setTimeout(() => {
      console.error('Worker shutdown timeout (30s), forcing exit');
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
        reanalysisWorker.close(),
      ]);
      await redis.quit();
      clearTimeout(timeout);
      console.log('Worker shutdown complete');
      process.exit(0);
    } catch (err) {
      console.error('Worker shutdown error:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch(console.error);
