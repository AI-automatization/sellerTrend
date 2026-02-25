import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Models that require account_id filtering (tenant-scoped)
const TENANT_MODELS = new Set([
  'TrackedProduct',
  'CategoryRun',
  'ExternalPriceSearch',
  'CargoCalculation',
  'ExternalSearchJob',
  'CompetitorTracking',
  'ApiKey',
  'Consultation',
  'PriceTest',
  'ProductChecklist',
  'AdCampaign',
  'TeamInvite',
  'CustomReport',
  'SharedWatchlist',
  'CommunityInsight',
  'FeedbackTicket',
]);

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();

    // Tenant-scoped safety net: log query events in development
    if (process.env.NODE_ENV !== 'production') {
      this.$on('query' as never, (e: { query: string }) => {
        for (const model of TENANT_MODELS) {
          const tableName = `"${model}"`;
          if (
            e.query.includes(tableName) &&
            !e.query.includes('account_id') &&
            !e.query.includes('"id"')
          ) {
            this.logger.warn(
              `[TENANT] Query on ${model} without account_id filter`,
            );
            break;
          }
        }
      });
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
