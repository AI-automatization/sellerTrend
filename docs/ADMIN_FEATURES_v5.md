# ADMIN PANEL v5 — 26 ta Yangi Funksiya Spetsifikatsiyasi

**Loyiha:** Uzum Trend Finder
**Sana:** 2026-02-24
**Maqsad:** Admin uchun to'liq analitika, user monitoring, va feedback/chat tizimi

---

## TUZILMA

| Guruh | Soni | Tavsif |
|-------|:----:|--------|
| **A** — Admin Analytics Dashboard | 5 | Platforma daromad, o'sish, statistika |
| **B** — User Monitoring | 5 | Har bir user faoliyati, tracked products, session |
| **C** — Platforma Analitikasi | 5 | Real-time, heatmap, system health |
| **D** — User Natijalari | 5 | Portfolio, discovery, ROI, competitor |
| **E** — Admin Qulayliklari | 5 | Impersonate, bulk, search, suspend |
| **F** — Feedback & Chat | 1 | User-Admin chat + feedback tizimi |
| **Jami** | **26** | |

---

## A. ADMIN ANALYTICS DASHBOARD

### A1 — Platforma Umumiy Statistika

**Maqsad:** Admin bir qarashda butun platformani ko'rsin.

**Sahifa:** `/admin` → yangi "Dashboard" tab (birinchi tab)

**Kartalar (6 ta stat card):**
| Karta | Ma'lumot | Manba |
|-------|---------|-------|
| Jami accountlar | ACTIVE / PAYMENT_DUE / SUSPENDED breakdown | Account model |
| Jami userlar | Aktiv / bloklangan | User model |
| Bugungi aktiv userlar | Bugun login qilganlar soni | User.last_login_at |
| Jami tracked products | Platformadagi barcha kuzatilayotgan mahsulotlar | TrackedProduct count |
| Bugungi analyze so'rovlar | Bugun qilingan URL tahlillar soni | AuditEvent (ANALYZE) |
| Bugungi discovery runlar | Bugun boshlangan discovery joblar | DiscoveryRun count |

**Backend:**
```
GET /api/v1/admin/stats/overview
→ { accounts: { total, active, payment_due, suspended },
    users: { total, active, blocked, today_active },
    products: { tracked_total, analyzed_today },
    discovery: { runs_today, runs_total } }
```

---

### A2 — Billing / Daromad Grafigi

**Maqsad:** Kunlik/haftalik/oylik daromadni ko'rish, MRR hisoblash.

**Sahifa:** `/admin` → "Dashboard" tab ichida grafik

**Komponentlar:**
- **Area chart:** Kunlik daromad (oxirgi 30 kun) — Transaction `type=CHARGE` sum
- **Bar chart:** Oylik daromad (oxirgi 12 oy)
- **Stat kartalar:**
  - Bugungi daromad (so'm)
  - Bu oylik daromad (MRR)
  - O'rtacha account balance
  - PAYMENT_DUE ga tushganlar soni (bu oy)

**Backend:**
```
GET /api/v1/admin/stats/revenue?period=30d
→ { daily: [{ date, amount }], monthly: [{ month, amount }],
    today_revenue, mrr, avg_balance, payment_due_count }
```

---

### A3 — User O'sish Grafigi

**Maqsad:** Yangi registratsiyalar va churn ko'rsatish.

**Sahifa:** `/admin` → "Dashboard" tab ichida

**Komponentlar:**
- **Line chart:** Yangi userlar (kunlik/haftalik) — User.created_at bo'yicha
- **Line chart:** Churn (PAYMENT_DUE ga o'tganlar) — Transaction + Account status
- **Stat kartalar:**
  - Bu hafta yangi userlar
  - Bu oy yangi userlar
  - Churn rate % (PAYMENT_DUE / ACTIVE)

**Backend:**
```
GET /api/v1/admin/stats/growth?period=30d
→ { new_users: [{ date, count }], churned: [{ date, count }],
    week_new, month_new, churn_rate_pct }
```

---

### A4 — Eng Mashhur Mahsulotlar (Global)

**Maqsad:** Platformada eng ko'p kuzatilayotgan top mahsulotlar.

**Sahifa:** `/admin` → "Mashhur" tab

**Komponentlar:**
- **Jadval:** Top-20 eng ko'p track qilingan product
  | # | Mahsulot | Track qilganlar soni | O'rtacha score | Haftalik sotuv | Kategoriya |
- **Pie chart:** Kategoriya bo'yicha tracked products taqsimoti

**Backend:**
```
GET /api/v1/admin/stats/popular-products?limit=20
→ [{ product_id, title, tracker_count, avg_score, weekly_bought, category }]

GET /api/v1/admin/stats/category-distribution
→ [{ category_name, count, percentage }]
```

---

### A5 — Eng Faol Kategoriyalar

**Maqsad:** Qaysi kategoriyalarda eng ko'p faoliyat.

**Sahifa:** `/admin` → "Mashhur" tab ichida

**Komponentlar:**
- **Horizontal bar chart:** Top-10 kategoriya (discovery run soni bo'yicha)
- **Jadval:** Kategoriya, jami runlar, jami topilgan winnerlar, oxirgi run sanasi

**Backend:**
```
GET /api/v1/admin/stats/popular-categories?limit=10
→ [{ category_id, category_name, run_count, winner_count, last_run_at }]
```

---

## B. USER MONITORING

### B1 — User Activity Log

**Maqsad:** Har bir user qachon nima qilganini ko'rish.

**Sahifa:** `/admin` → "Userlar" tab → user tanlash → Activity drawer

**Log qilinadigan amallar:**
| Action | Trigger |
|--------|---------|
| `LOGIN` | Auth success |
| `ANALYZE` | URL tahlil qilish |
| `TRACK_PRODUCT` | Mahsulot kuzatishga olish |
| `UNTRACK_PRODUCT` | Kuzatishdan olish |
| `DISCOVERY_RUN` | Discovery ishga tushirish |
| `EXPORT` | CSV/Excel export |
| `SOURCING_SEARCH` | Sourcing qidirish |
| `API_KEY_CREATED` | API kalit yaratish |

**Komponentlar:**
- **Timeline:** Amal, vaqt, qo'shimcha ma'lumot (product nomi, kategoriya)
- **Filter:** Action type, sana range
- **Pagination:** 50 ta per page

**Backend:**
```
GET /api/v1/admin/users/:userId/activity?action=&from=&to=&page=1&limit=50
→ { items: [{ id, action, details, ip, created_at }], total, page }
```

**Prisma model:**
```prisma
model UserActivity {
  id         String   @id @default(uuid())
  user_id    String
  account_id String
  action     String   @db.VarChar(50)
  details    Json?
  ip         String?  @db.VarChar(45)
  user_agent String?  @db.VarChar(255)
  created_at DateTime @default(now()) @db.Timestamptz
  user       User     @relation(fields: [user_id], references: [id])
  @@index([user_id, created_at])
  @@index([account_id, created_at])
  @@map("user_activities")
}
```

---

### B2 — User Tracked Products Ro'yxati

**Maqsad:** Admin har bir userning kuzatayotgan mahsulotlarini ko'rsin.

**Sahifa:** `/admin` → "Userlar" tab → user tanlash → Products drawer

**Komponentlar:**
- **Jadval:**
  | Mahsulot | Score | Trend | Haftalik sotuv | Track sanasi |
- **Summary:** Jami products, o'rtacha score, jami haftalik sotuv

**Backend:**
```
GET /api/v1/admin/users/:userId/tracked-products
→ { products: [{ product_id, title, score, trend, weekly_bought, tracked_at }],
    summary: { total, avg_score, total_weekly } }
```

---

### B3 — User Session Tarixi

**Maqsad:** User login tarixi — qachon, qayerdan.

**Sahifa:** `/admin` → "Userlar" tab → user card yonida "Sessions" tugmasi

**Komponentlar:**
- **Jadval:**
  | Login vaqti | IP | Qurilma | Joylashuv |
- **Stat:** Oxirgi login, jami login soni, oxirgi IP

**Backend:**
```
GET /api/v1/admin/users/:userId/sessions?limit=20
→ [{ id, ip, user_agent, device_type, logged_in_at }]
```

**Prisma model:**
```prisma
model UserSession {
  id           String   @id @default(uuid())
  user_id      String
  ip           String?  @db.VarChar(45)
  user_agent   String?  @db.VarChar(500)
  device_type  String?  @db.VarChar(50)  // mobile/desktop/tablet
  logged_in_at DateTime @default(now()) @db.Timestamptz
  user         User     @relation(fields: [user_id], references: [id])
  @@index([user_id, logged_in_at])
  @@map("user_sessions")
}
```

---

### B4 — User Billing Tarixi

**Maqsad:** Har bir account to'lov tarixi batafsil.

**Sahifa:** `/admin` → "Accounts" tab → account → "Billing" drawer

**Komponentlar:**
- **Line chart:** Balance o'zgarishi vaqt bo'yicha (Transaction.balance_after)
- **Jadval:**
  | Sana | Tur (CHARGE/DEPOSIT) | Summa | Balance oldin | Balance keyin | Izoh |
- **Summary:** Jami charge, jami deposit, hozirgi balance

**Backend:**
```
GET /api/v1/admin/accounts/:accountId/transactions?page=1&limit=50
→ { items: [{ id, type, amount, balance_before, balance_after, description, created_at }],
    summary: { total_charges, total_deposits, current_balance },
    total, page }
```

---

### B5 — User Limitlar va Foydalanish

**Maqsad:** Har bir user qancha resurs ishlatayotganini ko'rish.

**Sahifa:** `/admin` → "Userlar" tab → user card ichida

**Komponentlar:**
- **Progress barlar:**
  - Bugungi analyze: 5/10 (limit va ishlatilgan)
  - API key requests: 450/1000
  - Export bugun: 2/5
- **Stat kartalar:**
  - Jami analyze (all time)
  - Jami discovery run
  - API keylar soni
  - Jami export

**Backend:**
```
GET /api/v1/admin/users/:userId/usage
→ { today: { analyzes: 5, analyze_limit: 10, exports: 2, export_limit: 5,
             api_requests: 450, api_limit: 1000 },
    all_time: { analyzes: 234, discoveries: 45, exports: 23, api_keys: 3 } }
```

---

## C. PLATFORMA ANALITIKASI

### C1 — Real-time Platform Dashboard

**Maqsad:** Bugungi kunlik faoliyat real-time.

**Sahifa:** `/admin` → "Dashboard" tab yuqori qismi

**Komponentlar:**
- **Live counter kartalar:**
  - Hozirgi aktiv sessionlar
  - Bugungi requestlar soni (from logs)
  - Queue da turgan joblar (BullMQ)
  - Oxirgi 1 soatda errorlar
- **Activity feed:** Oxirgi 10 ta amal (real-time, 30 sek polling)
  - "user@email.com analyzed Product X" (2 min ago)
  - "demo@test.uz started discovery run #45" (5 min ago)

**Backend:**
```
GET /api/v1/admin/stats/realtime
→ { active_sessions, today_requests, queue_pending, recent_errors,
    recent_activity: [{ user_email, action, detail, time_ago }] }
```

---

### C2 — Product Global Heatmap

**Maqsad:** Qaysi mahsulotlar eng ko'p kuzatilmoqda — kategoriya bo'yicha visual.

**Sahifa:** `/admin` → "Analitika" tab

**Komponentlar:**
- **Treemap/Heatmap:** Kategoriya → ichidagi eng ko'p tracked products
  - Katta square = ko'proq tracker
  - Rang: yashil (score yuqori) → qizil (score past)
- **Filter:** Period (7d / 30d / all)

**Backend:**
```
GET /api/v1/admin/stats/product-heatmap?period=30d
→ [{ category, products: [{ title, tracker_count, avg_score }] }]
```

---

### C3 — Kategoriya Trendi

**Maqsad:** Qaysi kategoriyalarda eng ko'p harakat bor.

**Sahifa:** `/admin` → "Analitika" tab

**Komponentlar:**
- **Stacked area chart:** Top-5 kategoriya, haftalik discover+track soni
- **Jadval:** Kategoriya, bu hafta / o'tgan hafta, o'sish %

**Backend:**
```
GET /api/v1/admin/stats/category-trends?weeks=8
→ [{ category, weekly: [{ week, discoveries, tracks }], growth_pct }]
```

---

### C4 — System Health Panel

**Maqsad:** Tizim salomatligi — admin texnik holatni ko'rsin.

**Sahifa:** `/admin` → "Tizim" tab

**Komponentlar:**
- **Status kartalar:**
  - API: UP/DOWN + avg response time (ms)
  - Database: connected/disconnected + query count
  - Redis/BullMQ: connected + queue length
  - Disk: logs fayl hajmi
- **Error log:** Oxirgi 20 ta xato (timestamp, endpoint, error message)
- **Uptime:** Server qachon ishga tushgan

**Backend:**
```
GET /api/v1/admin/stats/health
→ { api: { status, avg_response_ms, uptime_seconds },
    db: { status, query_count_today },
    redis: { status, queue_pending, queue_failed },
    disk: { log_size_mb },
    recent_errors: [{ time, endpoint, message }] }
```

---

### C5 — Admin Report Export

**Maqsad:** Admin o'zi uchun PDF/CSV report yuklab olsin.

**Sahifa:** `/admin` → Har bir tab da "Export" tugmasi

**Export turlari:**
| Report | Format | Ma'lumot |
|--------|--------|---------|
| Userlar ro'yxati | CSV | email, role, account, status, created_at, last_login |
| Daromad hisoboti | CSV | Kunlik/oylik charge/deposit, balance snapshot |
| Faollik hisoboti | CSV | User activity summary (action counts per user) |
| Platforma summary | PDF | Barcha stat'lar bitta sahifada |

**Backend:**
```
GET /api/v1/admin/export/users?format=csv
GET /api/v1/admin/export/revenue?format=csv&from=&to=
GET /api/v1/admin/export/activity?format=csv&from=&to=
GET /api/v1/admin/export/summary?format=pdf
```

---

## D. USER NATIJALARI (Results)

### D1 — User Portfolio Summary

**Maqsad:** Admin har bir userning "portfel" ko'rsatkichlarini ko'rsin.

**Sahifa:** `/admin` → "Userlar" tab → user card ustiga hover / expand

**Komponentlar:**
- **Mini stat kartalar:**
  - Tracked products soni
  - O'rtacha score
  - Jami haftalik sotuv
  - Trend: nechta up / flat / down
- **Mini bar chart:** Top-5 product by score

**Backend:**
```
GET /api/v1/admin/users/:userId/portfolio-summary
→ { tracked_count, avg_score, total_weekly_sales,
    trends: { up, flat, down },
    top_products: [{ title, score, weekly_bought }] }
```

---

### D2 — User Discovery Natijalari

**Maqsad:** User discovery ishlari qanday natija berdi.

**Sahifa:** `/admin` → user detail → "Discovery" bo'limi

**Komponentlar:**
- **Stat:** Jami runlar, jami topilgan winnerlar, nechta track qilindi
- **Jadval:**
  | Run # | Kategoriya | Winnerlar soni | Track qilindi | Sana |

**Backend:**
```
GET /api/v1/admin/users/:userId/discovery-results
→ { total_runs, total_winners, total_tracked,
    runs: [{ id, category_id, winners_count, tracked_count, created_at }] }
```

---

### D3 — User ROI Tracker

**Maqsad:** User reklama kampaniyalari natijalarini admin ko'rsin.

**Sahifa:** `/admin` → user detail → "ROI" bo'limi

**Komponentlar:**
- **Jadval:**
  | Kampaniya | Platforma | Budget | Sarflangan | Revenue | ROI % | ROAS |
- **Summary:** Jami budget, jami revenue, o'rtacha ROI

**Backend:**
```
GET /api/v1/admin/users/:userId/campaigns
→ { campaigns: [{ name, platform, budget, spent, revenue, roi, roas }],
    summary: { total_budget, total_revenue, avg_roi } }
```

---

### D4 — User Competitor Tracking

**Maqsad:** User qancha competitor kuzatmoqda.

**Sahifa:** `/admin` → user detail → "Raqobat" bo'limi

**Komponentlar:**
- **Stat:** Jami competitor pairlar, narx o'zgarishlar soni (bu hafta)
- **Jadval:**
  | Mahsulot | Competitor | Narx farqi | Oxirgi yangilangan |

**Backend:**
```
GET /api/v1/admin/users/:userId/competitor-stats
→ { total_pairs, price_changes_week,
    pairs: [{ product_title, competitor_title, price_diff_pct, last_updated }] }
```

---

### D5 — Top Performers Leaderboard (Internal)

**Maqsad:** Eng muvaffaqiyatli userlar reytingi.

**Sahifa:** `/admin` → "Analitika" tab

**Komponentlar:**
- **Jadval:**
  | # | User | Tracked | Avg Score | Weekly Sales | Discovery Runs | Faollik |
- **Filter:** Period (7d / 30d / all)
- **Badge:** Top-3 uchun oltin/kumush/bronza

**Backend:**
```
GET /api/v1/admin/stats/top-users?period=30d&limit=20
→ [{ user_id, email, account_name, tracked_count, avg_score,
     total_weekly, discovery_runs, activity_score }]
```

---

## E. ADMIN QULAYLIKLARI

### E1 — User Impersonate (Ko'rish rejimi)

**Maqsad:** Admin biror user sifatida tizimga "kirsin" (faqat ko'rish, o'zgartirish mumkin emas).

**Sahifa:** `/admin` → user ro'yxatida "Ko'rish" tugmasi

**Ishlash tartibi:**
1. Admin "Ko'rish" bosadi
2. Backend vaqtinchalik JWT yaratadi (role=USER, read_only=true, expires=30min)
3. Frontend yangi tabda ochiladi, tepada sariq banner: "Siz [user@email] sifatida ko'ryapsiz"
4. Barcha POST/PATCH/DELETE so'rovlar bloklangan (read-only)

**Backend:**
```
POST /api/v1/admin/users/:userId/impersonate
→ { token, expires_at }
```

**Guard:** `ImpersonateGuard` — `read_only: true` bo'lsa faqat GET so'rovlar

---

### E2 — Bulk Actions (Ko'p accountga bir vaqtda)

**Maqsad:** Bir nechta accountni bir vaqtda boshqarish.

**Sahifa:** `/admin` → "Accounts" tab → checkbox'lar + "Tanlangan" dropdown

**Amallar:**
- Tanlanganlarga deposit qo'shish (barchaga bir xil summa)
- Tanlanganlarga SUSPEND berish
- Tanlanganlarga ACTIVE qaytarish
- Tanlanganlarga daily_fee o'zgartirish

**Backend:**
```
POST /api/v1/admin/accounts/bulk
Body: { account_ids: [...], action: "DEPOSIT" | "SUSPEND" | "ACTIVATE" | "SET_FEE",
        params: { amount?: number, fee?: number } }
→ { success: number, failed: number, errors: [...] }
```

---

### E3 — Notification / Xabar Yuborish

**Maqsad:** Admin userlarga xabar yuborsin (platformada banner yoki toast).

**Sahifa:** `/admin` → "Xabarlar" tab

**Komponentlar:**
- **Form:** Xabar matni, tur (info/warning/error), auditoriya (all / selected accounts)
- **Jadval:** Yuborilgan xabarlar tarixi
- **User tomonida:** Layout.tsx da notification bell + toast

**Backend:**
```
POST /api/v1/admin/notifications
Body: { message, type: "info"|"warning"|"error", target: "all"|string[] }

GET /api/v1/notifications/my        ← User o'zi uchun
→ [{ id, message, type, is_read, created_at }]

PATCH /api/v1/notifications/:id/read  ← O'qildi deb belgilash
```

**Prisma model:**
```prisma
model Notification {
  id         String   @id @default(uuid())
  account_id String?  // null = all
  message    String   @db.VarChar(500)
  type       String   @db.VarChar(20) // info, warning, error
  is_read    Boolean  @default(false)
  created_by String?  // admin user_id
  created_at DateTime @default(now()) @db.Timestamptz
  @@index([account_id, is_read])
  @@map("notifications")
}
```

---

### E4 — Account Suspend / Restore

**Maqsad:** Accountni qo'lda to'xtatish va qayta yoqish.

**Sahifa:** `/admin` → "Accounts" tab → account row → "Suspend" / "Restore" tugma

**Ishlash:**
- SUSPEND: account.status → SUSPENDED, barcha userlar bloklangan
- RESTORE: account.status → ACTIVE, userlar qayta faol

**Backend:**
```
PATCH /api/v1/admin/accounts/:id/status
Body: { status: "ACTIVE" | "SUSPENDED" }
→ { id, status, updated_at }
```

**Audit:** `ACCOUNT_SUSPENDED` / `ACCOUNT_RESTORED` eventlar loglanadi.

---

### E5 — Admin Global Search

**Maqsad:** Admin tezkor qidiruv — user, account, product bo'yicha.

**Sahifa:** `/admin` → sidebar yoki tepada search input

**Komponentlar:**
- **Search input:** `Ctrl+K` shortcut bilan ochiladi
- **Natijalar:** 3 guruhga ajratilgan:
  - Userlar: email, role
  - Accountlar: company name, status
  - Mahsulotlar: title, product_id

**Backend:**
```
GET /api/v1/admin/search?q=test
→ { users: [...], accounts: [...], products: [...] }
```

---

## F. FEEDBACK & CHAT TIZIMI

### F1 — User-Admin Feedback + Chat

**Maqsad:** Userlar feedback yuborsin, admin javob bersin — to'liq chat tizimi.

**Sahifa (User):** `/feedback` — yangi sahifa
**Sahifa (Admin):** `/admin` → "Feedback" tab

#### User tomoni:

**Komponentlar:**
- **Yangi feedback form:**
  - Tur: Bug report / Feature request / Savol / Boshqa
  - Mavzu (subject)
  - Xabar matni (textarea)
  - Screenshot yuklash (optional, base64)
  - Ustuvorlik: Past / O'rta / Yuqori
- **Mening feedbacklarim:** Barcha yuborilgan ticketlar ro'yxati
  - Status badge: OPEN / IN_PROGRESS / RESOLVED / CLOSED
  - Har bir ticketni ochib chat ko'rinishida yozishmoq
- **Chat:** Ticket ichida admin bilan yozishmalar (message thread)

#### Admin tomoni:

**Komponentlar:**
- **Ticket ro'yxati:** Barcha feedbacklar jadval
  | # | User | Mavzu | Tur | Ustuvorlik | Status | Yaratilgan | Oxirgi javob |
- **Filter:** Status, tur, ustuvorlik, sana
- **Ticket detail:** Chat thread + statusni o'zgartirish
- **Stat kartalar:**
  - Jami ticketlar
  - Ochiq (OPEN)
  - Jarayonda (IN_PROGRESS)
  - Hal qilingan (RESOLVED)
  - O'rtacha javob vaqti

**Backend:**
```
# User endpoints:
POST   /api/v1/feedback              ← Yangi ticket
GET    /api/v1/feedback/my            ← Mening ticketlarim
GET    /api/v1/feedback/:id           ← Ticket detail + messages
POST   /api/v1/feedback/:id/messages  ← Xabar yuborish

# Admin endpoints:
GET    /api/v1/admin/feedback                    ← Barcha ticketlar
GET    /api/v1/admin/feedback/stats              ← Statistika
GET    /api/v1/admin/feedback/:id                ← Ticket detail
PATCH  /api/v1/admin/feedback/:id/status         ← Status o'zgartirish
POST   /api/v1/admin/feedback/:id/messages       ← Admin javob yozish
```

**Prisma modellar:**
```prisma
model FeedbackTicket {
  id          String         @id @default(uuid())
  account_id  String
  user_id     String
  subject     String         @db.VarChar(200)
  type        FeedbackType
  priority    FeedbackPriority @default(MEDIUM)
  status      FeedbackStatus @default(OPEN)
  created_at  DateTime       @default(now()) @db.Timestamptz
  updated_at  DateTime       @updatedAt @db.Timestamptz
  account     Account        @relation(fields: [account_id], references: [id])
  user        User           @relation(fields: [user_id], references: [id])
  messages    FeedbackMessage[]
  @@index([account_id, status])
  @@index([status, created_at])
  @@map("feedback_tickets")
}

model FeedbackMessage {
  id         String   @id @default(uuid())
  ticket_id  String
  sender_id  String
  content    String   @db.Text
  is_admin   Boolean  @default(false)
  created_at DateTime @default(now()) @db.Timestamptz
  ticket     FeedbackTicket @relation(fields: [ticket_id], references: [id])
  @@index([ticket_id, created_at])
  @@map("feedback_messages")
}

enum FeedbackType     { BUG FEATURE QUESTION OTHER }
enum FeedbackPriority { LOW MEDIUM HIGH }
enum FeedbackStatus   { OPEN IN_PROGRESS RESOLVED CLOSED }
```

---

## SIDEBAR YANGILASH

**Hozirgi tuzilma (14 ta link):**
```
Dashboard, Analyze, Discovery, Sourcing, Shops, Signals, Enterprise
--- Tools ---
Leaderboard, Calculator, Elasticity, AI Description, Consultation, Referral, API Keys
--- Admin ---
Admin Panel
```

**YANGI tuzilma (16 ta link, guruhlangan):**
```
=== ASOSIY ===
  Dashboard         📊
  URL Tahlil        🔍
  Discovery         📈
  Sourcing          🌍

=== MAHSULOT ===
  Do'konlar         🏪
  Signallar         🔔
  Leaderboard       🏆

=== ASBOBLAR ===
  Kalkulyator       🧮
  Elastiklik        📉
  AI Tavsif         ✨
  Konsultatsiya     💬

=== BIZNES ===
  Enterprise        🏢
  Referal           👥
  API Kalitlar      🔑
  Feedback          📝    ← YANGI

=== ADMIN ===  (faqat SUPER_ADMIN)
  Admin Panel       🛡️
```

**O'zgarishlar:**
1. Guruhlar 5 taga bo'linadi (Asosiy, Mahsulot, Asboblar, Biznes, Admin)
2. Feedback yangi sahifa — barcha userlar uchun
3. Admin seksiyasi kengaytiriladi (admin panel ichida 7 ta tab)
4. Sidebar ranglari: guruh nomlari `text-base-content/40` bilan

---

## ADMIN PANEL TABLARI (yangilangan)

```
1. Dashboard     — A1, A2, A3, C1 (statistika + grafiklar)
2. Userlar       — B1, B2, B3, B5, D1 (user detail drawer)
3. Accounts      — B4, E2, E4 (billing + bulk + suspend)
4. Mashhur       — A4, A5 (top products + categories)
5. Analitika     — C2, C3, D5 (heatmap + trends + leaderboard)
6. Tizim         — C4 (health panel)
7. Feedback      — F1 admin tomoni
8. Xabarlar      — E3 (notifications)
9. Audit         — mavjud (saqlanadi)
10. Qidiruv      — E5 (header da, tab emas)
```

---

## YANGI PRISMA MODELLAR (5 ta)

| Model | Feature |
|-------|---------|
| `UserActivity` | B1 — User activity log |
| `UserSession` | B3 — Login session tracking |
| `Notification` | E3 — Admin xabarlar |
| `FeedbackTicket` | F1 — Feedback tizimi |
| `FeedbackMessage` | F1 — Chat xabarlar |

## YANGI ENUMLAR (3 ta)

| Enum | Qiymatlar |
|------|----------|
| `FeedbackType` | BUG, FEATURE, QUESTION, OTHER |
| `FeedbackPriority` | LOW, MEDIUM, HIGH |
| `FeedbackStatus` | OPEN, IN_PROGRESS, RESOLVED, CLOSED |

---

## YANGI API ENDPOINTLAR (jami ~30 ta)

### Admin stats (6 ta):
```
GET /admin/stats/overview
GET /admin/stats/revenue
GET /admin/stats/growth
GET /admin/stats/popular-products
GET /admin/stats/popular-categories
GET /admin/stats/realtime
GET /admin/stats/product-heatmap
GET /admin/stats/category-trends
GET /admin/stats/top-users
GET /admin/stats/health
```

### Admin user detail (7 ta):
```
GET /admin/users/:id/activity
GET /admin/users/:id/tracked-products
GET /admin/users/:id/sessions
GET /admin/users/:id/usage
GET /admin/users/:id/portfolio-summary
GET /admin/users/:id/discovery-results
GET /admin/users/:id/campaigns
GET /admin/users/:id/competitor-stats
```

### Admin actions (5 ta):
```
POST   /admin/users/:id/impersonate
POST   /admin/accounts/bulk
PATCH  /admin/accounts/:id/status
GET    /admin/search
GET    /admin/export/users
GET    /admin/export/revenue
GET    /admin/export/activity
```

### Admin feedback (4 ta):
```
GET    /admin/feedback
GET    /admin/feedback/stats
GET    /admin/feedback/:id
PATCH  /admin/feedback/:id/status
POST   /admin/feedback/:id/messages
```

### Admin notifications (2 ta):
```
POST   /admin/notifications
```

### User endpoints (5 ta):
```
POST   /feedback
GET    /feedback/my
GET    /feedback/:id
POST   /feedback/:id/messages
GET    /notifications/my
PATCH  /notifications/:id/read
```

---

## YANGI FRONTEND SAHIFALAR

| Sahifa | Route | Kimga |
|--------|-------|-------|
| `FeedbackPage.tsx` | `/feedback` | Barcha userlar |

## O'ZGARTILADIGAN SAHIFALAR

| Sahifa | O'zgarish |
|--------|-----------|
| `AdminPage.tsx` | 10 ta tab (Dashboard, Userlar, Accounts, Mashhur, Analitika, Tizim, Feedback, Xabarlar, Audit, Permissions) |
| `Layout.tsx` | Sidebar yangi guruhlar + Feedback link + notification bell |
| `App.tsx` | FeedbackPage route qo'shish |
| `client.ts` | Yangi API endpointlar |
| `translations.ts` | Yangi kalit-qiymatlar |

---

*ADMIN_FEATURES_v5.md | Uzum Trend Finder | 2026-02-24*
