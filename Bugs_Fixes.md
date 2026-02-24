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
