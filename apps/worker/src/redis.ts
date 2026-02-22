const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');

// Pass plain connection options to avoid ioredis version conflicts with BullMQ
export const redisConnection = {
  connection: {
    host: url.hostname,
    port: parseInt(url.port || '6379', 10),
    maxRetriesPerRequest: null, // Required for BullMQ
  },
};
