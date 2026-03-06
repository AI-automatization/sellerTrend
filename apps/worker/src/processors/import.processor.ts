import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { parseUzumProductId, calculateScore, getSupplyPressure, calcWeeklyBought, weeklyBoughtWithFallback, sleep, SNAPSHOT_MIN_GAP_MS } from '@uzum/utils';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';
import { fetchUzumProductRaw } from './uzum-scraper';

interface ImportBatchJobData {
  accountId: string;
  urls: string[];
}

async function processUrl(url: string, accountId: string, jobId: string, jobName: string) {
  const productId = parseUzumProductId(url);
  if (!productId) {
    logJobInfo('import-batch', jobId, jobName, `Skip invalid URL: ${url}`);
    return null;
  }

  try {
    const detail = await fetchUzumProductRaw(productId);
    if (!detail) {
      logJobInfo('import-batch', jobId, jobName, `API failed for product ${productId}`);
      return null;
    }

    const shopData = detail.seller || detail.shop;
    const shopId = shopData?.id ? BigInt(shopData.id) : null;

    // Upsert shop
    if (shopId && shopData) {
      const shopOrders = shopData.orders ?? shopData.ordersCount ?? null;
      await prisma.shop.upsert({
        where: { id: shopId },
        update: {
          title: shopData.title || shopData.name,
          rating: shopData.rating ?? null,
          orders_quantity: shopOrders ? BigInt(shopOrders) : null,
        },
        create: {
          id: shopId,
          title: shopData.title || shopData.name,
          rating: shopData.rating ?? null,
          orders_quantity: shopOrders ? BigInt(shopOrders) : null,
        },
      });
    }

    // Upsert product
    const title =
      detail.localizableTitle?.ru ||
      detail.title ||
      `Product ${productId}`;
    const titleUz: string | null = detail.localizableTitle?.uz ?? null;
    const pid = BigInt(productId);
    const totalAvailable = detail.totalAvailableAmount != null
      ? BigInt(detail.totalAvailableAmount)
      : null;

    // Category path: root → leaf (nested parent chain)
    const categoryPath: Array<{ id: number; title: string }> = [];
    {
      let node: { id: number; title: string; parent?: unknown } | null | undefined = detail.category;
      while (node) {
        categoryPath.unshift({ id: node.id, title: (node as { title: string }).title });
        node = (node as { parent?: typeof node }).parent ?? null;
      }
    }

    // Photos: extract high-res URLs
    const photoSizes = ['720', '800', '540', '480', '240'];
    const photoUrls: string[] = (detail.photos ?? []).map((p) => {
      for (const s of photoSizes) {
        const url = p.photo?.[s]?.high;
        if (url) return url;
      }
      const first = Object.values(p.photo ?? {})[0];
      return first?.high ?? null;
    }).filter((u): u is string => u !== null);
    const mainPhotoUrl = photoUrls[0] ?? null;

    const badges = detail.badges ?? [];
    const productData = {
      title,
      title_uz: titleUz,
      category_path: categoryPath.length > 0 ? categoryPath : undefined,
      badges: badges.length > 0 ? badges : undefined,
      photo_url: mainPhotoUrl ?? undefined,
      photo_urls: photoUrls,
      rating: detail.rating ?? null,
      feedback_quantity: detail.reviewsAmount ?? 0,
      orders_quantity: detail.ordersAmount ? BigInt(detail.ordersAmount) : BigInt(0),
      total_available_amount: totalAvailable,
      shop_id: shopId,
      category_id: detail.category?.id ? BigInt(detail.category.id) : null,
    };

    await prisma.product.upsert({
      where: { id: pid },
      update: productData,
      create: { id: pid, ...productData },
    });

    // Centralized weekly_bought: prefer stored scraped, fallback to calculated (T-207)
    const currentOrders = detail.ordersAmount ?? 0;

    const recentSnapshots = await prisma.productSnapshot.findMany({
      where: { product_id: pid },
      orderBy: { snapshot_at: 'desc' },
      take: 20,
      select: { orders_quantity: true, weekly_bought: true, weekly_bought_source: true, snapshot_at: true },
    });

    // Dedup guard (T-267): skip snapshot if last one is < 5 min old
    const lastSnap = recentSnapshots[0];
    if (lastSnap && Date.now() - lastSnap.snapshot_at.getTime() < SNAPSHOT_MIN_GAP_MS) {
      logJobInfo('import-batch', jobId, jobName, `Snapshot dedup: product ${productId}, skip — last snap ${Math.round((Date.now() - lastSnap.snapshot_at.getTime()) / 1000)}s ago`);
    } else {
      // Prefer last scraped weekly_bought; fallback to calculation (transitional)
      let weeklyBought: number | null = null;
      let wbSource = 'calculated';
      let wbConfidence = 0.30;

      const lastScraped = recentSnapshots.find((s) => s.weekly_bought_source === 'scraped' && s.weekly_bought != null);
      if (lastScraped) {
        weeklyBought = lastScraped.weekly_bought;
        wbSource = 'stored_scraped';
        wbConfidence = 0.50;
      } else {
        const rawWeeklyBought = calcWeeklyBought(recentSnapshots, currentOrders);
        weeklyBought = weeklyBoughtWithFallback(rawWeeklyBought, recentSnapshots);
        wbConfidence = recentSnapshots.length >= 7 ? 0.50 : 0.30;
      }

      const stockType = detail.skuList?.[0]?.stock?.type;
      const supplyPressure = getSupplyPressure(
        stockType === 'FBO' ? 'FBO' : 'FBS',
      );
      const score = calculateScore({
        weekly_bought: weeklyBought,
        orders_quantity: currentOrders,
        rating: detail.rating ?? 0,
        supply_pressure: supplyPressure,
      });

      try {
        await prisma.productSnapshot.create({
          data: {
            product_id: pid,
            orders_quantity: currentOrders ? BigInt(currentOrders) : null,
            weekly_bought: weeklyBought,
            weekly_bought_source: wbSource,
            weekly_bought_confidence: wbConfidence,
            rating: detail.rating ?? null,
            feedback_quantity: detail.reviewsAmount ?? 0,
            score,
          },
        });
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
          logJobInfo('import-queue', jobId, jobName, `Snapshot dedup: product ${pid} already has snapshot in this 5-min bucket`);
        } else {
          throw err;
        }
      }
    }

    // Enqueue immediate Playwright scrape (fire-and-forget)
    try {
      const { weeklyScrapeQueue } = await import('../jobs/weekly-scrape.job');
      await weeklyScrapeQueue.add('immediate-scrape', { mode: 'single', productId: productId.toString() }, {
        attempts: 1,
        removeOnComplete: 100,
        removeOnFail: 50,
      });
    } catch { /* queue unavailable — non-critical */ }

    // Track product
    await prisma.trackedProduct.upsert({
      where: {
        account_id_product_id: {
          account_id: accountId,
          product_id: pid,
        },
      },
      update: { is_active: true },
      create: {
        account_id: accountId,
        product_id: pid,
      },
    });

    return productId;
  } catch (err: unknown) {
    logJobInfo('import-batch', jobId, jobName, `Error for ${url}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export function createImportWorker() {
  const worker = new Worker(
    'import-batch',
    async (job: Job<ImportBatchJobData>) => {
      const { accountId, urls } = job.data;
      const start = Date.now();
      logJobStart('import-batch', job.id ?? '-', job.name, { accountId, urlCount: urls.length });

      try {
        let success = 0;
        let failed = 0;

        // Process 5 at a time with rate limiting
        const BATCH_SIZE = 5;
        for (let i = 0; i < urls.length; i += BATCH_SIZE) {
          const batch = urls.slice(i, i + BATCH_SIZE);
          const results = await Promise.all(
            batch.map((url) => processUrl(url, accountId, job.id ?? '-', job.name)),
          );
          success += results.filter(Boolean).length;
          failed += results.filter((r) => r === null).length;

          if (i + BATCH_SIZE < urls.length) {
            await sleep(1000); // rate limit
          }
        }

        const result = { success, failed, total: urls.length };
        logJobDone('import-batch', job.id ?? '-', job.name, Date.now() - start, result);
        return result;
      } catch (err) {
        logJobError('import-batch', job.id ?? '-', job.name, err, Date.now() - start);
        throw err;
      }
    },
    { ...redisConnection, concurrency: 1 },
  );

  worker.on('error', (err) => logJobError('import-batch', '-', 'worker', err));
  worker.on('failed', (job, err) => logJobError('import-batch', job?.id ?? '-', job?.name ?? '-', err));
  worker.on('stalled', (jobId) => console.error(`[import-batch] stalled: ${jobId}`));

  return worker;
}
