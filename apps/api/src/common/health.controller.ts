import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly redisUrl: string;

  constructor(private readonly prisma: PrismaService) {
    this.redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  }

  @Get()
  async check() {
    const timestamp = new Date().toISOString();

    // DB check
    let db = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'unreachable';
    }

    // Redis check — fresh connection each time to avoid stale state
    let redis = 'ok';
    let queueDepth: Record<string, number> | undefined;
    let client: Redis | null = null;
    try {
      client = new Redis(this.redisUrl, {
        maxRetriesPerRequest: 0,
        connectTimeout: 3000,
        enableOfflineQueue: false,
        lazyConnect: true,
        retryStrategy: () => null,
      });

      await client.connect();
      await client.ping();

      // Queue depth for all known queues
      const queueNames = [
        'discovery-queue',
        'sourcing-search',
        'import-batch',
        'billing-queue',
        'competitor-queue',
        'reanalysis-queue',
        'weekly-scrape-queue',
      ];
      queueDepth = {};
      for (const name of queueNames) {
        const waiting = await client.llen(`bull:${name}:wait`);
        const active = await client.llen(`bull:${name}:active`);
        queueDepth[name] = waiting + active;
      }
    } catch {
      redis = 'unreachable';
    } finally {
      client?.disconnect();
    }

    const status = db === 'ok' && redis === 'ok' ? 'ok' : 'degraded';

    return { status, db, redis, queues: queueDepth, timestamp };
  }
}
