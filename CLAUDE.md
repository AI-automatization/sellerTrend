# CLAUDE.md — UZUM TREND FINDER
# Bu fayl Claude CLI tomonidan avtomatik o'qiladi
# Ikkala dasturchi uchun UMUMIY qoidalar

---

## 🤖 CLAUDE — BIRINCHI QADAM (MAJBURIY)

**Har yangi terminal sessiyasida Claude SHART quyidagini so'rashi kerak:**

```
Salom! Men Uzum Trend Finder loyihasidaman.
Kimligingizni aniqlay olmayman — ismingiz kim?
  1. Bekzod (Backend)
  2. Sardor (Frontend)
```

Javob kelgach, o'sha dasturchining `CLAUDE_[ISM].md` faylini o'qib, kontekstga kirish.

---

## 📁 LOYIHA HAQIDA

**Uzum Trend Finder** — `uzum.uz` marketplace uchun SaaS analytics platformasi.

| Layer | Tech | Port |
|-------|------|------|
| Backend API | NestJS + Prisma + PostgreSQL | 3000 |
| Worker | BullMQ + Redis | — |
| Frontend | React 19 + Vite + Tailwind + DaisyUI v5 | 5173 |
| Bot | grammY (Telegram) | — |
| DB | PostgreSQL 16 + pgvector | 5432 |
| Queue | Redis 7 | 6379 |

**Monorepo:** `pnpm workspaces` + `turbo`

```
apps/api/        → Bekzod (FAQAT)
apps/worker/     → Bekzod (FAQAT)
apps/bot/        → Bekzod (FAQAT)
apps/web/        → Sardor (FAQAT)
packages/types/  → Kelishib (IKKALASI)
packages/utils/  → Kelishib (IKKALASI)
```

---

## ✅ 43 FEATURE — VERSION MAP

### v1.0 MVP (01-10)
```
01 Competitor Price Tracker   | 02 Seasonal Trend Calendar
03 Shop Intelligence          | 04 Niche Finder
05 CSV/Excel Import-Export    | 06 Referral Tizimi
07 API Access (Dev Plan)      | 08 Public Leaderboard
09 Profit Calculator 2.0      | 10 Browser Extension
```

### v2.0 AI+Tech (11-20)
```
11 Trend Prediction ML        | 12 Auto Description Generator
13 Review Sentiment Analysis  | 14 White-label
15 Konsultatsiya Marketplace  | 16 PWA
17 WebSocket Real-time        | 18 Multi-language i18n
19 Demand-Supply Gap          | 20 Price Elasticity Calculator
```

### v3.0 Signals (21-30)
```
21 Cannibalization Alert      | 22 Dead Stock Predictor
23 Category Saturation Index  | 24 Flash Sale Detector
25 New Product Early Signal   | 26 Stock Cliff Alert
27 Ranking Position Tracker   | 28 Product Launch Checklist
29 A/B Price Testing          | 30 Replenishment Planner
```

### v4.0 Enterprise (31-43)
```
31 Uzum Ads ROI Tracker       | 32 Telegram Mini App
33 Team Collaboration         | 34 Custom Report Builder
35 Market Share PDF           | 36 Watchlist Sharing
37 Historical Data Archive    | 38 Collective Intelligence
39 Algorithm Reverse Eng.     | 40 Xitoy/Yevropa Sourcing
41 Cargo Calculator           | 42 Browser Extension Pro
43 White-label API            |
```

---

## 🔐 SHARED FILE PROTOCOL

`packages/types/src/index.ts` yoki `packages/utils/src/index.ts` o'zgartirish kerak bo'lsa:

```
1. Telegram/chat orqali ikkinchi dasturchiga xabar ber
2. Tasdiq olingach o'zgartir
3. Commit: "types: [nima qo'shildi] ([ism])"
4. Ikkinchi dasturchi DARHOL pull qiladi
```

---

## 🌿 GIT QOIDALARI

```bash
# Har kuni boshida:
git pull origin main

# Branch format:
bekzod/feat-[feature-name]
sardor/feat-[feature-name]

# Commit format (MAJBURIY):
feat(module): [nima qilindi] — qisqa, inglizcha
fix(module): [nima tuzatildi]
refactor(module): [nima o'zgartirildi]

# Misol:
feat(sourcing): add SerpAPI client for 1688 and Taobao
fix(billing): correct BigInt casting in charge calculation
refactor(discovery): replace Playwright with REST pagination
```

---

## 🐛 BUG TRACKING (MAJBURIY)

**Claude har qanday bug yoki error tuzatganda `docs/Bugs_Fixes.md` faylga AVTOMATIK yozishi SHART:**

1. Console error (frontend) — `.map is not a function`, `undefined`, 404, 500, etc.
2. API error (backend) — NestJS exception, Prisma error, 4xx/5xx
3. TypeScript error — `tsc --noEmit` da chiqqan xatolar
4. Playwright/test error — route test'larda topilgan xatolar
5. Build/config error — Vite, Webpack, dependency muammolari

**Format (har bir bug uchun):**
```markdown
### BUG-[raqam]: [qisqa sarlavha]
- **Sana:** YYYY-MM-DD
- **Tur:** frontend | backend | config | build
- **Fayl:** [o'zgargan fayl path]
- **Xato:** [error message]
- **Sabab:** [root cause]
- **Yechim:** [nima qilindi]
- **Status:** FIXED
```

**Qoidalar:**
- Bug topilgan paytda DARHOL yoziladi, keyin emas
- Har bir sessiyada avval `docs/Bugs_Fixes.md` o'qib, raqamni davom ettirish
- Playwright test natijalarini ham yozish
- Takroriy buglar uchun yangi yozuv yaratmaslik, mavjudini yangilash

---

## ⚙️ LOCAL DEVELOPMENT

```bash
# Infra (postgres + redis):
docker-compose up -d

# API:
cd apps/api && pnpm dev

# Worker:
cd apps/worker && pnpm dev

# Web:
cd apps/web && pnpm dev

# Prisma migration (FAQAT Bekzod):
cd apps/api && npx prisma migrate dev --name [migration-name]
npx prisma generate

# Type check:
pnpm --filter api exec tsc --noEmit
pnpm --filter web exec tsc --noEmit
```

---

*CLAUDE.md | Uzum Trend Finder | 2026-02-23*
