/**
 * Uzum category page DOM scraper test
 * Playwright bilan sahifani to'liq render qilib, mahsulotlarni ajratib oladi.
 *
 * Run: node tools/scraper-test.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const CATEGORY_URL = 'https://uzum.uz/ru/category/makiyazh--10091';

async function main() {
  console.log('Launching Playwright...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'ru-RU',
    extraHTTPHeaders: {
      'Accept-Language': 'ru-RU,ru;q=0.9',
    },
  });
  const page = await context.newPage();

  console.log('Navigating to:', CATEGORY_URL);
  await page.goto(CATEGORY_URL, { waitUntil: 'networkidle', timeout: 30000 });

  console.log('Waiting for products...');

  // Try multiple selectors to find product cards
  const selectors = [
    '[data-product-id]',
    '[data-id]',
    '.product-card',
    '.catalog-card',
    '.sku-card',
    '[class*="product"]',
    '[class*="card"]',
    'article',
    '.item',
    '[class*="item"]',
  ];

  let foundSelector = null;
  let foundCount = 0;

  for (const sel of selectors) {
    try {
      const count = await page.locator(sel).count();
      if (count > 5) {
        console.log(`✅ Selector "${sel}" found ${count} elements`);
        if (count > foundCount) {
          foundSelector = sel;
          foundCount = count;
        }
      } else if (count > 0) {
        console.log(`  "${sel}" = ${count} (too few)`);
      }
    } catch {
      // ignore
    }
  }

  if (!foundSelector) {
    console.log('❌ No product selector found. Dumping page...');
    const html = await page.content();
    writeFileSync('tools/uzum-rendered.html', html);
    console.log('Saved rendered HTML to tools/uzum-rendered.html (', html.length, 'chars)');

    // Try to find any repeating elements
    const bodyText = await page.evaluate(() => {
      const els = document.querySelectorAll('*');
      const counts = {};
      els.forEach(el => {
        const cls = el.className;
        if (typeof cls === 'string' && cls.length > 3 && cls.length < 50) {
          counts[cls] = (counts[cls] || 0) + 1;
        }
      });
      return Object.entries(counts)
        .filter(([, c]) => c > 5)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);
    });
    console.log('Repeating classes:', bodyText);
    await browser.close();
    return;
  }

  console.log(`\nBest selector: "${foundSelector}" (${foundCount} items)`);

  // Try to extract data from DOM
  const products = await page.evaluate((selector) => {
    const cards = Array.from(document.querySelectorAll(selector));
    return cards.slice(0, 5).map(card => {
      // Try all data attributes
      const data = { ...card.dataset };

      // Try text content
      const allText = card.innerText?.slice(0, 200);

      // Try nested elements
      const title = card.querySelector('h1,h2,h3,h4,p,[class*="title"],[class*="name"]')?.textContent?.trim();
      const price = card.querySelector('[class*="price"],[class*="sum"]')?.textContent?.trim();
      const rating = card.querySelector('[class*="rating"],[class*="star"]')?.textContent?.trim();
      const img = card.querySelector('img')?.src;
      const link = card.querySelector('a')?.href;

      return { data, title, price, rating, img: img?.slice(0, 80), link: link?.slice(0, 80), text: allText };
    });
  }, foundSelector);

  console.log('\n--- Sample products ---');
  products.forEach((p, i) => {
    console.log(`\n[${i}]`, JSON.stringify(p, null, 2));
  });

  // Try Vue.js internals if available
  const vueData = await page.evaluate(() => {
    // Vue 3 devtools API
    const appEl = document.querySelector('#app') || document.querySelector('[data-v-app]');
    if (!appEl) return null;

    const vueApp = appEl.__vue_app__;
    if (!vueApp) return { note: '__vue_app__ not found' };

    // Try to find store data
    const globalProps = vueApp.config?.globalProperties;
    if (!globalProps) return { note: 'no globalProperties' };

    const store = globalProps.$store;
    if (store?.state) {
      const state = store.state;
      // Look for product-like data
      const keys = Object.keys(state);
      return { type: 'vuex', keys };
    }

    return { note: 'Vue app found but no store', appKeys: Object.keys(vueApp) };
  });

  if (vueData) {
    console.log('\n--- Vue.js internals ---', JSON.stringify(vueData, null, 2));
  }

  // Take screenshot for visual inspection
  await page.screenshot({ path: 'tools/uzum-screenshot.png', fullPage: false });
  console.log('\nScreenshot saved to tools/uzum-screenshot.png');

  // Save full rendered HTML
  const html = await page.content();
  writeFileSync('tools/uzum-rendered.html', html);
  console.log('Rendered HTML saved to tools/uzum-rendered.html (', html.length, 'chars)');

  await browser.close();
  console.log('\nDone!');
}

main().catch(console.error);
