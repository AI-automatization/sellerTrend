import 'dotenv/config';
import http from 'http';
import { Bot, GrammyError, HttpError } from 'grammy';
import { prisma } from './prisma';
import { parseUzumProductId } from '@uzum/utils';
import { escapeHtml } from './utils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const WEB_URL = process.env.WEB_URL ?? 'https://ventra.uz';

// ─── Per-user rate limiter (2s cooldown) ─────────────────────────────────────

const RATE_LIMIT_MS = 2000;
const RATE_LIMIT_MAX_ENTRIES = 1000;
const userLastMessage = new Map<number, number>();

function isRateLimited(userId: number): boolean {
  const now = Date.now();

  // Evict old entries when map grows too large
  if (userLastMessage.size > RATE_LIMIT_MAX_ENTRIES) {
    for (const [uid, ts] of userLastMessage) {
      if (now - ts > RATE_LIMIT_MS) {
        userLastMessage.delete(uid);
      }
    }
  }

  const lastTs = userLastMessage.get(userId);
  if (lastTs && now - lastTs < RATE_LIMIT_MS) {
    return true;
  }
  userLastMessage.set(userId, now);
  return false;
}

/** Format BigInt UZS amount: 1_500_000 → "1 500 000" */
function formatUzs(amount: bigint | number): string {
  return Number(amount).toLocaleString('ru-RU');
}

/** Check if chat is linked to a VENTRA account. Returns accountId or null. */
async function requireLink(chatId: number): Promise<{ accountId: string } | null> {
  const link = await prisma.telegramLink.findFirst({
    where: { chat_id: String(chatId), is_active: true },
  });
  if (!link) return null;
  return { accountId: link.account_id };
}

/** Parse product ID from Uzum URL or raw number string */
function parseProductInput(input: string): bigint | null {
  // Try raw number first
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) {
    return BigInt(trimmed);
  }
  // Try URL parsing
  const parsed = parseUzumProductId(trimmed);
  if (parsed !== null) {
    return BigInt(parsed);
  }
  return null;
}

const DEFAULT_DAILY_FEE = 50_000n;
const MAX_TRACKED_DISPLAY = 10;

// ─── Structured logger (bot has no NestJS, so simple helper) ────────────────
function logBot(level: 'info' | 'warn' | 'error', message: string, error?: unknown) {
  const entry = {
    timestamp: new Date().toISOString(),
    service: 'bot',
    level,
    message,
    ...(error instanceof Error
      ? { error: error.message, stack: error.stack }
      : error != null ? { error: String(error) } : {}),
  };
  if (level === 'error') {
    process.stderr.write(JSON.stringify(entry) + '\n');
  } else {
    process.stdout.write(JSON.stringify(entry) + '\n');
  }
}

// T-349: Global crash handlers — log but do NOT exit.
// For fatal errors (ENOMEM), trigger graceful shutdown.
let shutdownFn: ((signal: string) => Promise<void>) | null = null;

process.on('uncaughtException', (err) => {
  logBot('error', 'uncaughtException', err);
  const isFatal = err && ('code' in err) && (err as NodeJS.ErrnoException).code === 'ERR_WORKER_OUT_OF_MEMORY'
    || err?.message?.includes('ENOMEM')
    || err?.message?.includes('allocation failed');
  if (isFatal && shutdownFn) {
    logBot('error', 'Fatal memory error detected, initiating graceful shutdown');
    shutdownFn('ENOMEM').catch(() => process.exit(1));
  }
  // Otherwise let the process continue — Railway will restart if truly broken
});
process.on('unhandledRejection', (reason) => {
  logBot('error', 'unhandledRejection', reason instanceof Error ? reason : new Error(String(reason)));
  // Do NOT exit — one rejected promise should not kill the bot
});

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  logBot('error', 'TELEGRAM_BOT_TOKEN env variable is required');
  process.exit(1);
}

const bot = new Bot(TOKEN);

// ─── Rate limiter middleware ─────────────────────────────────────────────────

bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  if (userId && isRateLimited(userId)) {
    return; // silently drop
  }
  await next();
});

// ─── Commands ────────────────────────────────────────────────────────────────

bot.command('start', async (ctx) => {
  const linked = await requireLink(ctx.chat.id);
  const linkStatus = linked
    ? `\n\nAkkount ulangan. /myproducts va /balance ishlatishingiz mumkin.`
    : `\n\nAkkountingizni ulash uchun /connect buyrug'ini yuboring.`;

  await ctx.reply(
    `<b>VENTRA Analytics Bot</b>\n\n` +
    `Men sizga Uzum marketplace trenduvoiy mahsulotlar haqida xabar beraman.\n\n` +
    `<b>Buyruqlar:</b>\n` +
    `/connect — Akkountni ulash (API key prefix)\n` +
    `/myproducts — Kuzatilayotgan mahsulotlar\n` +
    `/balance — Balans va qolgan kunlar\n` +
    `/product — Mahsulot ma'lumoti (URL yoki ID)\n` +
    `/subscribe — Xabarnomaga ulaning\n` +
    `/unsubscribe — Obunani bekor qiling\n` +
    `/status — Hozirgi holat\n` +
    `/top — So'nggi top mahsulotlar\n` +
    `/help — Yordam` +
    linkStatus,
    { parse_mode: 'HTML' },
  );
});

// ─── /connect [API_KEY_PREFIX] — Link Telegram → VENTRA account ─────────────

bot.command('connect', async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message?.text ?? '';
  const parts = text.split(/\s+/);
  const prefix = parts[1]?.trim();

  if (!prefix || prefix.length < 4) {
    await ctx.reply(
      `<b>Akkountni ulash</b>\n\n` +
      `API key prefixingizni yuboring:\n` +
      `<code>/connect vntr_abc1</code>\n\n` +
      `API key prefix — dashboardda Settings &gt; API Keys sahifasida ko'rinadi.\n` +
      `Kamida 4 belgi kerak.`,
      { parse_mode: 'HTML' },
    );
    return;
  }

  // Check if already linked
  const existingLink = await prisma.telegramLink.findFirst({
    where: { chat_id: String(chatId), is_active: true },
  });
  if (existingLink) {
    await ctx.reply(
      `Siz allaqachon ulangansiz.\n\n` +
      `Qayta ulash uchun avval /disconnect qiling.`,
      { parse_mode: 'HTML' },
    );
    return;
  }

  // Look up ApiKey by prefix
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      key_prefix: { startsWith: prefix },
      is_active: true,
    },
    include: { account: { select: { id: true, name: true } } },
  });

  if (!apiKey) {
    await ctx.reply(
      `API key topilmadi yoki faol emas.\n\n` +
      `Prefix to'g'riligini tekshiring va qaytadan urinib ko'ring.`,
    );
    return;
  }

  // Create TelegramLink
  const username = ctx.from?.username ?? null;
  await prisma.telegramLink.create({
    data: {
      account_id: apiKey.account_id,
      chat_id: String(chatId),
      username,
    },
  });

  logBot('info', `TelegramLink created: chat=${chatId} → account=${apiKey.account_id}`);

  await ctx.reply(
    `<b>Muvaffaqiyatli ulandi!</b>\n\n` +
    `Akkount: <b>${escapeHtml(apiKey.account.name)}</b>\n\n` +
    `Endi /myproducts, /balance, /product buyruqlarini ishlatishingiz mumkin.`,
    { parse_mode: 'HTML' },
  );
});

// ─── /disconnect — Unlink Telegram from VENTRA account ──────────────────────

bot.command('disconnect', async (ctx) => {
  const chatId = ctx.chat.id;

  const link = await prisma.telegramLink.findFirst({
    where: { chat_id: String(chatId), is_active: true },
  });

  if (!link) {
    await ctx.reply('Siz hali hech qanday akkountga ulanmagansiz.');
    return;
  }

  await prisma.telegramLink.update({
    where: { id: link.id },
    data: { is_active: false },
  });

  logBot('info', `TelegramLink deactivated: chat=${chatId}`);
  await ctx.reply('Akkount uzildi. Qayta ulash uchun /connect ishlatishingiz mumkin.');
});

// ─── /myproducts — Show tracked products ────────────────────────────────────

bot.command('myproducts', async (ctx) => {
  const linked = await requireLink(ctx.chat.id);
  if (!linked) {
    await ctx.reply('Avval akkountingizni ulang: /connect [API_KEY_PREFIX]');
    return;
  }

  const tracked = await prisma.trackedProduct.findMany({
    where: { account_id: linked.accountId, is_active: true },
    take: MAX_TRACKED_DISPLAY,
    orderBy: { created_at: 'desc' },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          total_available_amount: true,
          snapshots: {
            select: { score: true, weekly_bought: true },
            orderBy: { snapshot_at: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  if (tracked.length === 0) {
    await ctx.reply(
      'Hozircha kuzatilayotgan mahsulot yo\'q.\n\n' +
      'Dashboardda mahsulot qo\'shing va bu yerda ko\'ring.',
    );
    return;
  }

  const totalCount = await prisma.trackedProduct.count({
    where: { account_id: linked.accountId, is_active: true },
  });

  const lines = tracked.map((tp, i) => {
    const p = tp.product;
    const snap = p.snapshots[0];
    const score = snap?.score != null ? Number(snap.score).toFixed(2) : '--';
    const wb = snap?.weekly_bought != null ? snap.weekly_bought.toLocaleString() : '--';
    const stock = p.total_available_amount != null ? p.total_available_amount.toString() : '--';
    return (
      `${i + 1}. <b>${escapeHtml(p.title)}</b>\n` +
      `   Score: <code>${score}</code> | Haftalik: ${wb} | Stok: ${stock}`
    );
  });

  const footer = totalCount > MAX_TRACKED_DISPLAY
    ? `\n\n<i>...va yana ${totalCount - MAX_TRACKED_DISPLAY} ta mahsulot (dashboardda ko'ring)</i>`
    : '';

  await ctx.reply(
    `<b>Kuzatilayotgan mahsulotlar (${totalCount})</b>\n\n` +
    lines.join('\n\n') +
    footer,
    { parse_mode: 'HTML' },
  );
});

// ─── /balance — Show account balance + estimated days ───────────────────────

bot.command('balance', async (ctx) => {
  const linked = await requireLink(ctx.chat.id);
  if (!linked) {
    await ctx.reply('Avval akkountingizni ulang: /connect [API_KEY_PREFIX]');
    return;
  }

  const account = await prisma.account.findUnique({
    where: { id: linked.accountId },
    select: { name: true, balance: true, daily_fee: true, status: true },
  });

  if (!account) {
    await ctx.reply('Akkount topilmadi. /connect orqali qayta ulaning.');
    return;
  }

  const dailyFee = account.daily_fee ?? DEFAULT_DAILY_FEE;
  const balance = account.balance;
  const remainingDays = dailyFee > 0n
    ? Math.floor(Number(balance) / Number(dailyFee))
    : 0;

  const statusEmoji = account.status === 'ACTIVE' ? 'Faol'
    : account.status === 'PAYMENT_DUE' ? 'To\'lov kutilmoqda'
    : 'To\'xtatilgan';

  await ctx.reply(
    `<b>Akkount: ${escapeHtml(account.name)}</b>\n\n` +
    `Balans: <code>${formatUzs(balance)}</code> UZS\n` +
    `Kunlik to'lov: <code>${formatUzs(dailyFee)}</code> UZS\n` +
    `Qolgan kunlar: <b>${remainingDays}</b> kun\n` +
    `Holat: ${statusEmoji}`,
    { parse_mode: 'HTML' },
  );
});

// ─── /product [URL or ID] — Quick product info ─────────────────────────────

bot.command('product', async (ctx) => {
  const linked = await requireLink(ctx.chat.id);
  if (!linked) {
    await ctx.reply('Avval akkountingizni ulang: /connect [API_KEY_PREFIX]');
    return;
  }

  const text = ctx.message?.text ?? '';
  const parts = text.split(/\s+/);
  const input = parts.slice(1).join(' ').trim();

  if (!input) {
    await ctx.reply(
      `<b>Mahsulot ma'lumotlari</b>\n\n` +
      `Foydalanish:\n` +
      `<code>/product 155927</code>\n` +
      `<code>/product https://uzum.uz/ru/product/mahsulot-155927</code>`,
      { parse_mode: 'HTML' },
    );
    return;
  }

  const productId = parseProductInput(input);
  if (productId === null) {
    await ctx.reply('Mahsulot ID yoki URL ni to\'g\'ri kiriting.');
    return;
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      title: true,
      category_id: true,
      rating: true,
      orders_quantity: true,
      total_available_amount: true,
      is_active: true,
      skus: {
        select: { min_sell_price: true },
        where: { is_available: true },
        take: 1,
        orderBy: { min_sell_price: 'asc' },
      },
      snapshots: {
        select: { score: true, weekly_bought: true, snapshot_at: true },
        orderBy: { snapshot_at: 'desc' },
        take: 1,
      },
    },
  });

  if (!product) {
    await ctx.reply(`Mahsulot topilmadi (ID: ${productId.toString()}).`);
    return;
  }

  const snap = product.snapshots[0];
  const score = snap?.score != null ? Number(snap.score).toFixed(2) : '--';
  const wb = snap?.weekly_bought != null ? snap.weekly_bought.toLocaleString() : '--';
  const stock = product.total_available_amount != null
    ? product.total_available_amount.toString()
    : '--';
  const price = product.skus[0]?.min_sell_price != null
    ? formatUzs(product.skus[0].min_sell_price)
    : '--';
  const rating = product.rating != null ? Number(product.rating).toFixed(2) : '--';
  const orders = product.orders_quantity != null
    ? product.orders_quantity.toString()
    : '--';
  const snapshotDate = snap?.snapshot_at
    ? new Date(snap.snapshot_at).toLocaleDateString('uz-UZ')
    : '--';

  await ctx.reply(
    `<b>${escapeHtml(product.title)}</b>\n` +
    `ID: <code>${product.id.toString()}</code>\n\n` +
    `Score: <code>${score}</code>\n` +
    `Haftalik sotilgan: ${wb}\n` +
    `Narx: ${price} UZS\n` +
    `Stok: ${stock}\n` +
    `Reyting: ${rating}\n` +
    `Jami buyurtmalar: ${orders}\n` +
    `Holat: ${product.is_active ? 'Faol' : 'Nofaol'}\n` +
    `So'nggi snapshot: ${snapshotDate}\n\n` +
    `<a href="https://uzum.uz/ru/product/-${product.id.toString()}">Uzum'da ko'rish</a>`,
    { parse_mode: 'HTML' },
  );
});

// ─── Existing commands ───────────────────────────────────────────────────────

bot.command('subscribe', async (ctx) => {
  const chatId = String(ctx.chat.id);

  // Store subscription in DB (system_settings as simple store)
  const key = `telegram_subscriber_${chatId}`;
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value: 'active' },
    create: { key, value: 'active' },
  });

  await ctx.reply(
    `<b>Obuna faollashtirildi!</b>\n\n` +
    `Yangi trending mahsulotlar topilganda sizga xabar keladi.\n` +
    `Chat ID: <code>${chatId}</code>`,
    { parse_mode: 'HTML' },
  );
});

bot.command('unsubscribe', async (ctx) => {
  const chatId = String(ctx.chat.id);
  const key = `telegram_subscriber_${chatId}`;

  await prisma.systemSetting.upsert({
    where: { key },
    update: { value: 'inactive' },
    create: { key, value: 'inactive' },
  });

  await ctx.reply('Obuna bekor qilindi.');
});

bot.command('status', async (ctx) => {
  const chatId = String(ctx.chat.id);
  const key = `telegram_subscriber_${chatId}`;

  const setting = await prisma.systemSetting.findUnique({ where: { key } });
  const isActive = setting?.value === 'active';

  const linked = await requireLink(ctx.chat.id);
  const linkLine = linked
    ? '\nAkkount: ulangan'
    : '\nAkkount: ulanmagan (/connect)';

  await ctx.reply(
    (isActive
      ? `Obuna <b>faol</b>. Xabarlar keladi.`
      : `Obuna <b>faol emas</b>. /subscribe buyrug'ini yuboring.`) +
    linkLine,
    { parse_mode: 'HTML' },
  );
});

bot.command('top', async (ctx) => {
  await ctx.reply('<i>So\'nggi discovery natijalari yuklanmoqda...</i>', {
    parse_mode: 'HTML',
  });

  const latestRun = await prisma.categoryRun.findFirst({
    where: { status: 'DONE' },
    orderBy: { finished_at: 'desc' },
    include: {
      winners: {
        orderBy: { rank: 'asc' },
        take: 10,
        include: { product: { select: { title: true } } },
      },
    },
  });

  if (!latestRun || latestRun.winners.length === 0) {
    await ctx.reply('Hali hech qanday discovery natijasi yo\'q.\n\nWebsiteda yangi skanerlash boshlang.');
    return;
  }

  const lines = latestRun.winners.map((w) => {
    const score = w.score != null ? Number(w.score).toFixed(2) : '--';
    const activity = w.weekly_bought != null ? w.weekly_bought.toLocaleString() : '--';
    return (
      `${w.rank}. <b>${escapeHtml(w.product.title)}</b>\n` +
      `   Score: <code>${score}</code>  Haftalik: ${activity}`
    );
  });

  const finishedAt = latestRun.finished_at
    ? new Date(latestRun.finished_at).toLocaleString('uz-UZ')
    : '--';

  await ctx.reply(
    `<b>Kategoriya #${latestRun.category_id} — Top ${latestRun.winners.length}</b>\n` +
    `${finishedAt}\n\n` +
    lines.join('\n\n'),
    { parse_mode: 'HTML' },
  );
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    `<b>Yordam — VENTRA Analytics Bot</b>\n\n` +
    `<b>Akkount:</b>\n` +
    `/connect [prefix] — API key prefix orqali akkountni ulash\n` +
    `/disconnect — Akkountni uzish\n\n` +
    `<b>Shaxsiy ma'lumotlar:</b>\n` +
    `/myproducts — Kuzatilayotgan mahsulotlar ro'yxati\n` +
    `/balance — Balans va qolgan kunlar\n` +
    `/product [URL/ID] — Mahsulot tafsilotlari\n\n` +
    `<b>Umumiy:</b>\n` +
    `/subscribe — Kunlik trend xabarnomasiga ulaning\n` +
    `/unsubscribe — Obunani bekor qiling\n` +
    `/status — Obuna holatingiz\n` +
    `/top — So'nggi top trending mahsulotlar\n\n` +
    `Dashboard: ${WEB_URL}`,
    { parse_mode: 'HTML' },
  );
});

// Unknown command
bot.on('message', async (ctx) => {
  await ctx.reply(
    'Buyruqni tushunmadim. /help ni yuboring.',
  );
});

// ─── Error handling ───────────────────────────────────────────────────────────

bot.catch((err) => {
  const ctx = err.ctx;
  const e = err.error;
  if (e instanceof GrammyError) {
    logBot('error', `Update ${ctx.update.update_id} — Grammy error: ${e.description}`, e);
  } else if (e instanceof HttpError) {
    logBot('error', `Update ${ctx.update.update_id} — HTTP error contacting Telegram`, e);
  } else {
    logBot('error', `Update ${ctx.update.update_id} — Unknown error`, e);
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

async function bootstrap() {
  logBot('info', 'Telegram bot starting...');

  // Health check HTTP server (Railway requires an HTTP endpoint)
  const healthPort = parseInt(process.env.PORT || '3002', 10);
  const healthServer = http.createServer((req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      bot.api.getMe()
        .then((me) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', bot: me.username, timestamp: new Date().toISOString() }));
        })
        .catch((err) => {
          logBot('error', 'Health check: bot.api.getMe() failed', err);
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'disconnected', timestamp: new Date().toISOString() }));
        });
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  healthServer.listen(healthPort, () => {
    logBot('info', `Bot health check: http://localhost:${healthPort}/health`);
  });

  await bot.start({
    onStart: (info) => {
      logBot('info', `Bot started: @${info.username}`);
    },
  });

  // T-306 + T-349: Graceful shutdown
  const shutdown = async (signal: string) => {
    logBot('info', `[${signal}] Bot graceful shutdown...`);
    const timeout = setTimeout(() => {
      logBot('error', 'Bot shutdown timeout (15s), forcing exit');
      process.exit(1);
    }, 15_000);
    try {
      bot.stop();
      healthServer.close();
      await prisma.$disconnect();
      clearTimeout(timeout);
      logBot('info', 'Bot shutdown complete');
      process.exit(0);
    } catch (err) {
      logBot('error', 'Bot shutdown error', err);
      process.exit(1);
    }
  };

  // Wire up shutdownFn for fatal error handler (uncaughtException ENOMEM)
  shutdownFn = shutdown;

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => logBot('error', 'Bootstrap failed', err));
