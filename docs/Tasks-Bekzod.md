# BEKZOD — Ochiq Vazifalar
# Fayllar: apps/api/, apps/worker/, apps/bot/, apps/web/, apps/extension/, packages/*, prisma
# Yangilangan: 2026-03-04
# Bajarilganlar → docs/Done.md
# Audit manba: CODE-AUDIT + DEEP-PLATFORM-AUDIT + Analysis-Onboarding

---

# BACKEND KOD AUDIT — P1 MUHIM

### T-354 | P1 | BACKEND | `any` type cleanup — 40+ instance | 2h
**Sabab:** `serpapi.client`, `leaderboard`, `reports`, `community`, `file-logger`, `export.controller` — strict TS buzilgan.
**Yechim:** Har `any` → typed interface yoki `unknown` + type guard.

---

# BACKEND KOD AUDIT — P2 O'RTA

### T-359 | P2 | BACKEND | API P2 batch (27 ta) | 4h
> Batafsil ro'yxat: CODE-AUDIT-2026-03-04.md → P2-API-01..P2-API-27
Seed hardcoded creds, memory pressure prefix, RotatingFileWriter null, report filters validation, classifyUA, ads status, consultation date, parsePeriod duplicate, niche dead code, leaderboard cache eviction, discovery Prisma direct, findNiches false positive, proxyDispatcher `as any` (5x), shop pagination, AdminMonitoring return type, SearchPricesDto unused, export @Res, CommonModule export, capacity dbPoolSize, fetchWithTimeout cleanup, AliExpress timestamp, competitor duplicate endpoint, listInsights sort, notification architecture, admin tickets bounds, health module registration.

### T-360 | P2 | BACKEND | Worker+Bot P2 batch (14 ta) | 2h
> Batafsil ro'yxat: CODE-AUDIT-2026-03-04.md → P2-WK-01..P2-WK-14
Bot domain placeholder, /top numeric ID, bot rate limiting, escapeHtml duplicate, sourcing hardcoded customs/VAT, weekly scraper BrowserContext per product, import error level, discovery unreachable throw, AI scraper key guard, bot health always ok, discovery dead code, sourcing hardcoded waits, packages/types eskirgan UzumProductDetail, weekly scrape BigInt fragile.

---

# WEB APP AUDIT — P0 KRITIK (T-361..T-366)

> Manba: CODE-AUDIT-2026-03-04.md | apps/web/ | 6 ta P0 bug

### T-361 | P0 | FRONTEND | XSS — `dangerouslySetInnerHTML` olib tashlash | 15min
**Sabab:** `Layout.tsx:276` — `dangerouslySetInnerHTML={{ __html: t('payment.overdueDesc').replace('{balance}', '<strong>...')}}`. `balance` API'dan keladi. MITM hujumida XSS vektor.
**Yechim:** JSX interpolation: `<span>{t('payment.overdueDesc1')}<strong>{balance}</strong>{t('payment.overdueDesc2')}</span>`. `dangerouslySetInnerHTML` to'liq o'chirish.

### T-362 | P0 | FRONTEND | Auth Store token desync — stale role/email | 30min
**Sabab:** `authStore.ts` + `base.ts` — Token refresh interceptor faqat `localStorage` ni yangilaydi, Zustand store'ni emas. `payload.role`, `payload.email` stale qoladi.
**Yechim:** Refresh interceptor'da `useAuthStore.getState().setTokens(newAccess, newRefresh)` chaqirish.

### T-363 | P0 | FRONTEND | WebSocket logout'da disconnect qilinmaydi | 15min
**Sabab:** `useSocket.ts:12-23` — Module-level `sharedSocket` logout'dan keyin ham eski `account_id` bilan ishlaydi.
**Yechim:** Logout flow'da `sharedSocket.disconnect()` + `sharedSocket = null`. `useSocket` da re-connect logic.

### T-364 | P0 | FRONTEND | AdminRoute token expiry tekshirmaydi | 10min
**Sabab:** `App.tsx:42-48` — `AdminRoute` faqat `role` tekshiradi, `isTokenValid()` yo'q.
**Yechim:** `if (!isTokenValid() || role !== 'SUPER_ADMIN') return <Navigate to="/login" />`

### T-365 | P0 | FRONTEND | ProductPage useEffect race condition | 30min
**Sabab:** `ProductPage.tsx:120,131,146,162` — 4 ta `useEffect` turli dep array bilan. Stale result + yangi product kombinatsiyasi.
**Yechim:** `AbortController` + sequential flow yoki bitta `useProductData(id)` hook.

### T-366 | P0 | FRONTEND | Duplicate TokenPayload types | 10min
**Sabab:** `authStore.ts:3-9` `TokenPayload` + `base.ts:121-128` `JwtTokenPayload` — sync'siz.
**Yechim:** Bitta `TokenPayload` + `decodePayload` → `utils/auth.ts`. Ikkalasi import.

---

# WEB APP AUDIT — P1 MUHIM (T-367..T-369)

### T-367 | P1 | FRONTEND | AdminPage refactor — God Component | 2h
1. **30+ useState** (`AdminPage.tsx:24-88`) — tab state hook/context ga
2. **`Record<string, unknown>` de facto `any`** (`AdminPage.tsx:40-88`) — typed interface

### T-368 | P1 | FRONTEND | UX gaps — 6 ta user-facing bug | 2h
1. **404 route yo'q** (`App.tsx`) → `<Route path="*" element={<NotFoundPage />} />`
2. **Notification count faqat mount'da** (`Layout.tsx:130-135`) → WebSocket/polling
3. **Payment "To'ldirish" onClick yo'q** (`DashboardPage.tsx:143`) → to'lov flow
4. **Parol confirmation yo'q** (`RegisterPage.tsx:148-157`) → confirm + strength indicator
5. **Bo'sh Dashboard onboarding** (`DashboardPage.tsx:80-90`) → Welcome modal (T-373 tayyor)
6. **`useDashboardData` xatoni yutadi** (`useDashboardData.ts:17`) → `.catch(logError)` + UI error

### T-369 | P1 | FRONTEND | Code quality — 8 ta fix | 1h
1. **PublicLeaderboardPage dead code** → route qo'shish yoki o'chirish
2. **ErrorBoundary hardcoded Uzbek** (`ErrorBoundary.tsx:44-78`) → `t()` i18n
3. **Versiya "v5.1" eskirgan** (`LoginPage.tsx:77`, `RegisterPage.tsx:78`) → `APP_VERSION` const
4. **`branding.ts` dead code** (`config/branding.ts`) → o'chirish
5. **`isSuperAdmin` deps yo'q** (`Layout.tsx:118`) → useEffect dep array
6. **Date format 4 xil** → `utils/formatDate.ts` helper
7. **Notification layout** → stale state fix
8. **`useScoreRefresh` stale closure** (`useSocket.ts:49-57`) → `useRef` pattern

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

---

# CHROME EXTENSION — 18 TASK (T-216..T-233)

> Phase 1 (T-208..T-211) va Phase 2 (T-212..T-215) ✅ DONE → Done.md
> apps/extension/ — Bekzod zonasi (CLAUDE.md)

| Faza | Tasklar | Vaqt | Holat |
|------|---------|------|-------|
| 3. Popup Dashboard (P1) | T-216 | ~1.5h | ⬜ |
| 4. Category + Advanced (P1) | T-217..T-219 | ~5h | ⬜ |
| 5. Competitor + Narx (P2) | T-220..T-222 | ~4.5h | ⬜ |
| 6. AI + Hotkeys (P2) | T-223..T-224 | ~2.5h | ⬜ |
| 7. i18n + Testing (P2) | T-225..T-227 | ~4.5h | ⬜ |
| 8. Build + Publish (P1) | T-228..T-229 | ~3h | ⬜ |
| 9. Security + Polish (P1) | T-230..T-233 | ~3.5h | ⬜ |

---

# PLATFORMA AUDIT — UX/PIPELINE/ONBOARDING

### T-376 | P2 | BACKEND | Platform model — multi-marketplace (kelajak) | 2h
**Yechim:**
1. `Platform` model (`slug`, `name`, `isActive`, `comingSoon`, `logoUrl`)
2. Seed: `uzum` (active), `wildberries`, `yandex_market`, `ozon` (comingSoon)
3. `GET /api/v1/platforms` public endpoint
4. `Account.selectedMarketplaces` bilan bog'lash

### T-377 | P0 | FRONTEND | Demo credentials production'da — o'chirish | 5min
**Sabab:** `LoginPage.tsx:167` — `demo@ventra.uz / Demo123!` hardcoded.
**Yechim:** Demo creds o'chirish. `NODE_ENV === 'development'` da ko'rsatish mumkin.

### T-378 | P1 | FRONTEND | Forgot Password UI | 2h
1. LoginPage'da "Parolni unutdingiz?" link
2. ForgotPasswordPage — email input → API call
3. ResetPasswordPage — token + yangi parol
4. T-374 (API) bilan birga ishlaydi

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

## XULOSA

| Kategoriya | Soni |
|-----------|------|
| **Backend Audit P1** (T-354) | **1 task** |
| **Backend Audit P2** (T-359..T-360) | **2 task, ~41 bug** |
| **Web Audit P0** (T-361..T-366) | **6 task** |
| **Web Audit P1** (T-367..T-369) | **3 task, ~14 bug** |
| **Web Audit P2** (T-370) | **1 task, 15 bug** |
| **Chrome Extension** (T-216..T-233) | **18 task** |
| **Platforma P0** (T-377) | **1** |
| **Platforma P1** (T-378) | **1** |
| **Platforma P2** (T-376, T-380, T-381) | **3** |
| **Platforma P3** (T-384) | **1** |
| ENV manual | 3 |
| DevOps | 5 |
| **JAMI task ochiq** | **~45** |

---

# BAJARILDI → Done.md ga ko'chirilgan

**Backend Audit P0 (10 ta):** T-343..T-352
**Backend Audit P1 (5 ta):** T-353, T-355, T-356, T-357, T-358
**Platforma Audit P0 (2 ta):** T-371, T-372
**Platforma Audit P1 (3 ta):** T-373, T-374, T-375
**Design System (1 ta):** T-379
**Backend P1 (6 ta):** T-241, T-269, T-270, T-214, T-235, T-236
**Backend P2 (2 ta):** T-239, T-150
**Backend P3 (1 ta):** T-240
**Ikkalasi (3 ta):** T-237, T-260, T-261
**Web (8 ta):** T-202, T-264, T-266, T-257, T-188, T-189, T-190, T-192
**ENV (1 ta):** E-009
**Railway (10 ta):** T-262, T-263, T-177, T-179, T-180, T-181, T-184, T-242, T-244
**Stability Sprint (16 ta):** T-299..T-314

---
*Tasks-Bekzod.md | VENTRA | 2026-03-04 (zone tuzatish: web/extension Bekzodga)*
