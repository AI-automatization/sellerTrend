# VENTRA — OCHIQ VAZIFALAR
# Yangilangan: 2026-03-08
# Developer-specific fayllar:
#   - Bekzod → docs/Tasks-Bekzod.md
#   - Sardor → docs/Tasks-Sardor.md
# Bajarilganlar → docs/Done.md

---

## STATISTIKA

```
Ochiq:       ~25 ta
Bajarilgan:  ~180+ ta (Done.md)
Oxirgi T-#:  T-433
Keyingi T-#: T-434 dan boshlash
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

# RAG CHAT PIPELINE (T-428..T-433) — Bekzod
# ═══════════════════════════════════════════════════════════
#
# Manba: docs/RAG-PIPELINE-PLAN.md
# Boshlang'ich sana: 2026-03-10
# Dependency graph:
# ```
# T-428 (Schema) → T-429 (Classifier) → T-430 (Retriever)
#                                          ↓
#                   T-431 (Chat Service) ← T-430
#                          ↓
#                   T-432 (Controller SSE) ← T-431
#                          ↓
#                   T-433 (Frontend) ← T-432
# ```

---

## Bosqich 1 — Database Schema

### T-428 | P1 | BACKEND | RAG Chat — Prisma schema + migration (ChatConversation, ChatMessage) | 30min

**Sana:** 2026-03-10
**Manba:** yangi-feature (docs/RAG-PIPELINE-PLAN.md)
**Topilgan joyda:** `apps/api/prisma/schema.prisma`
**Mas'ul:** —

**Tahlil:**
RAG chat pipeline uchun 2 ta yangi model va 2 ta enum kerak. Foydalanuvchi suhbatlari
`ChatConversation` da, har xabar `ChatMessage` da saqlanadi. AiUsageLog allaqachon mavjud —
chat cost tracking uchun qayta ishlatiladi (`method='chat'`). Account modelga yangi relation qo'shiladi.
Multi-tenant: barcha query'lar `account_id` filter bilan.

**Muammo:**
Hozir chat jadvallari mavjud emas. AI xizmati faqat `extractAttributes`, `explainWinner`, `analyzeTrend`
kabi oldindan belgilangan endpoint'lar orqali ishlaydi. Erkin savol-javob uchun suhbat tarixi
saqlanadigan infra kerak.

**Yechim:**

1. `ChatRole` enum qo'shish:
```prisma
enum ChatRole {
  USER
  ASSISTANT
}
```

2. `ChatFeedback` enum qo'shish:
```prisma
enum ChatFeedback {
  UP
  DOWN
}
```

3. `ChatConversation` model:
```prisma
model ChatConversation {
  id         String    @id @default(cuid())
  account_id String
  user_id    String
  title      String?
  is_active  Boolean   @default(true)
  created_at DateTime  @default(now())
  updated_at DateTime  @updatedAt

  account  Account  @relation(fields: [account_id], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  messages ChatMessage[]

  @@index([account_id, updated_at(sort: Desc)])
  @@index([user_id])
}
```

4. `ChatMessage` model:
```prisma
model ChatMessage {
  id              String        @id @default(cuid())
  conversation_id String
  role            ChatRole
  content         String        @db.Text
  context_json    Json?         // retriever natijasi — debug + audit uchun
  intent          String?       // classifier natijasi (PRODUCT_ANALYSIS, NICHE, ...)
  product_ids     BigInt[]      // xabar bilan bog'liq mahsulot ID'lari
  model           String?       // "claude-haiku-4-5-20251001" yoki "claude-sonnet-4-5-20241022"
  input_tokens    Int?
  output_tokens   Int?
  cost_usd        Decimal?      @db.Decimal(10, 6)
  feedback        ChatFeedback?
  feedback_text   String?
  created_at      DateTime      @default(now())

  conversation ChatConversation @relation(fields: [conversation_id], references: [id], onDelete: Cascade)

  @@index([conversation_id, created_at])
}
```

5. `Account` modelga relation qo'shish:
```prisma
// Account model ichiga:
chat_conversations ChatConversation[]
```

6. `User` modelga relation qo'shish:
```prisma
// User model ichiga:
chat_conversations ChatConversation[]
```

7. Migration:
```bash
cd apps/api && npx prisma migrate dev --name add_chat_tables
npx prisma generate
```

**Tekshirish:**
- `npx prisma studio` — ChatConversation, ChatMessage jadvallar mavjud
- `npx prisma validate` — schema xatosiz
- Index'lar: account_id+updated_at (conversation list), conversation_id+created_at (message history)

**Fayllar:**
- `apps/api/prisma/schema.prisma` — +2 model, +2 enum, +2 relation

**Bog'liqlik:** yo'q (birinchi bosqich)

---

## Bosqich 2 — Intent Classifier

### T-429 | P1 | BACKEND | RAG Chat — Keyword-based intent classifier (10 intent, 3 til) | 1h

**Sana:** 2026-03-10
**Manba:** yangi-feature (docs/RAG-PIPELINE-PLAN.md)
**Topilgan joyda:** yangi fayl — `apps/api/src/chat/`
**Mas'ul:** —

**Tahlil:**
Foydalanuvchi xabaridan intent aniqlash — LLM CHAQIRMASDAN, faqat keyword matching.
Tezkor (0ms latency), bepul (API call yo'q), aniq (bilangan kalit so'zlar bo'yicha).
O'zbek, rus, ingliz tillarda kalit so'zlar. Agar hech bir keyword mos kelmasa → GENERAL intent.
Xabardan product ID ham extract qilinadi (raqam yoki tracked product title bo'yicha).

**Muammo:**
Hozir AI endpoint'lari oldindan belgilangan (extractAttributes, analyzeTrend, ...).
Erkin matn savolini qaysi service ga yo'naltirish kerak — bu classifier hal qiladi.
LLM classifier qimmat va sekin (300ms+), keyword-based 0ms va bepul.

**Yechim:**

1. `apps/api/src/chat/types/chat.types.ts` yaratish:
```typescript
export enum ChatIntent {
  PRODUCT_ANALYSIS = 'PRODUCT_ANALYSIS',   // mahsulot tahlili
  CATEGORY_TREND = 'CATEGORY_TREND',       // kategoriya trendi
  PRICE_ADVICE = 'PRICE_ADVICE',           // narx maslahati
  RECOMMENDATION = 'RECOMMENDATION',       // tavsiyalar
  DEAD_STOCK = 'DEAD_STOCK',               // sotilmayotgan tovar
  COMPETITOR = 'COMPETITOR',               // raqobat tahlili
  REVENUE = 'REVENUE',                     // daromad hisoblash
  FORECAST = 'FORECAST',                   // bashorat
  NICHE = 'NICHE',                         // niche topish
  GENERAL = 'GENERAL',                     // umumiy savol
}

export interface ClassifiedIntent {
  intent: ChatIntent;
  confidence: number;          // 0-1 — nechta keyword mos keldi
  product_ids: bigint[];       // xabardan topilgan product IDlar
  keywords_matched: string[];  // debug uchun
}

export interface RetrievedContext {
  intent: ChatIntent;
  summary: string;             // LLM ga beriladigan matn (~3K chars max)
  data: Record<string, unknown>; // raw data (JSON saqlash uchun)
  token_estimate: number;      // taxminiy token soni
  sources: string[];           // qaysi service'lardan olindi
}
```

2. `apps/api/src/chat/chat-classifier.service.ts` yaratish:
```typescript
@Injectable()
export class ChatClassifierService {
  private readonly logger = new Logger(ChatClassifierService.name);

  // Har intent uchun keyword map — 3 tilda
  private readonly INTENT_KEYWORDS: Record<ChatIntent, string[]> = {
    PRODUCT_ANALYSIS: [
      // uz
      'tahlil', 'analiz', 'mahsulot', 'tovar', 'ko\'rsat', 'holat', 'qanday',
      // ru
      'анализ', 'товар', 'продукт', 'показ', 'состояние',
      // en
      'analysis', 'product', 'analyze', 'show', 'status', 'detail',
    ],
    CATEGORY_TREND: [
      'kategoriya', 'trend', 'lider', 'top', 'o\'sish',
      'категория', 'тренд', 'лидер', 'рост',
      'category', 'trending', 'leader', 'growth', 'leaderboard',
    ],
    PRICE_ADVICE: [
      'narx', 'chegirma', 'baho', 'arzon', 'qimmat', 'flash',
      'цена', 'скидка', 'дешев', 'дорог',
      'price', 'discount', 'cheap', 'expensive', 'flash sale',
    ],
    RECOMMENDATION: [
      'tavsiya', 'maslahat', 'nima sotay', 'nima qo\'shay',
      'рекомендация', 'совет', 'что продавать',
      'recommend', 'suggest', 'what to sell', 'advice',
    ],
    DEAD_STOCK: [
      'sotilmay', 'qotib', 'ombor', 'stok', 'yotib',
      'не продается', 'залежал', 'склад', 'мертвый',
      'dead stock', 'not selling', 'stuck', 'slow moving',
    ],
    COMPETITOR: [
      'raqib', 'raqobat', 'kannibal', 'o\'xshash',
      'конкурент', 'каннибализ', 'похож',
      'competitor', 'competition', 'cannibalization', 'similar',
    ],
    REVENUE: [
      'daromad', 'foyda', 'tushum', 'revenue', 'margin',
      'доход', 'выручка', 'прибыль', 'маржа',
      'revenue', 'profit', 'income', 'margin', 'earnings',
    ],
    FORECAST: [
      'bashorat', 'prognoz', 'kelasi hafta', 'kelajak',
      'прогноз', 'следующая неделя', 'будущ',
      'forecast', 'predict', 'next week', 'future',
    ],
    NICHE: [
      'niche', 'nisha', 'bo\'sh joy', 'imkoniyat', 'kam raqobat',
      'ниша', 'возможность', 'мало конкурент',
      'niche', 'opportunity', 'gap', 'low competition', 'untapped',
    ],
    GENERAL: [], // fallback — keyword mos kelmasa
  };

  classify(message: string, trackedProductIds: bigint[]): ClassifiedIntent {
    const lower = message.toLowerCase();
    const words = lower.split(/\s+/);

    // 1. Product ID extraction — xabardan raqam olish
    const mentionedIds: bigint[] = [];
    const numberMatches = message.match(/\b\d{5,}\b/g); // 5+ raqamli sonlar = product ID
    if (numberMatches) {
      for (const num of numberMatches) {
        const id = BigInt(num);
        if (trackedProductIds.includes(id)) {
          mentionedIds.push(id);
        }
      }
    }

    // 2. Intent scoring — har intent uchun mos keyword'lar soni
    let bestIntent = ChatIntent.GENERAL;
    let bestScore = 0;
    const bestKeywords: string[] = [];

    for (const [intent, keywords] of Object.entries(this.INTENT_KEYWORDS)) {
      if (intent === 'GENERAL') continue;
      const matched = keywords.filter(kw => lower.includes(kw));
      if (matched.length > bestScore) {
        bestScore = matched.length;
        bestIntent = intent as ChatIntent;
        bestKeywords.length = 0;
        bestKeywords.push(...matched);
      }
    }

    const confidence = bestScore > 0 ? Math.min(bestScore / 3, 1) : 0;

    return {
      intent: bestIntent,
      confidence,
      product_ids: mentionedIds.length > 0 ? mentionedIds : trackedProductIds.slice(0, 5),
      keywords_matched: bestKeywords,
    };
  }
}
```

**Tekshirish:**
- "Mahsulotimni tahlil qil" → PRODUCT_ANALYSIS
- "Qaysi kategoriya o'syapti?" → CATEGORY_TREND
- "Sotilmayotgan tovarlarim bormi?" → DEAD_STOCK
- "Salom, qanday yordam bera olasiz?" → GENERAL
- "12345678 mahsulot narxi qanday?" → PRODUCT_ANALYSIS + product_ids: [12345678n]

**Fayllar:**
- `apps/api/src/chat/types/chat.types.ts` — yangi
- `apps/api/src/chat/chat-classifier.service.ts` — yangi

**Bog'liqlik:** T-428 (schema kerak — ChatIntent enum reference)

---

## Bosqich 3 — Context Retriever

### T-430 | P1 | BACKEND | RAG Chat — Context retriever (intent → service → context assembly) | 2h

**Sana:** 2026-03-10
**Manba:** yangi-feature (docs/RAG-PIPELINE-PLAN.md)
**Topilgan joyda:** yangi fayl — `apps/api/src/chat/chat-retriever.service.ts`
**Mas'ul:** —

**Tahlil:**
Classifier intent aniqlagach, retriever tegishli service'lardan real data oladi va LLM uchun
matnli kontekst tayyorlaydi. Har intent uchun boshqa service'lar chaqiriladi.
`Promise.allSettled()` bilan parallel — biri fail bo'lsa boshqalari ishlaydi.
Kontekst ~3K chars chegaralanadi (Haiku uchun optimallik + cost tejash).

**Muammo:**
Hozir AI xizmati faqat bitta aniq ma'lumot bilan ishlaydi (masalan, `analyzeTrend` ga snapshot
beriladi). RAG uchun bir nechta service'dan yig'ilgan boy kontekst kerak:
- `ProductsService.getWeeklyTrend()` — haftalik trend
- `ProductsService.getAdvancedForecast()` — ML bashorat
- `ProductsService.getRevenueEstimate()` — daromad hisoblash
- `SignalsService.getDeadStockRisk()` — sotilmayotgan tovarlar
- `SignalsService.getCannibalization()` — raqobat
- `SignalsService.getFlashSales()` — chegirmalar
- `DiscoveryService.getLeaderboard()` — kategoriya liderlari
- `NicheService.findNiches()` (yoki tegishli metod) — niche imkoniyatlar
- `ProductsService.getRecommendations()` — tavsiyalar

Har biriga `account_id` filter MAJBURIY.

**Yechim:**

1. `apps/api/src/chat/chat-retriever.service.ts`:
```typescript
@Injectable()
export class ChatRetrieverService {
  private readonly logger = new Logger(ChatRetrieverService.name);
  private readonly MAX_CONTEXT_CHARS = 3000;

  constructor(
    private readonly productsService: ProductsService,
    private readonly signalsService: SignalsService,
    private readonly discoveryService: DiscoveryService,
    private readonly prisma: PrismaService,
  ) {}

  async retrieve(
    classified: ClassifiedIntent,
    accountId: string,
  ): Promise<RetrievedContext> {
    const { intent, product_ids } = classified;

    switch (intent) {
      case ChatIntent.PRODUCT_ANALYSIS:
        return this.retrieveProductAnalysis(product_ids, accountId);
      case ChatIntent.CATEGORY_TREND:
        return this.retrieveCategoryTrend(accountId);
      case ChatIntent.PRICE_ADVICE:
        return this.retrievePriceAdvice(product_ids, accountId);
      case ChatIntent.RECOMMENDATION:
        return this.retrieveRecommendations(accountId);
      case ChatIntent.DEAD_STOCK:
        return this.retrieveDeadStock(accountId);
      case ChatIntent.COMPETITOR:
        return this.retrieveCompetitor(accountId);
      case ChatIntent.REVENUE:
        return this.retrieveRevenue(product_ids, accountId);
      case ChatIntent.FORECAST:
        return this.retrieveForecast(product_ids, accountId);
      case ChatIntent.NICHE:
        return this.retrieveNiche(accountId);
      case ChatIntent.GENERAL:
      default:
        return this.retrievePortfolioSummary(accountId);
    }
  }

  // --- PRODUCT_ANALYSIS ---
  private async retrieveProductAnalysis(productIds: bigint[], accountId: string) {
    const pid = productIds[0]?.toString();
    if (!pid) return this.retrievePortfolioSummary(accountId);

    const [trend, forecast, revenue] = await Promise.allSettled([
      this.productsService.getWeeklyTrend(pid, accountId),
      this.productsService.getAdvancedForecast(pid, accountId),
      this.productsService.getRevenueEstimate(pid, accountId),
    ]);

    const data: Record<string, unknown> = {};
    const parts: string[] = [];

    if (trend.status === 'fulfilled') {
      data.weekly_trend = trend.value;
      const t = trend.value;
      parts.push(`Haftalik savdo: ${t.weekly_sold ?? '?'} ta (${t.delta_pct != null ? (t.delta_pct > 0 ? '+' : '') + t.delta_pct + '%' : '?'}). Trend: ${t.trend}.`);
      if (t.advice) parts.push(`Maslahat: ${t.advice.message}`);
    }
    if (forecast.status === 'fulfilled') {
      data.forecast = forecast.value;
      parts.push(`7 kunlik bashorat: score ${forecast.value.score_forecast?.values?.slice(-1)?.[0]?.toFixed(1) ?? '?'}`);
    }
    if (revenue.status === 'fulfilled') {
      data.revenue = revenue.value;
      const r = revenue.value;
      parts.push(`Oylik daromad: ~${r.estimated_monthly_revenue?.toLocaleString() ?? '?'} so'm. Raqobat: ${r.competition_level}. ${r.recommendation}`);
    }

    return {
      intent: ChatIntent.PRODUCT_ANALYSIS,
      summary: parts.join('\n').slice(0, this.MAX_CONTEXT_CHARS),
      data,
      token_estimate: Math.ceil(parts.join('\n').length / 4),
      sources: ['getWeeklyTrend', 'getAdvancedForecast', 'getRevenueEstimate'],
    };
  }

  // --- DEAD_STOCK ---
  private async retrieveDeadStock(accountId: string) {
    const result = await this.signalsService.getDeadStockRisk(accountId);
    const items = Array.isArray(result) ? result : [];
    const summary = items.length === 0
      ? 'Sotilmayotgan tovar topilmadi.'
      : items.slice(0, 5).map(d =>
          `• ${d.title}: risk=${d.risk_level}, haftalik=${d.current_sold_per_week}, ${d.days_to_zero} kunga yetadi`
        ).join('\n');

    return {
      intent: ChatIntent.DEAD_STOCK,
      summary: summary.slice(0, this.MAX_CONTEXT_CHARS),
      data: { dead_stock: items },
      token_estimate: Math.ceil(summary.length / 4),
      sources: ['getDeadStockRisk'],
    };
  }

  // ... har intent uchun shu pattern: service chaqirish → summary qurish → return

  // --- GENERAL (portfolio summary) ---
  private async retrievePortfolioSummary(accountId: string) {
    const tracked = await this.productsService.getTrackedProducts(accountId);
    const count = tracked.length;
    const avgScore = count > 0
      ? (tracked.reduce((s, p) => s + (p.score ?? 0), 0) / count).toFixed(1)
      : '0';
    const summary = `Portfolio: ${count} ta mahsulot kuzatilmoqda. O'rtacha score: ${avgScore}.`;

    return {
      intent: ChatIntent.GENERAL,
      summary,
      data: { tracked_count: count, avg_score: avgScore },
      token_estimate: Math.ceil(summary.length / 4),
      sources: ['getTrackedProducts'],
    };
  }
}
```

2. Qolgan intent handler'lar (CATEGORY_TREND, PRICE_ADVICE, RECOMMENDATION, COMPETITOR, REVENUE, FORECAST, NICHE) xuddi shu pattern — har biri tegishli service method'ni chaqiradi va summary tayyorlaydi.

3. Module export'lar yangilash:
   - `products.module.ts` → `exports: [ProductsService]`
   - `signals.module.ts` → `exports: [SignalsService]`
   - `discovery.module.ts` → `exports: [DiscoveryService]` (NicheService ham agar alohida)

**Tekshirish:**
- PRODUCT_ANALYSIS intent + product_id → weekly_trend + forecast + revenue context
- DEAD_STOCK → dead stock risk list
- GENERAL (fallback) → portfolio summary
- Service failure → boshqa service'lar ishlayveradi (Promise.allSettled)

**Fayllar:**
- `apps/api/src/chat/chat-retriever.service.ts` — yangi
- `apps/api/src/products/products.module.ts` — `exports` ga `ProductsService` qo'shish
- `apps/api/src/signals/signals.module.ts` — `exports` ga `SignalsService` qo'shish
- `apps/api/src/discovery/discovery.module.ts` — `exports` ga `DiscoveryService` qo'shish

**Bog'liqlik:** T-429 (ChatIntent, ClassifiedIntent, RetrievedContext types kerak)

---

## Bosqich 4 — Chat Service (Core)

### T-431 | P1 | BACKEND | RAG Chat — Core service (Anthropic streaming, history, cost tracking) | 2h

**Sana:** 2026-03-10
**Manba:** yangi-feature (docs/RAG-PIPELINE-PLAN.md)
**Topilgan joyda:** yangi fayl — `apps/api/src/chat/chat.service.ts`
**Mas'ul:** —

**Tahlil:**
Bu servisning asosiy vazifasi: foydalanuvchi xabari → classify → retrieve → Claude ga streaming so'rov →
javobni ChatMessage ga saqlash → AiUsageLog ga cost yozish. Anthropic SDK da
`client.messages.stream()` mavjud — SSE stream qaytaradi. History: oxirgi 10 ta message (5 turn).
Model tanlash: oddiy savollar → Haiku (arzon, tez), murakkab tahlil (niche, competitor) → Sonnet.
Mavjud `AiService.checkAiQuota()` qayta ishlatiladi.

**Muammo:**
Mavjud `AiService` da `Anthropic.messages.create()` ishlatiladi (non-streaming).
Chat uchun streaming kerak — foydalanuvchi real-time javob ko'rishi uchun.
`Anthropic.messages.stream()` boshqa API — callback-based, SSE uchun mos.
Cost: Haiku $0.80/$4.00 per 1M token, Sonnet ~$3/$15 — model tanlash muhim.

**Yechim:**

1. `apps/api/src/chat/chat.service.ts`:
```typescript
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly anthropic: Anthropic;
  private readonly HAIKU_MODEL = 'claude-haiku-4-5-20251001';
  private readonly SONNET_MODEL = 'claude-sonnet-4-5-20241022';
  private readonly MAX_HISTORY = 10; // 5 turn (user+assistant)
  private readonly MAX_CONVERSATIONS = 50;
  private readonly COMPLEX_INTENTS: ChatIntent[] = [
    ChatIntent.NICHE, ChatIntent.COMPETITOR, ChatIntent.FORECAST,
  ];

  private readonly SYSTEM_PROMPT = `Sen VENTRA — Uzum.uz marketplace uchun professional bozor tahlilchisisan.
Vazifang: sotuvchilarga mahsulot tahlili, trend bashorati, narx maslahati va strategik yo'l-yo'riq berish.

QOIDALAR:
- Asosan O'zbek tilida javob ber (foydalanuvchi qaysi tilda yozsa, shu tilda)
- Raqamlarni aniq ko'rsat (narx, foiz, soni)
- Qisqa va foydali javob ber — 2-3 paragraf max
- Agar ma'lumot yetarli bo'lmasa, shuni ayt
- Hech qachon to'qima — faqat berilgan kontekst asosida javob ber`;

  constructor(
    private readonly prisma: PrismaService,
    private readonly classifier: ChatClassifierService,
    private readonly retriever: ChatRetrieverService,
    private readonly aiService: AiService, // checkAiQuota() uchun
    private readonly config: ConfigService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  // --- SEND MESSAGE (streaming) ---
  async *sendMessage(
    accountId: string,
    userId: string,
    message: string,
    conversationId?: string,
  ): AsyncGenerator<string> {
    // 1. AI quota tekshir
    await this.aiService.checkAiQuota(accountId);

    // 2. Conversation olish yoki yaratish
    const conversation = conversationId
      ? await this.getConversation(conversationId, accountId)
      : await this.createConversation(accountId, userId, message);

    // 3. User message saqlash
    await this.prisma.chatMessage.create({
      data: {
        conversation_id: conversation.id,
        role: 'USER',
        content: message,
      },
    });

    // 4. Tracked product ID'larni olish
    const trackedProducts = await this.prisma.trackedProduct.findMany({
      where: { account_id: accountId },
      select: { product_id: true },
    });
    const trackedIds = trackedProducts.map(tp => tp.product_id);

    // 5. Intent classify
    const classified = this.classifier.classify(message, trackedIds);

    // 6. Context retrieve
    const context = await this.retriever.retrieve(classified, accountId);

    // 7. History olish (oxirgi 10 message)
    const history = await this.prisma.chatMessage.findMany({
      where: { conversation_id: conversation.id },
      orderBy: { created_at: 'desc' },
      take: this.MAX_HISTORY,
      select: { role: true, content: true },
    });
    const messages = history.reverse().map(m => ({
      role: m.role.toLowerCase() as 'user' | 'assistant',
      content: m.content,
    }));

    // 8. Model tanlash
    const model = this.COMPLEX_INTENTS.includes(classified.intent)
      ? this.SONNET_MODEL
      : this.HAIKU_MODEL;

    // 9. System prompt + context
    const systemPrompt = `${this.SYSTEM_PROMPT}\n\n--- KONTEKST (real ma'lumotlar) ---\n${context.summary}`;

    // 10. Anthropic streaming
    const stream = this.anthropic.messages.stream({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    let fullResponse = '';
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullResponse += event.delta.text;
        yield event.delta.text;
      }
    }

    // 11. Final message dan token olish
    const finalMessage = await stream.finalMessage();
    inputTokens = finalMessage.usage.input_tokens;
    outputTokens = finalMessage.usage.output_tokens;

    // 12. Cost hisoblash
    const isHaiku = model === this.HAIKU_MODEL;
    const costUsd = isHaiku
      ? (inputTokens * 0.80 + outputTokens * 4.00) / 1_000_000
      : (inputTokens * 3.00 + outputTokens * 15.00) / 1_000_000;

    // 13. Assistant message saqlash
    await this.prisma.chatMessage.create({
      data: {
        conversation_id: conversation.id,
        role: 'ASSISTANT',
        content: fullResponse,
        context_json: context.data,
        intent: classified.intent,
        product_ids: classified.product_ids,
        model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: costUsd,
      },
    });

    // 14. AiUsageLog ga yozish (mavjud pattern)
    await this.prisma.aiUsageLog.create({
      data: {
        account_id: accountId,
        user_id: userId,
        method: 'chat',
        model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: costUsd,
      },
    });

    // 15. Conversation title yangilash (birinchi xabar bo'lsa)
    if (!conversationId) {
      await this.prisma.chatConversation.update({
        where: { id: conversation.id },
        data: { title: message.slice(0, 100) },
      });
    }
  }

  // --- CRUD ---
  async getConversations(accountId: string) { /* ... */ }
  async getMessages(conversationId: string, accountId: string) { /* ... */ }
  async deleteConversation(conversationId: string, accountId: string) { /* ... */ }
  async addFeedback(messageId: string, accountId: string, feedback: ChatFeedback, text?: string) { /* ... */ }
  private async createConversation(accountId: string, userId: string, firstMessage: string) { /* ... */ }
  private async getConversation(id: string, accountId: string) { /* ... */ }
}
```

2. Model tanlash logikasi:
   - `NICHE`, `COMPETITOR`, `FORECAST` → Sonnet (murakkab tahlil kerak)
   - Qolgan hammasi → Haiku (arzon + tez)

3. Conversation limit: 50 ta per account — yangi yaratishda tekshirish, oshsa eng eskisini soft-delete.

**Tekshirish:**
- Streaming: `sendMessage()` AsyncGenerator orqali har token qaytadi
- Cost: AiUsageLog da `method='chat'` yozuv
- History: 10 ta message context ga kiritiladi
- Quota: limit oshsa ForbiddenException

**Fayllar:**
- `apps/api/src/chat/chat.service.ts` — yangi
- `apps/api/src/chat/dto/send-message.dto.ts` — yangi
- `apps/api/src/chat/dto/chat-feedback.dto.ts` — yangi

**Bog'liqlik:** T-429 (classifier), T-430 (retriever)

---

## Bosqich 5 — Chat Controller (SSE)

### T-432 | P1 | BACKEND | RAG Chat — SSE streaming controller + CRUD endpoints | 1h

**Sana:** 2026-03-10
**Manba:** yangi-feature (docs/RAG-PIPELINE-PLAN.md)
**Topilgan joyda:** yangi fayl — `apps/api/src/chat/chat.controller.ts`
**Mas'ul:** —

**Tahlil:**
SSE streaming NestJS da `@Res()` manual approach kerak — `@Sse()` decorator POST method bilan
ishlamaydi. Manual `res.write()` + `text/event-stream` header. Barcha endpoint'larga
JwtAuthGuard, BillingGuard, PlanGuard qo'yiladi. AiThrottlerGuard orqali 10 msg/min limit.

**Muammo:**
NestJS `@Sse()` decorator faqat GET uchun ishlaydi. Chat uchun POST kerak (request body bor).
Manual SSE: `res.setHeader('Content-Type', 'text/event-stream')` + `res.write('data: ...\n\n')`.
CORS: axios SSE qo'llab-quvvatlamaydi — fetch + ReadableStream kerak (frontend tomonda).

**Yechim:**

1. `apps/api/src/chat/chat.controller.ts`:
```typescript
@Controller('chat')
@UseGuards(JwtAuthGuard, BillingGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // --- SSE STREAMING ---
  @Post('send')
  @UseGuards(PlanGuard, AiThrottlerGuard)
  @RequiresPlan('MAX')
  @HttpCode(200)
  async sendMessage(
    @Body() dto: SendMessageDto,
    @CurrentUser('account_id') accountId: string,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // nginx buffering off

    try {
      for await (const chunk of this.chatService.sendMessage(
        accountId, userId, dto.message, dto.conversation_id,
      )) {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    } finally {
      res.end();
    }
  }

  // --- CRUD ---
  @Get('conversations')
  async getConversations(@CurrentUser('account_id') accountId: string) {
    return this.chatService.getConversations(accountId);
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') conversationId: string,
    @CurrentUser('account_id') accountId: string,
  ) {
    return this.chatService.getMessages(conversationId, accountId);
  }

  @Post('messages/:id/feedback')
  async addFeedback(
    @Param('id') messageId: string,
    @CurrentUser('account_id') accountId: string,
    @Body() dto: ChatFeedbackDto,
  ) {
    return this.chatService.addFeedback(messageId, accountId, dto.feedback, dto.text);
  }

  @Delete('conversations/:id')
  async deleteConversation(
    @Param('id') conversationId: string,
    @CurrentUser('account_id') accountId: string,
  ) {
    return this.chatService.deleteConversation(conversationId, accountId);
  }
}
```

2. `apps/api/src/chat/dto/send-message.dto.ts`:
```typescript
export class SendMessageDto {
  @IsString()
  @Length(1, 2000)
  message!: string;

  @IsOptional()
  @IsString()
  conversation_id?: string;
}
```

3. `apps/api/src/chat/dto/chat-feedback.dto.ts`:
```typescript
export class ChatFeedbackDto {
  @IsEnum(ChatFeedback)
  feedback!: ChatFeedback;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  text?: string;
}
```

4. `apps/api/src/chat/chat.module.ts`:
```typescript
@Module({
  imports: [ProductsModule, SignalsModule, DiscoveryModule, AiModule],
  controllers: [ChatController],
  providers: [ChatService, ChatClassifierService, ChatRetrieverService],
})
export class ChatModule {}
```

5. `apps/api/src/app.module.ts` — `ChatModule` import qo'shish.

**Tekshirish:**
```bash
# SSE streaming test:
curl -N -X POST http://localhost:3000/api/v1/chat/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Mahsulotlarim holati qanday?"}'
# Kutilgan: data: {"text":"..."}\n\n chiqishi real-time

# Conversations list:
curl http://localhost:3000/api/v1/chat/conversations -H "Authorization: Bearer $TOKEN"

# Messages:
curl http://localhost:3000/api/v1/chat/conversations/CONV_ID/messages -H "Authorization: Bearer $TOKEN"
```

**Fayllar:**
- `apps/api/src/chat/chat.controller.ts` — yangi
- `apps/api/src/chat/chat.module.ts` — yangi
- `apps/api/src/chat/dto/send-message.dto.ts` — yangi
- `apps/api/src/chat/dto/chat-feedback.dto.ts` — yangi
- `apps/api/src/app.module.ts` — `ChatModule` import

**Bog'liqlik:** T-431 (ChatService), T-428 (schema)

---

## Bosqich 6 — Frontend Chat UI

### T-433 | P1 | FRONTEND | RAG Chat — Chat widget, SSE streaming, feedback, i18n | 3h

**Sana:** 2026-03-10
**Manba:** yangi-feature (docs/RAG-PIPELINE-PLAN.md)
**Topilgan joyda:** yangi fayllar — `apps/web/src/components/chat/`, `apps/web/src/api/chat.ts`, `apps/web/src/hooks/useChat.ts`
**Mas'ul:** —

**Tahlil:**
Frontend da floating chat widget kerak — pastki o'ng burchakda tugma, bosilganda drawer/modal ochiladi.
SSE streaming: axios ishlatib bo'lmaydi (SSE qo'llab-quvvatlamaydi), fetch + ReadableStream kerak.
DaisyUI `chat-bubble` component bilan xabar ko'rinishi. Markdown render uchun oddiy regex yoki
`react-markdown` (allaqachon dependency bo'lsa). i18n: 3 tilda tarjima.

**Muammo:**
1. SSE POST — axios SSE-ni qo'llab-quvvatlamaydi, fetch API kerak
2. Streaming state — har kelgan chunk ni real-time ko'rsatish
3. Auto-scroll — yangi xabar kelganda pastga scroll
4. Mobile responsive — kichik ekranda to'liq ekran chat
5. Markdown — Claude javobida **bold**, `code`, ro'yxatlar bo'lishi mumkin

**Yechim:**

1. `apps/web/src/api/chat.ts` — SSE client:
```typescript
import { getBaseUrl, getAuthHeaders } from './base';

export const chatApi = {
  // SSE streaming — fetch + ReadableStream
  sendMessage: async function* (message: string, conversationId?: string) {
    const res = await fetch(`${getBaseUrl()}/chat/send`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, conversation_id: conversationId }),
    });

    if (!res.ok) throw new Error(`Chat error: ${res.status}`);
    if (!res.body) throw new Error('No response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const json = JSON.parse(line.slice(6));
        if (json.done) return;
        if (json.error) throw new Error(json.error);
        if (json.text) yield json.text;
      }
    }
  },

  // CRUD — oddiy axios
  getConversations: () => api.get('/chat/conversations'),
  getMessages: (id: string) => api.get(`/chat/conversations/${id}/messages`),
  sendFeedback: (messageId: string, feedback: 'UP' | 'DOWN', text?: string) =>
    api.post(`/chat/messages/${messageId}/feedback`, { feedback, text }),
  deleteConversation: (id: string) => api.delete(`/chat/conversations/${id}`),
};
```

2. `apps/web/src/hooks/useChat.ts` — state management:
```typescript
interface ChatMessage {
  id?: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  streaming?: boolean;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    setError(null);
    setMessages(prev => [...prev, { role: 'USER', content: text }]);
    setMessages(prev => [...prev, { role: 'ASSISTANT', content: '', streaming: true }]);
    setIsStreaming(true);

    try {
      for await (const chunk of chatApi.sendMessage(text, conversationId ?? undefined)) {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.streaming) {
            return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
          }
          return prev;
        });
      }
      // streaming done
      setMessages(prev => {
        const last = prev[prev.length - 1];
        return last?.streaming
          ? [...prev.slice(0, -1), { ...last, streaming: false }]
          : prev;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xato yuz berdi');
      setMessages(prev => prev.filter(m => !m.streaming));
    } finally {
      setIsStreaming(false);
    }
  }, [conversationId]);

  return { messages, isStreaming, error, sendMessage, conversationId, setConversationId };
}
```

3. `apps/web/src/components/chat/ChatWidget.tsx` — floating widget:
```tsx
// Pastki o'ng burchakda fixed button (💬 icon)
// Bosilganda: drawer ochiladi (DaisyUI drawer yoki custom)
// Mobile: full-screen modal
// Desktop: 400px x 600px drawer
// Header: "VENTRA AI Chat" + close button + history button
// Body: messages list (auto-scroll)
// Footer: input + send button
```

4. `apps/web/src/components/chat/ChatMessage.tsx`:
```tsx
// DaisyUI chat component:
// <div className="chat chat-start"> (ASSISTANT)
// <div className="chat chat-end"> (USER)
// chat-bubble ichida: markdown render
// Streaming: typing indicator (cursor blink)
```

5. `apps/web/src/components/chat/ChatFeedback.tsx`:
```tsx
// 👍/👎 button'lar — ASSISTANT xabar ostida
// Bosilganda: chatApi.sendFeedback(messageId, 'UP'/'DOWN')
// Active state: bosilgan tugma highlighted
```

6. `apps/web/src/components/chat/ChatHistory.tsx`:
```tsx
// Sidebar/dropdown: oldingi suhbatlar ro'yxati
// chatApi.getConversations() dan olish
// Har biri: title + sana
// Bosilganda: shu suhbat xabarlarini yuklash
```

7. i18n qo'shimchalar (3 ta til fayliga):
```typescript
// uz.ts
'chat.title': 'AI Yordamchi',
'chat.placeholder': 'Savolingizni yozing...',
'chat.send': 'Yuborish',
'chat.history': 'Suhbat tarixi',
'chat.newChat': 'Yangi suhbat',
'chat.thinking': 'O\'ylayapman...',
'chat.error': 'Xato yuz berdi. Qayta urinib ko\'ring.',
'chat.feedbackThanks': 'Fikringiz uchun rahmat!',
'chat.noConversations': 'Hali suhbat yo\'q',
'chat.deleteConfirm': 'Bu suhbatni o\'chirishni xohlaysizmi?',
'chat.planRequired': 'Chat MAX tarif rejasida mavjud',

// ru.ts — ruscha ekvivalentlar
// en.ts — inglizcha ekvivalentlar
```

8. `ChatWidget` ni `App.tsx` yoki `Layout.tsx` ga qo'shish — barcha sahifalarda ko'rinadi.

**Tekshirish:**
1. Chat widget — pastki o'ng burchakda 💬 tugma ko'rinadi
2. Tugma bosilganda drawer ochiladi
3. Savol yozib yuborish → SSE streaming javob real-time ko'rinadi
4. Markdown formatted javob (bold, list, code)
5. 👍/👎 feedback ishlaydi
6. Suhbat tarixi ko'rinadi va tanlanadi
7. Mobile da to'g'ri ko'rinadi
8. i18n: uz/ru/en da barcha matnlar tarjima qilingan

**Fayllar:**
- `apps/web/src/api/chat.ts` — yangi
- `apps/web/src/hooks/useChat.ts` — yangi
- `apps/web/src/components/chat/ChatWidget.tsx` — yangi
- `apps/web/src/components/chat/ChatMessage.tsx` — yangi
- `apps/web/src/components/chat/ChatFeedback.tsx` — yangi
- `apps/web/src/components/chat/ChatHistory.tsx` — yangi
- `apps/web/src/i18n/uz.ts` — +chat keys
- `apps/web/src/i18n/ru.ts` — +chat keys
- `apps/web/src/i18n/en.ts` — +chat keys

**Bog'liqlik:** T-432 (backend SSE endpoint tayyor bo'lishi kerak)

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
| **RAG Chat Pipeline** (T-428..T-433) | 6 | 6 | Sardor |
| **JAMI task ochiq** | **~25** | | |
| **JAMI bajarilgan** | **~180+** | | → Done.md |

---

*Tasks.md | VENTRA Analytics Platform | 2026-03-10*
