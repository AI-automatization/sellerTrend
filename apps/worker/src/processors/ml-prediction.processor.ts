/**
 * ML Prediction batch processor (T-482).
 *
 * Har kuni kechasi barcha tracked product lar uchun ML prognoz ishlatadi
 * va natijalarni ml_predictions jadvaliga saqlaydi.
 *
 * Ishga tushish: 04:00 UTC (daily-aggregation 03:30 UTC dan keyin)
 *
 * Ish tartibi:
 *   1. TrackedProduct lar ro'yxatini olish (account bo'yicha group qilmasdan)
 *   2. Har product uchun oxirgi 90 kun snapshotni olish
 *   3. ML service /predict/sales POST → predictions
 *   4. ml_predictions jadvaliga INSERT (upsert emas — har kuni yangi row)
 *   5. Xato bo'lsa skip + log, to'xtamaslik
 */

import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';

const QUEUE_NAME = 'ml-prediction-queue';
const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? 'http://ml-service:8000';
const HORIZON_DAYS = 7;
const SNAPSHOT_LOOKBACK_DAYS = 90;
/** Bir vaqtda nechta product parallel ishlov oladi (ML service yukini boshqarish uchun) */
const CONCURRENCY_BATCH = 5;

// ── Alert thresholds (T-494) ──────────────────────────────────────────────
const MAPE_FAILURE_THRESHOLD = 50;     // 1 kun > 50% → PREDICTION_FAILURE
const MAPE_DRIFT_THRESHOLD = 30;       // 3 kun > 30% → MODEL_DRIFT
const MAPE_RETRAIN_THRESHOLD = 25;     // 3 kun > 25% → auto-retrain
const DIRECTION_DRIFT_THRESHOLD = 60;  // direction accuracy < 60% → DIRECTION_DRIFT
const DRIFT_WINDOW_DAYS = 3;

interface MlPredictPoint {
  date: string;
  value: number;
  lower: number;
  upper: number;
}

interface MlPredictResponse {
  predictions: MlPredictPoint[];
  model: string;       // ML service 'model' deb qaytaradi, 'model_name' emas
  mae: number | null;
  mape?: number | null;
}

async function runBatchPredictions(jobId: string, jobName: string): Promise<{
  total: number;
  success: number;
  skipped: number;
}> {
  // Barcha aktiv tracked product larni olish (unique product_id)
  const trackedProducts = await prisma.trackedProduct.findMany({
    where: { is_active: true },
    select: { product_id: true },
    distinct: ['product_id'],
  });

  const total = trackedProducts.length;
  logJobInfo(QUEUE_NAME, jobId, jobName, `Jami ${total} ta product uchun ML prognoz boshlanmoqda`);

  if (total === 0) {
    return { total: 0, success: 0, skipped: 0 };
  }

  const since = new Date();
  since.setDate(since.getDate() - SNAPSHOT_LOOKBACK_DAYS);

  let success = 0;
  let skipped = 0;

  // CONCURRENCY_BATCH ta parallel ishlatish
  for (let i = 0; i < trackedProducts.length; i += CONCURRENCY_BATCH) {
    const batch = trackedProducts.slice(i, i + CONCURRENCY_BATCH);

    await Promise.allSettled(
      batch.map(async ({ product_id }) => {
        try {
          // Snapshotlarni olish
          const snapshots = await prisma.productSnapshot.findMany({
            where: {
              product_id,
              snapshot_at: { gte: since },
            },
            orderBy: { snapshot_at: 'asc' },
            select: {
              snapshot_at: true,
              weekly_bought: true,
              score: true,
              orders_quantity: true,
            },
          });

          if (snapshots.length < 3) {
            // Ma'lumot yetarli emas — skip
            skipped++;
            return;
          }

          // ML service ga so'rov
          const response = await fetch(`${ML_SERVICE_URL}/predict/sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              product_id: product_id.toString(),
              horizon: HORIZON_DAYS,
              snapshots: snapshots.map((s) => ({
                snapshot_at: s.snapshot_at.toISOString(),
                weekly_bought: s.weekly_bought,
                score: s.score !== null ? Number(s.score) : null,
                orders_quantity:
                  s.orders_quantity !== null ? s.orders_quantity.toString() : null,
              })),
            }),
            signal: AbortSignal.timeout(30_000), // 30s timeout
          });

          if (!response.ok) {
            skipped++;
            return;
          }

          const mlData = (await response.json()) as MlPredictResponse;

          // ml_predictions ga saqlash
          await prisma.mlPrediction.create({
            data: {
              product_id,
              model_name: mlData.model ?? 'unknown',
              metric: 'weekly_bought',
              horizon_days: HORIZON_DAYS,
              predictions: (mlData.predictions ?? []) as unknown as Parameters<typeof prisma.mlPrediction.create>[0]['data']['predictions'],
              mae: mlData.mae ?? undefined,
              mape: mlData.mape ?? undefined,
            },
          });

          success++;
        } catch {
          // Individual product xatosi — skip
          skipped++;
        }
      }),
    );
  }

  return { total, success, skipped };
}

// ── T-494: ML Alert checker ───────────────────────────────────────────────
async function checkMlAlerts(jobId: string, jobName: string): Promise<void> {
  const since = new Date();
  since.setDate(since.getDate() - DRIFT_WINDOW_DAYS);

  // Group MlAuditLog by model_name, date
  const auditRows = await prisma.mlAuditLog.findMany({
    where: { created_at: { gte: since } },
    select: {
      model_name: true,
      error_pct: true,
      predicted_value: true,
      actual_value: true,
      created_at: true,
    },
  });

  if (auditRows.length === 0) return;

  // Group by model_name
  const byModel = new Map<string, typeof auditRows>();
  for (const row of auditRows) {
    const key = row.model_name;
    if (!byModel.has(key)) byModel.set(key, []);
    byModel.get(key)!.push(row);
  }

  const retrained = new Set<string>();

  for (const [modelName, rows] of byModel.entries()) {
    const avgMape = rows.reduce((s, r) => s + r.error_pct, 0) / rows.length;

    // Direction accuracy: predicted > 0 === actual > 0
    const withBoth = rows.filter(r => r.predicted_value !== null && r.actual_value !== null);
    const dirCorrect = withBoth.filter(
      r => (r.predicted_value > 0) === (r.actual_value > 0),
    ).length;
    const dirAccuracy = withBoth.length > 0 ? (dirCorrect / withBoth.length) * 100 : null;

    // Group by day to check consecutive days
    const byDay = new Map<string, number[]>();
    for (const row of rows) {
      const day = row.created_at.toISOString().slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(row.error_pct);
    }
    const dayMapes = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, errs]) => errs.reduce((s, e) => s + e, 0) / errs.length);

    // PREDICTION_FAILURE: today's MAPE > 50%
    const todayMape = dayMapes.at(-1) ?? 0;
    if (todayMape > MAPE_FAILURE_THRESHOLD) {
      logJobError(QUEUE_NAME, jobId, jobName,
        new Error(`[PREDICTION_FAILURE] ${modelName}: MAPE=${todayMape.toFixed(1)}% (>${MAPE_FAILURE_THRESHOLD}%)`));
    }

    // MODEL_DRIFT: last 3 days all > 30%
    if (
      dayMapes.length >= DRIFT_WINDOW_DAYS &&
      dayMapes.slice(-DRIFT_WINDOW_DAYS).every(m => m > MAPE_DRIFT_THRESHOLD)
    ) {
      logJobError(QUEUE_NAME, jobId, jobName,
        new Error(`[MODEL_DRIFT] ${modelName}: MAPE >${MAPE_DRIFT_THRESHOLD}% 3 kun ketma-ket (avg=${avgMape.toFixed(1)}%)`));
    }

    // DIRECTION_DRIFT: direction accuracy < 60%
    if (dirAccuracy !== null && dirAccuracy < DIRECTION_DRIFT_THRESHOLD) {
      logJobError(QUEUE_NAME, jobId, jobName,
        new Error(`[DIRECTION_DRIFT] ${modelName}: direction_accuracy=${dirAccuracy.toFixed(1)}% (<${DIRECTION_DRIFT_THRESHOLD}%)`));
    }

    // Auto-retrain: last 3 days all > 25%
    if (
      !retrained.has(modelName) &&
      dayMapes.length >= DRIFT_WINDOW_DAYS &&
      dayMapes.slice(-DRIFT_WINDOW_DAYS).every(m => m > MAPE_RETRAIN_THRESHOLD)
    ) {
      logJobInfo(QUEUE_NAME, jobId, jobName,
        `[AUTO_RETRAIN] ${modelName}: MAPE >${MAPE_RETRAIN_THRESHOLD}% 3 kun → retrain triggerlanmoqda`);
      try {
        await fetch(`${ML_SERVICE_URL}/batch/retrain`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model_name: modelName }),
          signal: AbortSignal.timeout(15_000),
        });
        retrained.add(modelName);
        logJobInfo(QUEUE_NAME, jobId, jobName, `[AUTO_RETRAIN] ${modelName}: retrain so'rovi yuborildi`);
      } catch (err) {
        logJobError(QUEUE_NAME, jobId, jobName,
          new Error(`[AUTO_RETRAIN] ${modelName}: retrain so'rovida xato: ${err instanceof Error ? err.message : String(err)}`));
      }
    }
  }
}

export function createMlPredictionWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const start = Date.now();
      logJobStart(QUEUE_NAME, job.id ?? '-', job.name);
      try {
        const result = await runBatchPredictions(job.id ?? '-', job.name);
        // T-494: ML alertlarni tekshir
        await checkMlAlerts(job.id ?? '-', job.name).catch(err =>
          logJobError(QUEUE_NAME, job.id ?? '-', 'checkMlAlerts', err),
        );
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
