import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  extraHTTPHeaders: { 'Accept-Language': 'ru-RU,ru;q=0.9' },
});
const page = await ctx.newPage();
await page.goto('https://uzum.uz/ru/category/vasha-krasota--676', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);

const productCards = await page.locator('[data-test-id="product-card--default"]').count();
const catLinks = await page.locator('a[href*="/category/"]').count();
const anyCards = await page.locator('[class*="card"]').count();

const hrefs = await page.$$eval('a[href*="/category/"]', els =>
  [...new Set(els.map(e => e.getAttribute('href')).filter(h => h && h.includes('--')))].slice(0, 10)
);

// Get product card hrefs specifically
const productHrefs = await page.$$eval('[data-test-id="product-card--default"]', cards =>
  cards.slice(0, 5).map(c => c.getAttribute('href'))
);

console.log('product-card--default:', productCards);
console.log('category links:', catLinks);
console.log('any [class*=card]:', anyCards);
console.log('subcategory hrefs:', JSON.stringify(hrefs, null, 2));
console.log('product card hrefs (first 5):', JSON.stringify(productHrefs));
await browser.close();
