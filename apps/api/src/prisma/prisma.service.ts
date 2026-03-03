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

/** Ensure pool_timeout and statement_timeout are set in DATABASE_URL */
function ensurePoolParams(envUrl?: string): string {
  let url = envUrl ?? 'postgresql://localhost:5432/ventra';
  // Simple string append — avoids new URL() which can mangle passwords
  if (!url.includes('pool_timeout')) {
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}pool_timeout=10`;
  }
  if (!url.includes('statement_timeout')) {
    url = `${url}&statement_timeout=15000`;
  }
  if (!url.includes('connection_limit')) {
    url = `${url}&connection_limit=30`;
  }
  return url;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasourceUrl: ensurePoolParams(process.env.DATABASE_URL),
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
