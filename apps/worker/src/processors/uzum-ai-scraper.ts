/**
 * Claude AI-powered scraper helpers for Uzum category pages.
 *
 * filterByCategory(products, categoryName)
 *   After DOM scraping we get products from Uzum's featured widget —
 *   these may include cross-category noise (e.g. category 676 "beauty"
 *   showing electronics). Claude reads product titles and keeps only
 *   those relevant to the requested category.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ProductDetail } from './uzum-scraper';
import { logJobInfo } from '../logger';

// T-062: lazy initialization — client yaratilmaydi ANTHROPIC_API_KEY yo'q bo'lsa
let _client: Anthropic | null = null;
function getAiClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key.includes('YOUR_KEY')) return null;
  if (!_client) {
    _client = new Anthropic({ apiKey: key });
  }
  return _client;
}

/** Extract a human-readable category name from a Uzum category URL.
 *  https://uzum.uz/ru/category/makiyazh--10091 → "makiyazh"
 *  https://uzum.uz/ru/category/vasha-krasota--676 → "vasha krasota"
 */
export function extractCategoryName(url: string): string {
  const match = url.match(/\/category\/([^/?#]+)/);
  if (!match) return '';
  const slug = match[1].replace(/--\d+.*$/, ''); // remove --ID suffix
  return slug.replace(/-/g, ' ');
}

/**
 * Ask Claude to filter product list to only those relevant to the category.
 *
 * Input:  full list of ProductDetail (with titles from REST API)
 * Output: filtered subset — only products that belong to the category
 *
 * Uses claude-haiku for speed and low cost (~$0.002 per run).
 */
export async function filterByCategory(
  products: ProductDetail[],
  categoryName: string,
): Promise<ProductDetail[]> {
  const ai = getAiClient();
  if (!ai) {
    logJobInfo('discovery-queue', '-', 'ai-scraper', 'No API key — skipping category filter');
    return products;
  }

  if (products.length === 0) return [];

  const productList = products.map((p, i) => `${i}: ${p.title}`).join('\n');

  const prompt = `You are filtering Uzum.uz marketplace products for a category page.

Category: "${categoryName}"

Products scraped from this page (may include cross-category featured items):
${productList}

Task: Return ONLY the indexes of products that genuinely belong to the "${categoryName}" category.
Exclude products that are clearly from a different category (e.g. food items on a makeup page).
If uncertain, include the product (don't over-filter).

Respond with ONLY a JSON array of integer indexes. Example: [0, 2, 5, 7]
No explanation, no text — just the JSON array.`;

  try {
    const response = await ai.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const firstBlock = response.content[0];
    const text = firstBlock.type === 'text' ? firstBlock.text.trim() : '';
    logJobInfo('discovery-queue', '-', 'ai-scraper', `Filter response: ${text.slice(0, 100)}`);

    const indexes: number[] = JSON.parse(text);
    if (!Array.isArray(indexes)) return products;

    const filtered = indexes
      .filter((i) => typeof i === 'number' && i >= 0 && i < products.length)
      .map((i) => products[i]);

    logJobInfo('discovery-queue', '-', 'ai-scraper', `Category filter: ${products.length} → ${filtered.length} products kept`);
    return filtered.length > 0 ? filtered : products; // never return empty if filter fails
  } catch (err) {
    logJobInfo('discovery-queue', '-', 'ai-scraper', `Filter error: ${err}`);
    return products; // fallback: return unfiltered
  }
}
