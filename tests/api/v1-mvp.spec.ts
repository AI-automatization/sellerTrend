import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Uzum Trend Finder — v1.0 MVP Backend API Tests
 * Prerequisites: API running on localhost:3000, DB seeded
 */

const API = '/api/v1';
let adminToken = '';
let demoToken = '';

// Helper: login and get token
async function login(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<string> {
  const res = await request.post(`${API}/auth/login`, {
    data: { email, password },
  });
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(body.access_token).toBeTruthy();
  return body.access_token;
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ============================================================
// AUTH
// ============================================================

test.describe.serial('Auth', () => {
  test('admin login', async ({ request }) => {
    adminToken = await login(request, 'admin@uzum-trend.uz', 'Admin123!');
    const res = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@uzum-trend.uz', password: 'Admin123!' },
    });
    const body = await res.json();
    expect(body.account_id).toBe('aaaaaaaa-0000-0000-0000-000000000001');
    expect(body.status).toBe('ACTIVE');
  });

  test('demo login', async ({ request }) => {
    demoToken = await login(request, 'demo@uzum-trend.uz', 'Demo123!');
    expect(demoToken).toBeTruthy();
  });

  test('wrong password returns 401', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@uzum-trend.uz', password: 'WrongPassword' },
    });
    expect(res.status()).toBe(401);
  });

  test('register with referral_code field accepted', async ({ request }) => {
    const res = await request.post(`${API}/auth/register`, {
      data: {
        email: `pw-test-${Date.now()}@test.uz`,
        password: 'TestPass123!',
        company_name: 'PW Test Company',
        referral_code: 'INVALID_CODE',
      },
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.access_token).toBeTruthy();
  });
});

// ============================================================
// HEALTH
// ============================================================

test.describe('Health', () => {
  test('GET /health — ok', async ({ request }) => {
    const res = await request.get(`${API}/health`);
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.db).toBe('ok');
  });
});

// ============================================================
// Feature 08 — Public Leaderboard (NO AUTH)
// ============================================================

test.describe('F08: Public Leaderboard', () => {
  test('GET /leaderboard/public — top products, no auth', async ({ request }) => {
    const res = await request.get(`${API}/leaderboard/public`);
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);

    if (body.length > 0) {
      expect(body[0].rank).toBe(1);
      expect(body[0].product_id).toBeTruthy();
      expect(body[0].title).toBeTruthy();

      // Top 5 should have score, items after rank 5 masked
      for (const item of body.slice(0, Math.min(5, body.length))) {
        expect(item.score).not.toBeNull();
      }
      if (body.length > 5) {
        expect(body[5].score).toBeNull();
        expect(body[5].title).toContain('***');
      }
    }
  });

  test('GET /leaderboard/public/categories', async ({ request }) => {
    const res = await request.get(`${API}/leaderboard/public/categories`);
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

// ============================================================
// Feature 02 — Seasonal Trend Calendar
// ============================================================

test.describe.serial('F02: Seasonal Calendar', () => {
  test.beforeAll(async ({ request }) => {
    if (!adminToken) adminToken = await login(request, 'admin@uzum-trend.uz', 'Admin123!');
  });

  test('GET /discovery/seasonal-calendar — all events (11+)', async ({ request }) => {
    const res = await request.get(`${API}/discovery/seasonal-calendar`, {
      headers: authHeader(adminToken),
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.events.length).toBeGreaterThanOrEqual(10);

    const event = body.events[0];
    expect(event.name).toBeTruthy();
    expect(event.start_month).toBeGreaterThanOrEqual(1);
    expect(event.end_month).toBeLessThanOrEqual(12);
    expect(event.boost).not.toBeNull();

    const names = body.events.map((e: any) => e.name);
    expect(names).toContain('Yangi Yil');
    expect(names).toContain('8-Mart');
    expect(names).toContain('Ramazon');
    expect(names).toContain('Black Friday');
    expect(names).toContain('Maktab mavsumi');
  });

  test('GET /discovery/seasonal-calendar/upcoming — current/next month', async ({ request }) => {
    const res = await request.get(`${API}/discovery/seasonal-calendar/upcoming`, {
      headers: authHeader(adminToken),
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.current_month).toBeGreaterThanOrEqual(1);
    expect(body.events.length).toBeGreaterThan(0);
  });

  test('requires auth', async ({ request }) => {
    const res = await request.get(`${API}/discovery/seasonal-calendar`);
    expect(res.status()).toBe(401);
  });
});

// ============================================================
// Feature 09 — Profit Calculator 2.0
// ============================================================

test.describe.serial('F09: Profit Calculator', () => {
  test.beforeAll(async ({ request }) => {
    if (!adminToken) adminToken = await login(request, 'admin@uzum-trend.uz', 'Admin123!');
  });

  test('calculates profit correctly', async ({ request }) => {
    const res = await request.post(`${API}/tools/profit-calculator`, {
      headers: authHeader(adminToken),
      data: {
        sell_price_uzs: 100000,
        unit_cost_usd: 5,
        usd_to_uzs: 12800,
        uzum_commission_pct: 10,
        quantity: 100,
      },
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.revenue).toBe(10000000);
    expect(body.unit_cost_uzs).toBe(64000);
    expect(body.commission).toBe(1000000);
    expect(body.net_profit).toBeGreaterThan(0);
    expect(body.margin_pct).toBeGreaterThan(0);
    expect(body.roi_pct).toBeGreaterThan(0);
    expect(body.breakeven_qty).toBeGreaterThan(0);
    expect(body.breakeven_price).toBeGreaterThan(0);
  });

  test('with optional fields (fbo + ads)', async ({ request }) => {
    const res = await request.post(`${API}/tools/profit-calculator`, {
      headers: authHeader(adminToken),
      data: {
        sell_price_uzs: 200000,
        unit_cost_usd: 10,
        usd_to_uzs: 12800,
        uzum_commission_pct: 15,
        fbo_cost_uzs: 5000,
        ads_spend_uzs: 3000,
        quantity: 50,
      },
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.revenue).toBe(10000000);
    expect(body.total_cost).toBeGreaterThan(body.unit_cost_uzs * 50);
  });

  test('validation error (missing fields)', async ({ request }) => {
    const res = await request.post(`${API}/tools/profit-calculator`, {
      headers: authHeader(adminToken),
      data: { sell_price_uzs: -1 },
    });
    expect(res.status()).toBe(400);
  });

  test('requires auth', async ({ request }) => {
    const res = await request.post(`${API}/tools/profit-calculator`, {
      data: { sell_price_uzs: 100000 },
    });
    expect(res.status()).toBe(401);
  });
});

// ============================================================
// Feature 04 — Niche Finder
// ============================================================

test.describe.serial('F04: Niche Finder', () => {
  test.beforeAll(async ({ request }) => {
    if (!adminToken) adminToken = await login(request, 'admin@uzum-trend.uz', 'Admin123!');
  });

  test('GET /discovery/niches — niche scores', async ({ request }) => {
    const res = await request.get(`${API}/discovery/niches`, {
      headers: authHeader(adminToken),
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();

    if (body.run_id) {
      expect(body.niches.length).toBeGreaterThan(0);
      const niche = body.niches[0];
      expect(niche.product_id).toBeTruthy();
      expect(niche.niche_score).toBeGreaterThanOrEqual(0);
      expect(typeof niche.is_opportunity).toBe('boolean');

      // Sorted desc
      for (let i = 1; i < body.niches.length; i++) {
        expect(body.niches[i - 1].niche_score).toBeGreaterThanOrEqual(body.niches[i].niche_score);
      }
    }
  });

  test('GET /discovery/niches/gaps — demand-supply gaps', async ({ request }) => {
    const res = await request.get(`${API}/discovery/niches/gaps`, {
      headers: authHeader(adminToken),
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    if (body.run_id) {
      expect(body.avg_weekly_bought).toBeGreaterThan(0);
      expect(body.seller_count).toBeGreaterThan(0);
      if (body.gaps.length > 0) {
        expect(body.gaps[0].demand_ratio).toBeGreaterThan(1.5);
      }
    }
  });

  test('filter by category_id', async ({ request }) => {
    const res = await request.get(`${API}/discovery/niches?category_id=10012`, {
      headers: authHeader(adminToken),
    });
    expect(res.ok()).toBe(true);
  });
});

// ============================================================
// Feature 03 — Shop Intelligence
// ============================================================

test.describe.serial('F03: Shop Intelligence', () => {
  test.beforeAll(async ({ request }) => {
    if (!adminToken) adminToken = await login(request, 'admin@uzum-trend.uz', 'Admin123!');
  });

  test('404 for unknown shop', async ({ request }) => {
    const res = await request.get(`${API}/shops/999999999`, {
      headers: authHeader(adminToken),
    });
    expect(res.status()).toBe(404);
  });

  test('requires auth', async ({ request }) => {
    const res = await request.get(`${API}/shops/1`);
    expect(res.status()).toBe(401);
  });
});

// ============================================================
// Feature 06 — Referral System
// ============================================================

test.describe.serial('F06: Referral System', () => {
  let referralCode: string;

  test.beforeAll(async ({ request }) => {
    if (!adminToken) adminToken = await login(request, 'admin@uzum-trend.uz', 'Admin123!');
  });

  test('POST /referrals/generate-code — generates 8-char code', async ({ request }) => {
    const res = await request.post(`${API}/referrals/generate-code`, {
      headers: authHeader(adminToken),
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.code).toBeTruthy();
    expect(body.code.length).toBe(8);
    referralCode = body.code;
  });

  test('returns same code on repeat call', async ({ request }) => {
    const res = await request.post(`${API}/referrals/generate-code`, {
      headers: authHeader(adminToken),
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.code).toBe(referralCode);
  });

  test('GET /referrals/stats — statistics', async ({ request }) => {
    const res = await request.get(`${API}/referrals/stats`, {
      headers: authHeader(adminToken),
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.my_code).toBeTruthy();
    expect(typeof body.total_referred).toBe('number');
    expect(typeof body.active).toBe('number');
    expect(typeof body.earned_days).toBe('number');
  });

  test('requires auth', async ({ request }) => {
    const res = await request.get(`${API}/referrals/stats`);
    expect(res.status()).toBe(401);
  });
});

// ============================================================
// Feature 07 — API Access (Dev Plan)
// ============================================================

test.describe.serial('F07: API Keys', () => {
  let createdKeyId: string;

  test.beforeAll(async ({ request }) => {
    if (!adminToken) adminToken = await login(request, 'admin@uzum-trend.uz', 'Admin123!');
  });

  test('POST /api-keys — creates key with utf_ prefix', async ({ request }) => {
    const res = await request.post(`${API}/api-keys`, {
      headers: authHeader(adminToken),
      data: { name: 'Playwright Test Key' },
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.id).toBeTruthy();
    expect(body.key).toMatch(/^utf_/);
    expect(body.key.length).toBe(68);
    expect(body.name).toBe('Playwright Test Key');
    expect(body.daily_limit).toBe(1000);
    createdKeyId = body.id;
  });

  test('GET /api-keys — lists keys (no raw key)', async ({ request }) => {
    const res = await request.get(`${API}/api-keys`, {
      headers: authHeader(adminToken),
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.length).toBeGreaterThan(0);
    const key = body.find((k: any) => k.id === createdKeyId);
    expect(key).toBeTruthy();
    expect(key.key_prefix).toMatch(/^utf_/);
    expect(key.key).toBeUndefined();
  });

  test('DELETE /api-keys/:id — deactivates', async ({ request }) => {
    const res = await request.delete(`${API}/api-keys/${createdKeyId}`, {
      headers: authHeader(adminToken),
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.message).toContain('deactivated');

    // Verify deactivated
    const listRes = await request.get(`${API}/api-keys`, {
      headers: authHeader(adminToken),
    });
    const keys = await listRes.json();
    const deactivated = keys.find((k: any) => k.id === createdKeyId);
    expect(deactivated.is_active).toBe(false);
  });

  test('validation error (name too short)', async ({ request }) => {
    const res = await request.post(`${API}/api-keys`, {
      headers: authHeader(adminToken),
      data: { name: 'x' },
    });
    expect(res.status()).toBe(400);
  });
});

// ============================================================
// Feature 10 — Quick Score (Browser Extension)
// ============================================================

test.describe.serial('F10: Quick Score', () => {
  test.beforeAll(async ({ request }) => {
    if (!adminToken) adminToken = await login(request, 'admin@uzum-trend.uz', 'Admin123!');
  });

  test('returns lightweight score for known product', async ({ request }) => {
    const productsRes = await request.get(`${API}/products/tracked`, {
      headers: authHeader(adminToken),
    });
    const products = await productsRes.json();
    if (!Array.isArray(products) || products.length === 0) {
      test.skip();
      return;
    }
    const pid = products[0].product_id;
    const res = await request.get(`${API}/uzum/product/${pid}/quick-score`, {
      headers: authHeader(adminToken),
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(typeof body.score).toBe('number');
    expect(body.last_updated).toBeTruthy();
  });

  test('404 for unknown product', async ({ request }) => {
    const res = await request.get(`${API}/uzum/product/999999999/quick-score`, {
      headers: authHeader(adminToken),
    });
    expect(res.status()).toBe(404);
  });

  test('requires auth', async ({ request }) => {
    const res = await request.get(`${API}/uzum/product/118279/quick-score`);
    expect(res.status()).toBe(401);
  });
});

// ============================================================
// Feature 05 — CSV/Excel Export
// ============================================================

test.describe.serial('F05: Export', () => {
  test.beforeAll(async ({ request }) => {
    if (!adminToken) adminToken = await login(request, 'admin@uzum-trend.uz', 'Admin123!');
  });

  test('GET /products/export/csv — CSV download', async ({ request }) => {
    const res = await request.get(`${API}/products/export/csv`, {
      headers: authHeader(adminToken),
    });
    expect(res.ok()).toBe(true);
    expect(res.headers()['content-type']).toContain('text/csv');
    expect(res.headers()['content-disposition']).toContain('tracked-products.csv');

    const text = await res.text();
    expect(text).toContain('product_id');
    expect(text).toContain('title');
    expect(text).toContain('score');
    expect(text.trim().split('\n').length).toBeGreaterThan(1);
  });

  test('GET /discovery/export/excel — missing run_id → 400', async ({ request }) => {
    const res = await request.get(`${API}/discovery/export/excel`, {
      headers: authHeader(adminToken),
    });
    expect(res.status()).toBe(400);
  });

  test('GET /discovery/export/excel?run_id=... — XLSX download', async ({ request }) => {
    const runsRes = await request.get(`${API}/discovery/runs`, {
      headers: authHeader(adminToken),
    });
    const runs = await runsRes.json();
    if (!Array.isArray(runs)) { test.skip(); return; }
    const doneRun = runs.find((r: any) => r.status === 'DONE');
    if (!doneRun) { test.skip(); return; }

    const res = await request.get(`${API}/discovery/export/excel?run_id=${doneRun.id}`, {
      headers: authHeader(adminToken),
    });
    expect(res.ok()).toBe(true);
    expect(res.headers()['content-type']).toContain('application/vnd.openxmlformats');
    expect(res.headers()['content-disposition']).toContain('.xlsx');
  });
});

// ============================================================
// Feature 01 — Competitor Tracker (verify)
// ============================================================

test.describe.serial('F01: Competitor Tracker (verify)', () => {
  test.beforeAll(async ({ request }) => {
    if (!adminToken) adminToken = await login(request, 'admin@uzum-trend.uz', 'Admin123!');
  });

  test('GET tracked competitors', async ({ request }) => {
    const productsRes = await request.get(`${API}/products/tracked`, {
      headers: authHeader(adminToken),
    });
    const products = await productsRes.json();
    if (!Array.isArray(products) || products.length === 0) { test.skip(); return; }

    const res = await request.get(
      `${API}/competitor/products/${products[0].product_id}/tracked`,
      { headers: authHeader(adminToken) },
    );
    expect(res.ok()).toBe(true);
    const body = await res.json();
    // May return array or object with competitors field
    expect(body).toBeTruthy();
  });
});

// ============================================================
// Global Logger + Security
// ============================================================

test.describe('Global Logger & Security', () => {
  test('interceptor does not break requests', async ({ request }) => {
    const res = await request.get(`${API}/health`);
    expect(res.ok()).toBe(true);
  });

  test('protected endpoints return 401 without token', async ({ request }) => {
    for (const url of [
      `${API}/products/tracked`,
      `${API}/discovery/runs`,
      `${API}/referrals/stats`,
      `${API}/api-keys`,
      `${API}/shops/1`,
    ]) {
      const res = await request.get(url);
      expect(res.status()).toBe(401);
    }
  });
});

// ============================================================
// Existing endpoints (regression)
// ============================================================

test.describe.serial('Regression: Discovery + Products', () => {
  test.beforeAll(async ({ request }) => {
    if (!adminToken) adminToken = await login(request, 'admin@uzum-trend.uz', 'Admin123!');
  });

  test('GET /discovery/runs', async ({ request }) => {
    const res = await request.get(`${API}/discovery/runs`, {
      headers: authHeader(adminToken),
    });
    expect(res.ok()).toBe(true);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  test('GET /discovery/leaderboard', async ({ request }) => {
    const res = await request.get(`${API}/discovery/leaderboard`, {
      headers: authHeader(adminToken),
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(Array.isArray(body.winners)).toBe(true);
  });

  test('GET /products/tracked', async ({ request }) => {
    const res = await request.get(`${API}/products/tracked`, {
      headers: authHeader(adminToken),
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    if (body.length > 0) {
      expect(body[0].product_id).toBeTruthy();
      expect(body[0].title).toBeTruthy();
    }
  });
});
