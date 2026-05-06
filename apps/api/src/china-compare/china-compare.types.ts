export interface AlibabOffer {
  productId: string;
  productUrl: string;
  multiImage: string[];
  title: string;
  price: string;
  moq: string;
  companyName: string;
  countryCode: string;
  goldSupplierYears: string;
  reviewScore: string;
  reviewCount?: string;
  soldOrder?: string;
}

export interface AlibabSearchResponse {
  success: boolean;
  model?: {
    offers: AlibabOffer[];
    paginationData?: {
      currentPage: number;
      totalPage: number;
      totalCount: number;
    };
  };
}

export interface AlibabUploadResponse {
  success: boolean;
  model?: {
    imagePath?: string;
    regions?: string[];
  };
}

export interface ChinaCompareItem {
  platform: 'alibaba';
  productId: string;
  title: string;
  price: string;
  moq: string;
  supplier: string;
  country: string;
  url: string;
  image: string;
  reviewScore: string;
  reviewCount: string;
  soldOrder: string;
}

export interface ChinaCompareResponse {
  cached: boolean;
  totalCount: number;
  results: ChinaCompareItem[];
}
