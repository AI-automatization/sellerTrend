import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto('http://localhost:5174', { waitUntil: 'load' });

// Hero section
await page.screenshot({ path: 'screenshots/land-01-hero.png', fullPage: false });

// Scroll pastga — section by section
const sections = [
  { y: 900,  name: 'land-02-section2' },
  { y: 1800, name: 'land-03-section3' },
  { y: 2700, name: 'land-04-section4' },
  { y: 3600, name: 'land-05-section5' },
  { y: 4500, name: 'land-06-section6' },
  { y: 5400, name: 'land-07-footer' },
];

for (const s of sections) {
  await page.evaluate(y => window.scrollTo(0, y), s.y);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `screenshots/${s.name}.png` });
}

// Full page screenshot
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);
await page.screenshot({ path: 'screenshots/land-00-full.png', fullPage: true });

// Mobile view
await page.setViewportSize({ width: 390, height: 844 });
await page.goto('http://localhost:5174', { waitUntil: 'load' });
await page.screenshot({ path: 'screenshots/land-mobile-01-hero.png' });
await page.evaluate(() => window.scrollTo(0, 900));
await page.waitForTimeout(500);
await page.screenshot({ path: 'screenshots/land-mobile-02.png' });
await page.screenshot({ path: 'screenshots/land-mobile-full.png', fullPage: true });

await browser.close();
console.log('Screenshots tayyor');
