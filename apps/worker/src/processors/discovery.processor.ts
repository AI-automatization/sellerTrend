import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import type { CategoryDiscoveryJobData } from '@uzum/types';
import { calculateScore, getSupplyPressure, sleep } from '@uzum/utils';

const REST_BASE = 'https://api.uzum.uz/api/v2';
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Origin: 'https://uzum.uz',
  Referer: 'https://uzum.uz/',
  Accept: 'application/json',
};

async function fetchCategoryPage(
  categoryId: number,
  page: number,
): Promise<{ items: any[]; total: number }> {
  // Correct REST endpoint for category product listing
  const url = `${REST_BASE}/main/search/product?categoryId=${categoryId}&size=48&page=${page}&sort=ORDER_COUNT_DESC&showAdultContent=HIDE`;
  const res = await fetch(url, { headers: HEADERS });

  if (res.status === 429) {
    await sleep(5000);
    return fetchCategoryPage(categoryId, page);
  }

  if (!res.ok) throw new Error(`HTTP ${res.status} for category ${categoryId}`);

  const data = (await res.json()) as any;
  const payload = data?.payload ?? data;
  const items: any[] = payload?.products ?? payload?.data?.products ?? [];
  const total: number = payload?.total ?? payload?.data?.total ?? 0;

  return { items, total };
}

async function processDiscovery(data: CategoryDiscoveryJobData) {
  const { categoryId, runId } = data;

  await prisma.categoryRun.update({
    where: { id: runId },
    data: { status: 'RUNNING', started_at: new Date() },
  });

  // Fetch first page to get total
  const firstPage = await fetchCategoryPage(categoryId, 0);
  const total = firstPage.total;
  const totalPages = Math.min(Math.ceil(total / 48), 10); // max 10 pages (480 products)

  await prisma.categoryRun.update({
    where: { id: runId },
    data: { total_products: total },
  });

  const allItems: any[] = [...firstPage.items];

  // Fetch remaining pages with rate limiting
  for (let page = 1; page < totalPages; page++) {
    await sleep(1000); // 1 req/sec
    const pageData = await fetchCategoryPage(categoryId, page);
    allItems.push(...pageData.items);
    await prisma.categoryRun.update({
      where: { id: runId },
      data: { processed: page * 48 },
    });
  }

  // Score all items
  const scored = allItems
    .filter((item: any) => item?.id && item?.ordersAmount != null)
    .map((item: any) => {
      // REST API fields: id, title, rating, ordersAmount, rOrdersAmount, skuList
      const stockType: 'FBO' | 'FBS' =
        item?.skuList?.[0]?.stock?.type === 'FBO' ? 'FBO' : 'FBS';
      const score = calculateScore({
        weekly_bought: item.rOrdersAmount ?? null,
        orders_quantity: item.ordersAmount ?? 0,
        rating: item.rating ?? 0,
        supply_pressure: getSupplyPressure(stockType),
      });
      return { item, score, stockType };
    })
    .sort((a, b) => b.score - a.score);

  const top20 = scored.slice(0, 20);

  for (let i = 0; i < top20.length; i++) {
    const { item, score } = top20[i];

    const productId = BigInt(item.id);
    const sellPrice = item.skuList?.[0]?.purchasePrice
      ? BigInt(item.skuList[0].purchasePrice)
      : null;

    await prisma.product.upsert({
      where: { id: productId },
      update: {
        title: item.title ?? item.localizableTitle?.ru ?? '',
        rating: item.rating,
        orders_quantity: BigInt(item.ordersAmount ?? 0),
      },
      create: {
        id: productId,
        title: item.title ?? item.localizableTitle?.ru ?? '',
        rating: item.rating,
        orders_quantity: BigInt(item.ordersAmount ?? 0),
      },
    });

    await prisma.categoryWinner.create({
      data: {
        run_id: runId,
        product_id: productId,
        score,
        rank: i + 1,
        weekly_bought: item.rOrdersAmount ?? null,
        orders_quantity: BigInt(item.ordersAmount ?? 0),
        sell_price: sellPrice,
      },
    });
  }

  await prisma.categoryRun.update({
    where: { id: runId },
    data: {
      status: 'DONE',
      finished_at: new Date(),
      processed: allItems.length,
    },
  });

  return { total, processed: allItems.length, winners: top20.length };
}

export function createDiscoveryWorker() {
  return new Worker<CategoryDiscoveryJobData>(
    'discovery-queue',
    async (job: Job<CategoryDiscoveryJobData>) => {
      console.log(
        `[discovery] Run ${job.data.runId}, category ${job.data.categoryId}`,
      );
      try {
        const result = await processDiscovery(job.data);
        console.log(`[discovery] Done:`, result);
        return result;
      } catch (err) {
        console.error(`[discovery] Failed:`, err);
        await prisma.categoryRun.update({
          where: { id: job.data.runId },
          data: { status: 'FAILED', finished_at: new Date() },
        });
        throw err;
      }
    },
    { ...redisConnection, concurrency: 2 },
  );
}
