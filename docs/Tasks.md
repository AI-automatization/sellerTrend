# VENTRA — OCHIQ VAZIFALAR
# Yangilangan: 2026-03-04
# Developer-specific fayllar:
#   - Bekzod → docs/Tasks-Bekzod.md
#   - Sardor → docs/Tasks-Sardor.md
# Bajarilganlar → docs/Done.md

---

## QOIDALAR

### Umumiy
- Yangi bug/error/task topilganda shu faylga qo'shiladi
- Fix bo'lgandan keyin `docs/Done.md` ga ko'chiriladi
- Kategoriyalar: BACKEND, FRONTEND, DEVOPS, IKKALASI
- **GIT-BASED TASK LOCKING:** `pending[Bekzod]` / `pending[Sardor]` status ishlatiladi

### Task formati (MAJBURIY)

Har bir task quyidagi 3 qismdan iborat bo'lishi **SHART**:

**1. Sarlavha qatori:**
```
### T-XXX | P(0-3) | KATEGORIYA | Qisqa sarlavha | Vaqt
```

**2. Kelib chiqishi (Manba):**
Task qayerdan paydo bo'lgani — 1 qator yoziladi:
- `Manba: kod audit (fayl:qator)` — audit paytida topilgan bug
- `Manba: production bug (sana, error log)` — live da uchragan xato
- `Manba: ChatGPT/Claude tahlil (sana)` — AI audit natijasi
- `Manba: foydalanuvchi so'rovi / feature request` — user feedback
- `Manba: code review PR #N` — PR review da topilgan
- `Manba: dependency update / security advisory` — lib yangilanishi

**3. Muammo + Yechim:**
- **Muammo:** Nima buzilgan / nima etishmaydi — aniq tavsif
- **Yechim:** Qanday tuzatiladi — fayl nomlari, qaysi qator, qanday o'zgarish
- **Fayllar:** O'zgartiriladigan fayllar ro'yxati

**Namuna:**
```
### T-999 | P1 | BACKEND | WebSocket disconnect on logout | 30min

Manba: kod audit (useSocket.ts:12-23, 2026-03-04)

**Muammo:** Logout paytida WebSocket connection yopilmaydi — server'da
stale connection qoladi, memory leak hosil bo'ladi.

**Yechim:** `authStore.logout()` ichida `socket.disconnect()` chaqirish.
`useSocket.ts:23` da cleanup function qo'shish.

**Fayllar:** `apps/web/src/hooks/useSocket.ts`, `apps/web/src/store/authStore.ts`
```

### Task lifecycle
```
1. Topildi    → Tasks.md ga yoziladi (yuqoridagi format)
2. Olinadi    → pending[Bekzod/Sardor] status + git push
3. Ishlanadi  → branch ochib ishlash
4. Tugadi     → Tasks.md dan o'chiriladi, Done.md ga ko'chiriladi
```

---

# ═══════════════════════════════════════════════════════════
# QO'LDA QILINADIGAN ISHLAR — .env KALITLARI VA CONFIG
# ═══════════════════════════════════════════════════════════

## ENV-P1 — MUHIM (Feature'lar ishlamaydi)

### E-006 | CONFIG | `ALIEXPRESS_APP_KEY` + `ALIEXPRESS_APP_SECRET` yo'q | 5min
AliExpress Developer Portal dan key olish va `apps/api/.env` + `apps/worker/.env` ga yozish.

### E-008 | CONFIG | `REDIS_URL` dev da parolsiz — production bilan mos emas | 2min

## ENV-P2 — O'RTA (Optional)

### E-010 | CONFIG | `PROXY_URL` yo'q — Uzum API block qilsa kerak bo'ladi | 2min

---

# ═══════════════════════════════════════════════════════════
# DEVOPS OCHIQ TASKLAR
# ═══════════════════════════════════════════════════════════

## P0 — KRITIK

### T-281 | P0 | DEVOPS | Cloudflare CDN — frontend static assets 20ms, API caching | 1.5h

**Muammo:** Frontend bundle (JS/CSS/images) har safar Railway serverdan yuklanadi (~300ms per request).
Cloudflare CDN orqali static fayllar eng yaqin edge serverdan beriladi (~20-50ms).

**Benchmark (hozirgi):**
```
index.html:     ~300ms (Railway US)
main.js (~500KB): ~400-600ms (Railway US)
CSS/fonts:      ~300ms har biri
```

**To'liq yechim — qadamma-qadam:**

#### 1-qadam: Cloudflare account + domain
```
1. cloudflare.com da bepul account ochish
2. Domain qo'shish (masalan: ventra.uz yoki ventrastats.com)
3. Cloudflare nameserverlarni domain registrarda o'rnatish
4. DNS record qo'shish:
   - CNAME @ → diligent-courage-production.up.railway.app (Proxied ☁️)
   - CNAME www → diligent-courage-production.up.railway.app (Proxied ☁️)
```

#### 2-qadam: Cloudflare SSL/TLS sozlash
```
Dashboard → SSL/TLS → Overview:
  - Encryption mode: Full (strict)
Dashboard → SSL/TLS → Edge Certificates:
  - Always Use HTTPS: ON
  - Minimum TLS Version: 1.2
  - Automatic HTTPS Rewrites: ON
```

#### 3-qadam: Cache Rules — static assets
```
Dashboard → Caching → Cache Rules → Create Rule:

Rule 1: "Cache Static Assets"
  When: URI Path matches /assets/*
  Then: Cache → Eligible for cache
        Edge TTL: 30 days
        Browser TTL: 7 days

Rule 2: "Cache Fonts & Images"
  When: URI Path matches /*.woff2 OR /*.png OR /*.jpg OR /*.svg OR /*.ico
  Then: Cache → Eligible for cache
        Edge TTL: 90 days
        Browser TTL: 30 days

Rule 3: "No Cache API"
  When: URI Path starts with /api/
  Then: Cache → Bypass cache
  (API so'rovlar HECH QACHON cache qilinmasligi kerak)
```

#### 4-qadam: Page Rules (qo'shimcha)
```
Dashboard → Rules → Page Rules:

1. ventra.uz/api/* → Cache Level: Bypass
2. ventra.uz/assets/* → Cache Level: Cache Everything, Edge TTL: 1 month
3. ventra.uz/*.js → Cache Level: Cache Everything, Edge TTL: 1 month
4. ventra.uz/*.css → Cache Level: Cache Everything, Edge TTL: 1 month
```

#### 5-qadam: Nginx config yangilash (Railway)
```nginx
# apps/web/nginx.conf yoki Railway nginx service
# Cloudflare real IP olish uchun:

set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 104.24.0.0/14;
set_real_ip_from 108.162.192.0/18;
set_real_ip_from 131.0.72.0/22;
set_real_ip_from 141.101.64.0/18;
set_real_ip_from 162.158.0.0/15;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 188.114.96.0/20;
set_real_ip_from 190.93.240.0/20;
set_real_ip_from 197.234.240.0/22;
set_real_ip_from 198.41.128.0/17;
real_ip_header CF-Connecting-IP;

# Static assets uchun cache header:
location /assets/ {
    add_header Cache-Control "public, max-age=604800, immutable";
    try_files $uri =404;
}
```

#### 6-qadam: Vite build — content hash
```typescript
// apps/web/vite.config.ts — allaqachon bor bo'lishi kerak:
build: {
  rollupOptions: {
    output: {
      // Fayl nomlari hash bilan — cache invalidation avtomatik
      entryFileNames: 'assets/[name]-[hash].js',
      chunkFileNames: 'assets/[name]-[hash].js',
      assetFileNames: 'assets/[name]-[hash].[ext]',
    }
  }
}
```

#### 7-qadam: Cloudflare Performance sozlash
```
Dashboard → Speed → Optimization:
  - Auto Minify: JavaScript ✓, CSS ✓, HTML ✓
  - Brotli: ON
  - Early Hints: ON
  - HTTP/2: ON (default)
  - HTTP/3 (QUIC): ON

Dashboard → Speed → Image Optimization (Pro plan):
  - Polish: Lossless
  - WebP: ON
```

#### 8-qadam: Cloudflare Security (bonus)
```
Dashboard → Security → Settings:
  - Security Level: Medium
  - Challenge Passage: 30 min
  - Bot Fight Mode: ON (bepul)

Dashboard → Security → WAF:
  - Managed Rules: ON (Cloudflare Free Ruleset)
  - Rate Limiting: 100 req/10s per IP (API himoya)
```

#### 9-qadam: Verify
```bash
# Cache ishlayaptimi tekshirish:
curl -sI https://ventra.uz/assets/main-abc123.js | grep -i "cf-cache-status"
# Kutilgan: cf-cache-status: HIT

# API bypass tekshirish:
curl -sI https://ventra.uz/api/v1/health | grep -i "cf-cache-status"
# Kutilgan: cf-cache-status: DYNAMIC (bypass)
```

**Kutilgan natija:**
```
OLDIN:                          KEYIN:
Static assets: ~300ms           Static assets: ~20-50ms (CDN edge)
index.html:    ~300ms           index.html:    ~50-80ms (CDN edge)
API calls:     ~300ms           API calls:     ~300ms (bypass, o'zgarmaydi*)
                                * T-280 bilan birga: ~150ms
```

**Bepul Cloudflare plan yetarli:**
- Unlimited bandwidth
- Global CDN (200+ shaharda edge)
- DDoS himoya
- SSL sertifikat (bepul)
- WAF basic rules
- Bot protection

**Xavflar:**
- DNS propagation 1-24 soat kutish
- API so'rovlar BYPASS bo'lishi KERAK (aks holda stale data)
- WebSocket bo'lsa Cloudflare Free da cheklangan (100 concurrent)

---

## P1 — MUHIM

### T-178 | DEVOPS | Custom domain + SSL — web service | 10min (manual: domain kerak)

### T-283 | P1 | DEVOPS | Landing custom domain — ventra.uz DNS sozlash | 10min (manual)

**Holat:** Landing Railway da deploy qilingan, staging URL ishlaydi:
- Staging: `https://landing-staging-39b5.up.railway.app/`
- Railway service: `landing` (staging environment)

**Railway DNS record lari tayyor:**
```
CNAME  @               → d7j7qk9x.up.railway.app
TXT    _railway-verify  → railway-verify=railway-verify=822d30ad3e89eb5a8c969c7ccdcaa4759312a22ee0b2370851e0ded2b6b6b28d
```

**Qadamlar:**
1. `ventra.uz` domenni sotib olish (webhost.uz, ahost.uz yoki Cloudflare)
2. Registrar DNS panelida yuqoridagi CNAME + TXT record qo'shish
3. Propagatsiya kutish (5 daqiqa — 24 soat)
4. `https://ventra.uz` ishlashini tekshirish (Railway avtomatik SSL beradi)
5. Google Search Console da `ventra.uz` verify qilish → `GOOGLE_VERIFICATION_CODE` ni index.html ga qo'yish
6. Yandex Webmaster da verify → `YANDEX_VERIFICATION_CODE` ni index.html ga qo'yish

## P2 — O'RTA

### T-243 | DEVOPS | ALIEXPRESS_APP_KEY + SECRET — API | 5min
### T-245 | DEVOPS | PROXY_URL — API + Worker (optional) | 5min

---

# ═══════════════════════════════════════════════════════════
# CHROME EXTENSION — OCHIQ TASKLAR (T-216..T-233)
# ═══════════════════════════════════════════════════════════
#
# DONE: Faza 1 (T-208..T-211), Faza 2 (T-212..T-215) → Done.md

## Faza 3 — Popup Dashboard (P1) ~1.5h
### T-216 | P1 | FRONTEND | Popup "Tez Tahlil" funksiyasi | 1.5h

## Faza 4 — Category + Advanced (P1) ~5h
### T-217 | P1 | FRONTEND | Content Script — Kategoriya "Top 10" floating widget | 2h
### T-218 | P1 | FRONTEND | Notifications sistema (chrome.notifications + badge) | 1.5h
### T-219 | P1 | FRONTEND | Options (Sozlamalar) sahifasi | 1.5h

## Faza 5 — Competitor + Narx (P2) ~4.5h
### T-220 | P2 | FRONTEND | Content Script — Raqiblar narx taqqoslash overlay | 2h
### T-221 | P2 | FRONTEND | Content Script — Narx tarix grafigi (mini chart) | 1.5h
### T-222 | P2 | FRONTEND | Context Menu integration (o'ng tugma menu) | 1h

## Faza 6 — AI + Hotkeys (P2) ~2.5h
### T-223 | P2 | FRONTEND | Content Script — AI tahlil natijasini overlay da | 1.5h
### T-224 | P2 | FRONTEND | Keyboard shortcuts (hotkeys) | 1h

## Faza 7 — i18n + Testing + Perf (P2) ~4.5h
### T-225 | P2 | FRONTEND | i18n (uz, ru, en) | 1.5h
### T-226 | P2 | FRONTEND | Unit testlar (Vitest + Testing Library) | 2h
### T-227 | P2 | FRONTEND | Performance optimization + bundle size | 1h

## Faza 8 — Build + Publish (P1) ~3h
### T-228 | P1 | DEVOPS | Production build pipeline + Chrome Web Store publish | 2h
### T-229 | P1 | DEVOPS | Edge/Firefox adaptatsiya tayyorlash | 1h

## Faza 9 — Security + Polish (P1) ~3.5h
### T-230 | P1 | IKKALASI | Security audit + CSP + token xavfsizligi | 1h
### T-231 | P1 | FRONTEND | Onboarding flow (birinchi marta ochganda) | 1h
### T-232 | P2 | FRONTEND | Extension icon set (16/48/128) | 30min
### T-233 | P2 | FRONTEND | Error handling + offline mode + graceful degradation | 1h

---

# ═══════════════════════════════════════════════════════════
# DESKTOP AUDIT TASKLAR (T-315..T-328) — Sardor
# ═══════════════════════════════════════════════════════════
#
# Manba: docs/CODE-AUDIT-DESKTOP-LANDING-2026-03-04.md

## P0 — KRITIK (5 ta)

> ~~T-315..T-319~~ ✅ DONE (2026-03-06) → Done.md

## P1 — MUHIM (8 ta)

> ~~T-320..T-327~~ ✅ DONE (2026-03-06) → Done.md

## P2 — O'RTA (batch)

> ~~T-328~~ ✅ DONE (2026-03-06, i18n qismi → T-399) → Done.md

### T-399 | P2 | FRONTEND | Desktop tray menu i18n (uz/ru/en) | 30min

Manba: T-328 dan ajratildi (2026-03-06)

**Muammo:** Tray menu labellar inglizcha hardcoded.

**Yechim:** `app.getLocale()` → `uz`/`ru`/`en` labellar.

**Fayllar:** `apps/desktop/src/main/tray.ts`

---

# ═══════════════════════════════════════════════════════════
# LANDING AUDIT (T-329..T-342) — ✅ HAMMASI DONE → Done.md
# ═══════════════════════════════════════════════════════════

---

# ═══════════════════════════════════════════════════════════
# BACKEND KOD AUDIT (T-343..T-360) — Bekzod
# ═══════════════════════════════════════════════════════════
#
# Manba: docs/CODE-AUDIT-2026-03-04.md | apps/api, apps/worker, apps/bot

## P0 — KRITIK ✅ DONE (2026-03-04, d5850ca)

> T-343..T-352 → Done.md

## P1 — MUHIM ✅ DONE (2026-03-04)

> T-353, T-354, T-355, T-356, T-357, T-358 → Done.md (2026-03-04)

## P2 — O'RTA (2 task, ~41 bug)

| # | Muammo | Bug soni | Vaqt |
|---|--------|----------|------|
| T-359 | API P2 batch (27 ta) | 27 | 4h |
| T-360 | Worker+Bot P2 batch (14 ta) | 14 | 2h |

> Batafsil sabab/yechim: docs/Tasks-Bekzod.md

---

# ═══════════════════════════════════════════════════════════
# WEB APP KOD AUDIT (T-361..T-370) — Sardor
# ═══════════════════════════════════════════════════════════
#
# Manba: docs/CODE-AUDIT-2026-03-04.md | apps/web

## P0 — KRITIK (6 ta)

| # | Muammo | Fayl | Vaqt |
|---|--------|------|------|
| ~~T-361~~ | ~~XSS — `dangerouslySetInnerHTML`~~ | → T-392 ga birlashtirildi | — |
| ~~T-362~~ | ~~Auth Store token desync~~ | allaqachon tuzatilgan — `setTokens()` JWT decode qiladi | ✅ |
| ~~T-363~~ | ~~WebSocket logout disconnect~~ | allaqachon tuzatilgan — Zustand subscribe auto-disconnect | ✅ |
| ~~T-364~~ | ~~AdminRoute token expiry~~ | tuzatildi — `isTokenValid()` check qo'shildi | ✅ |
| ~~T-365~~ | ~~ProductPage race condition~~ | tuzatildi — AbortController + stale guard | ✅ |
| ~~T-366~~ | ~~Duplicate TokenPayload~~ | tuzatildi — dead `JwtTokenPayload` alias o'chirildi | ✅ |

## P1 — MUHIM (3 task, ~28 bug)

| # | Muammo | Bug soni | Vaqt |
|---|--------|----------|------|
| T-367 | AdminPage refactor — God Component (30+ useState) | 2 | 2h |
| T-368 | UX gaps — 404 route, notification, payment, register | 6 | 2h |
| T-369 | Code quality — dead code, i18n, version, deps | 8 | 1h |

## P2 — O'RTA (1 task, 15 bug)

| # | Muammo | Bug soni | Vaqt |
|---|--------|----------|------|
| T-370 | Web P2 batch (15 ta) | 15 | 3h |

> Batafsil sabab/yechim: docs/Tasks-Sardor.md

---

# ═══════════════════════════════════════════════════════════
# PLATFORMA AUDIT — UX/PIPELINE/ONBOARDING (T-371..T-384)
# ═══════════════════════════════════════════════════════════
#
# Manba: DEEP-PLATFORM-AUDIT-2026-03-04.md + Analysis-Onboarding-Multimarketplace.md

## P1 — MUHIM (4 ta)

| # | Muammo | Mas'ul | Vaqt |
|---|--------|--------|------|
~~| T-375 | Worker monitoring jobs — stock, trend, currency, cleanup, digest (5 cron) | Bekzod | 8h |~~
| T-378 | Forgot Password UI | Bekzod | 2h |

## P2 — O'RTA (6 ta)

| # | Muammo | Mas'ul | Vaqt |
|---|--------|--------|------|
| T-376 | Platform model — multi-marketplace (kelajak) | Bekzod | 2h |
| T-380 | Mobile UX — bottom nav, scroll-to-top, card layout (4 fix) | Sardor | 3h |
| T-381 | Accessibility — skip-to-content, focus trap, colorblind, keyboard (5 fix) | Sardor | 2h |
| ~~T-382~~ | ~~Landing conversion~~ | ✅ DONE (2026-03-06) | — |
| T-383 | Landing multi-marketplace section + hero copy + pricing | Bekzod | 3h |

## P3 — KELAJAK (1 ta)

| # | Muammo | Mas'ul | Vaqt |
|---|--------|--------|------|
| T-384 | Engagement features — revenue estimator, comparison, streak, badges | Bekzod | 20h+ |

> Batafsil sabab/yechim: docs/Tasks-Bekzod.md (T-371..T-376), docs/Tasks-Sardor.md (T-377..T-384)

---

# ═══════════════════════════════════════════════════════════
# DATA INTEGRITY & SCRAPING RELIABILITY (T-385..T-390) — Bekzod
# ═══════════════════════════════════════════════════════════
#
# Manba: ChatGPT audit + Claude Code fact-check (2026-03-04)

## P1 — MUHIM

### ~~T-385~~ ✅ DONE (2026-03-06) → Done.md

---

### ~~T-386~~ ✅ DONE (2026-03-06) → Done.md

---

### ~~T-387~~ ✅ DONE (2026-03-06) → Done.md

---

### ~~T-388~~ ✅ DONE (2026-03-06) → Done.md

---

## P2 — O'RTA

### ~~T-389~~ ✅ DONE (2026-03-06) → Done.md

---

### T-390 | P2 | DEVOPS | Docs ↔ Schema auto-sync | 1h

**Muammo:** `schema.prisma` (1116 qator, 49 jadval) va docs mustaqil yashaydi.
Schema o'zgaradi — docs eskiradi — audit noto'g'ri xulosa chiqaradi (ChatGPT case).

**Yechim:**
1. Script: `scripts/generate-db-docs.ts` — Prisma schema'dan avtomatik:
   - Jadval ro'yxati + column'lar + typelar + munosabatlar
   - Mermaid ER diagram
   - `docs/DATABASE.md` ga yoziladi
2. CI check: `schema.prisma` o'zgarganda — `DATABASE.md` yangilanishi **majburiy**
3. Pre-commit hook yoki GitHub Action

**Fayllar:** `scripts/generate-db-docs.ts` (yangi), `.github/workflows/ci.yml`, `docs/DATABASE.md` (yangi)

---

### ~~T-391~~ ✅ DONE (2026-03-06) → Done.md

---

# ═══════════════════════════════════════════════════════════
# ONBOARDING & BILLING MODEL (T-392..T-398) — Bekzod
# ═══════════════════════════════════════════════════════════
#
# Manba: docs/Onboarding-scenario.md tahlili (2026-03-06)

## P0 — KRITIK

### ~~T-392 P0~~ ✅ DONE (2026-03-06, 80dc8c3) → Done.md
### T-392 P1-P2 | IKKALASI | Billing model — frontend + admin stats + monthly cron | ~10h

**Qolgan ishlar:**
- P1: Worker daily cron → monthly subscription renewal (`0 3 1 * *`)
- P1: `admin-stats.service.ts`: churn, MRR, plan_distribution yangi formulalar
- P1: `admin-account.service.ts`: setPlan() metod, plan fieldlar response'da
- P2: Frontend `PaymentDueBanner` → `PlanExpiredBanner`
- P2: `PlanGuard` component (locked feature overlay)
- P2: `BillingPage`: plan selection + upgrade flow
- P2: `AdminAnalyticsTab`: conversion funnel, plan distribution chart

---

### ~~T-393~~ ✅ DONE (2026-03-06, 8c34df9) → Done.md

---

## P1 — MUHIM

### T-394 | P1 | FRONTEND | Onboarding Wizard — 3-stepli /onboarding sahifasi | 4h

Manba: Onboarding-scenario.md (2026-03-06) — DB infra tayyor (onboarding_step, PATCH /auth/onboarding), frontend yo'q

**Muammo:** `onboarding_completed: false` bo'lsa ham frontend hech narsa qilmaydi. Register → Dashboard yo'naltiriladi.

**Yechim:**
- Register'dan keyin `/onboarding` ga yo'naltirish (agar `onboarding_completed === false`)
- Step 1: URL input + "Tahlil" (uzum analyze call)
- Step 2: Natija ko'rsatish + "Kuzatishga qo'shish" tugmasi
- Step 3: Telegram bot QR/link (ixtiyoriy, "Keyinroq" bilan o'tkazish mumkin)
- Har stepda `PATCH /auth/onboarding` chaqiriladi

**Fayllar:** `apps/web/src/pages/OnboardingPage.tsx` (yangi), `apps/web/src/App.tsx` (route qo'shish), `apps/web/src/components/onboarding/` (yangi papka)

---

### T-395 | P1 | BACKEND | Recommendation system — nishan-based layered | 3h

Manba: Onboarding-scenario.md + suhbat (2026-03-06) — yangi user uchun bo'sh dashboard'da relevant productlar ko'rsatish

**Muammo:** Yangi user "TOP mahsulotlar" ko'rishi kerak, lekin DB bo'sh bo'lsa hech narsa yo'q. Seed qilingan products esa eskirishi mumkin, nishanga mos kelmaydi.

**Yechim (4 qatlamli):**
1. `category_winners` da user nishani bo'yicha filter → ko'rsat
2. `tracked_products` da nishanga mos productlar → ko'rsat
3. Uzum search API ishlaydimi → live qidiruv (user nishani bo'yicha)
4. Hardcoded fallback — nishan bo'yicha oldindan tanlangan popular product ID lar

**Fayllar:** `apps/api/src/products/products.service.ts` (getRecommendations metodi), yangi endpoint `GET /products/recommendations?niche=kosmetika`

---

### T-396 | P1 | FRONTEND | Admin billing metrics — yangi churn, MRR, plan distribution | 2h

Manba: Onboarding-scenario.md Admin ta'sir tahlili (2026-03-06)

**Muammo:** `churnRatePct` = PAYMENT_DUE/ACTIVE — bu haqiqiy churn emas. MRR = daily CHARGE summasi — bu haqiqiy MRR emas.

**Yechim:**
- `admin-stats.service.ts` → `getStatsGrowth()`: churn = plan expired + yangilamagan
- `getStatsRevenue()`: MRR = SUBSCRIPTION type transactionlar summasi; `avg_balance` o'rniga `avg_days_to_renewal`
- `getStatsOverview()`: `plan_breakdown: { FREE, PRO, MAX, COMPANY }` qo'shish
- Frontend `AdminAnalyticsTab.tsx`: plan distribution donut chart, conversion funnel

**Fayllar:** `apps/api/src/admin/admin-stats.service.ts`, `apps/web/src/components/admin/AdminAnalyticsTab.tsx`

---

## P2 — O'RTA

### T-397 | P2 | FRONTEND | Kontekstual tooltiplar — har sahifada birinchi marta | 1h

Manba: Onboarding-scenario.md (2026-03-06)

**Muammo:** Onboarding tugagandan keyin yangi user qaysi sahifaning nima qilishini bilmaydi.

**Yechim:** 5 ta sahifada (`Dashboard`, `Analyze`, `Discovery`, `Signals`, `Sourcing`) birinchi kirishda qisqa tooltip/hint. `localStorage.tooltip_seen_{page}` flag bilan faqat 1 marta ko'rsatiladi.

**Fayllar:** `apps/web/src/components/ui/PageHint.tsx` (yangi), sahifa komponentlarida `<PageHint page="dashboard" />`

---

### T-398 | P2 | BACKEND | Email/Telegram onboarding reminders | 3h

Manba: Onboarding-scenario.md (2026-03-06)

**Muammo:** Yangi user register qilib, 3 kundan keyin product tahlil qilmasa — hech qanday reminder yo'q.

**Yechim:**
- Register'dan keyin welcome email (email service ulangan bo'lsa)
- 3 kun o'tib `onboarding_completed === false` bo'lsa → Telegram bot reminder (ulangan bo'lsa)
- Cron job: `0 10 * * *` — har kuni 3 kunlik tekshirish

**Fayllar:** `apps/worker/src/processors/` (onboarding-reminder processor), `apps/api/src/auth/auth.service.ts` (welcome trigger)

---

# LANDING MANUAL TASKLAR

| # | Nima | Vaqt | Holat |
|---|------|------|-------|
| M-001 | Dashboard screenshot'lar | 30min | ⬜ |
| M-002 | Desktop installer build | 20min | ⬜ |
| M-003 | Testimonial ma'lumotlari | 1h | ⬜ |
| M-004 | Domain va hosting | 30min | ⬜ |

---

## XULOSA

| Kategoriya | Task | Bug/Fix | Mas'ul |
|-----------|------|---------|--------|
| ~~Backend Kod Audit P0~~ (T-343..T-352) | ~~10~~ ✅ | ~~10~~ | Bekzod |
| ~~Backend Kod Audit P1~~ (T-354) | ~~1~~ ✅ | ~~40~~ | Bekzod |
| **Backend Kod Audit P2** (T-359..T-360) | 2 | ~41 | Bekzod |
| **Web Kod Audit P0** (T-361..T-366) | 6 | 6 | **Bekzod** |
| **Web Kod Audit P1** (T-367..T-369) | 3 | ~14 | **Bekzod** |
| **Web Kod Audit P2** (T-370) | 1 | 15 | **Bekzod** |
| **Platforma Audit P0** (T-377) | 1 | 1 | **Bekzod** |
| ~~**Platforma Audit P1**~~ (~~T-373,T-374~~,T-375,T-378) | 2 | 2 | Bekzod |
| **Platforma Audit P2** (T-376,T-380,T-381,~~T-382~~,T-383) | 4 | ~14 | Bekzod(4) |
| **Platforma Audit P3** (T-384) | 1 | 6 | Bekzod |
| ~~Desktop Audit P0 (T-315..T-319)~~ | ~~5~~ ✅ | ~~5~~ | Sardor |
| ~~Desktop Audit P1 (T-320..T-327)~~ | ~~8~~ ✅ | ~~8~~ | Sardor |
| ~~Desktop Audit P2 (T-328)~~ | ~~1~~ ✅ | ~~10~~ | Sardor |
| ~~Landing Audit~~ (T-329..T-342) | ~~14~~ ✅ | ~~31~~ | Sardor |
| Chrome Extension (T-216..T-233) | 18 | 18 | **Bekzod** |
| Landing Manual (M-001..M-004) | 4 | 4 | Sardor |
| ENV manual (E-006, E-008, E-010) | 3 | 3 | Bekzod |
| DevOps (T-178, T-243, T-245, T-281, T-283) | 5 | 5 | Bekzod |
| **Data Integrity P1** (T-385..T-388) | 4 | 4 | Bekzod |
| **Data Integrity P2** (T-389..T-390) | 2 | 2 | Bekzod |
| **Session Bug** (T-391) | 1 | 3 | Bekzod |
| **Onboarding & Billing P0** (T-392..T-393) | 2 | 2 | Bekzod |
| **Onboarding & Billing P1** (T-394..T-396) | 3 | 3 | Bekzod |
| **Onboarding & Billing P2** (T-397..T-398) | 2 | 2 | Bekzod |
| **JAMI task ochiq** | **85** | | |
| **JAMI bajarilgan** | **~138** | | → Done.md |

---

*Tasks.md | VENTRA Analytics Platform | 2026-03-04*
