import { Inject, Injectable, Logger, NotFoundException, BadGatewayException } from '@nestjs/common';
import { fetch } from 'undici';
import { createHash, randomUUID } from 'crypto';
import { execFile } from 'child_process';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../common/redis/redis.module';
import { PrismaService } from '../prisma/prisma.service';
import type {
  WbUploadResponse,
  WbCardsResponse,
  WbCompareItem,
  WbCompareResponse,
} from './wb-compare.types';

const CACHE_TTL = 60 * 60 * 24; // 24 soat
const WB_CATEGORY_URL = 'https://category-detection.wildberries.ru/api/triton_predict_sync';
const WB_UPLOAD_BASE = 'https://search-by-photo.wb.ru/uploadsearch';
const WB_CARDS_BASE = 'https://card.wb.ru/cards/v2/detail';
// Global WB Russia catalog (dest=-1257786 = Moscow)
// u-card.wb.ru was UZ-only (dest=494) and returned empty for Russia-only products
const WB_DEST = '-1257786';
// RUB → UZS approximate rate (update if drift > 10%)
const RUB_TO_UZS = 155;

const BASE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
  Accept: '*/*',
  'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8,uz;q=0.7',
  Origin: 'https://www.wildberries.uz',
  Referer: 'https://www.wildberries.uz/search/image',
  'sec-ch-ua': '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-site': 'cross-site',
  'sec-fetch-mode': 'cors',
  'sec-fetch-dest': 'empty',
};

// nmId → basket server raqami
function getBasketNum(vol: number): string {
  if (vol <= 143) return '01';
  if (vol <= 287) return '02';
  if (vol <= 431) return '03';
  if (vol <= 719) return '04';
  if (vol <= 1007) return '05';
  if (vol <= 1061) return '06';
  if (vol <= 1115) return '07';
  if (vol <= 1169) return '08';
  if (vol <= 1313) return '09';
  if (vol <= 1461) return '10';
  if (vol <= 1609) return '11';
  if (vol <= 1757) return '12';
  if (vol <= 1905) return '13';
  if (vol <= 2053) return '14';
  if (vol <= 2201) return '15';
  if (vol <= 2349) return '16';
  if (vol <= 2497) return '17';
  if (vol <= 2649) return '18';
  return '19';
}

function getWbImageUrl(nmId: number): string {
  const vol = Math.floor(nmId / 100000);
  const part = Math.floor(nmId / 1000);
  const basket = getBasketNum(vol);
  return `https://basket-${basket}.wbbasket.ru/vol${vol}/part${part}/${nmId}/images/big/1.webp`;
}

function getWbProductUrl(nmId: number): string {
  // Use wildberries.ru — products from visual search come from global/Russia catalog
  return `https://www.wildberries.ru/catalog/${nmId}/detail.aspx`;
}

@Injectable()
export class WbCompareService {
  private readonly logger = new Logger(WbCompareService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async compareByProductId(productId: bigint, accountId: string): Promise<WbCompareResponse> {
    const tracked = await this.prisma.trackedProduct.findFirst({
      where: { product_id: productId, account_id: accountId },
      select: { product: { select: { photo_url: true } } },
    });

    if (!tracked?.product?.photo_url) {
      throw new NotFoundException('Product topilmadi yoki rasmi yo`q');
    }

    return this.compareByImageUrl(tracked.product.photo_url);
  }

  async compareByImageUrl(imageUrl: string): Promise<WbCompareResponse> {
    const cacheKey = `wb:visual:${createHash('md5').update(imageUrl).digest('hex')}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit: ${cacheKey}`);
      return { ...(JSON.parse(cached) as WbCompareResponse), cached: true };
    }

    this.logger.log(`WB visual search: ${imageUrl}`);

    let nmIds: number[];
    try {
      nmIds = await this.uploadImage(imageUrl);
    } catch (err) {
      this.logger.error(`WB rasm yuklashda xato: ${err}`);
      throw new BadGatewayException('Wildberries bilan bog\'lanishda xato yuz berdi. Keyinroq qayta urinib ko\'ring.');
    }

    if (nmIds.length === 0) {
      const empty: WbCompareResponse = { cached: false, totalCount: 0, results: [] };
      await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(empty));
      return empty;
    }

    let results: WbCompareItem[];
    try {
      results = await this.fetchCards(nmIds);
    } catch (err) {
      this.logger.error(`WB cards olishda xato: ${err}`);
      throw new BadGatewayException('Wildberries qidiruvida xato yuz berdi. Keyinroq qayta urinib ko\'ring.');
    }

    const response: WbCompareResponse = {
      cached: false,
      totalCount: results.length,
      results,
    };

    await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(response));
    return response;
  }

  private buildMultipart(buffer: Buffer, fieldName: string, filename: string, mimeType: string): { body: Buffer; boundary: string } {
    const boundary = `----WebKitFormBoundary${randomUUID().replace(/-/g, '').substring(0, 16)}`;
    const CRLF = '\r\n';
    const bodyParts: Buffer[] = [
      Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"${CRLF}Content-Type: ${mimeType}${CRLF}${CRLF}`, 'utf8'),
      buffer,
      Buffer.from(`${CRLF}--${boundary}--${CRLF}`, 'utf8'),
    ];
    return { body: Buffer.concat(bodyParts), boundary };
  }

  private async uploadImage(imageUrl: string): Promise<number[]> {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      throw new Error(`Rasm yuklab bo'lmadi: ${imgRes.status}`);
    }
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const queryId = `qidsite_${createHash('md5').update(String(Date.now())).digest('hex')}_${Date.now()}`;

    // Step 1: category-detection — label aniqlash
    let labelList = '';
    try {
      const { body: catBody, boundary: catBoundary } = this.buildMultipart(buffer, 'image_file', 'image', 'image/jpeg');
      const catRes = await fetch(WB_CATEGORY_URL, {
        method: 'POST',
        headers: {
          ...BASE_HEADERS,
          'Content-Type': `multipart/form-data; boundary=${catBoundary}`,
          'Content-Length': String(catBody.length),
          'query_id': queryId,
        },
        body: catBody,
      });
      if (catRes.ok) {
        const catData = await catRes.json() as { predictions?: Array<{ label: string; confidence: number }> };
        const best = catData.predictions?.sort((a, b) => b.confidence - a.confidence)[0];
        if (best?.label) {
          labelList = best.label;
          this.logger.log(`WB category detected: ${labelList} (confidence: ${best.confidence.toFixed(2)})`);
        }
      }
    } catch (err) {
      this.logger.warn(`WB category detection xato (davom etamiz): ${err}`);
    }

    // Step 2: uploadsearch — sof vizual qidiruv (label_list ishlatilmaydi)
    // label_list ishlatilsa noto'g'ri kategoriya qaytishi mumkin (masalan "volume" → avtomobil o'rindiqlari)
    const uploadUrl = WB_UPLOAD_BASE;

    const { body, boundary } = this.buildMultipart(buffer, 'image', 'image_search.jpg', 'image/jpeg');

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        ...BASE_HEADERS,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(body.length),
        'query_id': queryId,
        'requestuuid': randomUUID().toUpperCase(),
      },
      body,
    });

    if (!res.ok) {
      throw new Error(`WB upload xatosi: ${res.status}`);
    }

    const raw = await res.text();
    this.logger.log(`WB upload response: ${raw.substring(0, 300)}`);

    let data: WbUploadResponse;
    try {
      data = JSON.parse(raw) as WbUploadResponse;
    } catch {
      throw new Error(`WB upload JSON parse xatosi: ${raw.substring(0, 100)}`);
    }

    if (data.status !== 'OK' || !Array.isArray(data.result)) {
      this.logger.warn(`WB visual search natija qaytarmadi: ${raw.substring(0, 200)}`);
      return [];
    }

    const ids = data.result.map((r) => r.im_name).filter((id) => id > 0);
    this.logger.log(`WB visual search: ${ids.length} ta nmId (label: ${labelList || 'none'})`);
    return ids;
  }

  private curlGet(urlStr: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        '-s', '--max-time', '15', '--compressed',
        '-H', `User-Agent: ${BASE_HEADERS['User-Agent']}`,
        '-H', 'Accept: */*',
        '-H', `Origin: ${BASE_HEADERS.Origin}`,
        '-H', `Referer: ${BASE_HEADERS.Referer}`,
        '-H', 'sec-ch-ua: "Google Chrome";v="147", "Not.A/Brand";v="8"',
        '-H', 'sec-ch-ua-mobile: ?0',
        '-H', 'sec-ch-ua-platform: "macOS"',
        '-H', 'Sec-Fetch-Site: cross-site',
        '-H', 'Sec-Fetch-Mode: cors',
        '-H', 'Sec-Fetch-Dest: empty',
        '-w', '\n%{http_code}',
        urlStr,
      ];
      execFile('curl', args, { maxBuffer: 5 * 1024 * 1024 }, (err, stdout) => {
        if (err) { reject(err); return; }
        const lines = stdout.split('\n');
        const status = parseInt(lines[lines.length - 1], 10);
        const body = lines.slice(0, -1).join('\n');
        if (status !== 200) {
          reject(new Error(`WB cards xatosi: ${status}`));
        } else {
          resolve(body);
        }
      });
    });
  }

  private async fetchCards(nmIds: number[]): Promise<WbCompareItem[]> {
    // Max 100 ta, WB limit
    const batch = nmIds.slice(0, 100);
    const nm = batch.join(';');

    // card.wb.ru — global (Russia) catalog, geo-cheklovsiz
    // curr=rub chunki bu global Russia endpoint (u-card.wb.ru UZ uchun edi, lekin UZ produktlari yo'q)
    const urlStr = `${WB_CARDS_BASE}?appType=1&curr=rub&dest=${WB_DEST}&spp=30&ab_testing=false&lang=ru&nm=${nm}`;

    const raw = await this.curlGet(urlStr);
    this.logger.log(`WB cards response (200 chars): ${raw.substring(0, 200)}`);

    let data: WbCardsResponse;
    try {
      data = JSON.parse(raw) as WbCardsResponse;
    } catch {
      throw new Error(`WB cards JSON parse xatosi: ${raw.substring(0, 100)}`);
    }

    // card.wb.ru v2 format: { state, data: { products } }
    // u-card.wb.ru v4 format: { products }
    const products = data.data?.products ?? data.products ?? [];

    if (!Array.isArray(products) || products.length === 0) {
      this.logger.warn(`WB cards natija qaytarmadi. Sample nmIds: ${batch.slice(0, 5).join(',')}`);
      return [];
    }

    return products.map((p) => {
      const size = p.sizes?.[0];
      // card.wb.ru prices in RUB kopecks → RUB → UZS
      const priceRub = size?.price?.product ? Math.round(size.price.product / 100) : 0;
      const originalPriceRub = size?.price?.basic ? Math.round(size.price.basic / 100) : priceRub;
      const priceUzs = priceRub > 0 ? Math.round(priceRub * RUB_TO_UZS) : 0;
      const originalPriceUzs = originalPriceRub > 0 ? Math.round(originalPriceRub * RUB_TO_UZS) : priceUzs;
      return {
        platform: 'wildberries' as const,
        productId: p.id,
        title: p.name,
        priceUzs,
        originalPriceUzs,
        brand: p.brand || '',
        supplier: p.supplier || '',
        supplierRating: p.supplierRating ?? 0,
        rating: p.reviewRating ?? p.rating ?? 0,
        feedbacks: p.feedbacks ?? 0,
        url: getWbProductUrl(p.id),
        image: getWbImageUrl(p.id),
      };
    });
  }
}
