import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';

const QUEUE_NAME = 'currency-update-queue';

// Fallback rates if CBU API is unavailable
const FALLBACK_RATES: Record<string, number> = { USD: 12900, CNY: 1780, EUR: 14200 };

async function fetchCbuRates(): Promise<Record<string, number>> {
  const res = await fetch('https://cbu.uz/arkhiv-kursov-valyut/json/');
  if (!res.ok) throw new Error(`CBU API returned ${res.status}`);
  const data = await res.json() as Array<{ Ccy: string; Rate: string }>;

  const wanted = new Set(['USD', 'CNY', 'EUR']);
  const result: Record<string, number> = {};
  for (const item of data) {
    if (wanted.has(item.Ccy)) {
      result[item.Ccy] = parseFloat(item.Rate);
    }
  }
  return result;
}

async function processCurrencyUpdate(jobId: string, jobName: string) {
  let rates: Record<string, number>;
  let source = 'cbu';

  try {
    rates = await fetchCbuRates();
  } catch (err) {
    logJobInfo(QUEUE_NAME, jobId, jobName, `CBU API failed, using fallback rates: ${err instanceof Error ? err.message : String(err)}`);
    rates = FALLBACK_RATES;
    source = 'fallback';
  }

  // Upsert each rate into DB
  const updated: string[] = [];
  for (const [fromCode, rate] of Object.entries(rates)) {
    if (!rate || isNaN(rate)) continue;
    await prisma.currencyRate.upsert({
      where: { from_code_to_code: { from_code: fromCode, to_code: 'UZS' } },
      update: { rate },
      create: { from_code: fromCode, to_code: 'UZS', rate },
    });
    updated.push(`${fromCode}=${rate}`);
  }

  return { source, updated };
}

export function createCurrencyUpdateWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const start = Date.now();
      logJobStart(QUEUE_NAME, job.id ?? '-', job.name);
      try {
        const result = await processCurrencyUpdate(job.id ?? '-', job.name);
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
