import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { closeWeeklyScrapeQueue } from '../products/weekly-scrape.queue';
import { closeImportQueue } from '../export/import.queue';
import { closeDiscoveryQueue } from '../discovery/discovery.queue';

/**
 * Ensures all standalone BullMQ Queue instances are properly closed
 * when the NestJS application shuts down (SIGTERM / app.close()).
 *
 * Without this, Redis connections from lazy-initialized queues
 * stay open and leak file descriptors / prevent graceful exit.
 */
@Injectable()
export class QueueLifecycleService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueLifecycleService.name);

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing BullMQ queues...');

    const results = await Promise.allSettled([
      closeWeeklyScrapeQueue(),
      closeImportQueue(),
      closeDiscoveryQueue(),
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error(`Queue close error: ${String(result.reason)}`);
      }
    }

    this.logger.log('All BullMQ queues closed');
  }
}
