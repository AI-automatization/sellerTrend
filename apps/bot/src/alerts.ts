import { Bot } from 'grammy';
import { escapeHtml } from './utils';

/**
 * Send alert to a Telegram chat when a product score spikes.
 * Called after each discovery run completes.
 */
export async function sendDiscoveryAlert(
  bot: Bot,
  chatId: string | number,
  categoryId: string,
  winners: Array<{
    rank: number;
    title: string;
    score: number | null;
    weekly_bought: number | null;
    orders_quantity: string | null;
    sell_price: string | null;
  }>,
) {
  const top5 = winners.slice(0, 5);

  const lines = top5.map((w) => {
    const score = w.score != null ? w.score.toFixed(2) : '—';
    const activity = w.weekly_bought != null ? w.weekly_bought.toLocaleString() : '—';
    const price =
      w.sell_price != null
        ? `${Number(w.sell_price).toLocaleString()} so'm`
        : '—';

    return (
      `${w.rank}. <b>${escapeHtml(w.title)}</b>\n` +
      `   Score: <code>${score}</code>  Faollik: <code>${activity}</code>  ${price}`
    );
  });

  const message =
    `<b>Category #${categoryId} — Top 5 Trending</b>\n\n` +
    lines.join('\n\n') +
    `\n\n<i>VENTRA Analytics</i>`;

  await bot.api.sendMessage(chatId, message, { parse_mode: 'HTML' });
}
