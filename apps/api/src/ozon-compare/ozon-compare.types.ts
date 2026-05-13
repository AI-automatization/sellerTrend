export interface OzonCompareItem {
  platform: 'ozon';
  productId: string;
  title: string;
  priceUzs: number;
  originalPriceUzs: number;
  rating: number;
  feedbacks: number;
  url: string;
  image: string;
}

export interface OzonCompareResponse {
  cached: boolean;
  totalCount: number;
  results: OzonCompareItem[];
}

export interface OzonStateItem {
  type: string;
  id?: string;
  priceV2?: {
    price: Array<{ text: string; textStyle: string }>;
    discount?: string;
  };
  textAtom?: { text: string };
  labelList?: { items: Array<{ title: string }> };
}

export interface OzonProductRaw {
  skuId: string;
  link: string;
  alt?: string;
  items?: Array<{ type: string; image?: { link: string } }>;
  state?: OzonStateItem[];
}

export interface OzonWidgetState {
  header?: { title: string };
  productContainer?: { products: OzonProductRaw[] };
}
