# VENTRA — OCHIQ VAZIFALAR
# Yangilangan: 2026-03-08
# Developer-specific fayllar:
#   - Bekzod → docs/Tasks-Bekzod.md
#   - Sardor → docs/Tasks-Sardor.md
# Bajarilganlar → docs/Done.md

---

## STATISTIKA

```
Ochiq:       ~46 ta
Bajarilgan:  ~192+ ta (Done.md)
Oxirgi T-#:  T-502
Keyingi T-#: T-504 dan boshlash
```

---

## QOIDALAR

### Task formati v2 (MAJBURIY)

Har bir task **aynan shu formatda** yozilishi SHART.
Bu format `scripts/ventra-agent.sh` (autonomous agent) tomonidan parse qilinadi.

**SARLAVHA (1 qator, ### bilan):**
```
### T-XXX | P(0-3) | KATEGORIYA | Qisqa sarlavha | Tahminiy vaqt
```
- `T-XXX` — ketma-ket raqam (T-411, T-412, ...)
- `P0` = kritik (production bug), `P1` = muhim, `P2` = o'rta, `P3` = past
- `KATEGORIYA` = `BACKEND` | `FRONTEND` | `DEVOPS` | `IKKALASI`
- Sarlavha ingliz yoki o'zbek, qisqa (5-10 so'z)
- Vaqt: `15min` | `30min` | `1h` | `2h` | `4h` | `8h`

**TANA (sarlavha ostida, bo'sh qator bilan ajratilgan):**

```markdown
### T-999 | P1 | BACKEND | WebSocket disconnect on logout | 30min

**Sana:** 2026-03-08
**Manba:** kod-audit | production-bug | ai-tahlil | user-feedback | code-review | dependency-update | sentry-alert | self-improve
**Topilgan joyda:** `apps/web/src/hooks/useSocket.ts:12-23`
**Mas'ul:** Bekzod | Sardor | — (ochiq)

**Tahlil:**
Logout paytida WebSocket connection yopilmaydi. Server da stale connection
qoladi, 100+ foydalanuvchida memory leak hosil bo'ladi. Har logout da
~2MB memory qaytarilmaydi. 24 soatda ~500MB leak.

**Muammo:**
`useSocket.ts:23` da `useEffect` cleanup function yo'q.
Component unmount bo'lganda socket.disconnect() chaqirilmaydi.

**Yechim:**
1. `useSocket.ts:23` — useEffect return da `socket.disconnect()` qo'shish
2. `authStore.ts` — `logout()` ichida `socket.disconnect()` chaqirish
3. Server: stale connection timeout qo'shish (5 min)

**Fayllar:** `apps/web/src/hooks/useSocket.ts`, `apps/web/src/stores/authStore.ts`

**Qo'shimcha kontekst:** (ixtiyoriy)
- Bu muammo v5.4 da kiritilgan (weekly-scrape socket qo'shilganda)
- Sentry da 3 marta uchragan: VENTRA-ERR-1234
- Screenshot: screenshots/ws-leak-2026-03-08.png
```

### Maydon tushuntirishlari

| Maydon | Majburiy | Nima uchun |
|--------|----------|------------|
| `Sana` | HA | Task qachon yaratilgani — tracking uchun |
| `Manba` | HA | Qayerdan kelgani — qayta tekshirish uchun |
| `Topilgan joyda` | YO'Q | Aniq fayl:qator — agent tezroq topadi |
| `Mas'ul` | HA | Kim olgan — lock protocol uchun |
| `Tahlil` | HA | NEGA bu muammo — root cause, ta'sir ko'lami |
| `Muammo` | HA | NIMA buzilgan — aniq texnik tavsif |
| `Yechim` | HA | QANDAY tuzatiladi — qadam-baqadam |
| `Fayllar` | HA | Qaysi fayllar o'zgaradi — agent zone tekshirish uchun |
| `Qo'shimcha kontekst` | YO'Q | Screenshot, Sentry link, PR ref, bog'liq task |

### Manba turlari (standardlashtirilgan)

| Manba tegi | Ma'nosi | Misol |
|------------|---------|-------|
| `kod-audit` | Qo'lda yoki AI bilan kod tekshirish | `kod-audit (useSocket.ts:12, 2026-03-08)` |
| `production-bug` | Live da uchragan xato | `production-bug (Sentry VENTRA-1234, 2026-03-08)` |
| `ai-tahlil` | Claude/ChatGPT audit natijasi | `ai-tahlil (Claude deep-audit, 2026-03-04)` |
| `user-feedback` | Foydalanuvchi so'rovi/shikoyati | `user-feedback (Telegram @user123, 2026-03-07)` |
| `code-review` | PR review da topilgan | `code-review (PR #42, 2026-03-06)` |
| `dependency-update` | Lib yangilanishi, security advisory | `dependency-update (prisma 6.4.0 CVE-2026-XXX)` |
| `sentry-alert` | Sentry/monitoring alert | `sentry-alert (VENTRA-ERR-567, spike 50/min)` |
| `self-improve` | Agent self-improvement engine | `self-improve (learning.md: any_type 3+ marta)` |
| `regression` | Oldingi fix dan qayta paydo bo'lgan bug | `regression (T-375 fix dan keyin, 2026-03-08)` |
| `performance` | Sekinlik, memory leak, CPU spike | `performance (p95 > 3s, /api/products endpoint)` |

### Locking protocol

```
Ochiq:              ### T-411 | P1 | BACKEND | ... | 30min
                    **Mas'ul:** —

Olingan (Bekzod):   ### T-411 | P1 | BACKEND | ... | 30min | pending[Bekzod]
                    **Mas'ul:** Bekzod

Olingan (Agent):    ### T-411 | P1 | BACKEND | ... | 30min | pending[Claude-Auto]
                    **Mas'ul:** Claude-Auto

Qoidalar:
  - pending[X] bor → BOSHQASI TEGMAYDI
  - 1 soatdan ortiq o'zgarishsiz → "stuck", boshqasi olishi mumkin
  - Agent: faqat **Mas'ul: —** bo'lgan tasklarni oladi
```

### Task lifecycle v2

```
1. YARATILDI   → Tasks.md ga yoziladi (yuqoridagi format)
                  git commit: "task: add T-XXX [short title]"

2. OLINADI     → pending[Bekzod/Sardor/Claude-Auto] + Mas'ul yangilanadi
                  git commit: "task: claim T-XXX [Bekzod]"
                  git push (boshqalar ko'rishi uchun)

3. ISHLANADI   → branch: bekzod/T-XXX-short-title yoki auto/T-XXX-short-title
                  Agent/developer kod yozadi
                  tsc + build tekshiradi

4. PR OCHILADI → github: PR title "feat: T-XXX — short title"
                  QA Agent yoki manual review

5. MERGE       → PR approve → merge to main

6. ARXIV       → Tasks.md dan o'chiriladi
                  Done.md ga ko'chiriladi (Done format, pastda)
                  git commit: "task: done T-XXX"
```

### Done.md format (arxiv)

Task Done.md ga ko'chirilganda quyidagi FORMAT ishlatiladi:

```markdown
### T-XXX | KATEGORIYA | Sarlavha (sana)

**Manba:** [manba tegi]
**Muammo:** [1-2 jumla — nima buzilgan edi]
**Yechim:** [1-2 jumla — nima qilindi]
**Fayllar:** [o'zgargan fayllar]
**Commit:** [commit hash yoki PR #]
**Vaqt:** [haqiqiy sarflangan vaqt] (plan: [planlangan vaqt])
**Ta'sir:** [nima yaxshilandi — metrika, UX, xavfsizlik]
```

**Done.md namuna:**
```markdown
### T-375 | BACKEND | Worker monitoring jobs (2026-03-05)

**Manba:** ai-tahlil (Claude deep-audit, 2026-03-04)
**Muammo:** Worker da monitoring cron job yo'q edi — heap/RSS alertlar tekshirilmas edi.
**Yechim:** `monitoring.job.ts` yaratildi — har 5 min MetricsService.checkAlerts() chaqiradi.
**Fayllar:** `apps/worker/src/jobs/monitoring.job.ts`, `apps/worker/src/main.ts`
**Commit:** abc1234 | PR #67
**Vaqt:** 45min (plan: 30min)
**Ta'sir:** Production da memory leak 15 min ichida aniqlanadi (oldin hech qachon).
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

### T-507 | P0 | IKKALASI | ProductPage weekly_bought va daily_sold xato manbaidan olinishi — fix | 1h | done[Sardor]

- **Sana:** 2026-04-16
- **Manba:** production-bug (user-feedback, 2026-04-16)
- **Topilgan joyda:** `apps/web/src/pages/ProductPage.tsx:103-111`, `apps/api/src/uzum/uzum.service.ts:281-292`, `packages/utils/src/index.ts:198`
- **Mas'ul:** Sardor

- **Tahlil:**
  ProductPage `weekly_bought` va `daily_sold` ni `analyzeProduct` dan oladi. `analyzeProduct` Uzum API dan fresh data oladi (to'g'ri), lekin haftalik/kunlik sotuvni o'zi hisoblaydi (xato). `getProductById` da to'g'ri logika bor (trackedDays < 7 → scraped, >= 7 → dailyAggregation), lekin ProductPage uni weekly/daily uchun ishlatmaydi. Natijada Yangilash bosilganda haftalik sotuv 0 yoki xato qiymat bo'ladi.

- **Muammo:**
  1. `analyzeProduct`: `calcWeeklyBought` delta=0 bo'lsa 0 qaytaradi (null emas) → snapshotga 0 yoziladi → keyingi chaqiruvlarda ham 0 ko'rinadi
  2. `weeklyBoughtWithFallback(0, snaps)`: 0 != null → stored scraped qiymat izlanmaydi
  3. `ProductPage`: `setResult(analyzeRes.data)` — weekly_bought/daily_sold ni analyzeProduct dan oladi, getProductById dan emas

- **Yechim:**
  1. `packages/utils/src/index.ts:198` — `ordersDiff <= 0` → null (0 emas)
  2. `packages/utils/src/index.ts:138` — `calculated > 0` bo'lsagina ishlatish
  3. `apps/web/src/pages/ProductPage.tsx` — setResult dan keyin getProductById dan weekly_bought va daily_sold override qilish

- **Fayllar:**
  - `packages/utils/src/index.ts`
  - `apps/web/src/pages/ProductPage.tsx`

---

### T-502 | P1 | FRONTEND | Claude AI tahlili faqat tracked mahsulotlarda ko'rinsin | 20min | pending[Sardor]

- **Sana:** 2026-04-03
- **Manba:** user-feedback
- **Mas'ul:** Sardor
- **Muammo:** ProductPage da Claude AI tahlili `isMine` (localStorage) ga bog'langan. Foydalanuvchi mahsulotni track qilmagan bo'lsa ham AI tahlil ko'rinishi mumkin. Faqat API orqali tracked (`is_tracked`) bo'lganda ko'rinishi kerak.
- **Yechim:** `isMine` o'rniga `tracked` state ishlatish — AI section va trigger logikasida.
- **Fayllar:** `apps/web/src/pages/ProductPage.tsx`

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

## P2 — O'RTA ✅ DONE (2026-03-08)

| # | Muammo | Bug soni | Vaqt |
|---|--------|----------|------|
| ~~T-359~~ | ~~API P2 batch (27 ta)~~ | ~~27~~ | ✅ |
| ~~T-360~~ | ~~Worker+Bot P2 batch (14 ta)~~ | ~~14~~ | ✅ |

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
| ~~T-361~~ | ~~XSS — `dangerouslySetInnerHTML`~~ | ✅ tuzatildi — JSX interpolation (Layout.tsx) | ✅ |
| ~~T-362~~ | ~~Auth Store token desync~~ | allaqachon tuzatilgan — `setTokens()` JWT decode qiladi | ✅ |
| ~~T-363~~ | ~~WebSocket logout disconnect~~ | allaqachon tuzatilgan — Zustand subscribe auto-disconnect | ✅ |
| ~~T-364~~ | ~~AdminRoute token expiry~~ | tuzatildi — `isTokenValid()` check qo'shildi | ✅ |
| ~~T-365~~ | ~~ProductPage race condition~~ | tuzatildi — AbortController + stale guard | ✅ |
| ~~T-366~~ | ~~Duplicate TokenPayload~~ | tuzatildi — dead `JwtTokenPayload` alias o'chirildi | ✅ |

## P1 — MUHIM (3 task, ~28 bug)

| # | Muammo | Bug soni | Vaqt |
|---|--------|----------|------|
| ~~T-367~~ | ~~AdminPage refactor — God Component (30+ useState)~~ | ✅ DONE (2026-03-06) → Done.md | — |
| ~~T-368~~ | ~~UX gaps~~ | ✅ DONE (2026-03-06) → Done.md | — |
| ~~T-369~~ | ~~Code quality~~ | ✅ DONE (2026-03-06) → Done.md | — |

## P2 — O'RTA (1 task, 15 bug)

| # | Muammo | Bug soni | Vaqt |
|---|--------|----------|------|
| ~~T-370~~ | ~~Web P2 batch (15 ta)~~ | ~~15~~ | ✅ DONE (2026-03-08) |

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
| ~~T-375~~ | ~~Worker monitoring jobs~~ | ✅ DONE (2026-03-05) → Done.md | — |
| ~~T-378~~ | ~~Forgot Password UI~~ | ✅ allaqachon mavjud | — |

## P2 — O'RTA (6 ta)

| # | Muammo | Mas'ul | Vaqt |
|---|--------|--------|------|
| ~~T-376~~ | ~~Platform model — multi-marketplace (kelajak)~~ | ✅ DONE (2026-03-08) | — |
| ~~T-380~~ | ~~Mobile UX — bottom nav, scroll-to-top, card layout (4 fix)~~ | ✅ DONE (2026-03-08) | — |
| ~~T-381~~ | ~~Accessibility — skip-to-content, focus trap, colorblind, keyboard (5 fix)~~ | ✅ DONE (2026-03-08) | — |
| ~~T-382~~ | ~~Landing conversion~~ | ✅ DONE (2026-03-06) | — |
| T-383 | Landing multi-marketplace section + hero copy + pricing | Bekzod | 3h |

## P3 — KELAJAK (1 ta)

| # | Muammo | Mas'ul | Vaqt |
|---|--------|--------|------|
| ~~T-384~~ | ~~Engagement features — revenue estimator, comparison, streak, badges~~ | ✅ DONE (2026-03-08) | — |

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

### ~~T-390~~ ✅ DONE (2026-03-08) → Done.md
Schema auto-sync — `scripts/generate-db-docs.ts` + `docs/DATABASE.md` (53 model, 14 enum, Mermaid ER).

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
### ~~T-392 P1-P2~~ ✅ DONE (2026-03-08) → Done.md

Billing full-stack: subscription renewal cron, setPlan admin endpoint, churn/MRR/plan_breakdown metrics, BillingPage, PlanGuard, PlanExpiredBanner.

---

### ~~T-393~~ ✅ DONE (2026-03-06, 8c34df9) → Done.md

---

## P1 — MUHIM

### ~~T-394~~ ✅ allaqachon mavjud — OnboardingPage.tsx 3-step + route + API integration

---

### ~~T-395~~ ✅ DONE (2026-03-08) → Done.md
Recommendation system — 4-layer fallback (category winners → tracked → uzum API → hardcoded).

---

### ~~T-396~~ ✅ DONE (2026-03-08) → Done.md
Admin billing metrics — churn, MRR, plan_breakdown PieChart donut, avg_days_to_renewal.

---

## P2 — O'RTA

### ~~T-397~~ ✅ DONE (2026-03-08) → Done.md
Kontekstual tooltiplar — PageHint component, 4 sahifada (Dashboard, Analyze, Discovery, Sourcing).

---

### ~~T-398~~ ✅ DONE (2026-03-08) → Done.md
Onboarding reminders — daily 10AM cron, 3-day check for incomplete onboarding.

---

# ═══════════════════════════════════════════════════════════
# EXTENSION BUGS (T-427)
# ═══════════════════════════════════════════════════════════

### T-427 | P1 | FRONTEND | Extension — Modal closes after API response | 2h

**Sana:** 2026-03-09
**Manba:** user-feedback
**Topilgan joyda:** `apps/extension/src/popup.tsx`, `apps/extension/src/components/QuickAnalysisModal.tsx`
**Mas'ul:** pending[Sardor]

**Tahlil:**
Extension popup da "Tez Tahlil" modal ~1 sekund ichida auto-close bo'layapti.
Login tugaganda auth state o'zgarishi modal close trigger qilishi mumkin.
Yoki Chrome popup lifecycle issue — service worker timeout.

**Muammo:**
1. Modal ochiladi, loading spinner ko'rsatadi
2. ~1 sec o'tib modal o'z-o'zidan yopiladi
3. API response hali kelmagan → "Product not found" error
4. Ikkinchi marta ochganda ham xuddi shunday

**Yechim:**
1. `QuickAnalysisModal.tsx` — backdrop click auto-close disable
2. Auth state change dan modal state ni mustaqil qilish
3. Popup/message timeout ni increase qilish
4. API timeout xatosini proper handle qilish

**Fayllar:**
- `apps/extension/src/popup.tsx`
- `apps/extension/src/components/QuickAnalysisModal.tsx`
- `apps/extension/src/background/messages/quick-score.ts`

**Bog'liqlik:** T-216

---

# SEARCH + BRIGHT DATA SOURCING (T-411..T-425)

> **Maqsad:** Uzum kalit so'z qidiruvi → mahsulot cardlar → track → Bright Data orqali xalqaro narx taqqoslash
> **Arxitektura:** `docs/BRIGHTDATA-SOURCING-ARCHITECTURE.md`
> **Boshlang'ich sana:** 2026-03-08
> **Dependency graph:**
> ```
> Faza 1 (Backend infra):    ~~T-411~~ → ~~T-412~~ → ~~T-413~~ → ~~T-414~~ ✅ ALL DONE
> Faza 2 (Frontend search):  ~~T-415~~ → ~~T-416~~ → ~~T-417~~ → ~~T-418~~ ✅ ALL DONE
> Faza 3 (Expand panel):     ~~T-419~~ ✅ DONE
> Faza 4 (Bright Data):      ~~T-420~~ → ~~T-421~~ → ~~T-422~~ → ~~T-423~~ ✅ ALL DONE
> Faza 5 (Polish):           ~~T-424~~, ~~T-425~~ ✅ ALL DONE
> ```
> **SEARCH + BRIGHT DATA: BUTUNLAY TUGALLANGAN (T-411..T-425)** ✅

---


## FAZA 1 — BACKEND INFRA (P0)

> ~~T-411~~ DONE (2026-03-08) — Route order fix, commit e464044
> ~~T-412~~ DONE (2026-03-08) — searchProducts endpoint, commit e464044
> ~~T-413~~ DONE (2026-03-08) — trackFromSearch FK safe, commit a6cd581
> ~~T-414~~ DONE (2026-03-08) — @NoBilling() decorator, commit a6cd581

---

## FAZA 2 — FRONTEND SEARCH PAGE (P0)

> ~~T-415~~ DONE (2026-03-08) — SearchPage + route + nav + i18n, commit a6cd581
> ~~T-416~~ DONE (2026-03-08) — API client + types, commit d155bd9
> ~~T-417~~ DONE (2026-03-09) — i18n search translations uz/ru/en, commit 48cec40
> ~~T-418~~ DONE (2026-03-09) — ProductSearchCard, commit 48cec40

---

### ~~T-417~~ ✅ DONE (2026-03-09, 48cec40) → Done.md

---

### ~~T-418~~ ✅ DONE (2026-03-09, 48cec40) → Done.md

---

## FAZA 3 — EXPAND PANEL (P1)

> ~~T-419~~ DONE (2026-03-09) — ExpandPanel inline analysis, commit 67d62c9

---

## FAZA 4 — BRIGHT DATA INTEGRATION (P1)

> ~~T-420~~ DONE (2026-03-09) — BrightDataClient, commit 48cec40
> ~~T-421~~ DONE (2026-03-09) — sourcing-comparison endpoint, commit 67d62c9
> ~~T-422~~ DONE (2026-03-09) — SourcePricePanel, commit 9d47b75
> ~~T-423~~ DONE (2026-03-09) — platforms.config.ts, commit 48cec40

---

## FAZA 5 — POLISH (P2)

> ~~T-424~~ DONE (2026-03-09) — useTrackedProducts hook, commit 9d47b75
> ~~T-425~~ DONE (2026-03-09) — SearchLog model + admin endpoint, commit 0268999

---

# ═══════════════════════════════════════════════════════════
# WORKER BUGS
# ═══════════════════════════════════════════════════════════

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
| ~~Web Kod Audit P0~~ (T-361..T-366) | ~~6~~ ✅ | ~~6~~ | Bekzod |
| ~~Web Kod Audit P1~~ (T-367..T-369) | ~~3~~ ✅ | ~~30~~ | Bekzod |
| **Web Kod Audit P2** (T-370) | 1 | 15 | **Bekzod** |
| ~~Platforma Audit P0~~ (T-377) | ~~1~~ ✅ | ~~1~~ | Bekzod |
| ~~**Platforma Audit P1**~~ (T-373,T-374,T-375,T-378) | ~~4~~ ✅ | ~~4~~ | Bekzod |
| **Platforma Audit P2** (T-376,T-380,T-381,~~T-382~~,T-383) | 4 | ~14 | Bekzod(3)+Sardor(1) |
| **Platforma Audit P3** (T-384) | 1 | 6 | Bekzod |
| ~~Desktop Audit P0 (T-315..T-319)~~ | ~~5~~ ✅ | ~~5~~ | Sardor |
| ~~Desktop Audit P1 (T-320..T-327)~~ | ~~8~~ ✅ | ~~8~~ | Sardor |
| ~~Desktop Audit P2 (T-328)~~ | ~~1~~ ✅ | ~~10~~ | Sardor |
| ~~Landing Audit~~ (T-329..T-342) | ~~14~~ ✅ | ~~31~~ | Sardor |
| Chrome Extension (T-216..T-233) | 18 | 18 | **Bekzod** |
| Landing Manual (M-001..M-004) | 4 | 4 | Sardor |
| ENV manual (E-006, E-008, E-010) | 3 | 3 | Bekzod |
| DevOps (T-178, T-243, T-245, T-281, T-283) | 5 | 5 | Bekzod |
| ~~Data Integrity P1~~ (T-385..T-388) | ~~4~~ ✅ | ~~4~~ | Bekzod |
| **Data Integrity P2** (T-390) | 1 | 1 | Bekzod |
| ~~Session Bug~~ (T-391) | ~~1~~ ✅ | ~~3~~ | Bekzod |
| ~~Onboarding & Billing P0~~ (T-392..T-393) | ~~2~~ ✅ | ~~2~~ | Bekzod |
| **Onboarding & Billing P1** (T-394..T-396) | 3 | 3 | Bekzod |
| **Onboarding & Billing P2** (T-397..T-398) | 2 | 2 | Bekzod |
| ~~Search + Bright Data Faza 1~~ (T-411..T-414) | ~~4~~ ✅ | ~~7~~ | Sardor |
| ~~Search + Bright Data Faza 2~~ (T-415..T-418) | ~~4~~ ✅ | ~~4~~ | Sardor |
| ~~Search + Bright Data Faza 3~~ (T-419) | ~~1~~ ✅ | ~~3~~ | Sardor |
| ~~Search + Bright Data Faza 4~~ (T-420..T-423) | ~~4~~ ✅ | ~~6~~ | Sardor |
| ~~Search + Bright Data Faza 5~~ (T-424..T-425) | ~~2~~ ✅ | ~~2~~ | Sardor |
| ~~RAG Chat Pipeline~~ (T-428..T-433) | ~~6~~ ✅ | ~~6~~ | Ziyoda |
| **MML+RAG Pipeline Faza 1** (T-478..T-483) | 6 | 6 | Ziyoda |
| **MML+RAG Pipeline Faza 2** (T-484..T-489) | 6 | 6 | Ziyoda |
| **MML+RAG Pipeline Faza 3** (T-490..T-492) | 3 | 3 | Ziyoda |
| **MML+RAG Pipeline Faza 4** (T-493..T-496) | 4 | 4 | Ziyoda |
| **JAMI task ochiq** | **~44** | | |
| **JAMI bajarilgan** | **~180+** | | → Done.md |

---

### T-458 | P1 | BACKEND | Anthropic API key yangilash — sourcing AI query/scoring ishlamayapti | 15min

**Sana:** 2026-03-18
**Manba:** ai-tahlil
**Mas'ul:** Sardor

**Tahlil:**
Sourcing pipeline da `aiGenerateQuery` va `aiScoreResults` Claude Haiku ishlatadi.
Local test da `401 invalid x-api-key` xatosi aniqlandi. Key eskirgan.
AI query generation ishlamasa — ruscha title `enQuery` sifatida Playwright scraper ga uzatiladi
→ Banggood/Shopee ruscha query bilan 0 natija qaytaradi.

**Muammo:**
`.env` da `ANTHROPIC_API_KEY` invalid (401 error).

**Yechim:**
1. Anthropic Console dan yangi API key olish
2. `.env` + Railway environment variable yangilash
3. `apps/worker && node -e "require('@anthropic-ai/sdk')"` bilan test qilish

**Fayllar:**
- `.env` — `ANTHROPIC_API_KEY`
- `apps/worker/src/processors/sourcing.processor.ts:55-83`

---

### T-460 | P2 | BACKEND | SERPAPI_API_KEY yo'q — 1688/Taobao/Alibaba/Amazon ishlamayapti | 30min

**Sana:** 2026-03-18
**Manba:** ai-tahlil
**Mas'ul:** Sardor

**Tahlil:**
Sourcing pipeline `SERPAPI_API_KEY` bo'lmasa 1688, Taobao, Alibaba, Amazon qidiruvlari
o'tkazib yuboriladi (`if (!apiKey) return []`). Local test da SerpAPI: 0 natija.
Faqat Playwright (Banggood + Shopee) ishlaydi — bu esa Xitoy platformalarsiz
cross-platform comparison to'liq emas.

**Muammo:**
`.env` da `SERPAPI_API_KEY` yo'q → 4 ta platforma (1688, Taobao, Alibaba, Amazon) ishlamaydi.

**Yechim:**
1. SerpAPI (serpapi.com) da account ochib API key olish
2. `.env` + Railway environment variable ga `SERPAPI_API_KEY` qo'shish
3. `.env.example` ga ham qo'shish

**Fayllar:**
- `apps/worker/src/processors/sourcing.processor.ts:123-156` — `serpApiSearch()`
- `.env.example`

---

### T-447 | P3 | FULLSTACK | JWT token + PlanGuard — plan-based feature gating | 2h

**Sana:** 2026-03-15
**Manba:** self-improve
**Mas'ul:** Sardor

**Tahlil:**
Hozir JWT payloadda `plan` field yo'q. Frontend plan ni bilmaydi — `/auth/me` ga so'rovsiz feature gating imkoni yo'q. `PlanGuard` component mavjud lekin hech qayerga ulanmagan. Bu task to'lov tizimi (Payme/Click) qo'shilganda kerak bo'ladi — hozir P3 (past prioritet).

**Muammo:**
- JWT da `plan` yo'q → frontend tokendan plan o'qiy olmaydi
- `PlanGuard` component ishlatilmayapti
- Feature gating mexanizmi yo'q

**Yechim:**
1. `auth.service.ts` — `signAccessToken()`ga `plan` parametr qo'shish, JWT payloadga yozish
2. `auth.service.ts` — `login()`, `refresh()`, `register()`da account'dan `plan` o'qib uzatish
3. `packages/types/` — JWT payload type'ga `plan` qo'shish
4. Frontend `PlanGuard` — `getTokenPayload().plan` ishlatsin
5. Kerakli feature'larni `<PlanGuard require="PRO">` bilan wrap qilish

**Fayllar:** `apps/api/src/auth/auth.service.ts`, `packages/types/src/index.ts`, `apps/web/src/components/PlanGuard.tsx`

**Eslatma:** To'lov tizimi yo'q bo'lguncha bu task bajarilmaydi — hozir barcha userlar FREE planda.

---

---

### T-469 | P1 | WORKER | Global sourcing — Google Shopping olib tashlash + Wildberries/Ozon/Trendyol/Hepsiburada qo'shish | 2h | pending[Sardor]

**Sana:** 2026-03-25
**Manba:** user-feedback (Sardor, 2026-03-25)
**Mas'ul:** Sardor

**Tahlil:**
Hozirgi sourcing pipeline `SerpAPI google_shopping` engine orqali barcha qidiruvlarni amalga oshiradi.
Bu yondashuv noto'g'ri — google_shopping har platformani birga ko'rsatadi, platforma-specific
narxlar aniq emas. Foydalanuvchi to'g'ridan-to'g'ri manba platformalarini xohlaydi:
Wildberries/Ozon (Rossiya), Trendyol/Hepsiburada (Turkiya), mavjud: AliExpress/DHgate/Banggood/Shopee.

**Muammo:**
```
sourcing.processor.ts:550-558 — barcha qidiruvlar google_shopping orqali
```

**Yechim:**
1. `serpApiSearch(google_shopping)` bloklarini olib tashlash
2. `searchWildberries()` — REST API (search.wb.ru)
3. `scrapeOzon()` — Playwright (ozon.ru)
4. `scrapeTrendyol()` — Playwright (trendyol.com)
5. `scrapeHepsiburada()` — Playwright (hepsiburada.com)
6. `seed.ts` — wildberries, ozon, trendyol, hepsiburada externalPlatform qo'shish
7. `platforms.config.ts` — yangi platformalar
8. `types.ts` (web) — SOURCE_META yangilash
9. `GlobalPriceComparison.tsx` — subtitle yangilash

**Fayllar:**
- `apps/worker/src/processors/sourcing.processor.ts`
- `apps/api/prisma/seed.ts`
- `apps/api/src/bright-data/platforms.config.ts`
- `apps/web/src/components/product/types.ts`
- `apps/web/src/components/product/GlobalPriceComparison.tsx`

---

### T-478 | P1 | IKKALASI | getSourcingComparison — Worker pipeline ga o'tkazish | 2h | pending[Sardor]

**Sana:** 2026-03-27
**Manba:** ai-tahlil
**Mas'ul:** Sardor

**Tahlil:**
`GET /products/:id/sourcing-comparison` hozir `BrightDataClient.searchAllPlatforms()` chaqiradi —
bu Bright Data Web Scraper API (dataset ID lar) ishlatadi. Dataset IDlar yo'q/noto'g'ri → bo'sh natija.
Worker da esa Playwright + Bright Data proxy (USERNAME/PASSWORD) orqali to'g'ridan
aliexpress.com, 1688.com, dhgate.com, ozon.ru, wildberries va boshqalarni scrape qiladi — bu ishlaydi.

**Muammo:**
API endpoint sinxron BrightDataClient ishlatadi (dataset IDlar yo'q) → barcha platformalar `[]` qaytaradi.
Worker pipeline mavjud va ishlaydi lekin frontend unga ulanmagan.

**Yechim:**
1. `products.service.ts` — `getSourcingComparison()` → `enqueueSourcingJob()` chaqirsin, jobId qaytarsin
2. `products.controller.ts` — `POST /:id/sourcing-comparison/start` + `GET /:id/sourcing-comparison/results`
3. `products.ts` (web api) — yangi 2 endpoint ga o'tish
4. `GlobalPriceComparison.tsx` — polling logikasi (har 3 sek status check, DONE bo'lsa natija)

**Fayllar:**
- `apps/api/src/products/products.service.ts`
- `apps/api/src/products/products.controller.ts`
- `apps/web/src/api/products.ts`
- `apps/web/src/components/product/GlobalPriceComparison.tsx`

---

### T-495 | P3 | BACKEND | TimescaleDB + daily_sales materialized view (100K tayyorlik) | 3h

**Sana:** 2026-03-28
**Manba:** ai-tahlil (MML-RAG-STRATEGY.md roadmap)
**Topilgan joyda:** `docs/MML-RAG-STRATEGY.md:390-415`
**Mas'ul:** Ziyoda

**Tahlil:**
100K productga yetganda PostgreSQL analytical query 12-30 soniya ketadi.
TimescaleDB hypertable + continuous aggregate `daily_sales` view (kunlik delta AVTOMATIK) →
ClickHouse orqali 50-200 millisekund. Bu task P3 — hozir 10K scale da kerak emas,
product_count > 50K bo'lganda bajariladi.

**Muammo:**
`product_snapshots` oddiy PG jadval — 100K da sekin bo'ladi.

**Yechim:**
1. TimescaleDB extension yoqish (Railway PG da mavjud)
2. `product_snapshots` → hypertable
3. `daily_sales` continuous aggregate (MML-RAG-STRATEGY.md:403-410)
4. 30 kun eski data auto-compress policy

**Fayllar:**
- `apps/api/prisma/migrations/` — TimescaleDB migration SQL

**Eslatma:** product_count > 50K bo'lganda bajariladi (hozir P3).

---

### T-496 | P3 | BACKEND | Model 4 — Risk Assessment LightGBM Classifier | 3h

**Sana:** 2026-03-28
**Manba:** ai-tahlil (MML-RAG-STRATEGY.md roadmap)
**Topilgan joyda:** `docs/MML-RAG-STRATEGY.md:232-243`
**Mas'ul:** Ziyoda

**Tahlil:**
Hozir `predictDeadStock()` qoida asosida ishlaydi (packages/utils). ML yaxshilash:
Tarixda sotuvlari 0 ga tushgan productlar ustida LightGBM Classifier train qilinadi.
`risk_score` 0-1, `risk_level`: low/medium/high/critical. Kutilgan AUC: 80%+.

**Muammo:**
Risk assessment rule-based — yangi pattern larni o'rganolmaydi, AUC taxminan 65%.

**Yechim:**
1. `apps/ml/models/lightgbm_risk.py` — binary classifier (dead stock bo'ladimi?)
2. Features: score traektoriyasi, weekly_bought kamayish, feedback to'xtab qolishi, stok
3. `POST /predict/risk` endpoint
4. `PredictionsService` ga `getRiskScore()` metod
5. ProductPage da risk badge yangilash (ML based)

**Fayllar:**
- `apps/ml/models/lightgbm_risk.py` (yangi)
- `apps/ml/main.py`
- `apps/api/src/predictions/predictions.service.ts`

---

### T-497 | P1 | BACKEND | Bright Data Web Unlocker — uzum.uz kunlik sotuv scraping (Playwright replacement) | 3h

**Sana:** 2026-03-29
**Manba:** ai-tahlil (performance + reliability)
**Topilgan joyda:** `apps/worker/src/processors/weekly-scrape.processor.ts`, `apps/worker/src/processors/weekly-scraper.ts`
**Mas'ul:** Ziyoda | pending[Ziyoda]

**Tahlil:**
Hozirgi `weekly-scrape.processor.ts` Playwright browser orqali uzum.uz sahifasidan `weekly_bought`
banner ni scrape qiladi. Muammo: Playwright = 300-600MB RAM, sekin (sahifa render kutish),
Uzum.uz Railway IP ni bloklashi mumkin. Bright Data Web Unlocker esa HTTP proxy sifatida
`https://api.uzum.uz/api/v2/product/{id}` REST endpointini to'g'ridan chaqiradi — browser siz,
10-50ms, IP rotation avtomatik. `ordersAmount` (cumulative) dan delta = `weekly_bought`.
ML pipeline (T-479 CategoryAggregation, T-482 MlPrediction) uchun kunlik aniq data zarur.

**Muammo:**
1. `weekly-scraper.ts` Playwright + SSR banner parse — og'ir va ishonchsiz
2. Uzum REST API Railway IP bilan bloklanishi mumkin (T-454 faqat sourcing uchun fix qildi)
3. `ordersAmount` delta hisoblash yo'q — faqat banner qiymati ishlatiladi

**Yechim:**
1. `apps/worker/src/clients/uzum-unlocker.client.ts` yaratish:
   - `BRIGHT_DATA_USERNAME` + `BRIGHT_DATA_PASSWORD` mavjud bo'lsa → Bright Data Web Unlocker proxy
   - Fallback: to'g'ridan Uzum REST API (local dev uchun)
   - `fetchProductOrders(productId: number)` → `{ordersAmount, totalAvailableAmount, sellPrice, rating, reviewsAmount}`
   - Proxy format: `http://{user}:{pass}@brd.superproxy.io:22225` (undici ProxyAgent)

2. `apps/worker/src/processors/weekly-scrape.processor.ts` yangilash:
   - Birinchi: `uzumUnlockerClient.fetchProductOrders(id)` → `ordersAmount` olish
   - Delta: `ordersAmount - prevSnapshot.orders_amount` = `weekly_bought` (agar delta > 0)
   - Fallback: `weekly_bought` yo'q bo'lsa → mavjud Playwright banner scrape (saqlanadi)
   - `weekly_bought_source`: `'brightdata-unlocker'` | `'scraped'` | `'calculated'`

3. `apps/worker/src/jobs/daily-sales.job.ts` yaratish:
   - Cron `0 2 * * *` (02:00 UTC — uzum.uz trafik minimal bo'lgan vaqt)
   - `weekly-scrape-queue` ga `mode: 'batch'` job yuborish
   - Bu mavjud 15min batch ni to'ldiradi, lekin kechasi to'liq run ham qiladi

4. `apps/worker/src/app.module.ts` ga `daily-sales.job.ts` qo'shish

**Fayllar:**
- `apps/worker/src/clients/uzum-unlocker.client.ts` (yangi)
- `apps/worker/src/processors/weekly-scrape.processor.ts` (yangilash)
- `apps/worker/src/jobs/daily-sales.job.ts` (yangi)
- `apps/worker/src/app.module.ts`
- `.env.example` — `BRIGHT_DATA_USERNAME`, `BRIGHT_DATA_PASSWORD` (allaqachon bor, eslatma)

**Qo'shimcha kontekst:**
- `BRIGHT_DATA_USERNAME`/`PASSWORD` allaqachon `.env` da bor (T-454 dan)
- `browser-pool.ts` Bright Data CDP ishlatadi — bu esa Web Unlocker (HTTP proxy), boshqa credential
- Web Unlocker endpoint: `brd.superproxy.io:22225` (HTTP), CDP: `brd.superproxy.io:9222` (WebSocket)
- `undici` ProxyAgent allaqachon `uzum-scraper.ts` da ishlatilgan — import tayyor

---

### T-510 | P0 | IKKALASI | Haftalik/bugungi sotuv xatoliklari — created_at, today_sold, score fix | 1h | pending[Sardor]

**Sana:** 2026-04-18
**Manba:** production-bug | user-feedback
**Topilgan joyda:** `apps/api/src/products/products.service.ts:861-876`, `apps/api/src/uzum/uzum.service.ts:116-124`
**Mas'ul:** Sardor

**Tahlil:**
4 ta bog'liq bug aniqlandi:
1. Qayta track qilganda `created_at` yangilanmaydi → `trackedDays` xato hisoblanadi
2. `trackedDays >= 7` bo'lib qoladi → `productSnapshotDaily` yig'indisi (20) ishlatiladi, scraped (183) emas
3. `today_sold` null — `take:20` da 18h+ snap topilmaydi, `productSnapshotDaily.max_orders` ishlatilmagan
4. Score = 0 — dedup path da `lastSnap.score = null` (worker snapshot) → `cachedScore = 0`

**Muammo:**
```
Apr 9  → tracked (created_at=Apr9)
Apr 10 → untrack (is_active=false)
Apr 16 → re-track → is_active=true, created_at=Apr9 (yangilanmadi!)
trackedDays = 10 >= 7 → weeklyFromDaily = 20 (xato), scraped 183 ignored
```

**Yechim:**
1. `trackProduct` — `update` ga `created_at: new Date()` qo'shish (re-track = yangi boshlanish)
2. `getProductById` — `daysWithData < 3` bo'lsa scraped ga fallback
3. `analyzeProduct` — `today_sold` ni `productSnapshotDaily` kechagi `max_orders` dan hisoblash
4. `analyzeProduct` dedup path — `score=null` snapshot uchun `recentSnapshots` dan scored snap topish

**Fayllar:**
- `apps/api/src/products/products.service.ts`
- `apps/api/src/uzum/uzum.service.ts`

---

### T-509 | P1 | IKKALASI | "Bugungi sotuv" alohida card — kechagi sotuv fixed, bugungi live | 1h | done[Sardor]

**Sana:** 2026-04-16
**Manba:** user-feedback (Sardor, 2026-04-16)
**Topilgan joyda:** `apps/web/src/pages/ProductPage.tsx:420-436`, `apps/api/src/uzum/uzum.service.ts`
**Mas'ul:** Sardor

**Tahlil:**
Hozir bitta "Kechagi sotuv" karta bor. `analyzeProduct` (Yangilash tugmasi) live delta
qaytaradi → `currentOrders` o'zgarsa karta ham o'zgaradi → foydalanuvchini chalkashtirib yuboradi.
`getProductById` `productSnapshotDaily.daily_orders_delta` qaytaradi (fixed, kecha hisoblab
qo'yilgan qiymat). Ikki alohida karta kerak: biri fixed (kechagi), biri live (bugungi).

**Muammo:**
Faqat bitta `daily_sold` karta bor, u `analyzeProduct` da o'zgarib turadi (live) yoki
`getProductById` dan override bo'ladi (fixed) — logika aniq emas.

**Yechim:**
1. `analyzeProduct` javobiga `today_sold` maydoni qo'shish (= hozirgi live delta)
2. `AnalyzeResult` type ga `today_sold?: number | null` qo'shish
3. `ProductPage`: `todaySold` state, `loadData` da `analyzeRes.data.today_sold` saqlash
4. "Bugungi sotuv" yangi karta qo'shish (live, har Yangilashda o'zgaradi)
5. "Kechagi sotuv" karta `result.daily_sold` (fixed, `productSnapshotDaily` dan override)

**Fayllar:**
- `apps/api/src/uzum/uzum.service.ts`
- `apps/web/src/api/types.ts`
- `apps/web/src/pages/ProductPage.tsx`

---

### T-508 | P0 | BACKEND | analyzeProduct daily_sold = 0 bug — 18h+ oldingi snapshot bilan taqqoslash | 30min | done[Sardor]

**Sana:** 2026-04-17
**Manba:** production-bug | user-feedback
**Topilgan joyda:** `apps/api/src/uzum/uzum.service.ts:113-115, 281-283`
**Mas'ul:** Sardor | pending[Sardor]

**Tahlil:**
`analyzeProduct` (Yangilash tugmasi) `daily_sold` ni hisoblashda `recentSnapshots[0]`
(eng so'nggi snapshot) bilan taqqoslaydi. Birinchi sahifaga kirishda yangi snapshot
yaratiladi. Keyingi kirishda `recentSnapshots[0]` = bugun yaratilgan snapshot bo'ladi
va `currentOrders - recentSnapshots[0].orders_quantity = 0` → `daily_sold = 0`.

**Muammo:**
```
1-kirish: recentSnapshots[0] = Apr 16 (38177) → 38194 - 38177 = 17 ✅
2-kirish: recentSnapshots[0] = Apr 17 (38194) → 38194 - 38194 = 0 ❌
```
Ikkala path ham xato: dedup path (line 113) va asosiy path (line 281).

**Yechim:**
`recentSnapshots` ichidan 18+ soat oldingi birinchi snapshotni topish (`dayOldSnap`).
Shu bilan taqqoslash → har doim kechagi ma'lumot asosida hisob:
```typescript
const DAILY_MIN_GAP_MS = 18 * 60 * 60 * 1000;
const dayOldSnap = recentSnapshots.find(
  (s) => Date.now() - s.snapshot_at.getTime() > DAILY_MIN_GAP_MS,
);
const daily_sold = dayOldSnap
  ? Math.max(0, currentOrders - Number(dayOldSnap.orders_quantity ?? 0))
  : null;
```

**Fayllar:**
- `apps/api/src/uzum/uzum.service.ts` (line 113-115 va 281-283)

---


*Tasks.md | VENTRA Analytics Platform | 2026-04-15*