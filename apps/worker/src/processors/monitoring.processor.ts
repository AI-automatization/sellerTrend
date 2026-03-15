import { Worker, Job } from 'bullmq';
import { AlertType } from '@prisma/client';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';
import { detectStockCliff, detectEarlySignals, detectFlashSales } from '@uzum/utils';

const QUEUE_NAME = 'monitoring-queue';

// ─── Data loaders ────────────────────────────────────────────────────────────

async function loadTrackedProductsForAccount(accountId: string) {
  return prisma.trackedProduct.findMany({
    where: { account_id: accountId, is_active: true },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          orders_quantity: true,
          created_at: true,
          snapshots: {
            orderBy: { snapshot_at: 'desc' },
            take: 14,
            select: { score: true, weekly_bought: true, snapshot_at: true },
          },
          skus: {
            take: 1,
            select: {
              id: true,
              sku_snapshots: {
                orderBy: { snapshot_at: 'desc' },
                take: 5,
                select: { sell_price: true, snapshot_at: true },
              },
            },
          },
        },
      },
    },
  });
}

// ─── Alert creation helpers ──────────────────────────────────────────────────

async function createAlertIfRuleExists(
  accountId: string,
  productId: bigint,
  ruleType: AlertType,
  message: string,
): Promise<boolean> {
  const rule = await prisma.alertRule.findFirst({
    where: { account_id: accountId, product_id: productId, rule_type: ruleType, is_active: true },
  });
  if (!rule) return false;

  await prisma.alertEvent.create({
    data: { rule_id: rule.id, product_id: productId, message },
  });
  return true;
}

// ─── Stock Cliff detection ───────────────────────────────────────────────────

async function runStockCliff(accountId: string): Promise<number> {
  const tracked = await loadTrackedProductsForAccount(accountId);
  if (tracked.length === 0) return 0;

  const products = tracked.map((t) => {
    const snaps = t.product.snapshots; // DESC
    const latest = snaps[0];
    return {
      product_id: t.product.id.toString(),
      title: t.product.title,
      weekly_bought: latest?.weekly_bought ?? 0,
      orders_quantity: Number(t.product.orders_quantity ?? 0),
      snapshots: snaps.map((s) => ({
        weekly_bought: s.weekly_bought ?? 0,
        date: s.snapshot_at.toISOString(),
      })),
    };
  });

  const cliffs = detectStockCliff(products);
  let alertsCreated = 0;

  for (const cliff of cliffs) {
    const productId = BigInt(cliff.product_id);
    const message = `Stok cliff xavfi (${cliff.severity})! Taxminiy qolgan kunlar: ${cliff.estimated_days_left}. Kunlik sotish: ${cliff.current_velocity.toFixed(1)} dona/kun`;
    const created = await createAlertIfRuleExists(accountId, productId, AlertType.STOCK_LOW, message);
    if (created) alertsCreated++;
  }

  return alertsCreated;
}

// ─── Early Signals detection ─────────────────────────────────────────────────

async function runEarlySignals(accountId: string): Promise<number> {
  const tracked = await loadTrackedProductsForAccount(accountId);
  if (tracked.length === 0) return 0;

  const products = tracked.map((t) => ({
    product_id: t.product.id.toString(),
    title: t.product.title,
    created_at: t.product.created_at.toISOString(),
    snapshots: t.product.snapshots
      .slice()
      .reverse() // ASC for early signals
      .map((s) => ({
        score: Number(s.score ?? 0),
        weekly_bought: s.weekly_bought ?? 0,
        date: s.snapshot_at.toISOString(),
      })),
  }));

  const signals = detectEarlySignals(products);
  let alertsCreated = 0;

  for (const signal of signals) {
    if (signal.momentum_score < 0.5) continue; // Only fire on strong momentum
    const productId = BigInt(signal.product_id);
    const message = `Erta signal aniqlandi! Momentum: ${signal.momentum_score.toFixed(2)}, Haftalik sotuv tezligi: ${signal.sales_velocity}/kun, Score o'sish: ${signal.score_growth}%`;
    const created = await createAlertIfRuleExists(accountId, productId, AlertType.SCORE_SPIKE, message);
    if (created) alertsCreated++;
  }

  return alertsCreated;
}

// ─── Flash Sales detection ───────────────────────────────────────────────────

async function runFlashSales(accountId: string): Promise<number> {
  const tracked = await loadTrackedProductsForAccount(accountId);
  if (tracked.length === 0) return 0;

  const priceHistory = tracked
    .filter((t) => t.product.skus.length > 0)
    .map((t) => {
      const sku = t.product.skus[0];
      return {
        product_id: t.product.id.toString(),
        title: t.product.title,
        prices: sku.sku_snapshots.map((s) => ({
          price: Number(s.sell_price ?? 0),
          date: s.snapshot_at.toISOString(),
        })),
      };
    });

  const flashSales = detectFlashSales(priceHistory);
  let alertsCreated = 0;

  for (const flash of flashSales) {
    const productId = BigInt(flash.product_id);
    const message = `Flash sale aniqlandi! Narx ${flash.price_drop_pct}% tushirildi: ${flash.old_price.toLocaleString()} → ${flash.new_price.toLocaleString()} so'm`;
    const created = await createAlertIfRuleExists(accountId, productId, AlertType.PRICE_DROP, message);
    if (created) alertsCreated++;
  }

  return alertsCreated;
}

// ─── Main job processor ──────────────────────────────────────────────────────

async function processMonitoringSignals(jobId: string, jobName: string) {
  // Only process accounts that are ACTIVE (not SUSPENDED)
  const accounts = await prisma.account.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true },
  });
  logJobInfo(QUEUE_NAME, jobId, jobName, `Running signals for ${accounts.length} accounts`);

  let totalStockCliff = 0;
  let totalEarlySignals = 0;
  let totalFlashSales = 0;

  for (const account of accounts) {
    try {
      const [sc, es, fs] = await Promise.all([
        runStockCliff(account.id),
        runEarlySignals(account.id),
        runFlashSales(account.id),
      ]);
      totalStockCliff += sc;
      totalEarlySignals += es;
      totalFlashSales += fs;
    } catch (err) {
      logJobError(QUEUE_NAME, jobId, jobName, err);
      // Continue to next account
    }
  }

  return {
    accounts: accounts.length,
    stock_cliff_alerts: totalStockCliff,
    early_signal_alerts: totalEarlySignals,
    flash_sale_alerts: totalFlashSales,
  };
}

// ─── Worker factory ──────────────────────────────────────────────────────────

export function createMonitoringWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const start = Date.now();
      logJobStart(QUEUE_NAME, job.id ?? '-', job.name);
      try {
        const result = await processMonitoringSignals(job.id ?? '-', job.name);
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
