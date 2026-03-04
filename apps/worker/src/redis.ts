import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const url = new URL(REDIS_URL);

// Detect TLS from rediss:// scheme
const isTLS = url.protocol === 'rediss:';

const sharedConnectionOptions = {
  host: url.hostname,
  port: parseInt(url.port || '6379', 10),
  password: url.password || undefined,
  username: url.username || undefined,
  db: url.pathname ? parseInt(url.pathname.slice(1), 10) || 0 : 0,
  ...(isTLS ? { tls: {} } : {}),
};

// Pass plain connection options to avoid ioredis version conflicts with BullMQ
export const redisConnection = {
  connection: {
    ...sharedConnectionOptions,
    maxRetriesPerRequest: null, // Required for BullMQ
  },
};

// Shared Redis instance for health checks (lazy-init, reused across calls)
let healthRedis: Redis | null = null;

export function getHealthRedis(): Redis {
  if (!healthRedis) {
    healthRedis = new Redis({
      ...sharedConnectionOptions,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
    });
    healthRedis.on('error', (err: Error) => {
      console.error('Health Redis error:', err.message);
    });
  }
  return healthRedis;
}
