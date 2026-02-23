import 'dotenv/config';
import { createBillingWorker } from './processors/billing.processor';
import { createDiscoveryWorker } from './processors/discovery.processor';
import { createSourcingWorker } from './processors/sourcing.processor';
import { createCompetitorWorker } from './processors/competitor.processor';
import { scheduleDailyBilling } from './jobs/billing.job';
import { scheduleCompetitorSnapshots } from './jobs/competitor-snapshot.job';

async function bootstrap() {
  console.log('Worker starting...');

  // Start workers (consumers)
  const billingWorker = createBillingWorker();
  const discoveryWorker = createDiscoveryWorker();
  const sourcingWorker = createSourcingWorker();
  const competitorWorker = createCompetitorWorker();

  // Schedule cron jobs
  await scheduleDailyBilling();
  await scheduleCompetitorSnapshots();

  console.log('Workers running:');
  console.log('  - billing-queue');
  console.log('  - discovery-queue');
  console.log('  - sourcing-search');
  console.log('  - competitor-queue');
  console.log('Daily billing cron scheduled at 00:00');
  console.log('Competitor snapshot cron scheduled every 6h');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await billingWorker.close();
    await discoveryWorker.close();
    await sourcingWorker.close();
    await competitorWorker.close();
    process.exit(0);
  });
}

bootstrap().catch(console.error);
