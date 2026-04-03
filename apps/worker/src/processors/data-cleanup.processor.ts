import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';

const QUEUE_NAME = 'data-cleanup-queue';

// Retention constants
const RAW_SNAPSHOT_RETENTION_DAYS = 30;  // Raw snapshots → aggregate after 30 days
const SNAPSHOT_RETENTION_DAYS = 90;      // Non-tracked product snapshots deleted after 90 days
const SESSION_RETENTION_DAYS = 7;        // Keep revoked sessions 7 more days
const SEARCH_JOB_RETENTION_DAYS = 30;    // Keep DONE/FAILED search jobs 30 days
const INVITE_RETENTION_DAYS = 0;         // Delete expired invites immediately

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function aggregateOldSnapshots(jobId: string, jobName: string): Promise<number> {
  const cutoff = daysAgo(RAW_SNAPSHOT_RETENTION_DAYS);

  // Find days that have raw snapshots older than retention but NOT yet aggregated
  const rows = await prisma.$queryRaw<Array<{ product_id: bigint; day: Date; cnt: number; avg_score: number; max_wb: number; avg_rating: number; max_orders: bigint; orders_delta: bigint | null }>>`
    SELECT
      ps.product_id,
      ps.snapshot_at::date AS day,
      COUNT(*)::int AS cnt,
      AVG(ps.score)::decimal(8,4) AS avg_score,
      MAX(ps.weekly_bought)::int AS max_wb,
      AVG(ps.rating)::decimal(3,2) AS avg_rating,
      MAX(ps.orders_quantity) AS max_orders,
      MAX(ps.orders_quantity) - (
        SELECT MAX(ps2.orders_quantity)
        FROM product_snapshots ps2
        WHERE ps2.product_id = ps.product_id
          AND ps2.snapshot_at::date = (ps.snapshot_at::date - INTERVAL '1 day')::date
      ) AS orders_delta
    FROM product_snapshots ps
    WHERE ps.snapshot_at < ${cutoff}
      AND NOT EXISTS (
        SELECT 1 FROM product_snapshot_daily d
        WHERE d.product_id = ps.product_id AND d.day = ps.snapshot_at::date
      )
    GROUP BY ps.product_id, ps.snapshot_at::date
    LIMIT 5000
  `;

  if (rows.length === 0) {
    logJobInfo(QUEUE_NAME, jobId, jobName, 'No snapshots to aggregate');
    return 0;
  }

  // Batch upsert daily aggregates
  let aggregated = 0;
  for (const row of rows) {
    try {
      await prisma.productSnapshotDaily.upsert({
        where: {
          product_id_day: { product_id: row.product_id, day: row.day },
        },
        create: {
          product_id: row.product_id,
          day: row.day,
          avg_score: row.avg_score,
          max_weekly_bought: row.max_wb,
          avg_rating: row.avg_rating,
          max_orders: row.max_orders,
          daily_orders_delta: row.orders_delta != null ? (Number(row.orders_delta) < 0 ? null : Number(row.orders_delta)) : null,
          snapshot_count: row.cnt,
        },
        update: {
          avg_score: row.avg_score,
          max_weekly_bought: row.max_wb,
          avg_rating: row.avg_rating,
          max_orders: row.max_orders,
          daily_orders_delta: row.orders_delta != null ? (Number(row.orders_delta) < 0 ? null : Number(row.orders_delta)) : null,
          snapshot_count: row.cnt,
        },
      });
      aggregated++;
    } catch {
      // Skip individual failures (constraint violations etc)
    }
  }

  // Delete aggregated raw snapshots
  if (aggregated > 0) {
    const { count: deleted } = await prisma.productSnapshot.deleteMany({
      where: {
        snapshot_at: { lt: cutoff },
        product_id: { in: rows.map((r) => r.product_id) },
      },
    });
    logJobInfo(QUEUE_NAME, jobId, jobName,
      `Aggregated ${aggregated} days, deleted ${deleted} raw snapshots (>${RAW_SNAPSHOT_RETENTION_DAYS}d)`);
    return deleted;
  }

  return 0;
}

async function cleanOldSnapshots(jobId: string, jobName: string): Promise<number> {
  const cutoff = daysAgo(SNAPSHOT_RETENTION_DAYS);

  // Find product IDs that are currently tracked (keep all their snapshots)
  const trackedProductIds = await prisma.trackedProduct.findMany({
    where: { is_active: true },
    select: { product_id: true },
  });
  const trackedIds = trackedProductIds.map((t) => t.product_id);

  // Delete old snapshots for NON-tracked products
  const { count } = await prisma.productSnapshot.deleteMany({
    where: {
      snapshot_at: { lt: cutoff },
      product: {
        tracked_by: { none: { is_active: true } },
      },
    },
  });

  logJobInfo(QUEUE_NAME, jobId, jobName, `Deleted ${count} old ProductSnapshot records (non-tracked products, >${SNAPSHOT_RETENTION_DAYS}d)`);

  // Also delete old SkuSnapshots for non-tracked products
  const { count: skuCount } = await prisma.skuSnapshot.deleteMany({
    where: {
      snapshot_at: { lt: cutoff },
      sku: {
        product: {
          tracked_by: { none: { is_active: true } },
        },
      },
    },
  });

  logJobInfo(QUEUE_NAME, jobId, jobName, `Deleted ${skuCount} old SkuSnapshot records (non-tracked, >${SNAPSHOT_RETENTION_DAYS}d)`);

  return count + skuCount;
}

async function cleanExpiredSessions(jobId: string, jobName: string): Promise<number> {
  const now = new Date();
  const revokedCutoff = daysAgo(SESSION_RETENTION_DAYS);

  const { count } = await prisma.userSession.deleteMany({
    where: {
      OR: [
        // Expired sessions
        { expires_at: { lt: now, not: null } },
        // Sessions revoked more than N days ago
        { revoked_at: { lt: revokedCutoff } },
      ],
    },
  });

  logJobInfo(QUEUE_NAME, jobId, jobName, `Deleted ${count} expired/revoked UserSession records`);
  return count;
}

async function cleanPasswordResets(jobId: string, jobName: string): Promise<number> {
  const now = new Date();

  const { count } = await prisma.passwordReset.deleteMany({
    where: {
      OR: [
        // Expired tokens
        { expires_at: { lt: now } },
        // Already used tokens
        { used_at: { not: null } },
      ],
    },
  });

  logJobInfo(QUEUE_NAME, jobId, jobName, `Deleted ${count} expired/used PasswordReset records`);
  return count;
}

async function cleanStaleSearchJobs(jobId: string, jobName: string): Promise<number> {
  const cutoff = daysAgo(SEARCH_JOB_RETENTION_DAYS);

  const { count } = await prisma.externalSearchJob.deleteMany({
    where: {
      status: { in: ['DONE', 'FAILED'] },
      created_at: { lt: cutoff },
    },
  });

  logJobInfo(QUEUE_NAME, jobId, jobName, `Deleted ${count} old ExternalSearchJob records (DONE/FAILED, >${SEARCH_JOB_RETENTION_DAYS}d)`);
  return count;
}

async function cleanExpiredInvites(jobId: string, jobName: string): Promise<number> {
  const now = new Date();

  const { count } = await prisma.teamInvite.deleteMany({
    where: { expires_at: { lt: now } },
  });

  logJobInfo(QUEUE_NAME, jobId, jobName, `Deleted ${count} expired TeamInvite records`);
  return count;
}

// ─── Main processor ──────────────────────────────────────────────────────────

async function processDataCleanup(jobId: string, jobName: string) {
  // Step 1: Aggregate old snapshots BEFORE deleting
  const aggregateResult = await Promise.allSettled([
    aggregateOldSnapshots(jobId, jobName),
  ]);

  // Step 2: Cleanup
  const [snapshots, sessions, passwordResets, searchJobs, invites] = await Promise.allSettled([
    cleanOldSnapshots(jobId, jobName),
    cleanExpiredSessions(jobId, jobName),
    cleanPasswordResets(jobId, jobName),
    cleanStaleSearchJobs(jobId, jobName),
    cleanExpiredInvites(jobId, jobName),
  ]);

  const result = {
    aggregated: aggregateResult[0].status === 'fulfilled' ? aggregateResult[0].value : 0,
    snapshots: snapshots.status === 'fulfilled' ? snapshots.value : 0,
    sessions: sessions.status === 'fulfilled' ? sessions.value : 0,
    password_resets: passwordResets.status === 'fulfilled' ? passwordResets.value : 0,
    search_jobs: searchJobs.status === 'fulfilled' ? searchJobs.value : 0,
    invites: invites.status === 'fulfilled' ? invites.value : 0,
  };

  // Log any failures without rethrowing
  [...aggregateResult, snapshots, sessions, passwordResets, searchJobs, invites].forEach((r) => {
    if (r.status === 'rejected') {
      logJobError(QUEUE_NAME, jobId, jobName, r.reason);
    }
  });

  return result;
}

// ─── Worker factory ──────────────────────────────────────────────────────────

export function createDataCleanupWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const start = Date.now();
      logJobStart(QUEUE_NAME, job.id ?? '-', job.name);
      try {
        const result = await processDataCleanup(job.id ?? '-', job.name);
        logJobDone(QUEUE_NAME, job.id ?? '-', job.name, Date.now() - start, result);
        return result;
      } catch (err) {
        logJobError(QUEUE_NAME, job.id ?? '-', job.name, err, Date.now() - start);
        throw err;
      }
    },
    { ...redisConnection, concurrency: 1 },
  );

  worker.on('error', (err) => logJobError(QUEUE_NAME, '-', 'worker', err));
  worker.on('failed', (job, err) =>
    logJobError(QUEUE_NAME, job?.id ?? '-', job?.name ?? '-', err),
  );

  return worker;
}
