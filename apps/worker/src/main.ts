import 'dotenv/config';
import { createBillingWorker } from './processors/billing.processor';
import { createDiscoveryWorker } from './processors/discovery.processor';
import { scheduleDailyBilling } from './jobs/billing.job';

async function bootstrap() {
  console.log('Worker starting...');

  // Start workers (consumers)
  const billingWorker = createBillingWorker();
  const discoveryWorker = createDiscoveryWorker();

  // Schedule daily billing cron
  await scheduleDailyBilling();

  console.log('Workers running:');
  console.log('  - billing-queue');
  console.log('  - discovery-queue');
  console.log('Daily billing cron scheduled at 00:00');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await billingWorker.close();
    await discoveryWorker.close();
    process.exit(0);
  });
}

bootstrap().catch(console.error);
