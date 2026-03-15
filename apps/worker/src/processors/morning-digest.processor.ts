import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';

const QUEUE_NAME = 'morning-digest-queue';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TOP_PRODUCTS_COUNT = 5;
const WEB_URL = process.env.WEB_URL ?? 'https://ventra.uz';

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

// ─── Digest builder ──────────────────────────────────────────────────────────

async function buildDigestForAccount(accountId: string): Promise<string | null> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { name: true, plan: true },
  });
  if (!account) return null;

  // 2. Top tracked products by latest score
  const tracked = await prisma.trackedProduct.findMany({
    where: { account_id: accountId, is_active: true },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          snapshots: {
            orderBy: { snapshot_at: 'desc' },
            take: 1,
            select: { score: true, weekly_bought: true },
          },
        },
      },
    },
    take: 50,
  });

  const topProducts = tracked
    .map((t) => ({
      title: t.product.title,
      score: t.product.snapshots[0] ? Number(t.product.snapshots[0].score ?? 0) : 0,
      weekly_bought: t.product.snapshots[0]?.weekly_bought ?? 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_PRODUCTS_COUNT);

  // 3. Undelivered alerts count
  const pendingAlerts = await prisma.alertEvent.count({
    where: {
      rule: { account_id: accountId },
      delivered_at: null,
    },
  });

  // 4. Build message
  const lines: string[] = [
    `🌅 <b>Xayrli kun, ${account.name}!</b>`,
    ``,
    `📦 <b>Plan:</b> ${account.plan}`,
  ];

  if (pendingAlerts > 0) {
    lines.push(`🔔 <b>Kutayotgan alertlar:</b> ${pendingAlerts} ta`);
  }

  if (topProducts.length > 0) {
    lines.push(``, `📊 <b>Top mahsulotlar:</b>`);
    for (let i = 0; i < topProducts.length; i++) {
      const p = topProducts[i];
      const title = p.title.length > 40 ? p.title.slice(0, 37) + '...' : p.title;
      lines.push(`${i + 1}. ${title} — score: ${p.score.toFixed(1)}, haftalik: ${p.weekly_bought}`);
    }
  } else {
    lines.push(``, `ℹ️ Kuzatilayotgan mahsulotlar yo'q. /start buyrug'i bilan boshlang.`);
  }

  lines.push(``, `${WEB_URL} | <i>VENTRA Analytics</i>`);
  return lines.join('\n');
}

// ─── Main processor ──────────────────────────────────────────────────────────

async function processMorningDigest(jobId: string, jobName: string) {
  // Get all accounts with active Telegram links
  const telegramLinks = await prisma.telegramLink.findMany({
    where: { is_active: true },
    select: { account_id: true, chat_id: true },
  });

  if (telegramLinks.length === 0) {
    logJobInfo(QUEUE_NAME, jobId, jobName, 'No active Telegram links — skipping digest');
    return { total: 0, sent: 0, failed: 0 };
  }

  logJobInfo(QUEUE_NAME, jobId, jobName, `Sending digest to ${telegramLinks.length} Telegram users`);

  let sent = 0;
  let failed = 0;

  for (const link of telegramLinks) {
    try {
      const message = await buildDigestForAccount(link.account_id);
      if (!message) continue;

      const ok = await sendTelegramMessage(link.chat_id, message);
      if (ok) {
        sent++;
      } else {
        failed++;
        logJobInfo(QUEUE_NAME, jobId, jobName, `Failed to send digest to chat ${link.chat_id}`);
      }
    } catch (err) {
      failed++;
      logJobError(QUEUE_NAME, jobId, jobName, err);
    }
  }

  return { total: telegramLinks.length, sent, failed };
}

// ─── Worker factory ──────────────────────────────────────────────────────────

export function createMorningDigestWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const start = Date.now();
      logJobStart(QUEUE_NAME, job.id ?? '-', job.name);
      try {
        const result = await processMorningDigest(job.id ?? '-', job.name);
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
