import { test, expect, Page } from '@playwright/test';

/**
 * Uzum Trend Finder — Frontend UI & Responsive Tests
 * Prerequisites: API on localhost:3000, Web on localhost:5173 (or proxied via API)
 *
 * Tests run against API endpoints to verify:
 * 1. All v1.0 MVP endpoints respond correctly
 * 2. Response structures are valid
 * 3. Auth flow works
 */

const API = '/api/v1';
let adminToken = '';

// Helper: login
async function loginAdmin(request: any): Promise<string> {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: 'admin@uzum-trend.uz', password: 'Admin123!' },
  });
  const body = await res.json();
  return body.access_token || '';
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ============================================================
// F08 — LEADERBOARD (PUBLIC — NO AUTH)
// ============================================================

test.describe('F08 — Public Leaderboard', () => {
  test('GET /leaderboard/public returns array', async ({ request }) => {
    const res = await request.get(`${API}/leaderboard/public`);
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('GET /leaderboard/public/categories returns array', async ({ request }) => {
    const res = await request.get(`${API}/leaderboard/public/categories`);
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('leaderboard accessible without auth', async ({ request }) => {
    const res = await request.get(`${API}/leaderboard/public`, {
      headers: {}, // no auth
    });
    expect(res.ok()).toBe(true);
  });
});

// ============================================================
// F09 — PROFIT CALCULATOR
// ============================================================

test.describe('F09 — Profit Calculator', () => {
  test.beforeAll(async ({ request }) => {
    adminToken = await loginAdmin(request);
  });

  test('POST /tools/profit-calculator returns valid result', async ({ request }) => {
    const res = await request.post(`${API}/tools/profit-calculator`, {
      headers: auth(adminToken),
      data: {
        sell_price_uzs: 150000,
        unit_cost_usd: 5,
        usd_to_uzs: 12800,
        uzum_commission_pct: 10,
        fbo_cost_uzs: 5000,
        ads_spend_uzs: 3000,
        quantity: 100,
      },
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.revenue).toBeGreaterThan(0);
    expect(body.net_profit).toBeDefined();
    expect(body.margin_pct).toBeDefined();
    expect(body.roi_pct).toBeDefined();
    expect(body.breakeven_qty).toBeDefined();
    expect(body.breakeven_price).toBeDefined();
  });

  test('profit calculator rejects invalid data', async ({ request }) => {
    const res = await request.post(`${API}/tools/profit-calculator`, {
      headers: auth(adminToken),
      data: { sell_price_uzs: -100, quantity: 0 },
    });
    expect(res.ok()).toBe(false);
  });

  test('profit calculator requires auth', async ({ request }) => {
    const res = await request.post(`${API}/tools/profit-calculator`, {
      data: { sell_price_uzs: 100000, unit_cost_usd: 5, usd_to_uzs: 12800, uzum_commission_pct: 10, quantity: 10 },
    });
    expect(res.status()).toBe(401);
  });
});

// ============================================================
// F02 — SEASONAL CALENDAR
// ============================================================

test.describe('F02 — Seasonal Calendar', () => {
  test.beforeAll(async ({ request }) => {
    adminToken = await loginAdmin(request);
  });

  test('GET /discovery/seasonal-calendar returns events', async ({ request }) => {
    const res = await request.get(`${API}/discovery/seasonal-calendar`, {
      headers: auth(adminToken),
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    // API returns { events: [...] }
    expect(body).toHaveProperty('events');
    expect(Array.isArray(body.events)).toBe(true);
    if (body.events.length > 0) {
      expect(body.events[0]).toHaveProperty('name');
      expect(body.events[0]).toHaveProperty('start_month');
      expect(body.events[0]).toHaveProperty('end_month');
    }
  });

  test('GET /discovery/seasonal-calendar/upcoming returns events', async ({ request }) => {
    const res = await request.get(`${API}/discovery/seasonal-calendar/upcoming`, {
      headers: auth(adminToken),
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    // API returns { events: [...] }
    expect(body).toHaveProperty('events');
    expect(Array.isArray(body.events)).toBe(true);
  });
});

// ============================================================
// F04 — NICHE FINDER
// ============================================================

test.describe('F04 — Niche Finder', () => {
  test.beforeAll(async ({ request }) => {
    adminToken = await loginAdmin(request);
  });

  test('GET /discovery/niches returns niches object', async ({ request }) => {
    const res = await request.get(`${API}/discovery/niches`, {
      headers: auth(adminToken),
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    // API returns { niches: [...], ... }
    expect(body).toHaveProperty('niches');
    expect(Array.isArray(body.niches)).toBe(true);
  });

  test('GET /discovery/niches/gaps returns gaps object', async ({ request }) => {
    const res = await request.get(`${API}/discovery/niches/gaps`, {
      headers: auth(adminToken),
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    // API returns { gaps: [...], ... }
    expect(body).toBeTruthy();
  });
});

// ============================================================
// F03 — SHOP INTELLIGENCE
// ============================================================

test.describe('F03 — Shop Intelligence', () => {
  test.beforeAll(async ({ request }) => {
    adminToken = await loginAdmin(request);
  });

  test('GET /shops/:shopId returns shop data or 404', async ({ request }) => {
    const res = await request.get(`${API}/shops/1`, {
      headers: auth(adminToken),
    });
    // may return 404 if no shop data — both are valid
    expect([200, 404]).toContain(res.status());
    if (res.ok()) {
      const body = await res.json();
      expect(body).toHaveProperty('shop_id');
      expect(body).toHaveProperty('trust_score');
    }
  });

  test('GET /shops/:shopId/products returns array', async ({ request }) => {
    const res = await request.get(`${API}/shops/1/products`, {
      headers: auth(adminToken),
    });
    expect([200, 404]).toContain(res.status());
    if (res.ok()) {
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
    }
  });

  test('shops endpoints require auth', async ({ request }) => {
    const res = await request.get(`${API}/shops/1`);
    expect(res.status()).toBe(401);
  });
});

// ============================================================
// F06 — REFERRAL
// ============================================================

test.describe('F06 — Referral System', () => {
  test.beforeAll(async ({ request }) => {
    adminToken = await loginAdmin(request);
  });

  test('POST /referrals/generate-code creates code', async ({ request }) => {
    const res = await request.post(`${API}/referrals/generate-code`, {
      headers: auth(adminToken),
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.code).toBeTruthy();
    expect(body.code.length).toBeGreaterThanOrEqual(6);
  });

  test('GET /referrals/stats returns stats', async ({ request }) => {
    const res = await request.get(`${API}/referrals/stats`, {
      headers: auth(adminToken),
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body).toHaveProperty('my_code');
    expect(body).toHaveProperty('total_referred');
    expect(body).toHaveProperty('earned_days');
  });
});

// ============================================================
// F07 — API KEYS
// ============================================================

test.describe('F07 — API Keys', () => {
  let createdKeyId = '';

  test.beforeAll(async ({ request }) => {
    adminToken = await loginAdmin(request);
  });

  test('POST /api-keys creates key', async ({ request }) => {
    const res = await request.post(`${API}/api-keys`, {
      headers: auth(adminToken),
      data: { name: 'Test Key Playwright' },
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.key).toBeTruthy();
    expect(body.key).toMatch(/^utf_/);
    expect(body.id).toBeTruthy();
    createdKeyId = body.id;
  });

  test('GET /api-keys lists keys', async ({ request }) => {
    const res = await request.get(`${API}/api-keys`, {
      headers: auth(adminToken),
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    // key should not be exposed in list
    expect(body[0]).toHaveProperty('key_prefix');
    expect(body[0]).not.toHaveProperty('key');
  });

  test('DELETE /api-keys/:id removes key', async ({ request }) => {
    if (!createdKeyId) return;
    const res = await request.delete(`${API}/api-keys/${createdKeyId}`, {
      headers: auth(adminToken),
    });
    expect(res.ok()).toBe(true);
  });
});

// ============================================================
// F05 — EXPORT
// ============================================================

test.describe('F05 — CSV/Excel Export', () => {
  test.beforeAll(async ({ request }) => {
    adminToken = await loginAdmin(request);
  });

  test('GET /products/export/csv returns CSV', async ({ request }) => {
    const res = await request.get(`${API}/products/export/csv`, {
      headers: auth(adminToken),
    });
    expect(res.ok()).toBe(true);
    const contentType = res.headers()['content-type'] || '';
    expect(contentType).toContain('text/csv');
  });

  test('export requires auth', async ({ request }) => {
    const res = await request.get(`${API}/products/export/csv`);
    expect(res.status()).toBe(401);
  });
});

// ============================================================
// F10 — QUICK SCORE (Browser Extension)
// ============================================================

test.describe('F10 — Quick Score', () => {
  test.beforeAll(async ({ request }) => {
    adminToken = await loginAdmin(request);
  });

  test('GET /uzum/product/:id/quick-score responds', async ({ request }) => {
    const res = await request.get(`${API}/uzum/product/12345/quick-score`, {
      headers: auth(adminToken),
    });
    // May 404 if product doesn't exist, but shouldn't 500
    expect([200, 404]).toContain(res.status());
  });
});

// ============================================================
// HEALTH CHECK
// ============================================================

test.describe('Health', () => {
  test('GET /health returns ok', async ({ request }) => {
    const res = await request.get(`${API}/health`);
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});

// ============================================================
// RESPONSE TIME — PERFORMANCE
// ============================================================

test.describe('Performance', () => {
  test.beforeAll(async ({ request }) => {
    adminToken = await loginAdmin(request);
  });

  test('public leaderboard responds under 2s', async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${API}/leaderboard/public`);
    const elapsed = Date.now() - start;
    expect(res.ok()).toBe(true);
    expect(elapsed).toBeLessThan(2000);
  });

  test('seasonal calendar responds under 1s', async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${API}/discovery/seasonal-calendar`, {
      headers: auth(adminToken),
    });
    const elapsed = Date.now() - start;
    expect(res.ok()).toBe(true);
    expect(elapsed).toBeLessThan(1000);
  });

  test('profit calculator responds under 500ms', async ({ request }) => {
    const start = Date.now();
    const res = await request.post(`${API}/tools/profit-calculator`, {
      headers: auth(adminToken),
      data: {
        sell_price_uzs: 100000, unit_cost_usd: 5, usd_to_uzs: 12800,
        uzum_commission_pct: 10, quantity: 50,
      },
    });
    const elapsed = Date.now() - start;
    expect(res.ok()).toBe(true);
    expect(elapsed).toBeLessThan(500);
  });
});
