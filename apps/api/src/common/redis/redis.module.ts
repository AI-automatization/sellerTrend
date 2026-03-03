import { Global, Module, OnModuleDestroy, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

const REDIS_DEFAULTS = {
  maxRetriesPerRequest: 3,
  connectTimeout: 5000,
  enableOfflineQueue: false,
  lazyConnect: false,
  retryStrategy: (times: number) => Math.min(times * 200, 5000),
};

/**
 * Parse a Redis URL into ioredis-compatible options.
 * Handles both redis:// and rediss:// (TLS) URLs.
 */
function parseRedisUrl(url: string): RedisOptions {
  const parsed = new URL(url);
  const options: RedisOptions = {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
    ...REDIS_DEFAULTS,
  };

  if (parsed.username) {
    options.username = parsed.username;
  }
  if (parsed.password) {
    options.password = decodeURIComponent(parsed.password);
  }
  if (parsed.protocol === 'rediss:') {
    options.tls = { rejectUnauthorized: false };
  }

  return options;
}

/**
 * Get BullMQ-compatible connection config from the same REDIS_URL.
 * BullMQ requires maxRetriesPerRequest: null.
 * Each BullMQ Queue/QueueEvents creates its own connection internally,
 * so we provide connection config (not an ioredis instance).
 */
export function getBullMQConnection(): {
  connection: {
    host: string;
    port: number;
    username?: string;
    password?: string;
    tls?: { rejectUnauthorized: boolean };
    maxRetriesPerRequest: null;
  };
} {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const parsed = new URL(url);

  const connection: {
    host: string;
    port: number;
    username?: string;
    password?: string;
    tls?: { rejectUnauthorized: boolean };
    maxRetriesPerRequest: null;
  } = {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
    maxRetriesPerRequest: null,
  };

  if (parsed.username) {
    connection.username = parsed.username;
  }
  if (parsed.password) {
    connection.password = decodeURIComponent(parsed.password);
  }
  if (parsed.protocol === 'rediss:') {
    connection.tls = { rejectUnauthorized: false };
  }

  return { connection };
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (config: ConfigService): Redis => {
        const logger = new Logger('RedisModule');
        const url = config.get<string>('REDIS_URL', 'redis://localhost:6379');
        const options = parseRedisUrl(url);
        const client = new Redis(options);

        client.on('connect', () => {
          logger.log('Redis connected');
        });
        client.on('error', (err: Error) => {
          logger.error(`Redis error: ${err.message}`);
        });

        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  private readonly logger = new Logger(RedisModule.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down Redis connection...');
    await this.redis.quit().catch((err: Error) => {
      this.logger.warn(`Redis quit error: ${err.message}`);
    });
  }
}
