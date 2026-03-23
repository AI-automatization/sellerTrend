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
            take: 3,
            select: { score: true, weekly_bought: true, orders_quantity: true, snapshot_at: true },
          },
        },
      },
    },
    take: 50,
  });

  const topProducts = tracked
    .map((t) => {
      const snaps = t.product.snapshots;
      const s0 = snaps[0];
      const s1 = snaps[1];

      let dailySold: number | null = null;
      let dailySoldDelta: number | null = null;

      if (s0 && s1) {
        const daysDiff = Math.max(0.5, (new Date(s0.snapshot_at).getTime() - new Date(s1.snapshot_at).getTime()) / (1000 * 60 * 60 * 24));
        const ordersDiff = Math.max(0, Number(s0.orders_quantity ?? 0) - Number(s1.orders_quantity ?? 0));
        dailySold = Math.round(ordersDiff / daysDiff);

        const s2 = snaps[2];
        if (s2) {
          const daysDiff2 = Math.max(0.5, (new Date(s1.snapshot_at).getTime() - new Date(s2.snapshot_at).getTime()) / (1000 * 60 * 60 * 24));
          const ordersDiff2 = Math.max(0, Number(s1.orders_quantity ?? 0) - Number(s2.orders_quantity ?? 0));
          const prevDailySold = Math.round(ordersDiff2 / daysDiff2);
          dailySoldDelta = dailySold - prevDailySold;
        }
      }

      return {
        title: t.product.title,
        score: s0 ? Number(s0.score ?? 0) : 0,
        weekly_bought: s0?.weekly_bought ?? 0,
        daily_sold: dailySold,
        daily_sold_delta: dailySoldDelta,
      };
    })
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
      const title = p.title.length > 35 ? p.title.slice(0, 32) + '...' : p.title;
      const dailyStr = p.daily_sold !== null
        ? ` | bugun: ${p.daily_sold} ta${p.daily_sold_delta !== null ? ` (${p.daily_sold_delta >= 0 ? '+' : ''}${p.daily_sold_delta})` : ''}`
        : '';
      lines.push(`${i + 1}. ${title} — score: ${p.score.toFixed(1)}${dailyStr}`);
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
