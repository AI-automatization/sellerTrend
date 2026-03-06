import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';

const BASE_URL = 'http://localhost:5173';
const EMAIL    = 'demo@ventra.uz';
const PASSWORD = 'Demo123!';

if (!existsSync('screenshots')) mkdirSync('screenshots');

const bugs = [];
function bug(id, severity, desc, detail = '') {
  bugs.push({ id, severity, desc, detail });
  console.log(`  ❌ BUG [${severity}] ${id}: ${desc}${detail ? ' — ' + detail : ''}`);
}
function ok(msg) { console.log(`  ✅ ${msg}`); }
function section(t) { console.log(`\n── ${t} ──`); }

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

const consoleErrors = [];
const networkErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('requestfailed', r => networkErrors.push(`${r.method()} ${r.url()} -- ${r.failure()?.errorText}`));

try {
  section('1. Login page');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1500);

  const url = page.url();
  if (url.includes('/login')) ok('Redirected to /login');
  else bug('D-001', 'P1', 'No redirect to /login for unauth user', url);

  const emailInput = page.locator('input[type="email"]');
  const passInput  = page.locator('input[type="password"]');
  const submitBtn  = page.locator('button[type="submit"]');

  if (await emailInput.count() === 0) bug('D-002', 'P0', 'Email input missing on login page');
  else ok('Email input present');

  if (await passInput.count() === 0) bug('D-003', 'P0', 'Password input missing');
  else ok('Password input present');

  if (await submitBtn.count() === 0) bug('D-004', 'P0', 'Submit button missing');
  else ok('Submit button present');

  const bodyOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
  if (bodyOverflow) bug('D-005', 'P2', 'Horizontal overflow on login page');
  else ok('No horizontal overflow on login page');

  const title = await page.title();
  if (!title) bug('D-006', 'P2', 'Empty page title');
  else ok(`Page title: "${title}"`);

  await page.screenshot({ path: 'screenshots/01-login.png', fullPage: true });
  ok('Screenshot: screenshots/01-login.png');

  section('2. Empty form submit');
  if (await submitBtn.count() > 0) {
    await submitBtn.first().click();
    await page.waitForTimeout(600);
    if (page.url().includes('/login')) ok('Empty submit stays on login page');
    else bug('D-007', 'P1', 'Empty form submit navigated away');
  }

  section('3. Login flow');
  const apiOk = await fetch('http://localhost:3000/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(r => r.status !== 0).catch(() => false);
  if (!apiOk) {
    console.log('  ⚠️  API not running (port 3000) — skipping authenticated tests');
    console.log('  ℹ️  Start API with: pnpm --filter api dev');
  } else {
    await emailInput.first().fill(EMAIL);
    await passInput.first().fill(PASSWORD);
    await submitBtn.first().click();

    try {
      await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 8000 });
      ok(`Login succeeded -> ${page.url()}`);
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.screenshot({ path: 'screenshots/02-dashboard.png' });
      ok('Screenshot: screenshots/02-dashboard.png');

      section('4. Dashboard checks');

      const sidebar = page.locator('nav, aside');
      if (await sidebar.count() === 0) bug('D-008', 'P2', 'No sidebar/nav found');
      else ok('Sidebar present');

      await page.waitForTimeout(3000);
      const spinners = page.locator('.loading, [class*="spinner"], [class*="loading-spinner"]');
      const spinCnt = await spinners.count();
      if (spinCnt > 0) bug('D-009', 'P2', 'Stuck loading spinner after 3s', `${spinCnt} found`);
      else ok('No stuck spinners');

      const broken = await page.evaluate(() =>
        [...document.querySelectorAll('img')]
          .filter(i => !i.complete || i.naturalWidth === 0)
          .map(i => i.src)
      );
      if (broken.length > 0) bug('D-010', 'P2', 'Broken images on dashboard', broken.slice(0, 3).join(', '));
      else ok('No broken images');

      const dashOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
      if (dashOverflow) bug('D-011', 'P2', 'Horizontal overflow on dashboard');
      else ok('No horizontal overflow on dashboard');

      section('5. Navigation');
      const routes = ['analyze', 'discovery', 'signals', 'leaderboard', 'sourcing'];
      for (const route of routes) {
        const link = page.locator(`a[href="/${route}"]`).first();
        if (await link.count() > 0) {
          await link.click();
          await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(400);
          if (page.url().includes(route)) ok(`/${route} navigation works`);
          else bug(`D-01${routes.indexOf(route)+2}`, 'P2', `/${route} nav failed`, page.url());
          await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(300);
        } else {
          console.log(`  ⚠️  No a[href="/${route}"] link found`);
        }
      }

      await page.screenshot({ path: 'screenshots/03-nav.png' });

      section('6. Analyze page — product search');
      await page.goto(BASE_URL + '/analyze', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      const searchInput = page.locator('input[placeholder*="URL"], input[placeholder*="url"], input[type="url"], input[type="text"]').first();
      if (await searchInput.count() > 0) {
        ok('Search input found on /analyze');
        await searchInput.fill('https://uzum.uz/uz/product/test-123');
        await page.screenshot({ path: 'screenshots/04-analyze.png' });
      } else {
        bug('D-017', 'P2', 'No search input on /analyze page');
      }

      section('7. Responsive 900px');
      await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded' });
      await page.setViewportSize({ width: 900, height: 600 });
      await page.waitForTimeout(400);
      const ov900 = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
      if (ov900) bug('D-018', 'P2', 'Horizontal overflow at 900px viewport');
      else ok('No overflow at 900px');
      await page.screenshot({ path: 'screenshots/05-responsive-900.png' });

    } catch (e) {
      const errText = await page.locator('.text-error, [role="alert"]').first().textContent().catch(() => '');
      bug('D-020', 'P1', 'Login failed', errText || e.message);
      await page.screenshot({ path: 'screenshots/login-error.png' });
    }
  }

  section('Console & Network errors');
  const critErrors = consoleErrors.filter(e =>
    !e.includes('favicon') && !e.includes('plausible') &&
    !e.includes('[vite]') && !e.includes('HMR') && !e.includes('hot-update')
  );
  if (critErrors.length === 0) ok('No critical console errors');
  else {
    critErrors.slice(0, 5).forEach(e => console.log(`  ⚠️  CONSOLE: ${e.slice(0, 120)}`));
    bug('D-021', 'P1', `${critErrors.length} console error(s)`, critErrors[0].slice(0, 100));
  }

  const critNet = networkErrors.filter(e =>
    !e.includes('plausible') && !e.includes('favicon') && !e.includes('hot-update')
  );
  if (critNet.length === 0) ok('No critical network errors');
  else {
    critNet.slice(0, 5).forEach(e => console.log(`  ⚠️  NET: ${e.slice(0, 120)}`));
    bug('D-022', 'P1', `${critNet.length} network error(s)`, critNet[0].slice(0, 100));
  }

} catch (err) {
  console.error('CRASH:', err.message);
  bugs.push({ id: 'D-000', severity: 'P0', desc: 'Test crashed', detail: err.message });
} finally {
  await browser.close();
}

console.log('\n═══════════════════════════════════════════');
if (bugs.length === 0) {
  console.log('RESULT: No bugs found!');
} else {
  console.log(`RESULT: ${bugs.length} issue(s) found:`);
  bugs.forEach(b => console.log(`  [${b.severity}] ${b.id}: ${b.desc}${b.detail ? ' | ' + b.detail : ''}`));
}
console.log('═══════════════════════════════════════════\n');
