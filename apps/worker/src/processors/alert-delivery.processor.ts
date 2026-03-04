import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';

const QUEUE_NAME = 'alert-delivery-queue';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MAX_ALERTS_PER_RUN = 50;

// ─── Telegram helper ────────────────────────────────────────────────────────

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

// ─── Alert message formatter ────────────────────────────────────────────────

interface AlertFormatInput {
  ruleType: string;
  productTitle: string;
  message: string | null;
}

function formatAlertMessage(input: AlertFormatInput): string {
  const { ruleType, productTitle, message } = input;
  const detail = message ?? '';

  switch (ruleType) {
    case 'PRICE_DROP':
      return `📉 <b>Narx tushdi!</b>\n${productTitle}\n${detail}`;
    case 'STOCK_LOW':
      return `📦 <b>Stok kam!</b>\n${productTitle}\n${detail}`;
    case 'SCORE_SPIKE':
      return `🚀 <b>Score o'sdi!</b>\n${productTitle}\n${detail}`;
    default:
      return `🔔 <b>Alert</b>\n${productTitle}\n${detail}`;
  }
}

// ─── Core processor ─────────────────────────────────────────────────────────

async function processAlertDelivery(jobId: string, jobName: string) {
  // 1. Query undelivered AlertEvents
  const events = await prisma.alertEvent.findMany({
    where: { delivered_at: null },
    take: MAX_ALERTS_PER_RUN,
    orderBy: { triggered_at: 'asc' },
    include: {
      rule: {
        select: {
          id: true,
          account_id: true,
          rule_type: true,
        },
      },
      product: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (events.length === 0) {
    logJobInfo(QUEUE_NAME, jobId, jobName, 'No undelivered alerts');
    return { total: 0, delivered: 0, telegram_sent: 0 };
  }

  logJobInfo(QUEUE_NAME, jobId, jobName, `Processing ${events.length} undelivered alerts`);

  let delivered = 0;
  let telegramSent = 0;

  for (const event of events) {
    const productTitle = event.product?.title ?? `Product #${event.product_id}`;
    const alertText = formatAlertMessage({
      ruleType: event.rule.rule_type,
      productTitle,
      message: event.message,
    });

    // 2a. Create in-app notification
    try {
      await prisma.notification.create({
        data: {
          account_id: event.rule.account_id,
          message: alertText.replace(/<[^>]*>/g, '').slice(0, 500), // strip HTML, limit 500 chars
          type: 'alert',
        },
      });
    } catch (err) {
      logJobError(QUEUE_NAME, jobId, jobName, err);
      // Continue — don't block other alerts
      continue;
    }

    // 2b. Check if account has active TelegramLink → send Telegram message
    try {
      const telegramLink = await prisma.telegramLink.findFirst({
        where: {
          account_id: event.rule.account_id,
          is_active: true,
        },
        select: { chat_id: true },
      });

      if (telegramLink) {
        const sent = await sendTelegramMessage(telegramLink.chat_id, alertText);
        if (sent) telegramSent++;
      }
    } catch {
      // TelegramLink model may not exist yet (T-372) — skip Telegram silently
    }

    // 2c. Mark as delivered
    await prisma.alertEvent.update({
      where: { id: event.id },
      data: { delivered_at: new Date() },
    });
    delivered++;
  }

  return { total: events.length, delivered, telegram_sent: telegramSent };
}

// ─── Worker factory ─────────────────────────────────────────────────────────

export function createAlertDeliveryWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const start = Date.now();
      logJobStart(QUEUE_NAME, job.id ?? '-', job.name);
      try {
        const result = await processAlertDelivery(job.id ?? '-', job.name);
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
  worker.on('failed', (job, err) => logJobError(QUEUE_NAME, job?.id ?? '-', job?.name ?? '-', err));

  return worker;
}
