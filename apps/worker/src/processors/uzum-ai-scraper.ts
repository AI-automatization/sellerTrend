/**
 * Claude AI-powered scraper helpers for Uzum category pages.
 *
 * Two capabilities:
 *
 * 1. filterByCategory(products, categoryName)
 *    After DOM scraping we get products from Uzum's featured widget —
 *    these may include cross-category noise (e.g. category 676 "beauty"
 *    showing electronics). Claude reads product titles and keeps only
 *    those relevant to the requested category.
 *
 * 2. visionExtractProducts(screenshotBase64)
 *    Fallback when DOM scraping yields 0 results. Sends a page screenshot
 *    to Claude claude-haiku (vision) and asks it to extract visible product cards.
 *    Returns [{title, price}] — caller then tries to match with product API.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ProductDetail } from './uzum-scraper';
import { logJobInfo } from '../logger';

// T-062: lazy initialization — client yaratilmaydi ANTHROPIC_API_KEY yo'q bo'lsa
let _client: Anthropic | null = null;
function getAiClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes('YOUR_KEY')) {
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
    const response = await getAiClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (response.content[0] as any).text?.trim() ?? '';
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

export interface VisionProduct {
  title: string;
  price: number | null;
  rating: number | null;
}

/**
 * Fallback: when DOM scraping yields 0 products, use the pre-captured
 * page screenshot and ask Claude Vision to extract visible product cards.
 *
 * Returns a list of {title, price, rating} — caller can use titles to
 * search for product IDs if needed.
 */
export async function visionExtractProducts(
  screenshotBase64: string,
  categoryName: string,
): Promise<VisionProduct[]> {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes('YOUR_KEY')) {
    logJobInfo('discovery-queue', '-', 'ai-scraper', 'No API key — skipping vision extraction');
    return [];
  }

  try {
    logJobInfo('discovery-queue', '-', 'ai-scraper', 'Running vision extraction on screenshot...');

    const response = await getAiClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/png', data: screenshotBase64 },
            },
            {
              type: 'text',
              text: `This is a screenshot of an Uzum.uz e-commerce category page for "${categoryName}".

Extract all visible product cards from this page.
For each product card, extract:
- title: product name (in Russian or Uzbek as shown)
- price: numeric price in UZS (remove spaces, just the number), null if not visible
- rating: rating score 0-5, null if not visible

Return ONLY a valid JSON array. Example:
[{"title":"Помада губная","price":45000,"rating":4.5},{"title":"Тушь для ресниц","price":32000,"rating":4.2}]

If no products are visible, return empty array: []`,
            },
          ],
        },
      ],
    });

    const text = (response.content[0] as any).text?.trim() ?? '';
    logJobInfo('discovery-queue', '-', 'ai-scraper', `Vision response: ${text.slice(0, 150)}`);

    // Extract JSON from response (might have markdown code block)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const extracted: VisionProduct[] = JSON.parse(jsonMatch[0]);
    logJobInfo('discovery-queue', '-', 'ai-scraper', `Vision extracted ${extracted.length} products`);
    return extracted;
  } catch (err) {
    logJobInfo('discovery-queue', '-', 'ai-scraper', `Vision extraction error: ${err}`);
    return [];
  }
}
