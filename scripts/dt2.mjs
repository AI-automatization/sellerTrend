import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

// Network so'rovlarni log qilish
page.on('response', async res => {
  const url = res.url();
  if (url.includes('api') || url.includes('auth')) {
    let body = '';
    try { body = await res.text(); } catch {}
    console.log(`[${res.status()}] ${res.request().method()} ${url}`);
    if (body) console.log('  Body:', body.slice(0, 300));
  }
});

page.on('console', msg => {
  if (msg.type() === 'error') console.log('[BROWSER ERROR]', msg.text());
});

await page.goto('http://localhost:5173/login');
await page.waitForLoadState('networkidle');

const emailInput = page.locator('input[type="email"], input[name="email"]').first();
const passwordInput = page.locator('input[type="password"]').first();

await emailInput.fill('demo@ventra.uz');
await passwordInput.fill('Demo123!');

const submitBtn = page.locator('button[type="submit"]').first();
await submitBtn.click();

await page.waitForTimeout(5000);
console.log('Final URL:', page.url());

// Barcha xato xabarlarni ko'rish
const alerts = await page.locator('[role="alert"], .alert, [class*="error"], [class*="toast"]').allTextContents();
if (alerts.length) console.log('Xabarlar:', alerts);

await browser.close();
