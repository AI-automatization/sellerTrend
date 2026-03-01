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

## ENV-P0 — KRITIK (Ilovasiz ishlamaydi)

### E-001 | DESKTOP | `apps/desktop/.env` fayl YARATISH — login ishlamaydi | 5min
**Fayl yaratish:** `apps/desktop/.env`
```env
VITE_API_URL=http://localhost:3000
```

### E-002 | DESKTOP | `electron.vite.config.ts` ga proxy qo'shish — dev mode login | 10min
**Fayl:** `apps/desktop/electron.vite.config.ts` — renderer.server bo'limiga proxy qo'shish.

## ENV-P1 — MUHIM (Feature'lar ishlamaydi)

### E-006 | CONFIG | `ALIEXPRESS_APP_KEY` + `ALIEXPRESS_APP_SECRET` yo'q | 5min
AliExpress Developer Portal dan key olish va `apps/api/.env` + `apps/worker/.env` ga yozish.

### E-008 | CONFIG | `REDIS_URL` dev da parolsiz — production bilan mos emas | 2min

## ENV-P2 — O'RTA (Optional)

### E-009 | CONFIG | `SENTRY_DSN` yo'q — error tracking o'chirilgan | 2min
### E-010 | CONFIG | `PROXY_URL` yo'q — Uzum API block qilsa kerak bo'ladi | 2min

---

# ═══════════════════════════════════════════════════════════
# DESKTOP APP LOGIN BUG (2026-02-27)
# ═══════════════════════════════════════════════════════════

---

# ═══════════════════════════════════════════════════════════
# BACKEND OCHIQ TASKLAR
# ═══════════════════════════════════════════════════════════

*(Sprint 1-2 backend tasks completed — see Done.md)*

---

# ═══════════════════════════════════════════════════════════
# FRONTEND OCHIQ TASKLAR
# ═══════════════════════════════════════════════════════════

## P1 — MUHIM

### T-202 | FRONTEND | ProductPage overall UX — sotuvchi uchun soddalash | 1h
### T-206 | FRONTEND | Raqiblar — "50 ta kuzatilmoqda" + "topilmadi" bir vaqtda | 10min
### T-264 | P1 | FRONTEND | Admin panel — role USER bo'lsa /admin sahifaga redirect yo'q | 30min

## P2 — O'RTA

### T-266 | P2 | FRONTEND | Shops, Leaderboard, Sourcing — bo'sh sahifa, yo'naltiruvchi xabar yo'q | 30min
### T-257 | P2 | FRONTEND | Granular ErrorBoundary per section | —

## i18n AUDIT

### T-276 | FRONTEND | UZ faylida ~85 ta inglizcha tarjima qilinmagan value | 60min
### T-277 | FRONTEND | RU faylida ~24 ta inglizcha tarjima qilinmagan value | 30min
### T-278 | FRONTEND | feedback.title UZ da aralash til: "Feedback & Yordam" | 5min
### T-279 | FRONTEND | discovery.title barcha 3 tilda "Category Discovery" — tarjima qilinmagan | 5min
**Fix:** `uz.ts`: "Kategoriya Kashfiyoti", `ru.ts`: "Обзор категорий"

---

# ═══════════════════════════════════════════════════════════
# IKKALASI (BACKEND + FRONTEND)
# ═══════════════════════════════════════════════════════════

### T-237 | P1 | IKKALASI | ProductPage da mahsulot rasmi ko'rsatish — Backend DONE, Frontend kerak | pending[Sardor]
### T-260 | P1 | FRONTEND | Discovery — kategoriya nomi frontend'da ko'rsatish (API tayyor) | pending[Sardor]
### T-261 | P1 | IKKALASI | Discovery drawer — Backend DONE, Frontend kerak | pending[Sardor]

---

# ═══════════════════════════════════════════════════════════
# DEVOPS OCHIQ TASKLAR
# ═══════════════════════════════════════════════════════════

## P0 — KRITIK

### T-262 + T-263 | DONE | SeedService auto-seed on API startup — admin, platforms, cargo, trends |

## P0 — KRITIK (Latency)

### T-280 | P0 | DEVOPS | Railway EU region migration — latency 300ms→150ms | 2h

**Muammo:** Hozir barcha servicelar US-West (Oregon) regionda. Toshkent→Oregon RTT ~300ms.
EU-West (Amsterdam/Frankfurt) ga ko'chirsa ~150ms ga tushadi (2x tezroq).

**Benchmark (hozirgi):**
```
Health endpoint (DB yo'q): min 200ms, avg 360ms
DB query endpoints:        min 218ms, avg 280ms
Server processing:         ~15-30ms (juda tez)
Network RTT:               ~250-300ms (asosiy bottleneck)
```

**To'liq yechim — qadamma-qadam:**

#### 1-qadam: Yangi EU PostgreSQL yaratish
```bash
# Railway Dashboard → Project → + New → Database → PostgreSQL
# Region: eu-west (Amsterdam) tanlash
# Yoki CLI:
railway add --plugin postgresql   # keyin dashboard dan region o'zgartirish
```

#### 2-qadam: Eski DB dan data export
```bash
# Railway dashboard → eski PostgreSQL → Connect tab → Connection String olish
# Local terminal:
pg_dump "postgresql://OLD_CONNECTION_STRING" \
  --no-owner --no-acl --clean --if-exists \
  -F custom -f ventra_backup.dump

# Yoki Railway plugin orqali:
railway connect postgresql  # eski DB ga ulanib
# \copy yoki pg_dump ishlatish
```

#### 3-qadam: Yangi EU DB ga import
```bash
pg_restore "postgresql://NEW_EU_CONNECTION_STRING" \
  --no-owner --no-acl --clean --if-exists \
  ventra_backup.dump

# pgvector extension qo'shish:
psql "postgresql://NEW_EU_CONNECTION_STRING" -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

#### 4-qadam: Redis ham EU ga ko'chirish
```bash
# Railway Dashboard → + New → Database → Redis
# Region: eu-west tanlash
# Eski Redis dan data ko'chirish shart emas (cache + sessions)
```

#### 5-qadam: API + Worker + Nginx → EU regionga
```bash
# Har bir service uchun Railway Dashboard → Service → Settings → Region → eu-west
# YOKI yangi servicelar yaratish EU regionda va deploy qilish

# Env variablelar yangilash:
DATABASE_URL=postgresql://NEW_EU_STRING
DIRECT_DATABASE_URL=postgresql://NEW_EU_DIRECT_STRING
REDIS_URL=redis://NEW_EU_REDIS_STRING
```

#### 6-qadam: Prisma migration sync
```bash
# EU DB da migration holati tekshirish:
npx prisma migrate status
# Agar kerak bo'lsa:
npx prisma migrate deploy
```

#### 7-qadam: DNS / Domain
```bash
# Custom domain (T-178) bilan birga qilish:
# Railway Dashboard → Nginx service → Settings → Custom Domain
# DNS: CNAME ventra.uz → [railway-domain].up.railway.app
```

#### 8-qadam: Smoke test
```bash
node -e "
async function ping(label, url, n=5) {
  const t=[];
  for(let i=0;i<n;i++){const s=Date.now();await fetch(url);t.push(Date.now()-s);}
  console.log(label, 'min:', Math.min(...t)+'ms', 'avg:', Math.round(t.reduce((a,b)=>a+b)/t.length)+'ms');
}
ping('EU Health:', 'https://NEW_DOMAIN/api/v1/health');
"
```

**Kutilgan natija:**
- Health: 200ms → ~80-100ms
- DB queries: 250ms → ~120-150ms
- Analyze: 700ms → ~400ms

**Xavflar:**
- Data migration vaqtida ~10-15 min downtime
- pgvector extension EU DB da ham enable qilish kerak
- BullMQ joblar Redis almashinuvida yo'qolishi mumkin (critical emas)

---

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

### T-177 | DEVOPS | pgvector extension — Railway PostgreSQL | 5min
### T-178 | DEVOPS | Custom domain + SSL — web service | 10min
### T-179 | DEVOPS | Worker memory/CPU limit tekshirish | 15min
### T-180 | DEVOPS | Monitoring + Uptime alert | 15min
### T-181 | DEVOPS | Railway database backup tekshirish | 10min

## P2 — O'RTA

### T-184 | DEVOPS | Staging environment (optional) | 30min
### T-242 | DEVOPS | SERPAPI_API_KEY — API + Worker | 5min
### T-243 | DEVOPS | ALIEXPRESS_APP_KEY + SECRET — API | 5min
### T-244 | DEVOPS | SENTRY_DSN — API | 5min
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

## BAJARISH KETMA-KETLIGI (TAVSIYA)

### FAZA 1 — DEVOPS: Railway production
1. T-262 → Railway DB seed
2. T-263 → SUPER_ADMIN user yaratish

### FAZA 2 — Discovery UX
3. T-260 → Category nomi ko'rsatish
4. T-261 → Discovery drawer data boyitish

### FAZA 3 — Frontend UX polish
5. T-264 → Admin route protection
6. T-266 → Empty state CTA

---

*Tasks.md | VENTRA Analytics Platform | 2026-03-01*
