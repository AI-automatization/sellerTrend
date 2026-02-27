const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');

// Pass plain connection options to avoid ioredis version conflicts with BullMQ
export const redisConnection = {
  connection: {
    host: url.hostname,
    port: parseInt(url.port || '6379', 10),
    password: url.password || undefined,
    username: url.username || undefined,
    db: url.pathname ? parseInt(url.pathname.slice(1), 10) || 0 : 0,
    maxRetriesPerRequest: null, // Required for BullMQ
  },
};
