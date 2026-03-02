# VENTRA — OCHIQ VAZIFALAR
# Yangilangan: 2026-03-01
# Bajarilganlar → docs/Done.md

---

## QOIDALAR

- Yangi bug/error/task topilganda shu faylga qo'shiladi
- Fix bo'lgandan keyin `docs/Done.md` ga ko'chiriladi
- Format: `T-XXX | [KATEGORIYA] | Sarlavha | Vaqt`
- Kategoriyalar: BACKEND, FRONTEND, DEVOPS, IKKALASI

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
# FRONTEND OCHIQ TASKLAR
# ═══════════════════════════════════════════════════════════

## P0 — KRITIK

### T-282 | P0 | BACKEND | `ai_explanation` production da null — 2 ta sabab topildi, 1 tasi fix | pending[Bekzod]

**Diagnostika natijasi (2026-03-01):**

| # | Sabab | Holat |
|---|-------|-------|
| 1 | `ANTHROPIC_API_KEY` **invalid** — 401 authentication_error | QO'LDA: yangi key kerak (Console → Settings → API Keys) |
| 2 | Score threshold `> 3` juda baland — birinchi tahlilda `weekly_bought=null` → 55% score = 0, hech qachon > 3 bo'lmaydi | **FIX DONE**: `> 1 \|\| orders > 50` ga o'zgartirildi (`uzum.service.ts:217`) |

**Qolgan qadam:**
1. `platform.claude.com/settings/keys` dan yangi API key yaratish
2. Railway production `api` + `worker` + staging `api` ga qo'yish
3. Redeploy → test: `POST /api/v1/uzum/analyze` → `ai_explanation` massiv qaytishi kerak

---

## P2 — O'RTA


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

# Latency tekshirish:
node -e "
async function p(l,u,n=5){const t=[];for(let i=0;i<n;i++){const s=Date.now();await fetch(u);t.push(Date.now()-s)}console.log(l,'min:',Math.min(...t)+'ms','avg:',Math.round(t.reduce((a,b)=>a+b)/t.length)+'ms')}
p('Static (CDN):', 'https://ventra.uz/assets/main.js');
p('API (bypass):', 'https://ventra.uz/api/v1/health');
"
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

### T-184 | DONE | Staging environment — api/worker/web SUCCESS, bot optional (TELEGRAM_BOT_TOKEN kerak) |
### T-243 | DEVOPS | ALIEXPRESS_APP_KEY + SECRET — API | 5min
### T-245 | DEVOPS | PROXY_URL — API + Worker (optional) | 5min

---

# ═══════════════════════════════════════════════════════════
# CHROME EXTENSION — 26 TASK (T-208..T-233)
# ═══════════════════════════════════════════════════════════
#
# Batafsil spec: git log yoki Done.md da.
# Barcha 26 task OCHIQ — hali boshlanmagan.

## Faza 1 — Setup + Auth (P0) ~7h
### T-208 | P0 | FRONTEND | Monorepo scaffold + Manifest V3 + build pipeline | 2h
### T-209 | P0 | FRONTEND | API client + chrome.storage JWT boshqaruvi | 1.5h
### T-210 | P0 | FRONTEND | Background Service Worker (alarm, badge, messaging) | 2h
### T-211 | P0 | FRONTEND | Popup Login UI + autentifikatsiya holati | 1.5h

## Faza 2 — Content Script Overlay (P0) ~6.5h
### T-212 | P0 | FRONTEND | Content Script — uzum.uz mahsulot overlay | 3h
### T-213 | P0 | FRONTEND | Content Script — katalog/qidiruv badge | 2.5h

## Faza 3 — Popup Dashboard (P1) ~4.5h
### T-215 | P1 | FRONTEND | Popup Dashboard (tracked products, signals, quick analyze) | 3h
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

*Tasks.md | VENTRA Analytics Platform | 2026-03-02*
