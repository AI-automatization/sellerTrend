// Account / Auth types
export type AccountStatus = 'ACTIVE' | 'PAYMENT_DUE' | 'SUSPENDED';
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';
export type TransactionType = 'CHARGE' | 'DEPOSIT' | 'REFUND';

// Uzum types
export type StockType = 'FBO' | 'FBS';

export interface UzumItem {
  catalogCard: {
    id: number;
    productId: number;
    ordersQuantity: number;
    feedbackQuantity: number;
    rating: number;
    minSellPrice: number;
    minFullPrice: number;
    title: string;
    discount: {
      discountPrice: number;
      fullDiscountPercent: number;
      sellDiscountPercent: number;
      paymentOptionKey: string;
    };
    buyingOptions: {
      defaultSkuId: number;
      isBestPrice: boolean;
      isSingleSku: boolean;
      deliveryOptions: {
        stockType: StockType;
        shortDate: string;
      };
    };
  };
}

export interface UzumProductDetail {
  productId: number;
  title: string;
  weeklyBought: number | null;
  ordersQuantity: number;
  rating: number;
  feedbackQuantity: number;
}

// Scoring
export interface ScoreInput {
  weekly_bought: number | null;
  orders_quantity: number;
  rating: number;
  supply_pressure: number;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Job types
export type JobName =
  | 'daily-billing'
  | 'category-discovery'
  | 'product-snapshot'
  | 'url-analyze';

export interface UrlAnalyzeJobData {
  url: string;
  accountId: string;
}

export interface CategoryDiscoveryJobData {
  categoryId: number;
  runId: string;
  accountId: string;
  categoryUrl?: string; // full Uzum category URL for Playwright scraping
}
