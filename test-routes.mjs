// Quick route checker — logs in as admin, visits every route, captures console errors
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const ROUTES = [
  '/',
  '/analyze',
  '/discovery',
  '/sourcing',
  '/leaderboard',
  '/calculator',
  '/shops',
  '/referral',
  '/api-keys',
  '/ai-description',
  '/elasticity',
  '/consultation',
  '/signals',
  '/enterprise',
  '/feedback',
  '/admin',
  '/admin?tab=users',
  '/admin?tab=accounts',
  '/admin?tab=popular',
  '/admin?tab=analytics',
  '/admin?tab=system',
  '/admin?tab=feedback',
  '/admin?tab=notifications',
  '/admin?tab=audit',
  '/admin?tab=permissions',
  '/admin?tab=deposits',
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Login
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', 'admin@uzum-trend.uz');
  await page.fill('input[type="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/', { timeout: 10000 });
  console.log('✅ Login OK\n');

  const allErrors = [];

  for (const route of ROUTES) {
    const errors = [];
    const warnings = [];

    const consoleHandler = (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' && !text.includes('favicon') && !text.includes('icon-192') && !text.includes('apple-mobile') && !text.includes('mobile-web-app') && !text.includes('manifest') && !text.includes('deprecated')) {
        // Try to get URL from message args
        const loc = msg.location();
        const extra = loc?.url ? ` [${loc.url}]` : '';
        errors.push(text.substring(0, 300) + extra);
      }
    };

    const errorHandler = (err) => {
      errors.push(`PAGE_ERROR: ${err.message.substring(0, 200)}`);
    };

    const responseHandler = (response) => {
      const status = response.status();
      const url = response.url();
      if (status === 404 && !url.includes('favicon') && !url.includes('icon-192') && !url.includes('manifest')) {
        errors.push(`404: ${url}`);
      }
    };

    page.on('console', consoleHandler);
    page.on('pageerror', errorHandler);
    page.on('response', responseHandler);

    try {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1500); // let async data load
    } catch (e) {
      errors.push(`NAVIGATION: ${e.message.substring(0, 150)}`);
    }

    page.off('console', consoleHandler);
    page.off('pageerror', errorHandler);
    page.off('response', responseHandler);

    if (errors.length > 0) {
      console.log(`❌ ${route}`);
      errors.forEach((e) => console.log(`   ${e}`));
      allErrors.push({ route, errors });
    } else {
      console.log(`✅ ${route}`);
    }
  }

  await browser.close();

  console.log('\n' + '═'.repeat(60));
  if (allErrors.length === 0) {
    console.log('🎉 Barcha route\'lar xatosiz!');
  } else {
    console.log(`⚠️  ${allErrors.length} ta route xatoli:`);
    for (const { route, errors } of allErrors) {
      console.log(`\n  ${route}:`);
      errors.forEach((e) => console.log(`    - ${e}`));
    }
  }
})();
