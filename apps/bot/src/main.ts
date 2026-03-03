import 'dotenv/config';
import http from 'http';
import { Bot, GrammyError, HttpError } from 'grammy';
import { prisma } from './prisma';
// T-300: Global crash handlers
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason);
  process.exit(1);
});

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN env variable is required');
  process.exit(1);
}

const bot = new Bot(TOKEN);

// ─── Commands ────────────────────────────────────────────────────────────────

bot.command('start', async (ctx) => {
  const chatId = ctx.chat.id;
  await ctx.reply(
    `👋 <b>VENTRA Analytics Bot</b>\n\n` +
    `Men sizga Uzum marketplace trenduvoiy mahsulotlar haqida xabar beraman.\n\n` +
    `📋 <b>Buyruqlar:</b>\n` +
    `/subscribe — Xabarnomaga ulaning\n` +
    `/unsubscribe — Obunani bekor qiling\n` +
    `/status — Hozirgi holat\n` +
    `/top — So'nggi top mahsulotlar\n` +
    `/help — Yordam`,
    { parse_mode: 'HTML' },
  );
});

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
    `✅ <b>Obuna faollashtirildi!</b>\n\n` +
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

  await ctx.reply('❌ Obuna bekor qilindi.');
});

bot.command('status', async (ctx) => {
  const chatId = String(ctx.chat.id);
  const key = `telegram_subscriber_${chatId}`;

  const setting = await prisma.systemSetting.findUnique({ where: { key } });
  const isActive = setting?.value === 'active';

  await ctx.reply(
    isActive
      ? `✅ Obuna <b>faol</b>. Xabarlar keladi.`
      : `❌ Obuna <b>faol emas</b>. /subscribe buyrug'ini yuboring.`,
    { parse_mode: 'HTML' },
  );
});

bot.command('top', async (ctx) => {
  await ctx.reply('<i>⏳ So\'nggi discovery natijalari yuklanmoqda...</i>', {
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
    await ctx.reply('📭 Hali hech qanday discovery natijasi yo\'q.\n\nWebsiteda yangi skanerlash boshlang.');
    return;
  }

  const lines = latestRun.winners.map((w) => {
    const score = w.score != null ? Number(w.score).toFixed(2) : '—';
    const activity = w.weekly_bought != null ? w.weekly_bought.toLocaleString() : '—';
    return (
      `${w.rank}. <b>${escapeHtml(w.product.title)}</b>\n` +
      `   📊 Score: <code>${score}</code>  🔥 ${activity}`
    );
  });

  const finishedAt = latestRun.finished_at
    ? new Date(latestRun.finished_at).toLocaleString('uz-UZ')
    : '—';

  await ctx.reply(
    `🏆 <b>Kategoriya #${latestRun.category_id} — Top ${latestRun.winners.length}</b>\n` +
    `📅 ${finishedAt}\n\n` +
    lines.join('\n\n'),
    { parse_mode: 'HTML' },
  );
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    `📖 <b>Yordam</b>\n\n` +
    `/subscribe — Kunlik trend xabarnomasiga ulaning\n` +
    `/unsubscribe — Obunani bekor qiling\n` +
    `/status — Obuna holatingiz\n` +
    `/top — So'nggi top trending mahsulotlar\n\n` +
    `🌐 Dashboard: https://your-domain.uz`,
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
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error('Error in request:', e.description);
  } else if (e instanceof HttpError) {
    console.error('Could not contact Telegram:', e);
  } else {
    console.error('Unknown error:', e);
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

async function bootstrap() {
  console.log('Telegram bot starting...');

  // Health check HTTP server (Railway requires an HTTP endpoint)
  const healthPort = parseInt(process.env.PORT || '3002', 10);
  const healthServer = http.createServer((req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', bot: 'running', timestamp: new Date().toISOString() }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  healthServer.listen(healthPort, () => {
    console.log(`Bot health check: http://localhost:${healthPort}/health`);
  });

  await bot.start({
    onStart: (info) => {
      console.log(`Bot started: @${info.username}`);
    },
  });

  // T-306: Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[${signal}] Bot graceful shutdown...`);
    const timeout = setTimeout(() => {
      console.error('Bot shutdown timeout (15s), forcing exit');
      process.exit(1);
    }, 15_000);
    try {
      bot.stop();
      healthServer.close();
      await prisma.$disconnect();
      clearTimeout(timeout);
      console.log('Bot shutdown complete');
      process.exit(0);
    } catch (err) {
      console.error('Bot shutdown error:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch(console.error);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
