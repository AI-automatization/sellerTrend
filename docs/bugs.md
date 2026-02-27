# VENTRA — BUGS AUDIT REPORT
# Sana: 2026-02-27
# Jami: 103 ta bug | CRITICAL: 11 | HIGH: 20 | MEDIUM: 39 | LOW: 33

---

## CRITICAL (11 ta)

### C-01 | SECURITY | `bootstrapAdmin` endpoint himoyalanmagan
**Fayl:** `apps/api/src/auth/auth.controller.ts:40-44`
**Muammo:** `POST /api/v1/auth/bootstrap-admin` hech qanday auth guard yo'q. Faqat SUPER_ADMIN mavjudligini tekshiradi. Agar SUPER_ADMIN yo'q bo'lsa, har qanday kishi o'zini SUPER_ADMIN qilishi mumkin.
**Fix:** Secret key/environment variable tekshirish yoki first-use dan keyin disable qilish.

### C-02 | BUG | Team invite — foydalanuvchi hech qachon login qila olmaydi
**Fayl:** `apps/api/src/team/team.service.ts:127-136`
**Muammo:** `password_hash` sifatida `crypto.randomBytes(32).toString('hex')` saqlanadi — bu raw hex, bcrypt hash EMAS. `bcrypt.compare()` doim `false` qaytaradi.
**Fix:** `await bcrypt.hash(tempPassword, 12)` ishlatish yoki "parol belgilash" oqimini qo'shish.

### C-03 | BUG | Billing TOCTOU race condition
**Fayl:** `apps/api/src/billing/billing.service.ts:39-69`
**Muammo:** `balance` tranzaksiyadan TASHQARIDA o'qiladi, keyin `decrement` tranzaksiya ichida. Parallel chaqiruvlarda `balance_before/balance_after` noto'g'ri bo'ladi.
**Fix:** Tranzaksiya ichida balansni o'qish yoki `RETURNING` bilan raw SQL.

### C-04 | CONFIG | NestJS v10 + WebSocket v11 versiya nomuvofiq
**Fayl:** `apps/api/package.json:18-27`
**Muammo:** `@nestjs/common` v10, lekin `@nestjs/websockets` va `@nestjs/platform-socket.io` v11. Major version mismatch runtime crash qilishi mumkin.
**Fix:** Barcha NestJS paketlarini bir xil versiyaga keltirish.

### C-05 | CONFIG | Express v5 + NestJS v10 nomuvofiq
**Fayl:** `apps/api/package.json:23,36`
**Muammo:** NestJS v10 Express v4 ni qo'llab-quvvatlaydi. Express v5 breaking changes routing va path parametrlarida bor.
**Fix:** Express v4 ga tushirish yoki NestJS v11 ga ko'tarish.

### C-06 | DOCKER | PgBouncer o'ziga ishora qilmoqda (circular)
**Fayl:** `docker-compose.prod.yml:43`
**Muammo:** `DATABASE_URL: ...@pgbouncer:5432/...` — PgBouncer o'ziga ulanishga harakat qiladi, PostgreSQL ga emas.
**Fix:** `@postgres:5432` ga o'zgartirish.

### C-07 | DOCKER | Redis parol REDIS_URL da yo'q
**Fayl:** `docker-compose.prod.yml:27,69,96`
**Muammo:** Redis `--requirepass` bilan ishga tushadi, lekin `REDIS_URL` parolsiz (`redis://redis:6379`). Natija: NOAUTH xatosi.
**Fix:** `redis://:${REDIS_PASSWORD}@redis:6379` ishlatish.

### C-08 | BUG | RegisterPage auth store bypass qiladi
**Fayl:** `apps/web/src/pages/RegisterPage.tsx:30-31`
**Muammo:** Login'dek `useAuthStore.setTokens()` va `queryClient.clear()` chaqirmaydi. Zustand state yangilanmaydi, eski cache saqlanadi.
**Fix:** LoginPage bilan bir xil pattern ishlatish.

### C-09 | BUG | AnalyzePage — `tracked=true` API xatosida ham o'rnatiladi
**Fayl:** `apps/web/src/pages/AnalyzePage.tsx:94-102`
**Muammo:** `setTracked(true)` try blokidan TASHQARIDA. API 500 yoki network error bo'lsa ham UI "Tracked" ko'rsatadi.
**Fix:** `setTracked(true)` ni try bloki ichiga ko'chirish.

### C-10 | BUG | ProductPage — `tracked=true` API xatosida ham o'rnatiladi
**Fayl:** `apps/web/src/pages/ProductPage.tsx:261-265`
**Muammo:** C-09 bilan bir xil muammo.
**Fix:** `setTracked(true)` ni try bloki ichiga ko'chirish.

### C-11 | BUG | Worker — Anthropic client modul yuklanganda yaratiladi
**Fayl:** `apps/worker/src/processors/uzum-ai-scraper.ts:21`
**Muammo:** `const client = new Anthropic(...)` modul import qilinganda ishga tushadi. `ANTHROPIC_API_KEY` yo'q bo'lsa crash qilishi mumkin. Discovery processor import qilganda ham trigger bo'ladi.
**Fix:** Lazy initialization (kerak bo'lganda yaratish).

---

## HIGH (20 ta)

### H-01 | SECURITY | notification.markAsRead account_id tekshirmaydi
**Fayl:** `apps/api/src/notification/notification.service.ts:81-99`
**Muammo:** Har qanday autentifikatsiyalangan foydalanuvchi BOSHQA accountning notifikatsiyasini o'qilgan deb belgilashi mumkin.

### H-02 | BUG | `shop.name` noto'g'ri — `shop.title` bo'lishi kerak
**Fayl:** `apps/api/src/products/products.service.ts:158`
**Muammo:** Prisma `Shop` modelida `title` mavjud, `name` emas. Doim `undefined` qaytaradi.

### H-03 | SECURITY | Product endpoint'lari account_id tekshirmaydi
**Fayl:** `apps/api/src/products/products.controller.ts:25-62`
**Muammo:** `GET :id`, `:id/snapshots`, `:id/forecast`, `:id/ml-forecast`, `:id/weekly-trend` — har qanday authenticated user har qanday product'ni ko'ra oladi.

### H-04 | BUG | Sourcing controller BillingGuard yo'q
**Fayl:** `apps/api/src/sourcing/sourcing.controller.ts:18`
**Muammo:** `PAYMENT_DUE` statusdagi foydalanuvchilar hali ham sourcing ishlatishi mumkin.

### H-05 | SECURITY | auth refresh/logout DTO validatsiya yo'q
**Fayl:** `apps/api/src/auth/auth.controller.ts:26-37`
**Muammo:** Inline type ishlatadi, class-validator dekoratorlari yo'q. `refresh_token` undefined/null bo'lishi mumkin.

### H-06 | BUG | competitor getHistory hardcoded string qaytaradi
**Fayl:** `apps/api/src/competitor/competitor.controller.ts:63-72`
**Muammo:** Haqiqiy data o'rniga yo'naltirish matnini qaytaradi.

### H-07 | BUG | AliExpress API HMAC imzo implementatsiyasi yo'q
**Fayl:** `apps/api/src/sourcing/platforms/aliexpress.client.ts:55-57`
**Muammo:** Sign parametri hech qachon hisoblanmaydi. Barcha so'rovlar autentifikatsiya xatosi bilan rad etiladi.

### H-08 | SECURITY | sourcing getJob account_id tekshirmaydi
**Fayl:** `apps/api/src/sourcing/sourcing.controller.ts:95-98`
**Muammo:** Har qanday foydalanuvchi har qanday sourcing job'ni ko'rishi mumkin.

### H-09 | SECURITY | In-memory login attempt tracking multi-instance'da ishlamaydi
**Fayl:** `apps/api/src/auth/auth.service.ts:32`
**Muammo:** `Map<string, LoginAttempt>` har instance'da alohida. Brute-force himoya aylanib o'tilishi mumkin.

### H-10 | BUG | JWT email field backend tomonidan sign qilinmaydi
**Fayl:** `apps/web/src/api/base.ts:116` + `apps/web/src/components/Layout.tsx:83`
**Muammo:** Backend JWT'ga faqat `sub, account_id, role` qo'yadi. `email` yo'q. Sidebar DOIM `'user@ventra.uz'` ko'rsatadi.

### H-11 | BUG | WebSocket dev proxy yo'q
**Fayl:** `apps/web/src/hooks/useSocket.ts:16` + `apps/web/vite.config.ts`
**Muammo:** Socket.IO `/ws` ga ulanadi, lekin Vite proxy faqat `/api/v1` ni qo'llab-quvvatlaydi. Dev'da real-time xususiyatlar ishlamaydi.

### H-12 | BUG | import.processor.ts noto'g'ri field — `reviewsAmount`
**Fayl:** `apps/worker/src/processors/import.processor.ts:75`
**Muammo:** Uzum API `feedbackQuantity` qaytaradi, lekin kod `reviewsAmount` ni o'qiydi. Natija: `feedback_quantity` doim 0.

### H-13 | BUG | import.processor.ts noto'g'ri field ustunligi — `seller` vs `shop`
**Fayl:** `apps/worker/src/processors/import.processor.ts:41`
**Muammo:** API `shop` qaytaradi, lekin kod avval `seller` ni tekshiradi.

### H-14 | BUG | reanalysis.processor lokallashtirilmagan title ishlatadi
**Fayl:** `apps/worker/src/processors/reanalysis.processor.ts:79`
**Muammo:** `detail.title` ishlatadi, `detail.localizableTitle?.ru || detail.title` o'rniga. Har 6 soatda title noto'g'ri qayta yoziladi.

### H-15 | BUG | reanalysis.processor noto'g'ri field — `reviewsAmount`
**Fayl:** `apps/worker/src/processors/reanalysis.processor.ts:83`
**Muammo:** H-12 bilan bir xil muammo.

### H-16 | TYPE_ERROR | packages/types `UzumProductDetail` API ga mos kelmaydi
**Fayl:** `packages/types/src/index.ts:37-44`
**Muammo:** `ordersQuantity` (haqiqiy: `ordersAmount`), `weeklyBought` (API dan olib tashlangan). Hech kim ishlatmaydi, lekin yangi developerni chalg'itadi.

### H-17 | TYPE_ERROR | packages/types `UzumItem` API ga mos kelmaydi
**Fayl:** `packages/types/src/index.ts:9-35`
**Muammo:** Eski format field nomlari. Hech qayerda ishlatilmaydi.

### H-18 | SCHEMA | `onDelete: Cascade` yo'q — parent o'chirganda crash
**Fayl:** `apps/api/prisma/schema.prisma` (ko'p joyda)
**Muammo:** Faqat 2 ta relation'da cascade bor. Product, Account, User o'chirganda barcha child recordlar to'sadi.

### H-19 | SCHEMA | `account_id` indekslari yo'q — 15 ta jadval
**Fayl:** `apps/api/prisma/schema.prisma`
**Muammo:** Transaction, CategoryRun, AlertRule, ExternalPriceSearch, CargoCalculation, ExternalSearchJob, CompetitorTracking, PriceTest, ProductChecklist, AdCampaign, TeamInvite, CustomReport, SharedWatchlist, CommunityInsight — barchasida `account_id` indeksi yo'q. Full table scan.

### H-20 | DOCKER | Worker env da API kalitlari yo'q
**Fayl:** `docker-compose.prod.yml:93-103`
**Muammo:** `ANTHROPIC_API_KEY`, `SERPAPI_API_KEY`, `ALIEXPRESS_APP_KEY` yo'q. AI scoring va external sourcing ishlamaydi.

---

## MEDIUM (39 ta)

### M-01 | BUG | admin.service.ts 2186 qator (400+ rule buzilgan)
**Fayl:** `apps/api/src/admin/admin.service.ts`

### M-02 | TYPE_ERROR | `as any` 30+ joyda (TAQIQLANGAN)
**Fayl:** `products.service.ts:158`, `sourcing.service.ts:224`, `serpapi.client.ts`, `aliexpress.client.ts`, `community.service.ts`, `consultation.service.ts`, `team.service.ts`, `feedback.service.ts`, `admin.controller.ts`

### M-03 | BUG | `main.ts` console.log ishlatadi (NestJS Logger kerak)
**Fayl:** `apps/api/src/main.ts:94-95,98-101`

### M-04 | DEAD_CODE | community.service.ts `counterUpdate` yaratiladi, ishlatilmaydi
**Fayl:** `apps/api/src/community/community.service.ts:111-121`

### M-05 | BUG | admin.service.ts hardcoded `SUPER_ADMIN_ACCOUNT_ID`
**Fayl:** `apps/api/src/admin/admin.service.ts:12`
**Muammo:** UUID hardcoded. DB dagi haqiqiy admin UUID boshqacha bo'lsa logika buziladi.

### M-06 | BUG | admin.controller.ts `@Res() res?` optional — non-null assertion crash riski
**Fayl:** `apps/api/src/admin/admin.controller.ts:597-659`

### M-07 | CONFLICT | JWT module 7d vs service 15m expiry
**Fayl:** `apps/api/src/auth/auth.module.ts` vs `auth.service.ts:16`
**Muammo:** Module `7d` default, service `15m` override. Chalg'ituvchi config.

### M-08 | BUG | api-key.guard.ts noto'g'ri role `'API_KEY'`
**Fayl:** `apps/api/src/common/guards/api-key.guard.ts:30`
**Muammo:** `API_KEY` role enum da yo'q. RolesGuard reject qiladi.

### M-09 | BUG | admin.service.ts getTopUsers N+1 query
**Fayl:** `apps/api/src/admin/admin.service.ts:861-880`
**Muammo:** 100 user = 400 query.

### M-10 | BUG | RotatingFileWriter stream NPE riski
**Fayl:** `apps/api/src/common/logger/file-logger.ts:103`

### M-11 | CONFLICT | Redis ulanish strategiyasi nomuvofiq
**Fayl:** `apps/api/src/export/import.queue.ts:9-12` vs `sourcing.queue.ts:3-13`
**Muammo:** Biri `REDIS_HOST/PORT`, boshqasi `REDIS_URL` o'qiydi.

### M-12 | BUG | community.service listInsights hamma narsani xotiraga yuklaydi
**Fayl:** `apps/api/src/community/community.service.ts:36-68`
**Muammo:** `take` limiti yo'q, in-memory sort. Katta data bilan xotira muammosi.

### M-13 | BUG | sourcing.queue.ts modul yuklanganda QueueEvents yaratadi
**Fayl:** `apps/api/src/sourcing/sourcing.queue.ts:17`
**Muammo:** Import paytida Redis ulanish. Redis yo'q bo'lsa crash.

### M-14 | DEAD_CODE | admin.ts `sendNotification` hech qachon chaqirilmaydi
**Fayl:** `apps/web/src/api/admin.ts:50-51`
**Muammo:** `sendNotificationAdvanced` ishlatiladi, `sendNotification` dead code.

### M-15 | TYPE_ERROR | authStore TokenPayload `email` field JWT da yo'q
**Fayl:** `apps/web/src/stores/authStore.ts:3-9`
**Muammo:** `email: string` deb e'lon qilingan, lekin JWT da yo'q. Doim `undefined`.

### M-16 | BUG | DashboardPage getTracked() `.catch()` yo'q
**Fayl:** `apps/web/src/pages/DashboardPage.tsx:143`
**Muammo:** Promise.all da xato bo'lsa user xabar olmaydi.

### M-17 | BUG | DashboardPage scoreColor(0) gray qaytaradi
**Fayl:** `apps/web/src/pages/DashboardPage.tsx:37-42`
**Muammo:** `if (!score)` — 0 falsy, null bilan bir xil ko'rinadi.

### M-18 | BUG | AdminPage deposits useEffect `depositLogPage` dependency yo'q
**Fayl:** `apps/web/src/pages/AdminPage.tsx:537`
**Muammo:** Sahifa raqami o'zgarganda data qayta yuklanmaydi.

### M-19 | BUG | ProductPage Recharts `<rect>` o'rniga `<Cell>` kerak
**Fayl:** `apps/web/src/pages/ProductPage.tsx:546-551`
**Muammo:** `<rect>` Recharts Bar ichida ishlamaydi. `<Cell>` kerak.

### M-20 | BUG | SourcingPage refreshRates() catch yo'q
**Fayl:** `apps/web/src/pages/SourcingPage.tsx:110-118`

### M-21 | BUG | SourcingPage import tab stale closure xavfi
**Fayl:** `apps/web/src/pages/SourcingPage.tsx:210-214`
**Muammo:** Empty deps array bilan `handleStart()` chaqiriladi, eslint-disable.

### M-22 | BUG | AdminPage `void setActiveTab` dead no-op
**Fayl:** `apps/web/src/pages/AdminPage.tsx:419`

### M-23 | BUG | AdminPage useEffect stale `activeTab` reference
**Fayl:** `apps/web/src/pages/AdminPage.tsx:429`

### M-24 | BUG | ProductPage loadData useEffect dependency yo'q
**Fayl:** `apps/web/src/pages/ProductPage.tsx:222`

### M-25 | BUG | ProductPage extSearched product o'zgarganda reset bo'lmaydi
**Fayl:** `apps/web/src/pages/ProductPage.tsx:246-259`
**Muammo:** Boshqa product'ga navigate qilganda external search qayta ishga tushmaydi.

### M-26 | BUG | ConsultationPage timezone muammo
**Fayl:** `apps/web/src/pages/ConsultationPage.tsx:69`
**Muammo:** Local timezone da yaratiladi, UTC ga convert qilinadi. UTC+5 da "10:00" = 05:00 UTC.

### M-27 | MISSING_HANDLER | ConsultationPage 3 ta empty catch
**Fayl:** `apps/web/src/pages/ConsultationPage.tsx:44,62,76`

### M-28 | MISSING_HANDLER | DiscoveryPage 2 ta empty catch
**Fayl:** `apps/web/src/pages/DiscoveryPage.tsx:122,150`

### M-29 | MISSING_HANDLER | ReferralPage empty catch
**Fayl:** `apps/web/src/pages/ReferralPage.tsx:29`

### M-30 | MISSING_HANDLER | ApiKeysPage 3 ta empty catch
**Fayl:** `apps/web/src/pages/ApiKeysPage.tsx:29,44,51`

### M-31 | MISSING_HANDLER | FeedbackPage 4 ta empty catch
**Fayl:** `apps/web/src/pages/FeedbackPage.tsx:75,91,102,115`

### M-32 | BUG | sourcing.processor AI ga platform UUID yuboradi
**Fayl:** `apps/worker/src/processors/sourcing.processor.ts:447`
**Muammo:** `platform_id` UUID, inson o'qiy oladigan nom emas. AI scoring sifati pasayadi.

### M-33 | BUG | sourcing.processor SerpAPI engine nomlari noto'g'ri
**Fayl:** `apps/worker/src/processors/sourcing.processor.ts:341-343`
**Muammo:** `'1688'`, `'taobao'`, `'alibaba'` — valid SerpAPI engine nomlari emas.

### M-34 | BUG | sourcing.processor Shopee valyutasini USD deb hardcode qiladi
**Fayl:** `apps/worker/src/processors/sourcing.processor.ts:421`

### M-35 | BUG | discovery.processor individual product upsert xatosini tutmaydi
**Fayl:** `apps/worker/src/processors/discovery.processor.ts:105-158`
**Muammo:** Bitta product xatosi butun job'ni to'xtatadi.

### M-36 | DEAD_CODE | Bot broadcastDiscovery hech qachon chaqirilmaydi
**Fayl:** `apps/bot/src/main.ts:147-173`
**Muammo:** Export qilingan, lekin alohida process. Worker chaqirmaydi.

### M-37 | DEAD_CODE | Bot sendPriceDropAlert hech qachon chaqirilmaydi
**Fayl:** `apps/bot/src/alerts.ts:48-65`

### M-38 | DOCKER | Prisma db push PgBouncer transaction mode orqali
**Fayl:** `apps/api/Dockerfile:46`
**Muammo:** DDL operatsiyalari PgBouncer transaction mode da ishlamaydi.

### M-39 | DOCKER | Redis healthcheck parol bilan ishlamaydi
**Fayl:** `docker-compose.prod.yml:31`
**Muammo:** `redis-cli ping` parol yo'q bo'lganda NOAUTH xatosi.

---

## LOW (33 ta)

### L-01 | TYPE_ERROR | `catch (e: any)` ko'p joyda
**Fayl:** `auth.service.ts:75`, `serpapi.client.ts:78,111,157`, `aliexpress.client.ts:80`

### L-02 | BUG | classifyUA — `axios`/`node-fetch` ni bot deb aniqlaydi
**Fayl:** `apps/api/src/common/logger/file-logger.ts:74`

### L-03 | DEAD_CODE | auth.module.ts `expiresIn: '7d'` hech ishlatilmaydi
**Fayl:** `apps/api/src/auth/auth.module.ts`

### L-04 | BUG | SearchAmazonDE google_shopping engine `site:` filter bilan
**Fayl:** `apps/api/src/sourcing/platforms/serpapi.client.ts:84-115`

### L-05 | SECURITY | prisma.service.ts tenant check faqat dev da
**Fayl:** `apps/api/src/prisma/prisma.service.ts:35`

### L-06 | BUG | referral.service getStats ishlatilmagan kodlarni ham hisoblaydi
**Fayl:** `apps/api/src/referral/referral.service.ts:40-48`

### L-07 | DEAD_CODE | sourcing.service `_source` parametri ishlatilmaydi
**Fayl:** `apps/api/src/sourcing/sourcing.service.ts:215-228`

### L-08 | TYPE_ERROR | community.service `updated!` non-null assertion
**Fayl:** `apps/api/src/community/community.service.ts:167-169`

### L-09 | BUG | naming — `consultant_id` aslida `account_id`
**Fayl:** `apps/api/src/consultation/consultation.service.ts:8-26`

### L-10 | BUG | useCallback(fn, [fn]) — hech narsa bermaydi
**Fayl:** `apps/web/src/hooks/useSocket.ts:73`

### L-11 | TYPE_ERROR | `any` type — api fayllarida 6 ta
**Fayl:** `base.ts:106-107`, `admin.ts:48`, `enterprise.ts:34,50,63`

### L-12 | BUG | console.error environment tekshiruvisiz
**Fayl:** `apps/web/src/components/ErrorBoundary.tsx:24`

### L-13 | TYPE_ERROR | getTokenPayload return type tor (sub, exp yo'q)
**Fayl:** `apps/web/src/api/base.ts:116`

### L-14 | BUG | isAuthenticated() token expiry tekshirmaydi
**Fayl:** `apps/web/src/App.tsx:33-35`
**Muammo:** Expired token bilan UI flash bo'ladi, keyin redirect.

### L-15 | UX | DashboardPage sparkline useMemo siz
**Fayl:** `apps/web/src/pages/DashboardPage.tsx:213-215`

### L-16 | MISSING_HANDLER | DashboardPage CSV export empty catch
**Fayl:** `apps/web/src/pages/DashboardPage.tsx:231`

### L-17 | TYPE_ERROR | AdminPage 30+ `any` type
**Fayl:** `apps/web/src/pages/AdminPage.tsx:42-476`

### L-18 | TYPE_ERROR | ProductPage `any` — mlForecast, trendAnalysis
**Fayl:** `apps/web/src/pages/ProductPage.tsx:186-187`

### L-19 | UX | ProductPage result?.product_id ikki marta effect trigger
**Fayl:** `apps/web/src/pages/ProductPage.tsx:244`

### L-20 | BUG | ProductPage hardcoded USD rate 12900
**Fayl:** `apps/web/src/pages/ProductPage.tsx:183`

### L-21 | TYPE_ERROR | SignalsPage barcha tab'larda `any[]`
**Fayl:** `apps/web/src/pages/SignalsPage.tsx:137+`

### L-22 | BUG | AdminPage 900+ qator (400 limit buzilgan)
**Fayl:** `apps/web/src/pages/AdminPage.tsx`

### L-23 | i18n | 7 ta sahifada hardcoded Uzbek matn
**Fayllar:** DiscoveryPage, ConsultationPage, ReferralPage, FeedbackPage, SignalsPage, AdminPage, SourcingPage

### L-24 | BUG | Worker billing.processor TOCTOU race
**Fayl:** `apps/worker/src/processors/billing.processor.ts:31-55`

### L-25 | CONFLICT | 3 ta fetchProductDetail nusxasi
**Fayllar:** `uzum-scraper.ts`, `import.processor.ts:18-25`, `reanalysis.processor.ts:32-43`

### L-26 | BUG | Worker console.log ishlatadi (logger kerak)
**Fayllar:** `main.ts:15-39`, `sourcing.processor.ts:108,143,329,381,391,466,546`

### L-27 | TYPE_ERROR | JobName — 2 ta job nomi yo'q
**Fayl:** `packages/types/src/index.ts:267-273`
**Muammo:** `reanalysis-6h` va `sourcing-search` yo'q.

### L-28 | DEAD_CODE | parseWeeklyBought — Uzum API dan olib tashlangan
**Fayl:** `packages/utils/src/index.ts:22-26`

### L-29 | BUG | predictDeadStock 0/0 = NaN edge case
**Fayl:** `packages/utils/src/index.ts:528`

### L-30 | BUG | forecastEnsemble RMSE aslida std deviation
**Fayl:** `packages/utils/src/index.ts:358`

### L-31 | BUG | calculateProfit breakeven formulasi kontseptual xato
**Fayl:** `packages/utils/src/index.ts:183-185`

### L-32 | BUG | redis.ts parol va DB raqamini tashlab yuboradi
**Fayl:** `apps/worker/src/redis.ts:1-10`

### L-33 | BUG | Bot barcha message turlarini tutadi (foto, sticker, etc.)
**Fayl:** `apps/bot/src/main.ts:135`

---

## XULOSA

| Severity | Soni | Nisbat |
|----------|------|--------|
| CRITICAL | 11 | 11% |
| HIGH | 20 | 19% |
| MEDIUM | 39 | 38% |
| LOW | 33 | 32% |
| **JAMI** | **103** | **100%** |

| Kategoriya | Soni |
|------------|------|
| BUG | 48 |
| SECURITY | 8 |
| TYPE_ERROR | 16 |
| DEAD_CODE | 9 |
| CONFLICT | 5 |
| MISSING_HANDLER | 10 |
| CONFIG/DOCKER | 10 |
| SCHEMA | 4 |
| i18n/UX | 3 |

### TOP 5 BIRINCHI TUZATISH KERAK

1. **C-06** PgBouncer circular reference — production ISHGA TUSHMAYDI
2. **C-07** Redis auth mismatch — BullMQ workers ULANMAYDI
3. **C-04 + C-05** NestJS/Express version mismatch — runtime CRASH xavfi
4. **C-01** bootstrapAdmin himoyalanmagan — SECURITY risk
5. **C-02** Team invite login impossible — foydalanuvchi KIRA OLMAYDI

---

*bugs.md | VENTRA Analytics Platform | 2026-02-27*
