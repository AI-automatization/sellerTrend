/**
 * Redis-based scrape lock using SETNX to prevent duplicate scraping.
 *
 * Problem: BullMQ "at least once" delivery + overlapping batch/single jobs
 * can cause the same product to be scraped concurrently, wasting Playwright
 * resources and creating duplicate snapshots.
 *
 * Solution: Before scraping, acquire a Redis lock with TTL.
 * If the lock exists, skip. If not, proceed and release after completion.
 * If worker crashes, the lock auto-expires (TTL).
 */

import Redis from 'ioredis';

const LOCK_PREFIX = 'scrape:lock:';
const DEFAULT_TTL_SECONDS = 600; // 10 minutes

/**
 * Attempt to acquire a scrape lock for a product.
 * Uses Redis SET with NX (only set if not exists) and EX (TTL).
 *
 * @returns true if lock acquired, false if another process holds it
 */
export async function acquireScrapeLock(
  redis: Redis,
  productId: string | number,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<boolean> {
  const key = `${LOCK_PREFIX}${productId}`;
  const value = `worker:${process.pid}:${Date.now()}`;
  const result = await redis.set(key, value, 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}

/**
 * Release the scrape lock for a product.
 * Called in finally block after scraping completes (success or failure).
 */
export async function releaseScrapeLock(
  redis: Redis,
  productId: string | number,
): Promise<void> {
  const key = `${LOCK_PREFIX}${productId}`;
  await redis.del(key);
}
