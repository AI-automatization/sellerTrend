import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { parseUzumProductId, calculateScore, getSupplyPressure, sleep } from '@uzum/utils';

interface ImportBatchJobData {
  accountId: string;
  urls: string[];
}

const UZUM_API = 'https://api.uzum.uz/api/v2';
const HEADERS = {
  'Accept-Language': 'ru-RU',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
};

async function fetchProductDetail(productId: number) {
  const resp = await fetch(`${UZUM_API}/product/${productId}`, {
    headers: HEADERS,
  });
  if (!resp.ok) return null;
  const json = (await resp.json()) as any;
  return json?.payload?.data ?? null;
}

async function processUrl(url: string, accountId: string) {
  const productId = parseUzumProductId(url);
  if (!productId) {
    console.log(`[import] Skip invalid URL: ${url}`);
    return null;
  }

  try {
    const detail = await fetchProductDetail(productId);
    if (!detail) {
      console.log(`[import] API failed for product ${productId}`);
      return null;
    }

    const shopData = detail.seller || detail.shop;
    const shopId = shopData?.id ? BigInt(shopData.id) : null;

    // Upsert shop
    if (shopId && shopData) {
      await prisma.shop.upsert({
        where: { id: shopId },
        update: {
          title: shopData.title || shopData.name,
          rating: shopData.rating ?? null,
          orders_quantity: shopData.ordersCount
            ? BigInt(shopData.ordersCount)
            : null,
        },
        create: {
          id: shopId,
          title: shopData.title || shopData.name,
          rating: shopData.rating ?? null,
          orders_quantity: shopData.ordersCount
            ? BigInt(shopData.ordersCount)
            : null,
        },
      });
    }

    // Upsert product
    const title =
      detail.localizableTitle?.ru ||
      detail.title ||
      `Product ${productId}`;
    const pid = BigInt(productId);

    await prisma.product.upsert({
      where: { id: pid },
      update: {
        title,
        rating: detail.rating ?? null,
        feedback_quantity: detail.feedbackQuantity ?? 0,
        orders_quantity: detail.ordersQuantity
          ? BigInt(detail.ordersQuantity)
          : BigInt(0),
        shop_id: shopId,
        category_id: detail.category?.id
          ? BigInt(detail.category.id)
          : null,
      },
      create: {
        id: pid,
        title,
        rating: detail.rating ?? null,
        feedback_quantity: detail.feedbackQuantity ?? 0,
        orders_quantity: detail.ordersQuantity
          ? BigInt(detail.ordersQuantity)
          : BigInt(0),
        shop_id: shopId,
        category_id: detail.category?.id
          ? BigInt(detail.category.id)
          : null,
      },
    });

    // Create snapshot
    const weeklyBought = detail.rOrdersAmount ?? 0;
    const stockType = detail.skuList?.[0]?.deliveryOptions?.[0]?.stockType;
    const supplyPressure = getSupplyPressure(
      stockType === 'FBO' ? 'FBO' : 'FBS',
    );
    const score = calculateScore({
      weekly_bought: weeklyBought,
      orders_quantity: detail.ordersQuantity ?? 0,
      rating: detail.rating ?? 0,
      supply_pressure: supplyPressure,
    });

    await prisma.productSnapshot.create({
      data: {
        product_id: pid,
        orders_quantity: detail.ordersQuantity
          ? BigInt(detail.ordersQuantity)
          : null,
        weekly_bought: weeklyBought,
        rating: detail.rating ?? null,
        score,
      },
    });

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
  } catch (err: any) {
    console.error(`[import] Error for ${url}: ${err.message}`);
    return null;
  }
}

export function createImportWorker() {
  return new Worker(
    'import-batch',
    async (job: Job<ImportBatchJobData>) => {
      const { accountId, urls } = job.data;
      console.log(
        `[import] Processing batch: ${urls.length} URLs for account ${accountId}`,
      );

      let success = 0;
      let failed = 0;

      // Process 5 at a time with rate limiting
      const BATCH_SIZE = 5;
      for (let i = 0; i < urls.length; i += BATCH_SIZE) {
        const batch = urls.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map((url) => processUrl(url, accountId)),
        );
        success += results.filter(Boolean).length;
        failed += results.filter((r) => r === null).length;

        if (i + BATCH_SIZE < urls.length) {
          await sleep(1000); // rate limit
        }
      }

      console.log(`[import] Done: ${success} success, ${failed} failed`);
      return { success, failed, total: urls.length };
    },
    { ...redisConnection, concurrency: 1 },
  );
}
