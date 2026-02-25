# Bugs & Fixes Log — Uzum Trend Finder

> Bu fayl Claude tomonidan avtomatik to'ldiriladi. Har bir bug tuzatilganda yangi yozuv qo'shiladi.

---

### BUG-001: feedbackTickets.map is not a function
- **Sana:** 2026-02-25
- **Tur:** frontend
- **Fayl:** `apps/web/src/pages/AdminPage.tsx`
- **Xato:** `Uncaught TypeError: feedbackTickets.map is not a function` (admin?tab=feedback)
- **Sabab:** API `{items: [...], total, page}` qaytaradi. `r.data?.items || r.data || []` — agar `items` undefined bo'lsa, `r.data` object (array emas) saqlanadi
- **Yechim:** `Array.isArray()` tekshiruvi qo'shildi: `const items = r.data?.items ?? r.data; setFeedbackTickets(Array.isArray(items) ? items : [])`
- **Status:** FIXED

---

### BUG-002: avg_score.toFixed is not a function
- **Sana:** 2026-02-25
- **Tur:** frontend
- **Fayl:** `apps/web/src/pages/AdminPage.tsx`
- **Xato:** `PAGE_ERROR: (p.avg_score ?? 0).toFixed is not a function` (admin?tab=popular)
- **Sabab:** API `avg_score` ni string sifatida qaytaradi (`"4.1234"`). `String.toFixed()` mavjud emas
- **Yechim:** `Number()` bilan o'raldi: `Number(p.avg_score ?? 0).toFixed(2)`
- **Status:** FIXED

---

### BUG-003: /api-keys sahifasi 404
- **Sana:** 2026-02-25
- **Tur:** config
- **Fayl:** `apps/web/vite.config.ts`
- **Xato:** `http://localhost:5173/api-keys` — 404 Not Found
- **Sabab:** Vite proxy `/api` prefix bilan barcha request'larni backend'ga yo'naltiradi. `/api-keys` route ham `/api` bilan boshlanadi, shuning uchun Vite uni `http://localhost:3000/api-keys` ga proxy qiladi (bunday endpoint yo'q)
- **Yechim:** Proxy path'ni `/api` → `/api/v1` ga o'zgartirildi. Endi faqat API call'lar proxy bo'ladi
- **Status:** FIXED

---

### BUG-004: platforms.join crash potensial
- **Sana:** 2026-02-25
- **Tur:** frontend
- **Fayl:** `apps/web/src/pages/SourcingPage.tsx`
- **Xato:** `j.platforms.join(', ')` — agar `platforms` null/undefined bo'lsa crash
- **Sabab:** API `platforms` field'ni har doim array qaytarmasligi mumkin
- **Yechim:** Optional chaining qo'shildi: `j.platforms?.join(', ') ?? '—'`
- **Status:** FIXED

---

### BUG-005: Dashboard stats field mismatch
- **Sana:** 2026-02-25
- **Tur:** frontend
- **Fayl:** `apps/web/src/pages/AdminPage.tsx`
- **Xato:** Dashboard kartalar "—" ko'rsatadi, API data keladi lekin field nomlari mos kelmaydi
- **Sabab:** Frontend `overview?.users?.today_active` ishlatadi, lekin API `today_active_users` qaytaradi (top-level field). Xuddi shunday `total_tracked_products`, `today_analyzes`, `today_category_runs`
- **Yechim:** Field nomlarini API response'ga moslashtirildi:
  - `overview?.users?.today_active` → `overview?.today_active_users`
  - `overview?.products?.tracked_total` → `overview?.total_tracked_products`
  - `overview?.products?.analyzed_today` → `overview?.today_analyzes`
  - `overview?.discovery?.runs_today` → `overview?.today_category_runs`
- **Status:** FIXED

---

### BUG-006: Realtime activity field mismatch
- **Sana:** 2026-02-25
- **Tur:** frontend
- **Fayl:** `apps/web/src/pages/AdminPage.tsx`
- **Xato:** So'nggi faoliyat ro'yxati ko'rinmaydi
- **Sabab:** Frontend `realtime.recent_activity` ishlatadi, API `activity_feed` qaytaradi
- **Yechim:** `realtime.recent_activity` → `realtime.activity_feed` ga o'zgartirildi
- **Status:** FIXED

---

### BUG-007: System Health field mismatch
- **Sana:** 2026-02-25
- **Tur:** frontend
- **Fayl:** `apps/web/src/pages/AdminPage.tsx`
- **Xato:** System Health kartalar noto'g'ri ma'lumot ko'rsatadi
- **Sabab:** Frontend `health.api?.status`, `health.db?.status`, `health.disk?.log_size_mb` ishlatadi. API boshqa format qaytaradi: `health.status`, `health.db_connected`, `health.memory`
- **Yechim:** Barcha field referenslar API response formatiga moslashtirildi
- **Status:** FIXED

---

### BUG-008: Feedback Stats field mismatch
- **Sana:** 2026-02-25
- **Tur:** frontend
- **Fayl:** `apps/web/src/pages/AdminPage.tsx`
- **Xato:** Feedback statistikalar 0 ko'rsatadi
- **Sabab:** Frontend `feedbackStats.open`, `feedbackStats.in_progress` ishlatadi. API `feedbackStats.by_status.OPEN`, `feedbackStats.by_status.IN_PROGRESS` qaytaradi
- **Yechim:** `feedbackStats.open` → `feedbackStats.by_status?.OPEN` formatiga o'zgartirildi
- **Status:** FIXED

---

### BUG-009: Super admin balansi statistikani buzadi
- **Sana:** 2026-02-25
- **Tur:** backend
- **Fayl:** `apps/api/src/admin/admin.service.ts`
- **Xato:** Dashboard'da juda katta balans summasi ko'rsatiladi
- **Sabab:** Super admin account (balance: 999,999,999) barcha statistik so'rovlarga kiritilgan edi — avg_balance, payment_due, account groupBy
- **Yechim:** `SUPER_ADMIN_ACCOUNT_ID` konstanta yaratildi. `getStatsOverview`, `getStatsRevenue`, `getStatsGrowth` metodlariga `{ id: { not: SUPER_ADMIN_ACCOUNT_ID } }` filter qo'shildi
- **Status:** FIXED

---

### BUG-010: express module not found (webpack build)
- **Sana:** 2026-02-25
- **Tur:** build
- **Fayl:** `apps/api/package.json`
- **Xato:** `webpack 5.97.1 compiled with 1 error` — `Cannot find module 'express'`
- **Sabab:** `admin.controller.ts` da `import { Response } from 'express'` bor, lekin `express` faqat `@nestjs/platform-express` orqali keladi (transitive dependency). Webpack to'g'ridan-to'g'ri resolve qila olmadi
- **Yechim:** `pnpm --filter api add express` — express'ni direct dependency qilib qo'shildi
- **Status:** FIXED

---

### BUG-011: Toast notifications yo'q edi
- **Sana:** 2026-02-25
- **Tur:** frontend
- **Fayl:** `apps/web/src/pages/AdminPage.tsx`, `apps/web/src/App.tsx`
- **Xato:** Admin amallar (deposit, rol o'zgartirish, status o'zgartirish) natijasi haqida foydalanuvchiga xabar berilmaydi
- **Sabab:** `react-toastify` o'rnatilgan lekin action funksiyalarga toast call qo'shilmagan
- **Yechim:** 11 ta action funksiyaga `toast.success()` va `toast.error()` qo'shildi: saveFee, saveGlobalFee, handleRoleChange, handleToggleActive, handleStatusChange, sendNotification, handleDeleteDeposit, handleFeedbackStatus, handleSearch, CreateAccountModal, DepositModal
- **Status:** FIXED

---

## Playwright Route Test — 2026-02-25

| # | Route | Status |
|---|-------|--------|
| 1 | `/` | ✅ |
| 2 | `/analyze` | ✅ |
| 3 | `/discovery` | ✅ |
| 4 | `/sourcing` | ✅ |
| 5 | `/leaderboard` | ✅ |
| 6 | `/calculator` | ✅ |
| 7 | `/shops` | ✅ |
| 8 | `/referral` | ✅ |
| 9 | `/api-keys` | ✅ |
| 10 | `/ai-description` | ✅ |
| 11 | `/elasticity` | ✅ |
| 12 | `/consultation` | ✅ |
| 13 | `/signals` | ✅ |
| 14 | `/enterprise` | ✅ |
| 15 | `/feedback` | ✅ |
| 16 | `/admin` | ✅ |
| 17 | `/admin?tab=users` | ✅ |
| 18 | `/admin?tab=accounts` | ✅ |
| 19 | `/admin?tab=popular` | ✅ |
| 20 | `/admin?tab=analytics` | ✅ |
| 21 | `/admin?tab=system` | ✅ |
| 22 | `/admin?tab=feedback` | ✅ |
| 23 | `/admin?tab=notifications` | ✅ |
| 24 | `/admin?tab=audit` | ✅ |
| 25 | `/admin?tab=permissions` | ✅ |
| 26 | `/admin?tab=deposits` | ✅ |

**Natija: 27/27 route — 0 error**

---

### BUG-012: weekly_bought (Haftalik Faollik) noto'g'ri raqam ko'rsatadi
- **Sana:** 2026-02-25
- **Tur:** backend
- **Fayl:** `apps/api/src/uzum/uzum.client.ts`, `apps/api/src/uzum/uzum.service.ts`, `apps/worker/src/processors/discovery.processor.ts`, `apps/worker/src/processors/import.processor.ts`
- **Xato:** Haftalik Faollik = 44500 ko'rsatiladi, Uzum saytda esa 499 (Бумага Svetocopy mahsuloti)
- **Sabab:** `rOrdersAmount` (44500) = **ROUNDED jami buyurtmalar**, haftalik ko'rsatkich **EMAS**. Uzum API `actions.text` field'ini olib tashlagan (undefined), shuning uchun `parseWeeklyBought()` ham ishlamaydi. `ordersAmount=44870`, `rOrdersAmount=44500` — farq atigi 0.8%, ya'ni `rOrdersAmount` shunchaki yaxlitlangan total.
- **Yechim:**
  1. `rOrdersAmount` ni `weekly_bought` sifatida ishlatish TO'XTATILDI
  2. `weekly_bought` endi snapshot tarixidan `ordersAmount` delta sifatida hisoblanadi: `(currentOrders - prevOrders) * 7 / daysDiff`
  3. Birinchi tahlilda (tarix yo'q) `weekly_bought = null` qaytariladi
  4. Barcha 3 joyda tuzatildi: uzum.service.ts, discovery.processor.ts, import.processor.ts
- **Status:** FIXED

---

### BUG-013: Stock holati — availableAmount per-order limit, actual stock emas
- **Sana:** 2026-02-25
- **Tur:** backend
- **Fayl:** `apps/api/src/uzum/uzum.client.ts`
- **Xato:** `sku.availableAmount=5` stock sifatida ko'rsatiladi, aslida bu per-order limit
- **Sabab:** Uzum API `sku.availableAmount` = bitta buyurtmada max sotib olish limiti ("Можно купить 5 шт"). `totalAvailableAmount=2659` = haqiqiy jami ombor stoki. `sku.restriction.restrictedAmount=5` ham shu limitni tasdiqlaydi
- **Yechim:** `totalAvailableAmount` field'i API response'ga qo'shildi (uzum.client.ts va uzum-scraper.ts). Frontend'ga `total_available_amount` qaytariladi
- **Status:** FIXED

---

### BUG-014: import.processor.ts noto'g'ri API field nomlari
- **Sana:** 2026-02-25
- **Tur:** backend
- **Fayl:** `apps/worker/src/processors/import.processor.ts`
- **Xato:** Import qilinganda `orders_quantity=0` va `feedback_quantity=0` bo'lib saqlanardi
- **Sabab:** Raw Uzum API javobida `ordersAmount` va `reviewsAmount` bor, lekin kod `ordersQuantity` va `feedbackQuantity` ishlatgan (mavjud emas → undefined → 0). Shuningdek `deliveryOptions[0].stockType` noto'g'ri yo'l — to'g'risi `stock.type`
- **Yechim:** Field nomlar to'g'rilandi: `ordersQuantity`→`ordersAmount`, `feedbackQuantity`→`reviewsAmount`, `deliveryOptions[0].stockType`→`stock.type`, `ordersCount`→`orders ?? ordersCount`
- **Status:** FIXED

---

### FEATURE: Auto Re-analysis + Weekly Trend System
- **Sana:** 2026-02-25
- **Tur:** feature (backend + frontend)
- **Fayllar:**
  - `apps/worker/src/jobs/reanalysis.job.ts` — yangi cron job (har 24 soatda, 03:00 UTC)
  - `apps/worker/src/processors/reanalysis.processor.ts` — tracked products avtomatik qayta tahlil
  - `apps/worker/src/main.ts` — reanalysis worker + cron ro'yxatdan o'tkazildi
  - `apps/api/src/products/products.service.ts` — `getWeeklyTrend()` yangi metod
  - `apps/api/src/products/products.controller.ts` — `GET /products/:id/weekly-trend` endpoint
  - `apps/web/src/api/client.ts` — `productsApi.getWeeklyTrend()` qo'shildi
  - `apps/web/src/pages/ProductPage.tsx` — Weekly trend UI: delta badge, 7-kun chart, maslahat
- **Xususiyatlar:**
  1. Tracked mahsulotlar har 24 soatda avtomatik qayta tahlil qilinadi (BullMQ cron)
  2. Haftalik sotuv = ordersAmount snapshot delta (rOrdersAmount EMAS)
  3. 7-kunlik trend: bu hafta vs o'tgan hafta sotuv taqqoslash
  4. "+70 ta sotuv" badge — UI da delta ko'rsatiladi
  5. Kunlik sotuv bar chart — 7 kunlik vizualizatsiya
  6. Dinamik maslahat: o'sish, tushish, barqaror holatga qarab tavsiya
  7. Ombor stok kartasi: `totalAvailableAmount` (per-order limit emas)
- **Status:** DONE

---

### BUG-015: Super Admin statistikada user count ga ta'sir qiladi
- **Sana:** 2026-02-25
- **Tur:** backend
- **Fayl:** `apps/api/src/admin/admin.service.ts`
- **Xato:** Dashboard'da totalUsers va activeUsers super admin accountini ham hisoblaydi. Growth stats'da newUsers, weekNew, monthNew ham filter yo'q
- **Sabab:** `getStatsOverview()` dagi `user.count()` va `getStatsGrowth()` dagi user so'rovlarida `SUPER_ADMIN_ACCOUNT_ID` filter qo'shilmagan edi
- **Yechim:** Barcha user count/findMany so'rovlariga `account_id: { not: SUPER_ADMIN_ACCOUNT_ID }` filter qo'shildi (5 ta so'rov)
- **Status:** FIXED

---

### BUG-016: Super admin sidebar'da 2 ta Dashboard
- **Sana:** 2026-02-25
- **Tur:** frontend
- **Fayl:** `apps/web/src/components/Layout.tsx`
- **Xato:** Super admin accounti sidebar'da "Admin Panel > Dashboard" va "Asosiy > Dashboard" ko'rinadi — 2 ta Dashboard
- **Sabab:** Admin Dashboard (`/admin`) va asosiy Dashboard (`/`) ikkalasi ham ko'rsatilgan, super admin uchun farqlanmagan
- **Yechim:** Asosiy Dashboard (`/`) ni `{!isSuperAdmin && ...}` shart bilan yashirildi — super admin faqat Admin Dashboard'ni ko'radi
- **Status:** FIXED

---

### FEATURE: VENTRA UI Redesign
- **Sana:** 2026-02-25
- **Tur:** frontend (design system)
- **Fayllar:**
  - `apps/web/src/index.css` — VENTRA custom theme (oklch color tokens, Inter + Space Grotesk fonts, scrollbar, card hover)
  - `apps/web/src/App.css` — tozalandi (Vite default olib tashlandi)
  - `apps/web/index.html` — title "VENTRA", theme-color #0B0F1A, meta description
  - `apps/web/src/components/Layout.tsx` — brand "VENTRA", V mark, sidebar border/hover style
  - `apps/web/src/pages/LoginPage.tsx` — VENTRA branding, subtle bg, no gradients
  - `apps/web/src/pages/RegisterPage.tsx` — VENTRA branding
  - `apps/web/src/pages/DashboardPage.tsx` — font-heading
  - `apps/web/src/config/branding.ts` — default app name "VENTRA"
- **Ranglar:** bg-0 #0B0F1A, bg-1 #121826, bg-2 #1A2233, accent #4C7DFF, text #E5E7EB
- **Fontlar:** Inter (UI) + Space Grotesk (h1-h6, brand)
- **Status:** DONE
