// ─── Uzum GraphQL API Types ───────────────────────────────────────────────────

// makeSearch
export interface SkuGroupCard {
  productId: number;
  title: string;
  ordersQuantity: number;
  feedbackQuantity: number;
  minFullPrice: number;
  minSellPrice: number;
  rating: number;
  badges: Array<{ id: string; text: string; textColor: string; backgroundColor: string }>;
  buyingOptions?: {
    isBestPrice: boolean;
    deliveryOptions: Array<{ shortDate: string; stockType: string; textDeliveryWithDate: string }>;
  };
  discount?: {
    discountPrice: number;
    discountAmount: number;
    paymentOptionKey: string;
    sellDiscountPercent: number;
  };
  discountInfo?: { text: string; textColor: string; backgroundColor: string };
}

export interface MakeSearchItem {
  catalogCard: ({ __typename: 'SkuGroupCard' } & SkuGroupCard) | { __typename: string };
}

export interface MakeSearchResult {
  total: number;
  items: MakeSearchItem[];
  category?: {
    id: number;
    title: string;
    parent?: { id: number; title: string };
  };
}

// productPage
export interface GraphQLShop {
  id: number;
  title: string;
  rating: number;
  ordersQuantity: number;
  feedbackQuantity: number;
  official: boolean;
  url: string;
}

export interface GraphQLSku {
  id: number;
  fullPrice: number;
  sellPrice: number;
  availableAmount: number;
  discountBadge?: { text: string };
  stock: { type: string };
  paymentOptions: Array<{ paymentPerMonth: number; period: number }>;
  characteristicValues: Array<{ id: number; title: string; value: string }>;
}

export interface GraphQLProduct {
  id: number;
  title: string;
  shortDescription: string;
  ordersQuantity: number;
  rating: number;
  feedbackQuantity: number;
  feedbackPhotosCount: number;
  minFullPrice: number;
  minSellPrice: number;
  isBlockedOrArchived: boolean;
  localizableTitle: { titleRu: string; titleUz: string };
  category: {
    id: number;
    title: string;
    parent?: { id: number; title: string; parent?: { id: number; title: string } };
  };
  shop: GraphQLShop;
  badges: Array<{ id: string; text: string; textColor: string; backgroundColor: string }>;
  skuList: GraphQLSku[];
  characteristics: Array<{ title: string; values: Array<{ id: number; title: string; value: string }> }>;
  photos: Array<{ key: string; link: { high: string; low: string } }>;
}

export interface InstallmentCalculation {
  month: number;
  text: string;
  title: string;
  subText: string;
  preselected: boolean;
}

export interface InstallmentWidget {
  calculationsPairs: Array<{
    skuId: number;
    isDefault: boolean;
    calculations: InstallmentCalculation[];
  }>;
}

export interface ProductPageResult {
  product: GraphQLProduct;
  installmentWidget: InstallmentWidget;
}

// getSuggestions
export interface SuggestionsRecommendedBlock {
  __typename: 'RecommendedSuggestionsBlock';
  content: {
    content: Array<{
      productId: number;
      title: string;
      ordersQuantity: number;
      feedbackQuantity: number;
      rating: number;
      minFullPrice: number;
      minSellPrice: number;
      discount?: {
        discountPrice: number;
        discountAmount: number;
        paymentOptionKey: string;
        sellDiscountPercent: number;
      };
      discountInfo?: { text: string; backgroundColor: string };
      badges?: Array<{ id: string; text: string }>;
      buyingOptions?: {
        isBestPrice: boolean;
        isSingleSku: boolean;
        defaultSkuId: number;
        deliveryOptions: Array<{ shortDate: string; stockType: string }>;
      };
    }>;
  };
}

export interface SuggestionsResult {
  blocks: Array<
    | SuggestionsRecommendedBlock
    | { __typename: 'TextSuggestionsBlock'; values: string[] }
    | { __typename: 'CategorySuggestionsBlock'; categories: Array<{ id: number; title: string }> }
    | { __typename: 'ShopSuggestionsBlock'; shops: Array<{ id: number; title: string }> }
  >;
}

// getProductRecommendations (similarProducts)
export interface ProductRecommendationItem {
  productId: number;
  title: string;
  ordersQuantity: number;
  minSellPrice: number;
  rating: number;
}

export interface ProductRecommendationsResult {
  blocks: Array<{
    __typename: 'ProductRecommendationBlock';
    products: Array<{ __typename: 'SkuGroupCard' } & ProductRecommendationItem>;
  }>;
}
