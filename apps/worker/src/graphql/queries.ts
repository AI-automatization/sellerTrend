// ─── Uzum GraphQL Queries ─────────────────────────────────────────────────────

export const MAKE_SEARCH_QUERY = `
query getMakeSearch($queryInput: MakeSearchQueryInput!) {
  makeSearch(query: $queryInput) {
    total
    items {
      catalogCard {
        __typename
        ... on SkuGroupCard {
          productId
          title
          ordersQuantity
          feedbackQuantity
          minFullPrice
          minSellPrice
          rating
          badges { id text textColor backgroundColor __typename }
          buyingOptions {
            isBestPrice
            deliveryOptions { shortDate stockType textDeliveryWithDate }
          }
          discount {
            discountPrice
            discountAmount
            paymentOptionKey
            sellDiscountPercent
          }
          discountInfo { text textColor backgroundColor }
        }
      }
    }
    category { id title parent { id title } }
  }
}
`;

export const PRODUCT_PAGE_QUERY = `
query productPage($id: Int!) {
  productPage(id: $id) {
    product {
      id title shortDescription
      ordersQuantity rating feedbackQuantity feedbackPhotosCount
      minFullPrice minSellPrice isBlockedOrArchived
      localizableTitle { titleRu titleUz }
      category { id title parent { id title parent { id title } } }
      shop {
        id title rating ordersQuantity feedbackQuantity official url
      }
      badges { id text textColor backgroundColor __typename }
      skuList {
        id fullPrice sellPrice availableAmount
        discountBadge { text }
        stock { type }
        paymentOptions { paymentPerMonth period }
        characteristicValues { id title value }
      }
      characteristics { title values { id title value } }
      photos { key link(trans: PRODUCT_540) { high low } }
    }
    installmentWidget {
      calculationsPairs {
        skuId
        isDefault
        calculations { month text title subText preselected }
      }
    }
  }
}
`;

export const GET_SUGGESTIONS_QUERY = `
query Suggestions($input: GetSuggestionsInput!, $limit: Int!) {
  getSuggestions(query: $input) {
    blocks {
      ... on RecommendedSuggestionsBlock {
        content {
          content {
            productId title ordersQuantity feedbackQuantity rating
            minFullPrice minSellPrice
            discount { discountPrice discountAmount paymentOptionKey sellDiscountPercent }
            discountInfo { text backgroundColor }
            badges { id text __typename }
            buyingOptions {
              isBestPrice isSingleSku defaultSkuId
              deliveryOptions { shortDate stockType }
            }
          }
        }
      }
      ... on TextSuggestionsBlock { values }
      ... on CategorySuggestionsBlock { categories { id title } }
      ... on ShopSuggestionsBlock { shops { id title } }
    }
  }
}
`;

export const PRODUCT_RECOMMENDATIONS_QUERY = `
query getProductRecommendations($productId: Int!, $limit: Int!) {
  getProductRecommendations(productId: $productId, limit: $limit) {
    blocks {
      ... on ProductRecommendationBlock {
        products {
          ... on SkuGroupCard {
            productId title ordersQuantity minSellPrice rating
          }
        }
      }
    }
  }
}
`;
