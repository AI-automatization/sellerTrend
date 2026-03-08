import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, slowMo: 600 });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

page.on('console', msg => {
  if (msg.type() === 'error') console.log('[BROWSER ERROR]', msg.text());
});

await page.goto('http://localhost:5177');
await page.waitForLoadState('networkidle');
console.log('Sahifa yuklandi:', page.url());
await page.screenshot({ path: 'screenshots/dt-01-loaded.png' });

try {
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 8000 });
  console.log('Login form topildi');
} catch(e) {
  const html = await page.content();
  console.log('Login form topilmadi! HTML:', html.slice(0, 800));
  await page.screenshot({ path: 'screenshots/dt-error.png' });
  await browser.close();
  process.exit(1);
}

const emailInput = page.locator('input[type="email"], input[name="email"]').first();
const passwordInput = page.locator('input[type="password"]').first();

await emailInput.fill('demo@ventra.uz');
await passwordInput.fill('Demo123!');
await page.screenshot({ path: 'screenshots/dt-02-filled.png' });
console.log('Credentials kiritildi');

const submitBtn = page.locator('button[type="submit"]').first();
await submitBtn.click();
console.log('Login bosildi');

await page.waitForTimeout(4000);
await page.screenshot({ path: 'screenshots/dt-03-result.png' });
console.log('Natija URL:', page.url());

const errorMsg = await page.locator('[class*="error"], [class*="alert"], [role="alert"]').first().textContent().catch(() => null);
if (errorMsg) console.log('Xato xabari:', errorMsg);

await browser.close();
