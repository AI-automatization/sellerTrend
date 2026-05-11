import { Inject, Injectable, Logger, NotFoundException, BadGatewayException } from '@nestjs/common';
import { fetch } from 'undici';
import { createHash, randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type Redis from 'ioredis';
import { chromium } from 'playwright';
import { REDIS_CLIENT } from '../common/redis/redis.module';
import { PrismaService } from '../prisma/prisma.service';
import type {
  WbUploadResponse,
  WbCardsResponse,
  WbCompareItem,
  WbCompareResponse,
} from './wb-compare.types';

const CACHE_TTL = 60 * 60 * 24; // 24 soat
const WB_CARDS_BASE = 'https://u-card.wb.ru/cards/v4/list';
const WB_DEST = '494'; // Uzbekistan

const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

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
  return `https://www.wildberries.uz/catalog/${nmId}/detail.aspx`;
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

    this.logger.log(`WB visual search (Playwright): ${imageUrl}`);

    let nmIds: number[];
    try {
      nmIds = await this.uploadImageViaPlaywright(imageUrl);
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

  /**
   * Playwright orqali WB vizual qidiruvni amalga oshiradi.
   * Real Chrome browser ishlatadi — WB siglip2_sigma engine'ini qaytaradi.
   * undici/curl orqali qilinsa WB siglip2_mrl_crop ishlatadi va noto'g'ri natijalar beradi.
   */
  private async uploadImageViaPlaywright(imageUrl: string): Promise<number[]> {
    // Rasmni yuklab vaqtinchalik faylga saqlash
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      throw new Error(`Rasm yuklab bo'lmadi: ${imgRes.status}`);
    }
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const tmpPath = join(tmpdir(), `wb_search_${randomUUID()}.jpg`);
    await writeFile(tmpPath, buffer);

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

      // webdriver ni yashirish — antibot uchun
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      });

      const page = await context.newPage();

      await page.goto('https://www.wildberries.uz/search/image', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await page.waitForTimeout(3000);

      // uploadsearch response ni kutish (file upload va button click dan oldin boshlash)
      const uploadRespPromise = page.waitForResponse(
        (resp) => resp.url().includes('uploadsearch'),
        { timeout: 35000 },
      );

      // WB image search file input ga rasm yuklash
      const fileInput = await page.$('#catalogFileInput');
      if (!fileInput) {
        throw new Error('WB sahifasida #catalogFileInput topilmadi');
      }
      await fileInput.setInputFiles(tmpPath);
      this.logger.log('WB: rasm yuklandi, "Найти товар" tugmasi kutilmoqda...');

      // "Найти товар" tugmasini kutish va bosish
      await page.waitForSelector('button:has-text("Найти товар")', { timeout: 15000 });
      await page.click('button:has-text("Найти товар")');
      this.logger.log('WB: "Найти товар" bosildi, uploadsearch kutilmoqda...');

      // Uploadsearch natijasini ushlash
      const uploadResp = await uploadRespPromise;
      const raw = await uploadResp.text();
      this.logger.log(`WB upload response (engine): ${raw.substring(0, 200)}`);

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
      this.logger.log(`WB visual search: ${ids.length} ta nmId topildi`);
      return ids;
    } finally {
      await browser.close();
      await unlink(tmpPath).catch(() => undefined); // temp fayl tozalash
    }
  }

  private curlGet(urlStr: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        '-s', '--max-time', '15', '--compressed',
        '-H', `User-Agent: ${BROWSER_UA}`,
        '-H', 'Accept: */*',
        '-H', 'Origin: https://www.wildberries.uz',
        '-H', 'Referer: https://www.wildberries.uz/search/image',
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
    const batch = nmIds.slice(0, 100);
    const nm = batch.join(';');

    const urlStr = `${WB_CARDS_BASE}?appType=1&curr=uzs&dest=${WB_DEST}&spp=30&hide_vflags=4294967296&hide_dflags=131072&hide_dtype=11%3B13&ab_testing=false&lang=ru&nm=${nm}`;

    const raw = await this.curlGet(urlStr);
    this.logger.log(`WB cards response (200 chars): ${raw.substring(0, 200)}`);

    let data: WbCardsResponse;
    try {
      data = JSON.parse(raw) as WbCardsResponse;
    } catch {
      throw new Error(`WB cards JSON parse xatosi: ${raw.substring(0, 100)}`);
    }

    const products = data.products ?? [];

    if (!Array.isArray(products) || products.length === 0) {
      this.logger.warn(`WB cards natija qaytarmadi. Sample nmIds: ${batch.slice(0, 5).join(',')}`);
      return [];
    }

    return products.map((p) => {
      const size = p.sizes?.[0];
      // u-card.wb.ru curr=uzs → prices in UZS tiyin (divide by 100)
      const priceUzs = size?.price?.product ? Math.round(size.price.product / 100) : 0;
      const originalPriceUzs = size?.price?.basic ? Math.round(size.price.basic / 100) : priceUzs;
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
