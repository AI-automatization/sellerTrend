import { Inject, Injectable, Logger, NotFoundException, BadGatewayException } from '@nestjs/common';
import { createHash } from 'crypto';
import { chromium } from 'playwright';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../common/redis/redis.module';
import { PrismaService } from '../prisma/prisma.service';
import type { OzonCompareItem, OzonCompareResponse, OzonProductRaw, OzonWidgetState } from './ozon-compare.types';

const CACHE_TTL = 60 * 60 * 24; // 24 soat
const BASE_URL = 'https://uz.ozon.com';
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

@Injectable()
export class OzonCompareService {
  private readonly logger = new Logger(OzonCompareService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async compareByProductId(productId: bigint, accountId: string): Promise<OzonCompareResponse> {
    const tracked = await this.prisma.trackedProduct.findFirst({
      where: { product_id: productId, account_id: accountId },
      select: { product: { select: { title: true } } },
    });

    if (!tracked?.product?.title) {
      throw new NotFoundException('Product topilmadi');
    }

    return this.searchByTitle(tracked.product.title);
  }

  async searchByTitle(title: string): Promise<OzonCompareResponse> {
    const cacheKey = `ozon:search:${createHash('md5').update(title).digest('hex')}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit: ${cacheKey}`);
      return { ...(JSON.parse(cached) as OzonCompareResponse), cached: true };
    }

    this.logger.log(`Ozon search (Playwright): "${title}"`);

    let results: OzonCompareItem[];
    try {
      results = await this.searchViaPlaywright(title);
    } catch (err) {
      this.logger.error(`Ozon qidiruvda xato: ${err}`);
      throw new BadGatewayException("Ozon bilan bog'lanishda xato yuz berdi. Keyinroq qayta urinib ko'ring.");
    }

    const response: OzonCompareResponse = { cached: false, totalCount: results.length, results };
    await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(response));
    return response;
  }

  private async searchViaPlaywright(title: string): Promise<OzonCompareItem[]> {
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
      ],
    });

    try {
      const context = await browser.newContext({
        userAgent: BROWSER_UA,
        locale: 'ru-RU',
        viewport: { width: 1280, height: 800 },
      });

      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      });

      const page = await context.newPage();

      let widgetStates: Record<string, string> = {};

      // Barcha entrypoint API calllarini ushlaymiz
      page.on('response', (response) => {
        if (response.url().includes('/api/entrypoint-api.bx/page/json/v2')) {
          response
            .json()
            .then((json: { widgetStates?: Record<string, string> }) => {
              if (json.widgetStates && Object.keys(json.widgetStates).length > 0) {
                widgetStates = json.widgetStates;
                this.logger.log(`Ozon widgetStates ushlandi: ${Object.keys(json.widgetStates).length} ta key`);
              }
            })
            .catch(() => undefined);
        }
      });

      await page.goto(
        `${BASE_URL}/search/?text=${encodeURIComponent(title)}&from_global=true`,
        { waitUntil: 'domcontentloaded', timeout: 30000 },
      );

      // Sahifa to'liq yuklanishini kutish
      await page.waitForTimeout(5000);

      if (Object.keys(widgetStates).length === 0) {
        // DOM dan mahsulotlarni o'qishga urinish (fallback)
        this.logger.warn('widgetStates bo\'sh, DOM fallback ishlatilmoqda');
        return await this.parseFromDom(page);
      }

      const results = this.parseProducts(widgetStates);
      this.logger.log(`Ozon search: ${results.length} ta mahsulot topildi`);
      return results;
    } finally {
      await browser.close();
    }
  }

  private async parseFromDom(page: import('playwright').Page): Promise<OzonCompareItem[]> {
    try {
      const selector = '[data-widget="searchResultsV2"] .tile-root, [data-widget="skuGrid"] .tile-root';
      const items = await page.$$eval(selector, (cards) =>
        cards.slice(0, 30).map((card) => ({
          link: card.querySelector('a')?.getAttribute('href') ?? '',
          title: card.querySelector('[class*="name"], [class*="title"]')?.textContent?.trim() ?? '',
          price: card.querySelector('[class*="price"]')?.textContent?.trim() ?? '',
          img: card.querySelector('img')?.getAttribute('src') ?? '',
        })),
      );

      return items
        .filter((i) => i.link && i.title)
        .map((i, idx) => ({
          platform: 'ozon' as const,
          productId: String(idx),
          title: i.title,
          priceUzs: parseInt(i.price.replace(/[^0-9]/g, ''), 10) || 0,
          originalPriceUzs: parseInt(i.price.replace(/[^0-9]/g, ''), 10) || 0,
          rating: 0,
          feedbacks: 0,
          url: `${BASE_URL}${i.link.split('?')[0]}`,
          image: i.img,
        }));
    } catch {
      return [];
    }
  }

  private parseProducts(widgetStates: Record<string, string>): OzonCompareItem[] {
    const results: OzonCompareItem[] = [];

    for (const [key, rawJson] of Object.entries(widgetStates)) {
      if (!key.startsWith('skuGrid-') && !key.startsWith('searchResultsV2-')) continue;

      let widget: OzonWidgetState;
      try {
        widget = JSON.parse(rawJson) as OzonWidgetState;
      } catch {
        continue;
      }

      for (const p of widget.productContainer?.products ?? []) {
        const item = this.extractProduct(p);
        if (item) results.push(item);
      }
    }

    return results;
  }

  private extractProduct(p: OzonProductRaw): OzonCompareItem | null {
    if (!p.skuId || !p.link) return null;

    const image = p.items?.find((i) => i.type === 'image')?.image?.link ?? '';
    const state = p.state ?? [];

    const priceState = state.find((s) => s.type === 'priceV2');
    const priceText =
      priceState?.priceV2?.price?.find((pr) => pr.textStyle === 'PRICE')?.text ?? '';
    const originalText =
      priceState?.priceV2?.price?.find((pr) => pr.textStyle === 'ORIGINAL_PRICE')?.text ?? priceText;

    const titleState = state.find((s) => s.type === 'textAtom' && s.id === 'name');
    const title = titleState?.textAtom?.text ?? p.alt ?? '';

    const labelList = state.find((s) => s.type === 'labelList')?.labelList?.items ?? [];
    const rating = parseFloat(labelList[0]?.title ?? '0') || 0;
    const feedbacks = parseUzs(labelList[1]?.title ?? '0');

    return {
      platform: 'ozon',
      productId: p.skuId,
      title,
      priceUzs: parseUzs(priceText),
      originalPriceUzs: parseUzs(originalText),
      rating,
      feedbacks,
      url: `${BASE_URL}${p.link.split('?')[0]}`,
      image,
    };
  }
}

function parseUzs(text: string): number {
  return parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
}
