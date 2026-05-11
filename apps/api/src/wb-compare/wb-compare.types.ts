export interface WbUploadResponse {
  status: string;
  result: Array<{ im_name: number; cosine: number | null }>;
}

export interface WbCardSize {
  price?: {
    basic: number;
    product: number;
  };
}

export interface WbCard {
  id: number;
  name: string;
  brand: string;
  supplier: string;
  supplierRating: number;
  rating: number;
  reviewRating: number;
  feedbacks: number;
  pics: number;
  sizes: WbCardSize[];
}

export interface WbCardsResponse {
  // card.wb.ru v2 format
  state?: number;
  data?: { products?: WbCard[] };
  // u-card.wb.ru v4 format (fallback)
  products?: WbCard[];
}

export interface WbCompareItem {
  platform: 'wildberries';
  productId: number;
  title: string;
  priceUzs: number;
  originalPriceUzs: number;
  brand: string;
  supplier: string;
  supplierRating: number;
  rating: number;
  feedbacks: number;
  url: string;
  image: string;
}

export interface WbCompareResponse {
  cached: boolean;
  totalCount: number;
  results: WbCompareItem[];
}
