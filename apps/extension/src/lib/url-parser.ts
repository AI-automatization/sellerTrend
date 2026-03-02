/**
 * Uzum URL parsing utilities for the extension.
 * Patterns from packages/utils, bundled locally for content script usage.
 */

/**
 * Extract product ID from a full Uzum product URL.
 * Formats:
 *   https://uzum.uz/ru/product/smartfon-ajib-x1-1176929
 *   https://uzum.uz/uz/product/slug-12345?skuId=xxx
 *   https://uzum.uz/product/12345
 */
export function parseProductIdFromUrl(url: string): string | null {
  const match = url.match(/\/product\/[^?/]*?(\d+)(?:[?/]|$)/)
  return match ? match[1] : null
}

/**
 * Extract product ID from a product card link href.
 * Strips query string before parsing (skuId suffix).
 * Format: /ru/product/slug-12345?skuId=xxx
 */
export function parseProductIdFromHref(href: string): string | null {
  const path = href.split("?")[0]
  const match = path.match(/\/product\/[^/]*?(\d+)$/)
  return match ? match[1] : null
}

/**
 * Extract category ID from a full Uzum category URL.
 * Format: https://uzum.uz/ru/category/smartfony--879
 */
export function parseCategoryIdFromUrl(url: string): string | null {
  const match = url.match(/\/category\/[^?/]*?--(\d+)(?:[?/]|$)/)
  return match ? match[1] : null
}

export function isProductPage(url: string): boolean {
  return /\/product\//.test(url)
}

export function isCategoryPage(url: string): boolean {
  return /\/category\//.test(url)
}
