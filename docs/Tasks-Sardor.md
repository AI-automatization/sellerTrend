# SARDOR — Ochiq Vazifalar
# Fayllar: apps/web/, apps/desktop/, apps/landing/
# Yangilangan: 2026-03-04
# Bajarilganlar → docs/Done.md
# Audit manba: CODE-AUDIT + DEEP-PLATFORM-AUDIT + Analysis-Onboarding

---

# WEB APP AUDIT — P0 KRITIK (T-361..T-366)

> Manba: CODE-AUDIT-2026-03-04.md | apps/web/ | 6 ta P0 bug

### T-361 | P0 | FRONTEND | XSS — `dangerouslySetInnerHTML` olib tashlash | 15min
**Sabab:** `Layout.tsx:276` — `dangerouslySetInnerHTML={{ __html: t('payment.overdueDesc').replace('{balance}', '<strong>...')}}`. `balance` API'dan keladi. MITM hujumida XSS vektor. `Number()` coercion qisman himoya qiladi lekin pattern xavfli.
**Yechim:** JSX interpolation ishlatish: `<span>{t('payment.overdueDesc1')}<strong>{balance}</strong>{t('payment.overdueDesc2')}</span>`. `dangerouslySetInnerHTML` to'liq o'chirish.

### T-362 | P0 | FRONTEND | Auth Store token desync — stale role/email | 30min
**Sabab:** `authStore.ts` + `base.ts` — Token refresh interceptor faqat `localStorage` ni yangilaydi, Zustand store'ni emas. `payload.role`, `payload.email` stale qoladi. WebSocket eski `account_id` bilan ishlaydi.
**Yechim:** Refresh interceptor'da `useAuthStore.getState().setTokens(newAccess, newRefresh)` chaqirish. WebSocket'ni ham yengilash.

### T-363 | P0 | FRONTEND | WebSocket logout'da disconnect qilinmaydi | 15min
**Sabab:** `useSocket.ts:12-23` — Module-level `sharedSocket` logout'dan keyin ham eski `account_id` bilan ishlaydi. Yangi user login qilsa eski room'dagi data'ni oladi.
**Yechim:** Logout flow'da `sharedSocket.disconnect()` chaqirish va `sharedSocket = null` ga reset. `useSocket` da re-connect logic.

### T-364 | P0 | FRONTEND | AdminRoute token expiry tekshirmaydi | 10min
**Sabab:** `App.tsx:42-48` — `PrivateRoute` `isTokenValid()` chaqiradi (expiry check), lekin `AdminRoute` faqat `role` tekshiradi. Expired token bilan admin panel UI flash qiladi, keyin 401 da crash.
**Yechim:** `AdminRoute` da `isTokenValid()` ham tekshirish: `if (!isTokenValid() || role !== 'SUPER_ADMIN') return <Navigate to="/login" />`.

### T-365 | P0 | FRONTEND | ProductPage useEffect race condition | 30min
**Sabab:** `ProductPage.tsx:120,131,146,162` — `id` o'zgarganda 4 ta `useEffect` ishlaydi. Reset effect `[id]` ga, external search `[result?.title]` ga bog'liq. Eski product result bilan yangi product uchun external search ishga tushishi mumkin.
**Yechim:** Effect'larni birlashtirib sequential flow yaratish. `AbortController` bilan stale request'ni cancel qilish. Yoki bitta `useProductData(id)` hook ga chiqarish.

### T-366 | P0 | FRONTEND | Duplicate TokenPayload types — 2 ta interface | 10min
**Sabab:** `authStore.ts:3-9` da `TokenPayload`, `base.ts:121-128` da `JwtTokenPayload` — ikki xil interface, ikki xil `decodePayload`. Birini o'zgartirsangiz ikkinchisi stale.
**Yechim:** Bitta `TokenPayload` + bitta `decodePayload` → `utils/auth.ts` ga chiqarish. Ikkalasi import qiladi.

---

# WEB APP AUDIT — P1 MUHIM (T-367..T-369)

> 14 ta bug batched into 3 task

### T-367 | P1 | FRONTEND | AdminPage refactor — God Component | 2h
**Sabab va yechim:**
1. **30+ useState** (`AdminPage.tsx:24-88`) — tab state'larni alohida hook/context ga chiqarish
2. **`Record<string, unknown>` — de facto `any`** (`AdminPage.tsx:40-88`) — typed interface yaratish
**Natija:** AdminPage thin orchestrator, har tab o'z state'ini boshqaradi.

### T-368 | P1 | FRONTEND | UX gaps — 6 ta user-facing bug | 2h
**Sabab va yechim:**
1. **404 route yo'q** (`App.tsx`) — noma'lum URL blank page → `<Route path="*" element={<NotFoundPage />} />`
2. **Notification count faqat mount'da** (`Layout.tsx:130-135`) — WebSocket yoki polling bilan yangilash
3. **Payment "To'ldirish" onClick yo'q** (`DashboardPage.tsx:143`) — to'lov flow ochish yoki Telegram link
4. **Parol confirmation yo'q** (`RegisterPage.tsx:148-157`) — confirm password field + strength indicator
5. **Bo'sh Dashboard onboarding** (`DashboardPage.tsx:80-90`) — Welcome modal + checklist (birinchi mahsulot tahlil, track, bot ulash)
6. **`useDashboardData` xatoni yutadi** (`useDashboardData.ts:17`) — `.catch(logError)` + UI error state

### T-369 | P1 | FRONTEND | Code quality — 8 ta fix | 1h
**Sabab va yechim:**
1. **PublicLeaderboardPage dead code** (`PublicLeaderboardPage.tsx`) — routed emas → route qo'shish yoki o'chirish
2. **ErrorBoundary hardcoded Uzbek** (`ErrorBoundary.tsx:44-78`) — `t()` bilan i18n
3. **Versiya "v5.1" eskirgan** (`LoginPage.tsx:77`, `RegisterPage.tsx:78`) — `APP_VERSION` const yoki `package.json` dan import
4. **`branding.ts` dead code** (`config/branding.ts`) — hech joyda import emas → o'chirish
5. **`isSuperAdmin` deps yo'q** (`Layout.tsx:118`) — useEffect dependency array ga qo'shish
6. **Date format 4 xil** — `utils/formatDate.ts` markaziy helper yaratish
7. **Notification layout** — stale state fix
8. **`useScoreRefresh` stale closure** (`useSocket.ts:49-57`) — `useRef` pattern

---

# WEB APP AUDIT — P2 O'RTA (T-370)

### T-370 | P2 | FRONTEND | Web P2 batch (15 ta) | 3h
> Batafsil ro'yxat: CODE-AUDIT-2026-03-04.md → P2-WEB-01..P2-WEB-15
1. Recharts lazy import (~200KB) — `React.lazy(() => import('recharts'))`
2. Consultation tab stale data — tab switch da refetch
3. Object URL memory leak — `URL.revokeObjectURL()` cleanup
4. Booking modal — Escape key + focus trap
5. Accessibility — aria-label/roles (Layout, DiscoveryPage, SourcingPage)
6. API key delete confirmation — modal qo'shish
7. Date format centralize — `utils/formatDate.ts`
8. Payment overlay dead end — to'lov flow yoki link
9. SourcingPage redundant ternary
10. `DEFAULT_USD_RATE` hardcoded — API dan olish
11. Duplicate CompetitorSection files — bitta qoldirish
12. `(window as any).Telegram` — type declaration qo'shish
13. `as any` in AnalyzePage — typed
14. SharedWatchlistPage/TelegramMiniApp i18n yo'q
15. `useScoreRefresh` stale closure — ref pattern

---

# DESKTOP APP AUDIT — T-315..T-328

> Manba: CODE-AUDIT-DESKTOP-LANDING-2026-03-04.md

## P0 — KRITIK (5 ta)

### T-315 | P0 | FRONTEND | Desktop: `sandbox: false` → `true` | 15min
**Sabab:** `window.ts:61` — Chromium sandbox o'chirilgan. XSS orqali OS ga chiqish oson.
**Yechim:** `sandbox: true`, preload ni sandbox rejimiga moslashtirish.

### T-316 | P0 | FRONTEND | Desktop: CSP header qo'shish | 15min
**Sabab:** `window.ts` — Content Security Policy yo'q. Renderer ixtiyoriy skript yuklashi mumkin.
**Yechim:** `session.defaultSession.webRequest.onHeadersReceived` da CSP qo'shish.

### T-317 | P0 | FRONTEND | Desktop: Path traversal — `app://` protocol fix | 15min
**Sabab:** `window.ts:17-44` — `decodeURIComponent` + `join()` = rendererDir dan tashqari fayl o'qish mumkin.
**Yechim:** `resolved.startsWith(rendererDir)` tekshiruvi qo'shish.

### T-318 | P0 | FRONTEND | Desktop: SSRF — API proxy validatsiya | 15min
**Sabab:** `window.ts:22-29` — `/api/` so'rovlar blindly proxy qilinadi. Origin tekshiruvi yo'q.
**Yechim:** `new URL()` bilan safe URL yaratish, origin validatsiya.

### T-319 | P0 | FRONTEND | Desktop: Navigation cheklovlari qo'shish | 15min
**Sabab:** `window.ts` — `will-navigate` va `setWindowOpenHandler` yo'q.
**Yechim:** Faqat `app://` va `localhost` ga ruxsat. Tashqi → `shell.openExternal()`.

## P1 — MUHIM (8 ta)

### T-320 | P1 | FRONTEND | Desktop: `(app as any)` → typed state | 10min
### T-321 | P1 | FRONTEND | Desktop: ipcRenderer.on memory leak fix | 15min
### T-322 | P1 | FRONTEND | Desktop: `console.error` → `electron-log` | 10min
### T-323 | P1 | FRONTEND | Desktop: `setInterval` cleanup | 5min
### T-324 | P1 | FRONTEND | Desktop: `.ico`/`.icns` icon fayllar yaratish | 15min
### T-325 | P1 | FRONTEND | Desktop: IPC notification input validatsiya | 10min
### T-326 | P1 | FRONTEND | Desktop: IPC badge count validatsiya | 5min
### T-327 | P1 | FRONTEND | Desktop: Permission request handler | 10min

> Batafsil sabab/yechim: CODE-AUDIT-DESKTOP-LANDING-2026-03-04.md

## P2 — O'RTA (batch)

### T-328 | P2 | FRONTEND | Desktop P2 batch (10 ta) | 1h

---

# LANDING AUDIT — T-329..T-342

> Manba: CODE-AUDIT-DESKTOP-LANDING-2026-03-04.md

## P0 — KRITIK (4 ta)

### T-329 | P0 | FRONTEND | Landing: `favicon.svg` yaratish | 10min
### T-330 | P0 | FRONTEND | Landing: Railway URL fallback o'chirish | 5min
### T-331 | P0 | FRONTEND | Landing: nginx CSP header | 15min
### T-332 | P0 | FRONTEND | Landing: Placeholder verification kodlari o'chirish | 5min

## P1 — MUHIM (9 ta)

### T-333 | P1 | FRONTEND | Landing: Dead code tozalash | 15min
### T-334 | P1 | FRONTEND | Landing: Email form fix | 30min
### T-335 | P1 | FRONTEND | Landing: localStorage try/catch | 10min
### T-336 | P1 | FRONTEND | Landing: Testimonials RU tarjima | 20min
### T-337 | P1 | FRONTEND | Landing: OG image build pipeline | 15min
### T-338 | P1 | FRONTEND | Landing: Mobile menu AnimatePresence | 10min
### T-339 | P1 | FRONTEND | Landing: Nginx security headers fix | 10min
### T-340 | P1 | FRONTEND | Landing: FeatureCard unused prop | 5min
### T-341 | P1 | FRONTEND | Landing: Prerender innerHTML XSS guard | 10min

> Batafsil sabab/yechim: CODE-AUDIT-DESKTOP-LANDING-2026-03-04.md

## P2 — O'RTA (batch)

### T-342 | P2 | FRONTEND | Landing P2 batch (18 ta) | 2h

---

# PLATFORMA AUDIT — UX/DESIGN/ONBOARDING (T-377..T-384)

> Manba: DEEP-PLATFORM-AUDIT-2026-03-04.md + Analysis-Onboarding-Multimarketplace.md

### T-377 | P0 | FRONTEND | Demo credentials production'da — o'chirish | 5min
**Sabab:** `LoginPage.tsx:167` — `demo@ventra.uz / Demo123!` hardcoded. Production'da har kim demo account bilan kirib, boshqa userlar datasi ni ko'rishi mumkin (agar demo account'ga access bor bo'lsa).
**Yechim:** Demo credentials'ni LoginPage'dan to'liq olib tashlash. `NODE_ENV === 'development'` da ko'rsatish mumkin.

### T-379 | P2 | FRONTEND | Design system cleanup — 6 ta fix | 2h
**Sabab va yechim:**
1. **Chart ranglar hardcoded hex** (`formatters.ts:20-25`) — tema CSS variables ishlatish
2. **Duplicate StatCard** — `product/StatCard.tsx` + `AnalyzePage.tsx:243` da inline StatCard → bitta component
3. **Duplicate SkeletonCard** — `skeletons/` + `ui/Skeleton.tsx` → bitta
4. **Card padding inconsistent** — p-3, p-4, p-5 aralash → DaisyUI `card-body` standart
5. **Toast dark theme always** (`App.tsx:63`) — app tema ga moslashtirish
6. **Signals 10 tab overwhelming** — category grouping, priority badge, "yangi" indicator

### T-380 | P2 | FRONTEND | Mobile UX — 4 ta fix | 3h
**Sabab va yechim:**
1. **Bottom navigation bar yo'q** — har navigatsiya uchun drawer ochish kerak → 5 ta asosiy sahifa uchun bottom nav
2. **ProductPage "scroll to top" yo'q** — 741 qatorli sahifa → floating button
3. **Table → card layout mobile'da** — horizontal scroll o'rniga responsive card
4. **Payment overlay `backdrop-blur`** — eski telefonda sekin → fallback yoki oddiy overlay

### T-381 | P2 | FRONTEND | Accessibility batch — 5 ta fix | 2h
**Sabab va yechim:** (T-370 #5 da aria-label/roles bor, bu qo'shimcha)
1. **Skip-to-content link** — keyboard navigation uchun
2. **Modal focus trap** — tab bilan modal'dan tashqariga chiqib ketish mumkin
3. **Color-only information** — score ranglari colorblind uchun icon/text ham kerak
4. **Table `scope` attribute** — screen reader uchun
5. **Keyboard shortcuts** — Ctrl+K search (mentioned but not implemented)

### T-382 | P2 | FRONTEND | Landing conversion — 4 ta fix | 4h
**Sabab va yechim:**
1. **Privacy Policy + Terms of Service pages yo'q** — Footer'da link bor, sahifa yo'q. O'zbekiston Shaxsiy Ma'lumotlar Qonuni (2019) talabi
2. **Cookie consent banner yo'q** — legal requirement
3. **Plausible analytics commented out** — enable qilish + CTA click tracking, scroll depth, conversion o'lchash
4. **Video demo yo'q** — pricing'dan oldin 90 sek Loom yoki placeholder section

---

# CHROME EXTENSION — 18 TASK (T-216..T-233)

> Phase 1 (T-208..T-211) va Phase 2 (T-212..T-215) ✅ DONE → Done.md

| Faza | Tasklar | Vaqt | Holat |
|------|---------|------|-------|
| 3. Popup Dashboard (P1) | T-215..T-216 | ~4.5h | T-215 ✅, T-216 ⬜ |
| 4. Category + Advanced (P1) | T-217..T-219 | ~5h | ⬜ |
| 5. Competitor + Narx (P2) | T-220..T-222 | ~4.5h | ⬜ |
| 6. AI + Hotkeys (P2) | T-223..T-224 | ~2.5h | ⬜ |
| 7. i18n + Testing (P2) | T-225..T-227 | ~4.5h | ⬜ |
| 8. Build + Publish (P1) | T-228..T-229 | ~3h | ⬜ |
| 9. Security + Polish (P1) | T-230..T-233 | ~3.5h | ⬜ |

---

# LANDING MANUAL (4 task)

| # | Nima | Vaqt | Holat |
|---|------|------|-------|
| M-001 | Dashboard screenshot'lar | 30min | ⬜ |
| M-002 | Desktop installer build | 20min | ⬜ |
| M-003 | Testimonial ma'lumotlari | 1h | ⬜ |
| M-004 | Domain va hosting | 30min | ⬜ |

---

## XULOSA

| Kategoriya | Soni |
|-----------|------|
| **Web Audit P0** (T-361..T-366) | **6** |
| **Web Audit P1** (T-367..T-369) | **3 task, ~28 bug** |
| **Web Audit P2** (T-370) | **1 task, 15 bug** |
| **Platforma P0** (T-377) | **1** |
| **Platforma P2** (T-379..T-382) | **4 task, ~19 fix** |
| Desktop P0 (T-315..T-319) | 5 |
| Desktop P1 (T-320..T-327) | 8 |
| Desktop P2 (T-328) | 10 |
| Landing P0 (T-329..T-332) | 4 |
| Landing P1 (T-333..T-341) | 9 |
| Landing P2 (T-342) | 18 |
| Chrome Extension (T-216..T-233) | 18 |
| Landing Manual (M-001..M-004) | 4 |
| **JAMI task ochiq** | **41** |
| **JAMI bug/fix ochiq** | **~125** |

---

# BAJARILDI → Done.md

**Extension Phase 1-2 (8 ta):** T-208..T-215
**Desktop (1 ta):** T-234
**Landing Dev (24 ta):** L-001..L-024
**Web App (8 ta):** T-202, T-264, T-266, T-257, T-188..T-192
**i18n Audit (9 ta):** T-271..T-279
**Sprint Frontend (8 ta):** T-237b, T-260, T-261, T-257, T-206, T-284..T-289
**Bekzod Dependent (3 ta):** T-193b, T-196b, T-199b

---
*Tasks-Sardor.md | VENTRA | 2026-03-04*
