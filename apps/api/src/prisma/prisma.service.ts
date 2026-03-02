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

/** Ensure pool_timeout is set in DATABASE_URL to prevent infinite waits */
function ensurePoolTimeout(envUrl?: string): string {
  const url = envUrl ?? 'postgresql://localhost:5432/ventra';
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has('pool_timeout')) {
      parsed.searchParams.set('pool_timeout', '10');
    }
    return parsed.toString();
  } catch {
    // Malformed URL — append as query string
    const sep = url.includes('?') ? '&' : '?';
    return url.includes('pool_timeout') ? url : `${url}${sep}pool_timeout=10`;
  }
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasourceUrl: ensurePoolTimeout(process.env.DATABASE_URL),
    });
  }

  async onModuleInit() {
    this.logger.log('Connecting to database (pool_timeout enforced)');
    await this.$connect();

    // Tenant-scoped safety net: log queries missing account_id filter
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

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
