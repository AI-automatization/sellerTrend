import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import type { CategoryDiscoveryJobData } from '@uzum/types';
import { calculateScore, getSupplyPressure, parseWeeklyBought, sleep } from '@uzum/utils';

const BASE_URL = 'https://graphql.uzum.uz/';
const HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Origin: 'https://uzum.uz',
  Referer: 'https://uzum.uz/',
};

const MAKE_SEARCH_QUERY = `
  query makeSearch($queryInput: MakeSearchQueryInput!) {
    makeSearch(query: $queryInput) {
      items { catalogCard { ... on SkuGroupCard { __typename id productId ordersQuantity feedbackQuantity rating minSellPrice title buyingOptions { defaultSkuId deliveryOptions { stockType } } } } }
      total
    }
  }
`;

async function fetchPage(categoryId: number, page: number) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      operationName: 'makeSearch',
      query: MAKE_SEARCH_QUERY,
      variables: {
        queryInput: {
          categoryId,
          pagination: { offset: page * 48, limit: 48 },
          showAdultContent: 'HIDE',
          filters: [],
          sort: 'BY_RELEVANCE_DESC',
        },
      },
    }),
  });

  if (res.status === 429) {
    await sleep(5000);
    return fetchPage(categoryId, page);
  }

  const data = await res.json();
  return data?.data?.makeSearch ?? { items: [], total: 0 };
}

async function processDiscovery(data: CategoryDiscoveryJobData) {
  const { categoryId, runId } = data;

  // Mark run as RUNNING
  await prisma.categoryRun.update({
    where: { id: runId },
    data: { status: 'RUNNING', started_at: new Date() },
  });

  // 1. Fetch first page to get total
  const firstPage = await fetchPage(categoryId, 0);
  const total = firstPage.total ?? 0;
  const totalPages = Math.ceil(total / 48);

  await prisma.categoryRun.update({
    where: { id: runId },
    data: { total_products: total },
  });

  const allItems: any[] = [...firstPage.items];

  // 2. Fetch remaining pages (rate limit: 1 req/sec)
  for (let page = 1; page < Math.min(totalPages, 10); page++) {
    await sleep(1000);
    const pageData = await fetchPage(categoryId, page);
    allItems.push(...pageData.items);

    await prisma.categoryRun.update({
      where: { id: runId },
      data: { processed: page * 48 },
    });
  }

  // 3. Score all items
  const scored = allItems
    .filter((item) => item.catalogCard?.__typename === 'SkuGroupCard')
    .map((item) => {
      const card = item.catalogCard;
      const stockType = card.buyingOptions?.deliveryOptions?.stockType ?? 'FBS';
      const score = calculateScore({
        weekly_bought: null, // fetching detail is too slow for bulk discovery
        orders_quantity: card.ordersQuantity ?? 0,
        rating: card.rating ?? 0,
        supply_pressure: getSupplyPressure(stockType),
      });
      return { card, score };
    })
    .sort((a, b) => b.score - a.score);

  // 4. Take top 20 winners
  const top20 = scored.slice(0, 20);

  for (let i = 0; i < top20.length; i++) {
    const { card, score } = top20[i];

    // Upsert product
    await prisma.product.upsert({
      where: { id: BigInt(card.productId) },
      update: { title: card.title, rating: card.rating, orders_quantity: BigInt(card.ordersQuantity ?? 0) },
      create: { id: BigInt(card.productId), title: card.title, rating: card.rating, orders_quantity: BigInt(card.ordersQuantity ?? 0) },
    });

    await prisma.categoryWinner.create({
      data: {
        run_id: runId,
        product_id: BigInt(card.productId),
        score,
        rank: i + 1,
        orders_quantity: BigInt(card.ordersQuantity ?? 0),
        sell_price: card.minSellPrice ? BigInt(card.minSellPrice) : null,
      },
    });
  }

  // 5. Mark done
  await prisma.categoryRun.update({
    where: { id: runId },
    data: { status: 'DONE', finished_at: new Date(), processed: allItems.length },
  });

  return { total, processed: allItems.length, winners: top20.length };
}

export function createDiscoveryWorker() {
  return new Worker<CategoryDiscoveryJobData>(
    'discovery-queue',
    async (job: Job<CategoryDiscoveryJobData>) => {
      console.log(`[discovery] Processing run ${job.data.runId}, category ${job.data.categoryId}`);
      try {
        const result = await processDiscovery(job.data);
        console.log(`[discovery] Done:`, result);
        return result;
      } catch (err) {
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
