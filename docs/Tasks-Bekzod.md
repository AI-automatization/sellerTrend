# BEKZOD — Ochiq Vazifalar
# Fayllar: apps/api/, apps/worker/, apps/web/, packages/*, prisma
# Yangilangan: 2026-03-08
# Bajarilganlar → docs/Done.md
# Audit manba: CODE-AUDIT + DEEP-PLATFORM-AUDIT + Analysis-Onboarding
#
# ESLATMA (2026-03-08): apps/bot/ va apps/extension/ → SARDOR ZONASI ko'chirildi
# Chrome Extension tasklar (T-216..T-233) → Tasks-Sardor.md ga ko'chirildi

---

# BACKEND KOD AUDIT — P1 MUHIM

### ~~T-354~~ ✅ DONE (2026-03-04) → Done.md

---

# BACKEND KOD AUDIT — P2 O'RTA

### T-359 | P2 | BACKEND | API P2 batch (27 ta) | 4h
> Batafsil ro'yxat: CODE-AUDIT-2026-03-04.md → P2-API-01..P2-API-27
Seed hardcoded creds, memory pressure prefix, RotatingFileWriter null, report filters validation, classifyUA, ads status, consultation date, parsePeriod duplicate, niche dead code, leaderboard cache eviction, discovery Prisma direct, findNiches false positive, proxyDispatcher `as any` (5x), shop pagination, AdminMonitoring return type, SearchPricesDto unused, export @Res, CommonModule export, capacity dbPoolSize, fetchWithTimeout cleanup, AliExpress timestamp, competitor duplicate endpoint, listInsights sort, notification architecture, admin tickets bounds, health module registration.

### T-360 | P2 | BACKEND | Worker+Bot P2 batch (14 ta) | 2h
> Batafsil ro'yxat: CODE-AUDIT-2026-03-04.md → P2-WK-01..P2-WK-14
Bot domain placeholder, /top numeric ID, bot rate limiting, escapeHtml duplicate, sourcing hardcoded customs/VAT, weekly scraper BrowserContext per product, import error level, discovery unreachable throw, AI scraper key guard, bot health always ok, discovery dead code, sourcing hardcoded waits, packages/types eskirgan UzumProductDetail, weekly scrape BigInt fragile.

---

# WEB APP AUDIT — P0 KRITIK (T-361..T-366) ✅ HAMMASI DONE

> ~~T-361~~ → T-392 ga birlashtirildi
> ~~T-362~~ ✅ setTokens() JWT decode qiladi
> ~~T-363~~ ✅ Zustand subscribe auto-disconnect
> ~~T-364~~ ✅ isTokenValid() check qo'shildi
> ~~T-365~~ ✅ AbortController + stale guard
> ~~T-366~~ ✅ dead JwtTokenPayload alias o'chirildi

---

# WEB APP AUDIT — P1 MUHIM (T-367..T-369)

### ~~T-367~~ ✅ DONE (2026-03-06) → Done.md

### ~~T-368~~ ✅ DONE (2026-03-06) → Done.md

### ~~T-369~~ ✅ DONE (2026-03-06) → Done.md

---

# WEB APP AUDIT — P2 O'RTA

### T-370 | P2 | FRONTEND | Web P2 batch (15 ta) | 3h
> CODE-AUDIT-2026-03-04.md → P2-WEB-01..P2-WEB-15
1. Recharts lazy import (~200KB) — `React.lazy()`
2. Consultation tab stale data — tab switch da refetch
3. Object URL memory leak — `URL.revokeObjectURL()` cleanup
4. Booking modal — Escape key + focus trap
5. Accessibility — aria-label/roles (Layout, DiscoveryPage, SourcingPage)
6. API key delete confirmation modal
7. Date format centralize — `utils/formatDate.ts`
8. Payment overlay dead end — to'lov flow
9. SourcingPage redundant ternary
10. `DEFAULT_USD_RATE` hardcoded → API dan olish
11. Duplicate CompetitorSection files → bitta
12. `(window as any).Telegram` → type declaration
13. `as any` in AnalyzePage → typed
14. SharedWatchlistPage/TelegramMiniApp i18n
15. `useScoreRefresh` stale closure → ref pattern

# PLATFORMA AUDIT — UX/PIPELINE/ONBOARDING

### T-376 | P2 | BACKEND | Platform model — multi-marketplace (kelajak) | 2h
**Yechim:**
1. `Platform` model (`slug`, `name`, `isActive`, `comingSoon`, `logoUrl`)
2. Seed: `uzum` (active), `wildberries`, `yandex_market`, `ozon` (comingSoon)
3. `GET /api/v1/platforms` public endpoint
4. `Account.selectedMarketplaces` bilan bog'lash

### ~~T-377~~ ✅ DONE (2026-03-06) → Done.md

### ~~T-378~~ ✅ allaqachon mavjud (ForgotPasswordPage, ResetPasswordPage, LoginPage link)

### T-380 | P2 | FRONTEND | Mobile UX — 4 ta fix | 3h
1. Bottom navigation bar yo'q → 5 ta asosiy sahifa bottom nav
2. ProductPage "scroll to top" yo'q → floating button
3. Table → card layout mobile'da
4. Payment overlay `backdrop-blur` → fallback

### T-381 | P2 | FRONTEND | Accessibility batch — 5 ta fix | 2h
1. Skip-to-content link
2. Modal focus trap
3. Color-only information → colorblind uchun icon/text
4. Table `scope` attribute
5. Keyboard shortcuts Ctrl+K

### T-384 | P3 | IKKALASI | Engagement features — kelajak | 20h+
1. Revenue estimator (API + Web)
2. Product comparison (Web)
3. Login streak (API + Web)
4. Achievement badges (API + Web)
5. "What's new" changelog (Web)
6. Weekly email digest (Worker + API)

---

### T-429 | P1 | BACKEND | Extension — VENTRA bazasida yo'q mahsulotni kuzatuvga qo'shish | 2h

**Manba:** Sardor (2026-03-11) — extension tomonida aniqlandi

**Muammo:** Extension orqali VENTRA bazasida bo'lmagan mahsulotni "Kuzatishga qo'shish" bosilganda 2 xil xatolik:
1. `POST /products/{id}/track` — 500 (mahsulot Product jadvalida yo'q, foreign key constraint)
2. `POST /products/search/{id}/track` — 404 (endpoint production serverda yo'q)

**Sabab:** `trackFromSearch()` metodi `products.service.ts` da to'g'ri yozilgan (Uzum API dan ma'lumot olib, Product DB ga yaratadi, keyin track qiladi). Lekin production ga deploy qilinmagan yoki route conflict bor.

**Yechim:**
1. `POST /products/search/:uzumId/track` endpointini production ga deploy qilish / route ni tekshirish
2. Yangi track qilingan mahsulotga `next_scrape_at = NOW()` belgilash — worker 15 daqiqa ichida scrape qilsin
3. `POST /products/:id/track` da mahsulot DB da yo'q bo'lsa 500 o'rniga 404 qaytarish

**Fayllar:**
- `apps/api/src/products/products.controller.ts`
- `apps/api/src/products/products.service.ts` — `trackFromSearch()`, `trackProduct()`
- `apps/worker/src/processors/weekly-scrape.processor.ts` — `next_scrape_at` logikasi

**Eslatma:** Backend fix bo'lgach Sardor extension da track tugmasini qayta yoqadi.

---

# ENV (qo'lda)

| # | Nima | Holat |
|---|------|-------|
| E-006 | ALIEXPRESS_APP_KEY + SECRET | ❌ Region ro'yxat xato |
| E-008 | REDIS_URL parol bilan (dev) | ⬜ |
| E-010 | PROXY_URL (kerak bo'lganda) | ⬜ |

# DEVOPS

| # | Prioritet | Nima | Holat |
|---|-----------|------|-------|
| T-281 | P0 | Cloudflare CDN — static assets 20ms | ⬜ |
| T-178 | P1 | Custom domain + SSL — web service | ⬜ |
| T-283 | P1 | Landing custom domain — ventra.uz DNS | ⬜ |
| T-243 | P2 | ALIEXPRESS keys Railway'ga | ⬜ |
| T-245 | P2 | PROXY_URL Railway'ga (optional) | ⬜ |

---

## XULOSA — OCHIQ TASKLAR

| Kategoriya | Soni |
|-----------|------|
| ~~Backend Audit P1~~ (T-354) | ✅ DONE |
| **Backend Audit P2** (T-359..T-360) | **2 task, ~41 bug** |
| ~~Web Audit P0~~ (T-361..T-366) | ✅ DONE |
| ~~Web Audit P1~~ (T-367..T-369) | ✅ DONE |
| **Web Audit P2** (T-370) | **1 task, 15 bug** |
| **Platforma P2** (T-376, T-380, T-381) | **3** |
| **Platforma P3** (T-384) | **1** |
| ENV manual | 3 |
| DevOps | 5 |
| **JAMI task ochiq** | **~17** |

---

# BAJARILDI → Done.md ga ko'chirilgan

**Backend Audit P0 (10 ta):** T-343..T-352
**Backend Audit P1 (5 ta):** T-353, T-355, T-356, T-357, T-358
**Web Audit P0 (6 ta):** T-361..T-366
**Web Audit P1 (3 ta):** T-367, T-368, T-369
**Platforma Audit P0 (3 ta):** T-371, T-372, T-377
**Platforma Audit P1 (4 ta):** T-373, T-374, T-375, T-378
**Design System (1 ta):** T-379
**Backend P1 (6 ta):** T-241, T-269, T-270, T-214, T-235, T-236
**Backend P2 (2 ta):** T-239, T-150
**Backend P3 (1 ta):** T-240
**Ikkalasi (3 ta):** T-237, T-260, T-261
**Web (8 ta):** T-202, T-264, T-266, T-257, T-188, T-189, T-190, T-192
**ENV (1 ta):** E-009
**Railway (10 ta):** T-262, T-263, T-177, T-179, T-180, T-181, T-184, T-242, T-244
**Stability Sprint (16 ta):** T-299..T-314
**Data Integrity (5 ta):** T-385, T-386, T-387, T-388, T-389, T-391
**Onboarding (2 ta):** T-392 (P0), T-393

---
*Tasks-Bekzod.md | VENTRA | 2026-03-08 (bot/extension → Sardor)*
