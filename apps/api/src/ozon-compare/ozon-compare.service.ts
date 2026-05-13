import { Inject, Injectable, Logger, NotFoundException, BadGatewayException } from '@nestjs/common';
import { fetch } from 'undici';
import { createHash, randomUUID } from 'crypto';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../common/redis/redis.module';
import { PrismaService } from '../prisma/prisma.service';
import type {
  OzonCompareItem,
  OzonCompareResponse,
  OzonProductRaw,
  OzonWidgetState,
} from './ozon-compare.types';

const CACHE_TTL = 60 * 60 * 24; // 24 soat
const MANIFEST_CACHE_TTL = 60 * 60; // 1 soat
const BASE_URL = 'https://uz.ozon.com';
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

const BASE_HEADERS = {
  'User-Agent': BROWSER_UA,
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'x-o3-app-name': 'dweb_client',
  'x-o3-app-version': 'release_8-4-2026_5fc45f01',
  'sec-ch-ua': '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Dest': 'empty',
  'Accept-Language': 'ru,en-US;q=0.9,en;q=0.8,uz;q=0.7',
};

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

    this.logger.log(`Ozon search: "${title}"`);

    const manifestVersion = await this.getManifestVersion();
    const xcid = randomUUID().replace(/-/g, '');

    const searchUrl =
      `${BASE_URL}/api/entrypoint-api.bx/page/json/v2` +
      `?url=${encodeURIComponent(`/search/?text=${encodeURIComponent(title)}&from_global=true`)}`;

    let data: { widgetStates?: Record<string, string> };
    try {
      const res = await fetch(searchUrl, {
        headers: {
          ...BASE_HEADERS,
          'x-o3-parent-requestid': randomUUID().replace(/-/g, ''),
          'x-page-view-id': randomUUID(),
          ...(manifestVersion ? { 'x-o3-manifest-version': manifestVersion } : {}),
          Referer: `${BASE_URL}/search/?text=${encodeURIComponent(title)}&from_global=true`,
          Cookie: `xcid=${xcid}; __Secure-user-id=0; __Secure-ab-group=53`,
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      data = (await res.json()) as typeof data;
    } catch (err) {
      this.logger.error(`Ozon API xatosi: ${err}`);
      throw new BadGatewayException("Ozon bilan bog'lanishda xato");
    }

    const results = this.parseProducts(data.widgetStates ?? {});

    const response: OzonCompareResponse = { cached: false, totalCount: results.length, results };
    await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(response));
    return response;
  }

  private parseProducts(widgetStates: Record<string, string>): OzonCompareItem[] {
    const results: OzonCompareItem[] = [];

    for (const [key, rawJson] of Object.entries(widgetStates)) {
      // skuGrid — search results va recommendations, searchResultsV2 — asosiy qidiruv
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
      priceState?.priceV2?.price?.find((pr) => pr.textStyle === 'ORIGINAL_PRICE')?.text ??
      priceText;

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

  /** Ozon manifest versiyasini `uz.ozon.com` bosh sahifasidan olib Redis ga cache qiladi */
  private async getManifestVersion(): Promise<string> {
    const cacheKey = 'ozon:manifest-version';
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`${BASE_URL}/`, {
        headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html' },
        redirect: 'follow',
      });
      const version = res.headers.get('x-o3-manifest-version') ?? '';
      if (version) {
        await this.redis.setex(cacheKey, MANIFEST_CACHE_TTL, version);
        this.logger.log(`Ozon manifest version yangilandi: ${version.slice(0, 50)}...`);
        return version;
      }
    } catch (err) {
      this.logger.warn(`Manifest version olishda xato: ${err}`);
    }

    return '';
  }
}

function parseUzs(text: string): number {
  return parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
}
