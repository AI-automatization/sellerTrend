import dotenv from 'dotenv';
import path from 'path';
// Local app .env first, then root monorepo .env (Railway injects vars directly)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
import http from 'http';
import { createDiscoveryWorker } from './processors/discovery.processor';
import { createSourcingWorker } from './processors/sourcing.processor';
import { createCompetitorWorker } from './processors/competitor.processor';
import { createImportWorker } from './processors/import.processor';
import { createWeeklyScrapeWorker } from './processors/weekly-scrape.processor';
import { createAlertDeliveryWorker } from './processors/alert-delivery.processor';
import { createMonitoringWorker } from './processors/monitoring.processor';
import { createMorningDigestWorker } from './processors/morning-digest.processor';
import { createCurrencyUpdateWorker } from './processors/currency-update.processor';
import { createDataCleanupWorker } from './processors/data-cleanup.processor';
import { createOnboardingReminderWorker } from './processors/onboarding-reminder.processor';
import { createWeeklyDigestWorker } from './processors/weekly-digest.processor';
import { createMarketplaceIntelligenceWorker } from './processors/marketplace-intelligence.processor';
import { createVisualSourcingWorker } from './processors/visual-sourcing.processor';
import { scheduleCompetitorSnapshots } from './jobs/competitor-snapshot.job';
import { scheduleWeeklyScrape } from './jobs/weekly-scrape.job';
import { scheduleAlertDelivery } from './jobs/alert-delivery.job';
import { scheduleMonitoring } from './jobs/monitoring.job';
import { scheduleMorningDigest } from './jobs/morning-digest.job';
import { scheduleCurrencyUpdate } from './jobs/currency-update.job';
import { scheduleDataCleanup } from './jobs/data-cleanup.job';
import { scheduleOnboardingReminder } from './jobs/onboarding-reminder.job';
import { scheduleWeeklyDigest } from './jobs/weekly-digest.job';
import { scheduleMarketplaceIntelligence } from './jobs/marketplace-intelligence.job';
import { logProcess } from './logger';
import { browserPool } from './browser-pool';
import { tokenManager } from './clients/token-manager';
import { uzumGraphQLClient } from './clients/uzum-graphql.client';
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

  // GraphQL token pre-warm (non-blocking — REST fallback if fails)
  tokenManager.getToken().then((token) => {
    if (token) {
      logProcess('info', 'GraphQL token olindi (5 soat keshda)');
    } else {
      logProcess('info', 'GraphQL token olinmadi — REST fallback rejimida');
    }
  }).catch(() => {
    logProcess('info', 'GraphQL token warm-up xato — REST fallback rejimida');
  });

  // Start workers (consumers)
  const discoveryWorker = createDiscoveryWorker();
  const sourcingWorker = createSourcingWorker();
  const competitorWorker = createCompetitorWorker();
  const importWorker = createImportWorker();
  const weeklyScrapeWorker = createWeeklyScrapeWorker();
  const alertDeliveryWorker = createAlertDeliveryWorker();
  const monitoringWorker = createMonitoringWorker();
  const morningDigestWorker = createMorningDigestWorker();
  const currencyUpdateWorker = createCurrencyUpdateWorker();
  const dataCleanupWorker = createDataCleanupWorker();
  const onboardingReminderWorker = createOnboardingReminderWorker();
  const weeklyDigestWorker = createWeeklyDigestWorker();
  const marketplaceIntelligenceWorker = createMarketplaceIntelligenceWorker();
  const visualSourcingWorker = createVisualSourcingWorker();

  // Schedule cron jobs
  await scheduleCompetitorSnapshots();
  await scheduleWeeklyScrape();
  await scheduleAlertDelivery();
  await scheduleMonitoring();
  await scheduleMorningDigest();
  await scheduleCurrencyUpdate();
  await scheduleDataCleanup();
  await scheduleOnboardingReminder();
  await scheduleWeeklyDigest();
  await scheduleMarketplaceIntelligence();

  logProcess('info', 'Workers running: discovery, sourcing, competitor, import, weekly-scrape, alert-delivery, monitoring, morning-digest, currency-update, data-cleanup, onboarding-reminder, weekly-digest, marketplace-intelligence, visual-sourcing');
  logProcess('info', 'Crons: competitor 6h, weekly-scrape 15min, alert-delivery 5min, monitoring 6h, digest 07:00, currency 00:30, cleanup 02:00, onboarding-reminder 10:00, weekly-digest Mon/08:00');

  // Health check HTTP server — reuse shared Redis from redis.ts
  const healthPort = parseInt(process.env.WORKER_HEALTH_PORT || '3001', 10);
  const redis = getHealthRedis();

  const server = http.createServer(async (req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      let redisOk = false;
      let graphqlTokenOk = false;
      try {
        await redis.ping();
        redisOk = true;
      } catch { /* redis down */ }

      try {
        const token = await tokenManager.getToken();
        graphqlTokenOk = token != null;
      } catch { /* token fetch failed */ }

      const status = redisOk ? 'ok' : 'degraded';
      res.writeHead(redisOk ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status,
        redis: redisOk ? 'ok' : 'unreachable',
        graphql_token: graphqlTokenOk ? 'ok' : 'unavailable',
        graphql_stats: uzumGraphQLClient.getStats(),
        workers: 14,
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
        discoveryWorker.close(),
        sourcingWorker.close(),
        competitorWorker.close(),
        importWorker.close(),
        weeklyScrapeWorker.close(),
        alertDeliveryWorker.close(),
        monitoringWorker.close(),
        morningDigestWorker.close(),
        currencyUpdateWorker.close(),
        dataCleanupWorker.close(),
        onboardingReminderWorker.close(),
        weeklyDigestWorker.close(),
        marketplaceIntelligenceWorker.close(),
        visualSourcingWorker.close(),
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
