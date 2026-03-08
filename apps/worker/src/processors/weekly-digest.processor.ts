import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';

const QUEUE_NAME = 'weekly-digest-queue';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEB_URL = process.env.WEB_URL ?? 'https://ventra.uz';

/** How many top gainers/losers to include in the digest */
const TOP_MOVERS_COUNT = 3;

/** Max users to process per run to avoid memory pressure */
const BATCH_LIMIT = 200;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductScoreChange {
  product_id: string;
  title: string;
  score_old: number;
  score_new: number;
  change: number;
}

interface DigestSummary {
  tracked_count: number;
  gainers: ProductScoreChange[];
  losers: ProductScoreChange[];
  signals_count: number;
  avg_score_change: number;
}

// ─── Telegram helper ─────────────────────────────────────────────────────────

async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Week boundaries ────────────────────────────────────────────────────────

function getWeekBoundaries(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setHours(0, 0, 0, 0);

  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 7);

  return { weekStart, weekEnd };
}

// ─── Build digest for a single user ─────────────────────────────────────────

async function buildUserDigest(
  accountId: string,
  weekStart: Date,
  weekEnd: Date,
): Promise<DigestSummary | null> {
  // 1. Get active tracked products for this account
  const trackedProducts = await prisma.trackedProduct.findMany({
    where: { account_id: accountId, is_active: true },
    select: { product_id: true, product: { select: { id: true, title: true } } },
  });

  if (trackedProducts.length === 0) return null;

  const trackedCount = trackedProducts.length;

  // 2. Get first and last snapshot scores for each product in the week window
  //    Use daily aggregates for efficiency when available, fall back to raw snapshots
  const scoreChanges: ProductScoreChange[] = [];

  for (const tp of trackedProducts) {
    // Get earliest snapshot in the week
    const oldSnapshot = await prisma.productSnapshot.findFirst({
      where: {
        product_id: tp.product_id,
        snapshot_at: { gte: weekStart, lt: weekEnd },
      },
      orderBy: { snapshot_at: 'asc' },
      select: { score: true },
    });

    // Get latest snapshot in the week
    const newSnapshot = await prisma.productSnapshot.findFirst({
      where: {
        product_id: tp.product_id,
        snapshot_at: { gte: weekStart, lt: weekEnd },
      },
      orderBy: { snapshot_at: 'desc' },
      select: { score: true },
    });

    if (oldSnapshot?.score != null && newSnapshot?.score != null) {
      const scoreOld = Number(oldSnapshot.score);
      const scoreNew = Number(newSnapshot.score);
      const change = scoreNew - scoreOld;

      scoreChanges.push({
        product_id: tp.product.id.toString(),
        title: tp.product.title,
        score_old: scoreOld,
        score_new: scoreNew,
        change,
      });
    }
  }

  // 3. Sort to find gainers and losers
  const sorted = [...scoreChanges].sort((a, b) => b.change - a.change);
  const gainers = sorted.filter((s) => s.change > 0).slice(0, TOP_MOVERS_COUNT);
  const losers = sorted.filter((s) => s.change < 0).sort((a, b) => a.change - b.change).slice(0, TOP_MOVERS_COUNT);

  // 4. Count signals (alert events) from last 7 days
  const signalsCount = await prisma.alertEvent.count({
    where: {
      rule: { account_id: accountId },
      triggered_at: { gte: weekStart, lt: weekEnd },
    },
  });

  // 5. Calculate average score change
  const avgScoreChange = scoreChanges.length > 0
    ? scoreChanges.reduce((sum, s) => sum + s.change, 0) / scoreChanges.length
    : 0;

  return {
    tracked_count: trackedCount,
    gainers,
    losers,
    signals_count: signalsCount,
    avg_score_change: Math.round(avgScoreChange * 100) / 100,
  };
}

// ─── Format Telegram message ────────────────────────────────────────────────

function formatTelegramDigest(accountName: string, summary: DigestSummary): string {
  const lines: string[] = [
    `<b>Haftalik hisobot — ${accountName}</b>`,
    ``,
    `Kuzatilayotgan mahsulotlar: <b>${summary.tracked_count}</b>`,
    `Signallar (7 kun): <b>${summary.signals_count}</b>`,
    `O'rtacha score o'zgarish: <b>${summary.avg_score_change > 0 ? '+' : ''}${summary.avg_score_change.toFixed(2)}</b>`,
  ];

  if (summary.gainers.length > 0) {
    lines.push(``, `<b>Top o'sganlar:</b>`);
    for (const g of summary.gainers) {
      const title = g.title.length > 35 ? g.title.slice(0, 32) + '...' : g.title;
      lines.push(`  +${g.change.toFixed(1)} | ${title} (${g.score_new.toFixed(1)})`);
    }
  }

  if (summary.losers.length > 0) {
    lines.push(``, `<b>Top tushganlar:</b>`);
    for (const l of summary.losers) {
      const title = l.title.length > 35 ? l.title.slice(0, 32) + '...' : l.title;
      lines.push(`  ${l.change.toFixed(1)} | ${title} (${l.score_new.toFixed(1)})`);
    }
  }

  if (summary.gainers.length === 0 && summary.losers.length === 0) {
    lines.push(``, `<i>Bu hafta score o'zgarishi kuzatilmadi.</i>`);
  }

  lines.push(``, `${WEB_URL} | <i>VENTRA Analytics</i>`);
  return lines.join('\n');
}

// ─── Main processor ─────────────────────────────────────────────────────────

async function processWeeklyDigest(jobId: string, jobName: string) {
  const { weekStart, weekEnd } = getWeekBoundaries();

  logJobInfo(QUEUE_NAME, jobId, jobName,
    `Processing weekly digest: ${weekStart.toISOString()} — ${weekEnd.toISOString()}`);

  // Find all active users whose accounts have tracked products
  const users = await prisma.user.findMany({
    where: {
      is_active: true,
      account: {
        status: 'ACTIVE',
        tracked_products: { some: { is_active: true } },
      },
    },
    select: {
      id: true,
      email: true,
      account_id: true,
      account: {
        select: {
          name: true,
          telegram_links: {
            where: { is_active: true },
            select: { chat_id: true },
            take: 1,
          },
        },
      },
    },
    take: BATCH_LIMIT,
  });

  if (users.length === 0) {
    logJobInfo(QUEUE_NAME, jobId, jobName, 'No active users with tracked products — skipping');
    return { total: 0, digests_created: 0, telegram_sent: 0, failed: 0 };
  }

  logJobInfo(QUEUE_NAME, jobId, jobName, `Building digests for ${users.length} users`);

  let digestsCreated = 0;
  let telegramSent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const summary = await buildUserDigest(user.account_id, weekStart, weekEnd);
      if (!summary) continue;

      // Store digest in DB
      const sentVia: string[] = [];

      // Try sending via Telegram
      const telegramLink = user.account.telegram_links[0];
      if (telegramLink) {
        const message = formatTelegramDigest(user.account.name, summary);
        const ok = await sendTelegramMessage(telegramLink.chat_id, message);
        if (ok) {
          sentVia.push('telegram');
          telegramSent++;
        }
      }

      // Save digest record
      await prisma.weeklyDigest.create({
        data: {
          user_id: user.id,
          week_start: weekStart,
          week_end: weekEnd,
          summary: JSON.parse(JSON.stringify(summary)),
          sent_via: sentVia,
        },
      });

      digestsCreated++;

      logJobInfo(QUEUE_NAME, jobId, jobName,
        `Digest created for ${user.email}: ${summary.tracked_count} products, ` +
        `${summary.gainers.length} gainers, ${summary.losers.length} losers, ` +
        `avg change: ${summary.avg_score_change}, sent: [${sentVia.join(', ')}]`);
    } catch (err) {
      failed++;
      logJobError(QUEUE_NAME, jobId, jobName, err);
      // Continue processing other users — one failure shouldn't stop the batch
    }
  }

  return {
    total: users.length,
    digests_created: digestsCreated,
    telegram_sent: telegramSent,
    failed,
    week_start: weekStart.toISOString(),
    week_end: weekEnd.toISOString(),
  };
}

// ─── Worker factory ─────────────────────────────────────────────────────────

export function createWeeklyDigestWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const start = Date.now();
      logJobStart(QUEUE_NAME, job.id ?? '-', job.name);
      try {
        const result = await processWeeklyDigest(job.id ?? '-', job.name);
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
