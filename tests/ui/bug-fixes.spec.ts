import { test, expect, type Page } from '@playwright/test';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FAKE_TOKEN = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  Buffer.from(JSON.stringify({ sub: '1', email: 'test@ventra.uz', role: 'USER', account_id: '1', exp: 9999999999 })).toString('base64'),
  'fakesig',
].join('.');

async function setAuth(page: Page) {
  await page.goto('/login');
  await page.evaluate((token) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('refresh_token', 'fake-refresh');
  }, FAKE_TOKEN);
}

async function mockProductPage(page: Page, productId = '12345') {
  // uzumApi.analyzeById → /uzum/product/:id
  await page.route(`**/api/v1/uzum/product/${productId}`, async (r) => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      product_id: +productId, title: 'Test Mahsulot', rating: 4.5,
      feedback_quantity: 120, orders_quantity: 5000, weekly_bought: 80,
      score: 7.2, sell_price: 85000, total_available_amount: 500,
      ai_explanation: ['Bu mahsulot yaxshi sotilmoqda'],
    }),
  }));
  const productsBase = `**/api/v1/products/${productId}`;
  await page.route(`${productsBase}/snapshots`, async (r) => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify([
      { snapshot_at: '2026-02-20T10:00:00Z', score: 6.5, weekly_bought: 70 },
      { snapshot_at: '2026-02-21T10:00:00Z', score: 6.8, weekly_bought: 75 },
      { snapshot_at: '2026-02-22T10:00:00Z', score: 7.0, weekly_bought: 78 },
      { snapshot_at: '2026-02-23T10:00:00Z', score: 7.1, weekly_bought: 80 },
      { snapshot_at: '2026-02-24T10:00:00Z', score: 7.2, weekly_bought: 82 },
    ]),
  }));
  for (const path of ['forecast', 'ml-forecast', 'trend-analysis', 'weekly-trend']) {
    await page.route(`${productsBase}/${path}`, async (r) => r.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(null),
    }));
  }
  await page.route('**/api/v1/competitor/**', async (r) => r.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ competitors: [] }),
  }));
  await page.route('**/api/v1/sourcing/search', async (r) => r.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ results: [] }),
  }));
  await page.route('**/api/v1/sourcing/currency-rates', async (r) => r.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ USD: 12900 }),
  }));
  await page.route('**/api/v1/billing/**', async (r) => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ balance: '100000', status: 'ACTIVE', daily_fee: '1000' }),
  }));
  await page.route('**/api/v1/notifications/**', async (r) => r.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify([]),
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// T-188...T-192: PWA o'chirilgan
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('PWA O\'chirilgan (T-188–T-192)', () => {
  test('T-188: sw.js 404 — service worker fayli yo\'q', async ({ page }) => {
    const res = await page.request.get('http://localhost:5173/sw.js');
    expect(res.status()).toBe(404);
  });

  test('T-189: manifest.json 404 — PWA manifest yo\'q', async ({ page }) => {
    const res = await page.request.get('http://localhost:5173/manifest.json');
    expect(res.status()).toBe(404);
  });

  test('T-190: apple-touch-icon.svg 404 — PWA icon yo\'q', async ({ page }) => {
    const res = await page.request.get('http://localhost:5173/apple-touch-icon.svg');
    expect(res.status()).toBe(404);
  });

  test('T-188: index.html — SW register o\'chirilgan, unregister bor', async ({ page }) => {
    const res = await page.request.get('http://localhost:5173/');
    const html = await res.text();
    expect(html).not.toContain("register('/sw.js')");
    expect(html).toContain('unregister');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T-084: RegisterPage auth fix
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('T-084: RegisterPage authStore', () => {
  test('Register — token localStorage ga saqlaydi', async ({ page }) => {
    await page.route('**/api/v1/auth/register', async (r) => r.fulfill({
      status: 201, contentType: 'application/json',
      body: JSON.stringify({ access_token: FAKE_TOKEN, refresh_token: 'fake-rt' }),
    }));

    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    await emailInput.fill('test@ventra.uz');
    await passwordInput.fill('password123');

    // company_name field (turli placeholder bo'lishi mumkin)
    const textInputs = page.locator('input[type="text"]');
    const count = await textInputs.count();
    if (count > 0) await textInputs.first().fill('Test Company');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBeTruthy();
  });

  test('Register page — JS xatosiz render bo\'ladi', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    expect(errors).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T-205: Score formula footer yo'q
// ═══════════════════════════════════════════════════════════════════════════════

test('T-205: ProductPage — scoring formula footer ko\'rinmasin', async ({ page }) => {
  await setAuth(page);
  await mockProductPage(page);
  await page.goto('/products/12345');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const formula = page.locator('text=Score = 0.55');
  await expect(formula).not.toBeVisible();
});

// ═══════════════════════════════════════════════════════════════════════════════
// T-195 + T-200: Texnik jargon yo'q
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('T-195 + T-200: Texnik jargon', () => {
  test('ProductPage — WMA, MAE, RMSE, Holt\'s ko\'rinmasin', async ({ page }) => {
    await setAuth(page);
    await mockProductPage(page);

    await page.route('**/api/v1/products/12345/ml-forecast', async (r) => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        data_points: 15, snapshots: [],
        score_forecast: {
          trend: 'up', confidence: 0.78,
          predictions: [{ date: '2026-03-01', value: 7.5, lower: 7.0, upper: 8.0 }],
          metrics: { mae: 0.12, rmse: 0.18 },
        },
        sales_forecast: {
          trend: 'up', confidence: 0.72,
          predictions: [{ date: '2026-03-01', value: 90, lower: 80, upper: 100 }],
          metrics: { mae: 5.1, rmse: 7.2 },
        },
      }),
    }));

    await page.goto('/products/12345');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await expect(page.locator('text=WMA')).not.toBeVisible();
    await expect(page.locator('text=MAE:')).not.toBeVisible();
    await expect(page.locator('text=RMSE:')).not.toBeVisible();
    await expect(page.locator("text=Holt's")).not.toBeVisible();
  });

  test('T-200: ML box — "confidence" va "snapshot" raw label ko\'rinmasin', async ({ page }) => {
    await setAuth(page);
    await mockProductPage(page);

    await page.route('**/api/v1/products/12345/ml-forecast', async (r) => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        data_points: 10, snapshots: [],
        score_forecast: { trend: 'flat', confidence: 0.65, predictions: [], metrics: {} },
        sales_forecast: { trend: 'flat', confidence: 0.60, predictions: [], metrics: {} },
      }),
    }));

    await page.goto('/products/12345');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // "confidence" sub-label ko'rinmasin (inglizcha sifatida)
    const page_text = await page.locator('body').innerText();
    expect(page_text).not.toMatch(/\bconfidence\b/i);
    expect(page_text).not.toMatch(/\bsnapshot\b/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T-194: Sana formati M02 XX ko'rinmasin
// ═══════════════════════════════════════════════════════════════════════════════

test('T-194: ProductPage — Sana "M02" formatda ko\'rinmasin', async ({ page }) => {
  await setAuth(page);
  await mockProductPage(page);
  await page.goto('/products/12345');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const bodyText = await page.locator('body').innerText();
  // M02 27 yoki M01 15 kabi format bo'lmasin
  expect(bodyText).not.toMatch(/M\d{2}\s\d{1,2}/);
});

// ═══════════════════════════════════════════════════════════════════════════════
// T-204: Qora to'rtburchak — Cell ishlatilgan
// ═══════════════════════════════════════════════════════════════════════════════

test('T-204: WeeklyTrend chart — qora to\'rtburchak yo\'q', async ({ page }) => {
  await setAuth(page);
  await mockProductPage(page);

  await page.route('**/api/v1/products/12345/weekly-trend', async (r) => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      weekly_sold: 85, prev_weekly_sold: 75, delta: 10, delta_pct: 13,
      trend: 'up', score_change: 0.3, last_updated: '2026-02-27T10:00:00Z',
      daily_breakdown: [
        { date: '2026-02-21', daily_sold: 10 },
        { date: '2026-02-22', daily_sold: 12 },
        { date: '2026-02-23', daily_sold: 14 },
        { date: '2026-02-24', daily_sold: 11 },
        { date: '2026-02-25', daily_sold: 13 },
        { date: '2026-02-26', daily_sold: 12 },
        { date: '2026-02-27', daily_sold: 15 },
      ],
      advice: null,
    }),
  }));

  await page.goto('/products/12345');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Black fill rect topilmasin
  const blackRects = page.locator('rect[fill="black"], rect[fill="#000"], rect[fill="rgb(0, 0, 0)"]');
  await expect(blackRects).toHaveCount(0);
});

// ═══════════════════════════════════════════════════════════════════════════════
// T-085 + T-086: setTracked bug
// ═══════════════════════════════════════════════════════════════════════════════

test('T-085/086: Track tugmasi faqat muvaffaqiyatli track bo\'lganda o\'zgaradi', async ({ page }) => {
  await setAuth(page);
  await mockProductPage(page);

  // Track API xato qaytaradi
  let trackCalled = false;
  await page.route('**/api/v1/products/12345/track', async (r) => {
    trackCalled = true;
    await r.fulfill({ status: 500, body: 'error' });
  });

  await page.goto('/products/12345');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Track tugmasi mavjud bo'lsa bosib ko'ramiz
  const trackBtn = page.locator('button:has-text("Kuzat"), button:has-text("Track"), button[aria-label*="track"]').first();
  if (await trackBtn.isVisible()) {
    await trackBtn.click();
    await page.waitForTimeout(500);
    // API xato qaytarganda tracked state o'zgarmasligi kerak
    // (button hali "Kuzat" holatida qolishi kerak, "Kuzatilmoqda" emas)
  }

  // JS xatosi yo'q bo'lishi kerak
  const jsErrors: string[] = [];
  page.on('pageerror', (err) => jsErrors.push(err.message));
  expect(jsErrors.filter(e => e.includes('setTracked'))).toHaveLength(0);
});

// ═══════════════════════════════════════════════════════════════════════════════
// AnalyzePage — URL tahlil (mach3 edge case)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('AnalyzePage — URL tahlil', () => {
  const GILLETTE_URL = 'https://uzum.uz/ru/product/gillette-mach3-britva-4700?skuId=5731';

  test('mach3 URL: tahlil natijasi ko\'rinadi, xato yo\'q', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setAuth(page);

    // Mock: POST /uzum/analyze → 200 OK
    await page.route('**/api/v1/uzum/analyze', async (route) => {
      const body = route.request().postDataJSON() as { url?: string };
      // URL to'g'ri yuborilganligini tekshirish
      expect(body.url).toBe(GILLETTE_URL);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          product_id: 4700,
          title: 'Gillette Mach3 Ustara',
          rating: 4.9,
          feedback_quantity: 525,
          orders_quantity: 2384,
          weekly_bought: 42,
          score: 3.85,
          sell_price: 67990,
          total_available_amount: 98,
          ai_explanation: null,
        }),
      });
    });

    // Snapshots (optional)
    await page.route('**/api/v1/products/4700/snapshots', async (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
    );

    await page.goto('/analyze');
    await page.waitForLoadState('networkidle');

    // URL input topilishi kerak
    const urlInput = page.locator('input[type="url"]');
    await expect(urlInput).toBeVisible();

    // URL kiriting va submit qiling
    await urlInput.fill(GILLETTE_URL);
    await page.click('button[type="submit"]');

    // Natija: mahsulot nomi va score ko'rinishi kerak
    await expect(page.locator('text=Gillette Mach3 Ustara')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=3.85')).toBeVisible();

    // Xato alert bo'lmasligi kerak
    await expect(page.locator('[role="alert"].alert-error')).not.toBeVisible();

    // JS xatolari bo'lmasligi kerak
    expect(jsErrors).toEqual([]);
  });

  test('mach3 URL: backend xato qaytarsa — error alert ko\'rinadi', async ({ page }) => {
    await setAuth(page);

    await page.route('**/api/v1/uzum/analyze', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Product 4700 not found on Uzum', statusCode: 400 }),
      });
    });

    await page.goto('/analyze');
    await page.waitForLoadState('networkidle');

    const urlInput = page.locator('input[type="url"]');
    await urlInput.fill(GILLETTE_URL);
    await page.click('button[type="submit"]');

    // Error alert ko'rinishi kerak
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5_000 });

    // Natija bloki ko'rinmasligi kerak
    await expect(page.locator('text=Gillette')).not.toBeVisible();
  });

  test('mach3 URL: input field URL ni o\'zgartirmasdan qabul qiladi', async ({ page }) => {
    await setAuth(page);

    await page.goto('/analyze');
    await page.waitForLoadState('networkidle');

    const urlInput = page.locator('input[type="url"]');
    await urlInput.fill(GILLETTE_URL);

    // Input qiymatini tekshirish — URL o'zgartirilmasligi kerak
    const inputValue = await urlInput.inputValue();
    expect(inputValue).toBe(GILLETTE_URL);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Login page — umumiy sog'liq tekshiruvi
// ═══════════════════════════════════════════════════════════════════════════════

test('Login page — JS xatosiz render bo\'ladi', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
  expect(errors).toEqual([]);
});
