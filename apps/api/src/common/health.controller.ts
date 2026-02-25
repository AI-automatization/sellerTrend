import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly redis: Redis;

  constructor(private readonly prisma: PrismaService) {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this.redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
    });
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

    // Redis check
    let redis = 'ok';
    let queueDepth: Record<string, number> | undefined;
    try {
      await this.redis.ping();

      // Queue depth for all known queues
      const queueNames = [
        'discovery-queue',
        'sourcing-search',
        'import-batch',
        'billing-queue',
        'competitor-queue',
        'reanalysis-queue',
      ];
      queueDepth = {};
      for (const name of queueNames) {
        const waiting = await this.redis.llen(`bull:${name}:wait`);
        const active = await this.redis.llen(`bull:${name}:active`);
        queueDepth[name] = waiting + active;
      }
    } catch {
      redis = 'unreachable';
    }

    const status = db === 'ok' && redis === 'ok' ? 'ok' : 'degraded';

    return { status, db, redis, queues: queueDepth, timestamp };
  }
}
