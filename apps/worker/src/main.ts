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

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    server.close();
    await billingWorker.close();
    await discoveryWorker.close();
    await sourcingWorker.close();
    await competitorWorker.close();
    await importWorker.close();
    await reanalysisWorker.close();
    redis.disconnect();
    process.exit(0);
  });
}

bootstrap().catch(console.error);
