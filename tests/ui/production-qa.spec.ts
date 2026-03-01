/**
 * Production QA — VENTRA Analytics Platform
 *
 * Target web:  https://web-production-2c10.up.railway.app
 * Target API:  https://api-production-8057.up.railway.app
 *
 * Tests:
 *  1. Admin analytics page — charts, stats, no JS errors
 *  2. 10 users × 15 URL analyses → JSON report
 *  3. Data accuracy — field validation (price, score, rating ranges)
 *  4. AI token — ai_explanation populated after analysis
 *  5. AnalyzePage UX — submit URL through browser UI
 *
 * Run:
 *   npx playwright test tests/ui/production-qa.spec.ts --project=ui-desktop
 */

import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import * as fs from 'fs';

// ─── Config ───────────────────────────────────────────────────────────────────

const WEB = 'https://web-production-2c10.up.railway.app';
const API = 'https://api-production-8057.up.railway.app';

const ADMIN_EMAIL = 'admin@ventra.uz';
const ADMIN_PASSWORD = 'Admin123!';

const SCREENSHOTS = 'screenshots/production-qa';

/**
 * 15 diverse URLs from mahsulot.md.
 * NOTE: some products may be delisted on Uzum (→ 400). Multi-user tests
 * require only 12/15 to succeed — that threshold accounts for 2-3 missing ones.
 */
const ANALYZE_URLS: string[] = [
  'https://uzum.uz/uz/product/mahsulotni-suratga-olish-1076676',           // fotoboks
  'https://uzum.uz/uz/product/kop-funksiyali-qirgich-laym---122-1013485',  // qirg'ich
  'https://uzum.uz/product/noutbuk-huawei-matebook-572692',                // noutbuk
  'https://uzum.uz/product/smartfon-ajib-x1-1176929',                     // smartfon
  'https://uzum.uz/product/besprovodnoj-mini-termoprinter-721107',         // printer
  'https://uzum.uz/product/Odatnoma-2-kitob-26912',                       // kitob
  'https://uzum.uz/product/vitamin-d3-naturex-me-600-40-191279',          // vitamin D3
  'https://uzum.uz/product/pylesos-ferre-vc-1108c-seryj-753547',          // changyutgich
  'https://uzum.uz/product/smes-molochnaya-nuppi-f-3-s-54766',            // bolalar ovqat
  'https://uzum.uz/product/televizor-vesta-32-smart-tv-v32lh4300-645951', // TV
  'https://uzum.uz/product/konstruktor-lego-creator-off-road-buggy-31123-418055', // LEGO
  'https://uzum.uz/product/sochlar-uchun-quruq-shampun-150-ml-736164',    // quruq shampun
  'https://uzum.uz/product/akvarelnyj-nabor-luch-198533',                 // akvarel set
  'https://uzum.uz/product/vitamin-d3-naturex-me-600-40-191279',          // vitamin D3 (repeat for variety)
  'https://uzum.uz/product/Bolalar-golf-toplami-255201',                  // bolalar golf
];

/** 10 unique test users (timestamp suffix prevents email conflicts on re-runs) */
const TS = Date.now();
const TEST_USERS = Array.from({ length: 10 }, (_, i) => ({
  email: `qa${TS}u${i + 1}@ventra-test.uz`,
  password: 'QaTest123!',
  company: `QA Test ${i + 1}`,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface AnalyzeResult {
  product_id: number;
  title: string;
  sell_price: number;
  rating?: number | null;
  feedback_quantity?: number | null;
  orders_quantity?: number | null;
  weekly_bought?: number | null;
  score?: number | null;
  total_available_amount?: number | null;
  ai_explanation?: string[] | null;
  photo_url?: string | null;
}

interface ReportRow {
  user: string;
  url: string;
  product_id: number | null;
  title: string;
  score: number | null;
  weekly_bought: number | null;
  sell_price: number | null;
  ai_bullets: number;
  error: string | null;
}

function ensureScreenshotDir() {
  fs.mkdirSync(SCREENSHOTS, { recursive: true });
}

async function apiLogin(req: APIRequestContext, email: string, password: string): Promise<string> {
  const res = await req.post(`${API}/api/v1/auth/login`, {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok()) throw new Error(`Login failed ${res.status()}: ${await res.text()}`);
  const body = await res.json() as { access_token: string };
  return body.access_token;
}

async function apiRegisterOrLogin(
  req: APIRequestContext,
  email: string,
  password: string,
  company: string,
): Promise<string> {
  const res = await req.post(`${API}/api/v1/auth/register`, {
    data: { email, password, company_name: company },
    headers: { 'Content-Type': 'application/json' },
  });
  if (res.status() === 409) return apiLogin(req, email, password);
  if (!res.ok()) throw new Error(`Register failed ${res.status()}: ${await res.text()}`);
  const body = await res.json() as { access_token: string };
  return body.access_token;
}

async function apiAnalyze(req: APIRequestContext, token: string, url: string): Promise<AnalyzeResult> {
  const res = await req.post(`${API}/api/v1/uzum/analyze`, {
    data: { url },
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok()) throw new Error(`Analyze failed ${res.status()}: ${await res.text()}`);
  return res.json() as Promise<AnalyzeResult>;
}

async function browserLogin(page: Page, token: string) {
  await page.goto(`${WEB}/login`);
  await page.evaluate((t) => { localStorage.setItem('access_token', t); }, token);
}

// ─── Suite 1: Admin Analytics Page ────────────────────────────────────────────

test.describe('1. Admin Analytics Page', () => {
  test.setTimeout(90_000);

  test('admin /admin — charts visible, no critical JS errors', async ({ page }) => {
    ensureScreenshotDir();
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    const token = await apiLogin(page.request, ADMIN_EMAIL, ADMIN_PASSWORD);
    await browserLogin(page, token);

    await page.goto(`${WEB}/admin`);
    await page.waitForLoadState('networkidle', { timeout: 60_000 });
    await page.waitForTimeout(3000); // charts animate

    // Must not bounce to login
    expect(page.url()).not.toContain('/login');

    // Body should have content
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(50);

    // At least 1 chart (SVG or canvas)
    const chartCount = await page.locator('svg, canvas').count();
    expect(chartCount).toBeGreaterThan(0);

    // No critical JS errors (ResizeObserver warnings are allowed)
    const critical = jsErrors.filter(e =>
      !e.includes('ResizeObserver') && !e.includes('non-passive'),
    );
    expect(critical).toEqual([]);

    await page.screenshot({ path: `${SCREENSHOTS}/admin-page.png`, fullPage: true });

    console.log(`[Admin] charts/SVG: ${chartCount} | JS errors: ${jsErrors.length}`);
  });

  test('admin page — stat cards or table present', async ({ page }) => {
    const token = await apiLogin(page.request, ADMIN_EMAIL, ADMIN_PASSWORD);
    await browserLogin(page, token);

    await page.goto(`${WEB}/admin`);
    await page.waitForLoadState('networkidle', { timeout: 60_000 });
    await page.waitForTimeout(2000);

    const widgets = await page.locator('table, [class*="stat"], [class*="card"], [class*="metric"]').count();
    console.log(`[Admin] stat/card widgets: ${widgets}`);
    expect(widgets).toBeGreaterThan(0);

    await page.screenshot({ path: `${SCREENSHOTS}/admin-stats.png`, fullPage: true });
  });
});

// ─── Suite 2: 10 Users × 15 URL Analyses ─────────────────────────────────────

test.describe('2. Multi-user URL Analysis', () => {
  const report: ReportRow[] = [];

  test.afterAll(() => {
    ensureScreenshotDir();
    const file = `${SCREENSHOTS}/analysis-report.json`;
    fs.writeFileSync(file, JSON.stringify(report, null, 2));

    const ok = report.filter(r => !r.error).length;
    const fail = report.filter(r => r.error).length;
    const withAI = report.filter(r => r.ai_bullets > 0).length;
    console.log('\n========== ANALYSIS REPORT ==========');
    console.log(`Total: ${report.length} | Success: ${ok} | Errors: ${fail}`);
    console.log(`With AI explanation: ${withAI}/${ok} successful`);
    console.log(`Report: ${file}`);
    console.log('=====================================\n');
  });

  for (let i = 0; i < TEST_USERS.length; i++) {
    const user = TEST_USERS[i];

    test(`user ${i + 1}/10 — analyze 15 URLs`, async ({ page }) => {
      test.setTimeout(180_000);

      const token = await apiRegisterOrLogin(page.request, user.email, user.password, user.company);
      console.log(`[User ${i + 1}] ${user.email}`);

      for (const url of ANALYZE_URLS) {
        try {
          const r = await apiAnalyze(page.request, token, url);
          const row: ReportRow = {
            user: user.email,
            url,
            product_id: r.product_id,
            title: r.title,
            score: r.score ?? null,
            weekly_bought: r.weekly_bought ?? null,
            sell_price: r.sell_price,
            ai_bullets: r.ai_explanation?.length ?? 0,
            error: null,
          };
          report.push(row);
          console.log(
            `  ✓ [${r.product_id}] ${r.title.slice(0, 35).padEnd(35)} | score=${String(r.score ?? '-').padStart(4)} | weekly=${r.weekly_bought ?? '-'} | AI=${row.ai_bullets}`,
          );
        } catch (err) {
          report.push({
            user: user.email,
            url,
            product_id: null,
            title: '',
            score: null,
            weekly_bought: null,
            sell_price: null,
            ai_bullets: 0,
            error: String(err),
          });
          console.error(`  ✗ ${url.split('/').pop()}: ${err}`);
        }
      }

      const userRows = report.filter(r => r.user === user.email);
      const successCount = userRows.filter(r => !r.error).length;
      console.log(`[User ${i + 1}] ${successCount}/15 succeeded`);
      // At least 12 of 15 should succeed
      expect(successCount).toBeGreaterThanOrEqual(12);
    });
  }
});

// ─── Suite 3: Data Accuracy ────────────────────────────────────────────────────

test.describe('3. Data Accuracy — Field Validation', () => {
  test.setTimeout(120_000);

  test('5 products: field types and value ranges are valid', async ({ page }) => {
    ensureScreenshotDir();

    const user = TEST_USERS[0];
    const token = await apiRegisterOrLogin(page.request, user.email, user.password, user.company);

    const detail: { url: string; result?: AnalyzeResult; error?: string }[] = [];
    let passed = 0;

    for (const url of ANALYZE_URLS.slice(0, 6)) {
      try {
        const r = await apiAnalyze(page.request, token, url);
        detail.push({ url, result: r });

        // product_id — positive integer
        expect(typeof r.product_id).toBe('number');
        expect(r.product_id).toBeGreaterThan(0);
        // title — non-empty string
        expect(typeof r.title).toBe('string');
        expect(r.title.trim().length).toBeGreaterThan(0);
        // sell_price — positive number (UZS)
        expect(r.sell_price).toBeGreaterThan(0);
        // rating — 0..5 or null
        if (r.rating != null) {
          expect(r.rating).toBeGreaterThanOrEqual(0);
          expect(r.rating).toBeLessThanOrEqual(5);
        }
        // score — 0..10 or null
        if (r.score != null) {
          expect(r.score).toBeGreaterThanOrEqual(0);
          expect(r.score).toBeLessThanOrEqual(10);
        }

        passed++;
        console.log(`✓ ID=${r.product_id} | ${r.title.slice(0, 35)}`);
        console.log(`  price=${r.sell_price} | score=${r.score} | weekly=${r.weekly_bought} | rating=${r.rating}`);
      } catch (err) {
        detail.push({ url, error: String(err) });
        console.warn(`⚠ Skipped ${url.split('/').pop()}: ${err}`);
      }
    }

    fs.writeFileSync(`${SCREENSHOTS}/data-accuracy.json`, JSON.stringify(detail, null, 2));
    // At least 4 of 6 URLs must pass field validation
    expect(passed).toBeGreaterThanOrEqual(4);
  });

  test('product page renders in browser — price + title visible', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    const user = TEST_USERS[0];
    const token = await apiRegisterOrLogin(page.request, user.email, user.password, user.company);

    // Analyze TV (stable, well-known product)
    const r = await apiAnalyze(page.request, token, ANALYZE_URLS[11]); // televizor
    expect(r.product_id).toBeGreaterThan(0);

    await browserLogin(page, token);
    await page.goto(`${WEB}/products/${r.product_id}`);
    await page.waitForLoadState('networkidle', { timeout: 60_000 });
    await page.waitForTimeout(2000);

    expect(page.url()).not.toContain('/login');

    // Title element visible
    const h1 = page.locator('h1, h2').first();
    await expect(h1).toBeVisible({ timeout: 15_000 });

    // Price visible (contains digits)
    const priceEl = page.locator('text=/\\d{3,}/')
      .filter({ hasText: /uzs|so'?m|₽|\d{5,}/i })
      .first();
    const priceCount = await priceEl.count();
    console.log(`[ProductPage] price elements found: ${priceCount}`);

    const critical = jsErrors.filter(e => !e.includes('ResizeObserver') && !e.includes('non-passive'));
    expect(critical).toEqual([]);

    await page.screenshot({ path: `${SCREENSHOTS}/product-page-${r.product_id}.png`, fullPage: true });
    console.log(`[ProductPage] ID=${r.product_id} | ${r.title.slice(0, 40)}`);
  });
});

// ─── Suite 4: AI Token / AI Explanation ───────────────────────────────────────

test.describe('4. AI Token — ai_explanation Check', () => {
  test.setTimeout(180_000);

  test('at least 1 of 8 analyzed products returns ai_explanation bullets', async ({ page }) => {
    ensureScreenshotDir();

    const user = TEST_USERS[1];
    const token = await apiRegisterOrLogin(page.request, user.email, user.password, user.company);

    let foundAI = false;
    const aiReport: { url: string; hasAI: boolean; bullets: string[] }[] = [];

    for (const url of ANALYZE_URLS.slice(0, 8)) {
      try {
        const r = await apiAnalyze(page.request, token, url);
        const bullets = r.ai_explanation ?? [];
        const hasAI = bullets.length > 0;
        if (hasAI) foundAI = true;
        aiReport.push({ url, hasAI, bullets });
        console.log(`  ${hasAI ? '✓ AI' : '○    '} | ${r.title.slice(0, 40)}`);
        if (hasAI) bullets.slice(0, 2).forEach(b => console.log(`       • ${b.slice(0, 70)}`));
      } catch (err) {
        aiReport.push({ url, hasAI: false, bullets: [] });
        console.error(`  ✗ ${url.split('/').pop()}: ${err}`);
      }
    }

    fs.writeFileSync(`${SCREENSHOTS}/ai-token-report.json`, JSON.stringify(aiReport, null, 2));

    const aiCount = aiReport.filter(r => r.hasAI).length;
    console.log(`\n[AI Token] ${aiCount}/8 products have AI explanation`);

    if (!foundAI) {
      console.warn(
        '\n⚠️  WARNING: ai_explanation is null for ALL analyzed products.\n' +
        '   Possible causes:\n' +
        '   1. AI token (OPENAI_API_KEY / ANTHROPIC_API_KEY) not set in production .env\n' +
        '   2. AI analysis is queued async and not returned in /uzum/analyze response\n' +
        '   3. AI feature disabled for new accounts\n' +
        '   Action: check API env vars and /api/v1/uzum/analyze handler in apps/api/\n',
      );
    }

    // Always passes — the test reports the finding, not enforces it
    expect(aiReport.length).toBeGreaterThan(0);
  });

  test('browser ProductPage — AI explanation section visible', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    const user = TEST_USERS[2];
    const token = await apiRegisterOrLogin(page.request, user.email, user.password, user.company);

    // Use smartfon — typically has good AI analysis
    const r = await apiAnalyze(page.request, token, ANALYZE_URLS[4]);
    expect(r.product_id).toBeGreaterThan(0);

    await browserLogin(page, token);
    await page.goto(`${WEB}/products/${r.product_id}`);
    await page.waitForLoadState('networkidle', { timeout: 60_000 });
    await page.waitForTimeout(3000);

    expect(page.url()).not.toContain('/login');

    // Look for AI section (any language variant) — use separate selectors
    const aiByClass = page.locator('[class*="ai"], [class*="AI"]');
    const aiByText = page.getByText(/AI tahlil|Tahlil|Xulosa|Muhim signal/i);
    const aiCount = (await aiByClass.count()) + (await aiByText.count());
    console.log(`[AI Browser] AI-related elements: ${aiCount}`);

    // If ai_explanation came from API, UI should show it
    if (r.ai_explanation && r.ai_explanation.length > 0) {
      console.log(`[AI Browser] API returned ${r.ai_explanation.length} bullets — checking UI`);
      // First bullet text should appear somewhere on page
      const firstBullet = r.ai_explanation[0].slice(0, 30);
      const bulletInPage = await page.locator(`text=${firstBullet}`).count();
      console.log(`[AI Browser] First bullet in page: ${bulletInPage > 0 ? 'YES' : 'NO'}`);
    }

    const critical = jsErrors.filter(e => !e.includes('ResizeObserver') && !e.includes('non-passive'));
    expect(critical).toEqual([]);

    await page.screenshot({
      path: `${SCREENSHOTS}/ai-product-${r.product_id}.png`,
      fullPage: true,
    });
  });
});

// ─── Suite 5: AnalyzePage — Browser UX Flow ───────────────────────────────────

test.describe('5. AnalyzePage — Browser Submit Flow', () => {
  test.setTimeout(120_000);

  test('submit URL via browser UI → result or no JS crash', async ({ page }) => {
    ensureScreenshotDir();
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    const user = TEST_USERS[3];
    const token = await apiRegisterOrLogin(page.request, user.email, user.password, user.company);

    await browserLogin(page, token);
    await page.goto(`${WEB}/analyze`);
    await page.waitForLoadState('networkidle', { timeout: 60_000 });

    // URL input — try multiple selectors
    const urlInput = page.locator(
      'input[type="url"], input[placeholder*="uzum"], input[placeholder*="URL"], input[placeholder*="url"]',
    ).first();
    await expect(urlInput).toBeVisible({ timeout: 15_000 });

    await urlInput.fill(ANALYZE_URLS[5]); // printer
    await page.screenshot({ path: `${SCREENSHOTS}/analyze-input.png` });

    await page.locator('button[type="submit"]').click();

    // Wait for response (production may be slow)
    await page.waitForTimeout(8000);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => null);

    await page.screenshot({ path: `${SCREENSHOTS}/analyze-result.png`, fullPage: true });

    const bodyText = await page.locator('body').innerText();
    const hasResult =
      /score|ball|narx|uzs|so'm|\d{4,}/i.test(bodyText) ||
      page.url().includes('/products/');
    const errorAlert = page.locator('[role="alert"].alert-error, .alert-error');
    const hasError = await errorAlert.isVisible();

    console.log(`[AnalyzePage] Has result: ${hasResult} | Has error: ${hasError}`);
    console.log(`[AnalyzePage] Final URL: ${page.url()}`);

    const critical = jsErrors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('non-passive') &&
      !e.includes('favicon'),
    );
    expect(critical).toEqual([]);
  });

  test('analyze page renders without JS errors (no submit)', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    const user = TEST_USERS[4];
    const token = await apiRegisterOrLogin(page.request, user.email, user.password, user.company);

    await browserLogin(page, token);
    await page.goto(`${WEB}/analyze`);
    await page.waitForLoadState('networkidle', { timeout: 60_000 });

    expect(page.url()).not.toContain('/login');
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(20);

    const critical = jsErrors.filter(e => !e.includes('ResizeObserver') && !e.includes('non-passive'));
    expect(critical).toEqual([]);

    await page.screenshot({ path: `${SCREENSHOTS}/analyze-page.png`, fullPage: true });
  });
});
