import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { fetch } from 'undici';
import { createHash } from 'crypto';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../common/redis/redis.module';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AlibabOffer,
  AlibabSearchResponse,
  AlibabUploadResponse,
  ChinaCompareItem,
  ChinaCompareResponse,
} from './china-compare.types';

const CACHE_TTL = 60 * 60 * 48; // 48 soat
const COOKIE_TTL = 60 * 30; // 30 daqiqa
const ALIBABA_BASE = 'https://www.alibaba.com';
const COOKIE_CACHE_KEY = 'china:alibaba:cookies';

const BASE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
  Referer: 'https://www.alibaba.com/',
  Origin: 'https://www.alibaba.com',
};

@Injectable()
export class ChinaCompareService {
  private readonly logger = new Logger(ChinaCompareService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async compareByProductId(productId: bigint, accountId: string): Promise<ChinaCompareResponse> {
    const tracked = await this.prisma.trackedProduct.findFirst({
      where: { product_id: productId, account_id: accountId },
      select: { product: { select: { photo_url: true } } },
    });

    if (!tracked?.product?.photo_url) {
      throw new NotFoundException('Product topilmadi yoki rasmi yo`q');
    }

    return this.compareByImageUrl(tracked.product.photo_url);
  }

  async compareByImageUrl(imageUrl: string): Promise<ChinaCompareResponse> {
    const cacheKey = `china:visual:${createHash('md5').update(imageUrl).digest('hex')}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit: ${cacheKey}`);
      return { ...(JSON.parse(cached) as ChinaCompareResponse), cached: true };
    }

    this.logger.log(`Alibaba visual search: ${imageUrl}`);

    const imagePath = await this.uploadImage(imageUrl);
    const offers = await this.fetchOffers(imagePath);
    const results = this.mapOffers(offers);

    const response: ChinaCompareResponse = {
      cached: false,
      totalCount: offers.length,
      results,
    };

    await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(response));

    return response;
  }

  private async getSessionCookies(): Promise<string> {
    const cached = await this.redis.get(COOKIE_CACHE_KEY);
    if (cached) return cached;

    const res = await fetch(`${ALIBABA_BASE}/`, {
      headers: {
        'User-Agent': BASE_HEADERS['User-Agent'],
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': BASE_HEADERS['Accept-Language'],
      },
      redirect: 'follow',
    });

    const setCookies = res.headers.getSetCookie?.() ?? [];
    const cookieStr = setCookies.map((c) => c.split(';')[0]).join('; ');

    if (cookieStr) {
      await this.redis.setex(COOKIE_CACHE_KEY, COOKIE_TTL, cookieStr);
      this.logger.log(`Alibaba session cookies yangilandi`);
    }

    return cookieStr;
  }

  private async uploadImage(imageUrl: string): Promise<string> {
    const cookies = await this.getSessionCookies();

    // Rasmni yuklab olamiz
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      throw new Error(`Rasm yuklab bo'lmadi: ${imgRes.status}`);
    }
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg';

    // Multipart form-data — pictureBase maydoni base64 string sifatida yuboriladi
    const base64Img = buffer.toString('base64');
    const boundary = `----WebKitFormBoundary${Date.now()}`;
    const CRLF = '\r\n';

    const bodyStr = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="pictureBase"`,
      '',
      base64Img,
      `--${boundary}--`,
      '',
    ].join(CRLF);

    const body = Buffer.from(bodyStr, 'utf8');
    void contentType; // faqat base64 string kerak, Content-Type shart emas

    const res = await fetch(`${ALIBABA_BASE}/search/api/imageTextSearchRegions`, {
      method: 'POST',
      headers: {
        ...BASE_HEADERS,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(body.length),
        Referer: 'https://www.alibaba.com/trade/search',
        Cookie: cookies,
      },
      body,
    });

    if (!res.ok) {
      throw new Error(`Alibaba upload xatosi: ${res.status}`);
    }

    const raw = await res.text();
    this.logger.log(`Alibaba upload response: ${raw.substring(0, 200)}`);

    let data: AlibabUploadResponse;
    try {
      data = JSON.parse(raw) as AlibabUploadResponse;
    } catch {
      throw new Error(`Alibaba upload JSON parse xatosi: ${raw.substring(0, 100)}`);
    }

    const imagePath = data.model?.imagePath;
    if (!imagePath) {
      throw new Error(`Alibaba imagePath yo'q: ${raw.substring(0, 200)}`);
    }

    this.logger.log(`Alibaba imagePath: ${imagePath}`);
    return imagePath;
  }

  private async fetchOffers(imagePath: string): Promise<AlibabOffer[]> {
    const cookies = await this.getSessionCookies();

    const url = new URL(`${ALIBABA_BASE}/search/api/imageTextSearch`);
    url.searchParams.set('imagePath', imagePath);
    url.searchParams.set('page', '1');
    url.searchParams.set('pageSize', '48');
    url.searchParams.set('currency', 'USD');
    url.searchParams.set('language', 'en_US');

    const res = await fetch(url.toString(), {
      headers: { ...BASE_HEADERS, Cookie: cookies },
    });

    if (!res.ok) {
      throw new Error(`Alibaba search xatosi: ${res.status}`);
    }

    const raw = await res.text();
    this.logger.log(`Alibaba search response (200 chars): ${raw.substring(0, 200)}`);

    let data: AlibabSearchResponse;
    try {
      data = JSON.parse(raw) as AlibabSearchResponse;
    } catch {
      throw new Error(`Alibaba search JSON parse xatosi: ${raw.substring(0, 100)}`);
    }

    if (!data.success || !data.model?.offers?.length) {
      this.logger.warn('Alibaba natija qaytarmadi');
      return [];
    }

    this.logger.log(
      `Alibaba: ${data.model.offers.length} ta natija (jami: ${data.model.paginationData?.totalCount ?? '?'})`,
    );

    return data.model.offers;
  }

  private mapOffers(offers: AlibabOffer[]): ChinaCompareItem[] {
    return offers.map((o) => ({
      platform: 'alibaba' as const,
      productId: o.productId,
      title: o.title,
      price: o.price,
      moq: o.moq,
      supplier: o.companyName,
      country: o.countryCode,
      url: o.productUrl.startsWith('//') ? `https:${o.productUrl}` : o.productUrl,
      image: o.multiImage[0] ?? '',
      reviewScore: o.reviewScore ?? '',
      reviewCount: o.reviewCount ?? '',
      soldOrder: o.soldOrder ?? '',
    }));
  }
}
