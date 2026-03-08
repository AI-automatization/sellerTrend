/**
 * product-detail-scraper.ts
 *
 * Uzum product detail sahifasidan 14 ta key ni scrape qiluvchi shablon.
 * Real API response asosida yozilgan: GET /api/v2/product/{id}
 *
 * 14 ta key (1.png dagi raqamlashga mos):
 *   1.  localizableTitle.ru/uz  — mahsulot nomi
 *   2.  category.parent chain   — kategoriya ierarxiyasi (root → leaf)
 *   3.  badges[]                — promo badge'lar
 *   4.  rating                  — reyting
 *   5.  reviewsAmount           — sharhlar soni
 *   6.  skuList[0].fullPrice    — eski narx (ustidan chizilgan)
 *   7.  skuList[0].purchasePrice— asosiy (hozirgi) narx
 *   8.  skuList[0].discountBadge— chegirma badge (narx yonidagi)
 *   9.  productOptionDtos[0].paymentPerMonth — oylik muddatli to'lov
 *   10. productOptionDtos[0].period          — muddatli to'lov oylari (asosiy)
 *   11. productOptionDtos[1].period          — muddatli to'lov oylari (qo'shimcha)
 *   12. totalAvailableAmount    — haqiqiy ombor stoki
 *   13. photos[0].photo["720"].high          — asosiy rasm URL
 *   14. photos[].photo["720"].high           — barcha rasmlar URL array
 */

import { fetchUzumProductRaw } from './uzum-scraper';
import { logJobInfo } from '../logger';

const QUEUE = 'product-detail';

// ─────────────────────────────────────────────
// RAW API TYPELARI — real payload.data strukturasi
// ─────────────────────────────────────────────

interface UzumCategoryNode {
  id: number;
  title: string;
  productAmount?: number;
  parent: UzumCategoryNode | null;
}

interface UzumBadge {
  type?: string;
  label?: string;
  backgroundColor?: string;
  textColor?: string;
}

/** Real foto strukturasi: har bir rasm o'lchamlar bo'yicha nested object */
interface UzumPhotoSize {
  high: string;
  low: string;
}

interface UzumPhoto {
  photoKey: string;
  photo: Record<string, UzumPhotoSize>; // key = "60"|"80"|"120"|"240"|"480"|"540"|"720"|"800"
  color: string | null;
  hasVerticalPhoto: boolean;
}

/** Installment variant — productOptionDtos ichida */
interface UzumInstallmentOption {
  optionId: number;
  text: string;           // "Рассрочка Uzum Nasiya"
  type: string;           // "UZUM_INSTALLMENT"
  paymentInfo: string;    // "Oyiga 2 478 so'mdan muddatli tolov"
  paymentPerMonth: number; // → chargePrice (Key 9)
  period: number;          // → chargeQuantity (Key 10 / 11)
  active: boolean;
}

interface UzumSkuFull {
  id: number;
  purchasePrice: number;       // → sellPrice (Key 7)
  fullPrice: number;           // → originalPrice (Key 6)
  availableAmount: number;     // → per-order limit (REAL STOK EMAS!)
  discountBadge: string | null; // → chegirma badge (Key 8)
  installment: unknown | null;
  productOptionDtos: UzumInstallmentOption[]; // → muddatli to'lov (Key 9-11)
  stock: {
    type: 'FBO' | 'FBS';
    deliveryDays?: number;
    deliveryTitle?: string;
  };
}

/** Uzum /api/v2/product/{id} → payload.data */
interface UzumRawProductFull {
  id: number;
  title: string;
  localizableTitle?: { ru?: string; uz?: string };  // Key 1
  category?: UzumCategoryNode;                       // Key 2 (nested parent chain)
  badges?: UzumBadge[];                             // Key 3
  rating: number;                                   // Key 4
  reviewsAmount: number;                            // Key 5
  ordersAmount: number;
  rOrdersAmount?: number;
  totalAvailableAmount: number;                     // Key 12
  photos?: UzumPhoto[];                             // Key 13 & 14
  skuList: UzumSkuFull[];
  seller?: {
    id: number;
    title: string;
    rating?: number;
    reviews?: number;
    orders?: number;
  };
}

// ─────────────────────────────────────────────
// CHIQISH INTERFEYSI — 14 KEY
// ─────────────────────────────────────────────

export interface UzumCategoryPathItem {
  id: number;
  title: string;
}

export interface UzumProductFullDetail {
  id: number;

  // Key 1
  titleRu: string;
  titleUz: string | null;

  // Key 2 — root → leaf tartibida
  // [{ id:10005, title:"Maishiy kimyoviy moddalar" },
  //  { id:11341, title:"Tozalash va yuvish vositalari" },
  //  { id:12048, title:"Mebel va polni parvarishlash..." }]
  categoryPath: UzumCategoryPathItem[];

  // Key 3
  badges: UzumBadge[];
  badgeLabels: string[];

  // Key 4
  rating: number;

  // Key 5
  reviewsCount: number;

  // Key 6 — null = chegirma yo'q (fullPrice === purchasePrice)
  fullPrice: bigint | null;

  // Key 7
  sellPrice: bigint | null;

  // Key 8 — skuList[0].discountBadge
  discountBadge: string | null;

  // Key 9 — null = muddatli to'lov yo'q
  chargePrice: bigint | null;

  // Key 10 — asosiy variant (masalan: 12 oy)
  chargeQuantity: number | null;

  // Key 11 — qo'shimcha variant (masalan: 24 oy), bo'lsa
  chargeQuantityAlt: number | null;

  // Key 12
  totalAvailableAmount: number;

  // Key 13 — photos[0].photo["720"].high
  mainPhotoUrl: string | null;

  // Key 14 — barcha rasmlar yuqori sifatli URL
  photoUrls: string[];

  // Qo'shimcha
  ordersAmount: number;
  stockType: 'FBO' | 'FBS';
  seller: { id: number; title: string } | null;
}

// ─────────────────────────────────────────────
// YORDAMCHI FUNKSIYALAR
// ─────────────────────────────────────────────

/**
 * Key 2 — category.parent.parent... zanjirini
 * root → leaf tartibidagi flat array ga o'zgartiradi.
 */
function extractCategoryPath(
  category: UzumCategoryNode | undefined,
): UzumCategoryPathItem[] {
  if (!category) return [];

  const path: UzumCategoryPathItem[] = [];
  let node: UzumCategoryNode | null = category;

  while (node) {
    path.unshift({ id: node.id, title: node.title });
    node = node.parent;
  }

  return path;
}

/**
 * Key 13 & 14 — foto URLini olish.
 * Uzum fotolari: photos[i].photo["720"].high (yoki "800", yoki birinchi mavjud o'lcham)
 */
function extractPhotoUrl(photo: UzumPhoto): string | null {
  const sizes = ['720', '800', '540', '480', '240'];
  for (const size of sizes) {
    const url = photo.photo[size]?.high;
    if (url) return url;
  }
  // Fallback: birinchi mavjud o'lcham
  const first = Object.values(photo.photo)[0]?.high;
  return first ?? null;
}

// ─────────────────────────────────────────────
// MAPPER
// ─────────────────────────────────────────────

function mapToFullDetail(
  productId: number,
  raw: UzumRawProductFull,
): UzumProductFullDetail {
  const sku = raw.skuList?.[0];

  // Key 6 — eski narx: faqat fullPrice > purchasePrice bo'lsa chegirma bor
  const fullPriceRaw = sku?.fullPrice ?? 0;
  const sellPriceRaw = sku?.purchasePrice ?? 0;
  const hasDiscount = fullPriceRaw > sellPriceRaw && fullPriceRaw > 0;

  // Key 9-11 — muddatli to'lov: productOptionDtos ichida
  const installmentOptions = (sku?.productOptionDtos ?? []).filter(
    (o) => o.type === 'UZUM_INSTALLMENT' && o.active,
  );
  const primaryInstallment = installmentOptions[0] ?? null;
  const altInstallment = installmentOptions[1] ?? null;

  // Key 13 & 14 — rasmlar
  const photos = raw.photos ?? [];
  const photoUrls = photos
    .map(extractPhotoUrl)
    .filter((url): url is string => url !== null);
  const mainPhotoUrl = photoUrls[0] ?? null;

  // Key 3 — badge'lar
  const badges = raw.badges ?? [];
  const badgeLabels = badges
    .map((b) => b.label)
    .filter((l): l is string => Boolean(l));

  return {
    id: productId,

    // Key 1
    titleRu: raw.localizableTitle?.ru ?? raw.title ?? '',
    titleUz: raw.localizableTitle?.uz ?? null,

    // Key 2
    categoryPath: extractCategoryPath(raw.category),

    // Key 3
    badges,
    badgeLabels,

    // Key 4
    rating: raw.rating ?? 0,

    // Key 5
    reviewsCount: raw.reviewsAmount ?? 0,

    // Key 6
    fullPrice: hasDiscount ? BigInt(fullPriceRaw) : null,

    // Key 7
    sellPrice: sellPriceRaw > 0 ? BigInt(sellPriceRaw) : null,

    // Key 8
    discountBadge: sku?.discountBadge ?? null,

    // Key 9
    chargePrice: primaryInstallment
      ? BigInt(primaryInstallment.paymentPerMonth)
      : null,

    // Key 10
    chargeQuantity: primaryInstallment?.period ?? null,

    // Key 11
    chargeQuantityAlt: altInstallment?.period ?? null,

    // Key 12
    totalAvailableAmount: raw.totalAvailableAmount ?? 0,

    // Key 13
    mainPhotoUrl,

    // Key 14
    photoUrls,

    // Qo'shimcha
    ordersAmount: raw.ordersAmount ?? 0,
    stockType: sku?.stock?.type === 'FBO' ? 'FBO' : 'FBS',
    seller: raw.seller ? { id: raw.seller.id, title: raw.seller.title } : null,
  };
}

// ─────────────────────────────────────────────
// ASOSIY FUNKSIYA
// ─────────────────────────────────────────────

export async function fetchProductFullDetail(
  productId: number,
  jobId = '-',
): Promise<UzumProductFullDetail | null> {
  logJobInfo(QUEUE, jobId, 'detail', `Fetching product ${productId}`);

  const raw = await fetchUzumProductRaw(productId);
  if (!raw) {
    logJobInfo(QUEUE, jobId, 'detail', `Product ${productId} not found`);
    return null;
  }

  const detail = mapToFullDetail(productId, raw as UzumRawProductFull);

  logJobInfo(
    QUEUE,
    jobId,
    'detail',
    `Product ${productId} OK — price=${detail.sellPrice}, stock=${detail.totalAvailableAmount}, photos=${detail.photoUrls.length}, category=${detail.categoryPath.at(-1)?.title ?? 'n/a'}`,
  );

  return detail;
}

// ─────────────────────────────────────────────
// BATCH FETCH
// ─────────────────────────────────────────────

export async function fetchProductsBatch(
  productIds: number[],
  concurrency = 5,
  jobId = '-',
): Promise<UzumProductFullDetail[]> {
  const results: UzumProductFullDetail[] = [];

  for (let i = 0; i < productIds.length; i += concurrency) {
    const chunk = productIds.slice(i, i + concurrency);

    const settled = await Promise.allSettled(
      chunk.map((id) => fetchProductFullDetail(id, jobId)),
    );

    for (const result of settled) {
      if (result.status === 'fulfilled' && result.value !== null) {
        results.push(result.value);
      }
    }

    logJobInfo(
      QUEUE,
      jobId,
      'batch',
      `Progress: ${Math.min(i + concurrency, productIds.length)}/${productIds.length}`,
    );
  }

  return results;
}
