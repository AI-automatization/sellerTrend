/**
 * Normalized product result from Bright Data Web Scraper API.
 * Platform-specific raw fields are mapped to this common shape.
 */
export interface BrightDataProduct {
  platform: 'aliexpress' | '1688' | 'taobao';
  title: string;
  price: number;
  currency: string;
  priceUsd: number;
  imageUrl: string;
  productUrl: string;
  rating?: number;
  orders?: number;
  shippingCost?: number;
}

/** Shape of a single item in the Bright Data trigger request body */
export interface BrightDataTriggerInput {
  keyword: string;
  limit?: number;
}

/** Bright Data trigger endpoint response (async collection) */
export interface BrightDataTriggerResponse {
  snapshot_id: string;
  status: string;
}

/** Raw product record from Bright Data AliExpress dataset */
export interface BrightDataAliExpressRaw {
  title?: string;
  final_price?: number | string;
  original_price?: number | string;
  currency?: string;
  image?: string;
  url?: string;
  product_url?: string;
  stars?: number | string;
  rating?: number | string;
  orders?: number | string;
  num_orders?: number | string;
  shipping?: number | string;
  shipping_cost?: number | string;
}

/** Raw product record from Bright Data 1688 dataset */
export interface BrightData1688Raw {
  title?: string;
  price?: number | string;
  currency?: string;
  image?: string;
  image_url?: string;
  url?: string;
  product_url?: string;
  rating?: number | string;
  sold?: number | string;
  sales?: number | string;
}

/** Raw product record from Bright Data Taobao dataset */
export interface BrightDataTaobaoRaw {
  title?: string;
  price?: number | string;
  currency?: string;
  image?: string;
  pic_url?: string;
  url?: string;
  detail_url?: string;
  rating?: number | string;
  sold?: number | string;
  sales_count?: number | string;
}
