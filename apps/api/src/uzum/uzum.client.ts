import { Injectable, Logger } from '@nestjs/common';
import { sleep } from '@uzum/utils';

const MAKE_SEARCH_QUERY = `
  query makeSearch($queryInput: MakeSearchQueryInput!) {
    makeSearch(query: $queryInput) {
      items {
        catalogCard {
          ... on SkuGroupCard {
            __typename
            id
            productId
            ordersQuantity
            feedbackQuantity
            rating
            minSellPrice
            minFullPrice
            title
            discount {
              discountPrice
              fullDiscountPercent
              sellDiscountPercent
              paymentOptionKey
            }
            buyingOptions {
              defaultSkuId
              isBestPrice
              isSingleSku
              deliveryOptions {
                stockType
                shortDate
              }
            }
          }
        }
      }
      total
    }
  }
`;

const PRODUCT_PAGE_QUERY = `
  query productPage($productId: Long!) {
    product(id: $productId) {
      id
      title
      ordersQuantity
      feedbackQuantity
      rating
      actions {
        text
      }
      skuList {
        id
        sellPrice
        fullPrice
        discountPercent
        availableAmount
      }
      shop {
        id
        title
        rating
        ordersQuantity
      }
    }
  }
`;

const BASE_URL = 'https://graphql.uzum.uz/';
const HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Origin: 'https://uzum.uz',
  Referer: 'https://uzum.uz/',
  'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
};

@Injectable()
export class UzumClient {
  private readonly logger = new Logger(UzumClient.name);

  async fetchCategoryListing(
    categoryId: number,
    page: number = 0,
    retries = 3,
  ): Promise<{ items: any[]; total: number }> {
    const payload = {
      operationName: 'makeSearch',
      query: MAKE_SEARCH_QUERY,
      variables: {
        queryInput: {
          categoryId,
          pagination: { offset: page * 48, limit: 48 },
          showAdultContent: 'HIDE',
          filters: [],
          sort: 'BY_RELEVANCE_DESC',
        },
      },
    };

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(BASE_URL, {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify(payload),
        });

        if (response.status === 429) {
          this.logger.warn(`Rate limited (429), waiting 5s...`);
          await sleep(5000);
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const result = data?.data?.makeSearch;

        return {
          items: result?.items ?? [],
          total: result?.total ?? 0,
        };
      } catch (err) {
        this.logger.error(`fetchCategoryListing attempt ${attempt + 1}: ${err}`);
        if (attempt < retries - 1) await sleep(2000 * (attempt + 1));
      }
    }

    return { items: [], total: 0 };
  }

  async fetchProductDetail(productId: number, retries = 3): Promise<any | null> {
    const payload = {
      operationName: 'productPage',
      query: PRODUCT_PAGE_QUERY,
      variables: { productId },
    };

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(BASE_URL, {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify(payload),
        });

        if (response.status === 429) {
          await sleep(5000);
          continue;
        }

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        return data?.data?.product ?? null;
      } catch (err) {
        this.logger.error(`fetchProductDetail attempt ${attempt + 1}: ${err}`);
        if (attempt < retries - 1) await sleep(2000 * (attempt + 1));
      }
    }

    return null;
  }
}
