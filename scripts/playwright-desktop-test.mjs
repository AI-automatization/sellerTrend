/**
 * VENTRA Desktop App — Playwright smoke test
 * Runs against localhost:5173 (electron-vite renderer in dev mode)
 * Usage: node scripts/playwright-desktop-test.mjs
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';
const API_URL  = 'http://localhost:3000';
const EMAIL    = 'demo@ventra.uz';
const PASSWORD = 'Demo123!';

const bugs = [];

function bug(id, severity, description, detail = '') {
  bugs.push({ id, severity, description, detail });
  console.log(`  ❌ BUG [${severity}] ${description}${detail ? ' — ' + detail : ''}`);
}

function ok(msg) {
  console.log(`  ✅ ${msg}`);
}

function section(title) {
  console.log(`\n── ${title} ──────────────────────────────`);
}

async function run() {
  console.log('VENTRA Desktop Playwright smoke test');
  console.log(`Target: ${BASE_URL}`);
  console.log(`API:    ${API_URL}`);

  // Check API availability
  section('Pre-flight checks');
  try {
    const apiRes = await fetch(`${API_URL}/health`).catch(() => null);
    if (!apiRes || !apiRes.ok) {
      console.log(`  ⚠️  API at ${API_URL} is not reachable — login test will fail`);
    } else {
      ok('API is reachable');
    }
  } catch { /* ignore */ }

  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  // Collect console errors
  const consoleErrors = [];
  const networkErrors = [];

  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('requestfailed', req => {
    networkErrors.push(`${req.method()} ${req.url()} → ${req.failure()?.errorText}`);
  });

  try {
    // ── 1. Login page ──────────────────────────────
    section('1. Login page');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });

    // Should redirect to /login
    if (page.url().includes('/login')) {
      ok('Redirected to /login when unauthenticated');
    } else {
      bug('D-001', 'P1', 'No redirect to /login for unauthenticated user', page.url());
    }

    // Check login form exists
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passInput  = page.locator('input[type="password"]');
    const submitBtn  = page.locator('button[type="submit"], button:has-text("Kirish"), button:has-text("Войти"), button:has-text("Login")');

    if (await emailInput.count() === 0) bug('D-002', 'P0', 'Email input not found on login page');
    else ok('Email input present');

    if (await passInput.count() === 0) bug('D-003', 'P0', 'Password input not found on login page');
    else ok('Password input present');

    if (await submitBtn.count() === 0) bug('D-004', 'P0', 'Submit button not found on login page');
    else ok('Submit button present');

    // Check page title
    const title = await page.title();
    if (!title || title === '') bug('D-005', 'P2', 'Page title is empty');
    else ok(`Page title: "${title}"`);

    // Check for layout shift / overflow
    const bodyOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });
    if (bodyOverflow) bug('D-006', 'P2', 'Horizontal scroll on login page (layout overflow)');
    else ok('No horizontal overflow on login page');

    // ── 2. Form validation ─────────────────────────
    section('2. Form validation (empty submit)');
    if (await submitBtn.count() > 0) {
      await submitBtn.first().click();
      await page.waitForTimeout(500);

      // Check if still on login page (validation should prevent submit)
      if (page.url().includes('/login')) {
        ok('Empty form submit kept user on login page');
      } else {
        bug('D-007', 'P1', 'Empty form submit navigated away from login page');
      }
    }

    // ── 3. Login flow ──────────────────────────────
    section('3. Login flow');
    if (await emailInput.count() > 0 && await passInput.count() > 0) {
      await emailInput.first().fill(EMAIL);
      await passInput.first().fill(PASSWORD);
      await submitBtn.first().click();

      // Wait for navigation or error
      try {
        await page.waitForURL(url => !url.includes('/login'), { timeout: 8000 });
        ok(`Login successful — navigated to ${page.url()}`);
      } catch {
        // Check for error message
        const errorMsg = page.locator('[class*="error"], [class*="alert"], .text-error, [role="alert"]');
        const errText = await errorMsg.first().textContent().catch(() => '');
        if (errText) {
          bug('D-008', 'P1', 'Login failed with credentials', `Error: "${errText.trim()}"`);
        } else {
          bug('D-008', 'P1', 'Login failed — API may be down', `Still at: ${page.url()}`);
        }
      }
    }

    // ── 4. Dashboard ───────────────────────────────
    section('4. Dashboard (after login)');
    if (!page.url().includes('/login')) {
      // Wait for dashboard to load
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

      const dashUrl = page.url();
      ok(`Current URL: ${dashUrl}`);

      // Check sidebar/nav exists
      const sidebar = page.locator('nav, [class*="sidebar"], aside');
      if (await sidebar.count() === 0) bug('D-009', 'P2', 'No sidebar/nav found on dashboard');
      else ok('Sidebar/nav present');

      // Check for blank white screen (content exists)
      const mainContent = page.locator('main, [class*="content"], [class*="dashboard"]');
      if (await mainContent.count() === 0) bug('D-010', 'P2', 'No main content area found on dashboard');
      else ok('Main content area present');

      // Check for spinner stuck (loading state)
      await page.waitForTimeout(3000);
      const spinners = page.locator('[class*="spinner"], [class*="loading"], .loading');
      const spinCount = await spinners.count();
      if (spinCount > 0) {
        bug('D-011', 'P2', 'Loading spinner still visible 3s after dashboard load', `${spinCount} spinner(s)`);
      } else {
        ok('No stuck loading spinners');
      }

      // Check for broken images
      const brokenImages = await page.evaluate(() => {
        const imgs = [...document.querySelectorAll('img')];
        return imgs.filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src);
      });
      if (brokenImages.length > 0) {
        bug('D-012', 'P2', 'Broken images on dashboard', brokenImages.slice(0,3).join(', '));
      } else {
        ok('No broken images');
      }

      // ── 5. Navigation ──────────────────────────────
      section('5. Navigation');
      const navLinks = page.locator('nav a, aside a, [class*="menu"] a');
      const linkCount = await navLinks.count();
      ok(`Found ${linkCount} nav links`);

      // Test a few nav links
      const navTargets = [
        { label: 'analyze', urlPart: 'analyze' },
        { label: 'discovery', urlPart: 'discovery' },
        { label: 'signals', urlPart: 'signals' },
      ];

      for (const target of navTargets) {
        const link = page.locator(`nav a[href*="${target.urlPart}"], aside a[href*="${target.urlPart}"]`).first();
        if (await link.count() > 0) {
          await link.click();
          await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
          if (page.url().includes(target.urlPart)) {
            ok(`Navigation to /${target.urlPart} works`);
          } else {
            bug(`D-01${3 + navTargets.indexOf(target)}`, 'P2', `Navigation to /${target.urlPart} failed`, page.url());
          }
          // Go back to dashboard
          await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
        }
      }

      // ── 6. Responsive layout ───────────────────────
      section('6. Responsive layout check');
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.setViewportSize({ width: 900, height: 600 });
      await page.waitForTimeout(500);
      const overflowSmall = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
      if (overflowSmall) bug('D-016', 'P2', 'Horizontal overflow at 900px viewport (min-width breakpoint)');
      else ok('No overflow at 900px viewport');
      await page.setViewportSize({ width: 1280, height: 800 });

      // ── 7. Profile/logout ──────────────────────────
      section('7. Profile/logout');
      const userMenu = page.locator('[class*="avatar"], [class*="user-menu"], button:has-text("Logout"), button:has-text("Chiqish")');
      if (await userMenu.count() > 0) {
        ok('User menu/avatar present');
      } else {
        bug('D-017', 'P2', 'No user menu/avatar found — cannot logout from UI');
      }
    }

    // ── 8. Console errors summary ──────────────────
    section('8. Console & Network errors');
    if (consoleErrors.length === 0) {
      ok('No console errors detected');
    } else {
      // Filter out known non-critical ones
      const criticalErrors = consoleErrors.filter(e =>
        !e.includes('favicon') &&
        !e.includes('plausible') &&
        !e.includes('HMR')
      );
      if (criticalErrors.length > 0) {
        bug('D-018', 'P1', `${criticalErrors.length} console error(s)`, criticalErrors.slice(0, 3).join(' | '));
      } else {
        ok(`${consoleErrors.length} non-critical console error(s) (favicon/plausible/HMR)`);
      }
    }

    const criticalNetErrors = networkErrors.filter(e =>
      !e.includes('plausible') &&
      !e.includes('favicon') &&
      !e.includes('hot-update')
    );
    if (criticalNetErrors.length > 0) {
      bug('D-019', 'P1', `${criticalNetErrors.length} network error(s)`, criticalNetErrors.slice(0, 3).join(' | '));
    } else {
      ok('No critical network errors');
    }

  } catch (err) {
    console.error('\n  💥 Test crashed:', err.message);
    bugs.push({ id: 'D-000', severity: 'P0', description: 'Test runner crashed', detail: err.message });
  } finally {
    await browser.close();
  }

  // ── Summary ────────────────────────────────────
  section('SUMMARY');
  if (bugs.length === 0) {
    console.log('  🎉 No bugs found!');
  } else {
    console.log(`  Found ${bugs.length} issue(s):\n`);
    bugs.forEach(b => console.log(`  [${b.severity}] ${b.id}: ${b.description}${b.detail ? '\n         → ' + b.detail : ''}`));
  }

  console.log('\n');
  return bugs;
}

run().catch(console.error);
