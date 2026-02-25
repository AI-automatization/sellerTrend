# CLAUDE.md — VENTRA Analytics Platform
# Bu fayl Claude CLI tomonidan avtomatik o'qiladi
# Ikkala dasturchi uchun UMUMIY qoidalar

---

## BIRINCHI QADAM (MAJBURIY)

**Har yangi terminal sessiyasida Claude quyidagini so'rashi SHART:**

```
Salom! Men VENTRA loyihasidaman.
Kimligingizni aniqlay olmayman — ismingiz kim?
  1. Bekzod (Backend)
  2. Sardor (Frontend)
```

Javob kelgach, tegishli faylni o'qib kontekstga kirish:
- Bekzod → `CLAUDE_BACKEND.md`
- Sardor → `CLAUDE_FRONTEND.md`

---

## LOYIHA

**VENTRA** — `uzum.uz` marketplace uchun SaaS analytics platformasi.

| Layer | Tech | Port |
|-------|------|------|
| Backend API | NestJS + Prisma + PostgreSQL 16 + pgvector | 3000 |
| Worker | BullMQ + Redis 7 | — |
| Frontend | React 19 + Vite 7 + Tailwind v4 + DaisyUI v5 | 5173 |
| Bot | grammY (Telegram) | — |

**Monorepo:** `pnpm workspaces` + `turbo`

```
apps/api/        → Backend (Bekzod)
apps/worker/     → Worker (Bekzod)
apps/bot/        → Telegram bot (Bekzod)
apps/web/        → Frontend (Sardor)
packages/types/  → Shared types (IKKALASI — kelishib)
packages/utils/  → Shared utils (IKKALASI — kelishib)
```

---

## CLEAN CODE PRINSIPLARI

### SOLID
- **S** — Single Responsibility: Har fayl BIR vazifa. Controller = HTTP, Service = logika, Hook = state.
- **O** — Open/Closed: Yangi funksionallik qo'shish uchun mavjud kodni o'zgartirma, kengaytir.
- **L** — Liskov: Interfeys va'da qilganini bajar. `any` type TAQIQLANGAN.
- **I** — Interface Segregation: Kichik, aniq interface'lar. Katta "god object" yaratma.
- **D** — Dependency Inversion: Service → Interface ga bog'lan, konkret implementatsiyaga emas.

### DRY + KISS
- Bir xil kod 2+ joyda → helper/hook/service ga chiqar.
- Murakkab yechimdan oldin oddiy yechimni sinab ko'r.
- Premature optimization qilma — avval ishlat, keyin optimizatsiya qil.

### TAQIQLANGAN
```
❌ any type (TypeScript strict mode)
❌ console.log (Backend: NestJS Logger, Frontend: development only)
❌ God object / 400+ qatorli fayl
❌ Inline styles (Tailwind class ishlatish)
❌ Magic numbers (const bilan nomlash)
❌ Nested try/catch (flat structure)
❌ Hardcoded secrets (.env ishlatish)
```

---

## TASK TRACKING (MAJBURIY)

**Loyiha vazifalari 2 ta faylda boshqariladi:**

| Fayl | Vazifasi |
|------|----------|
| `docs/Tasks.md` | Barcha ochiq vazifalar — bug, error, feature, arxitektura, devops |
| `docs/Done.md` | Bajarilgan ishlar arxivi — fix, feature, test natijalari |

**Yangi bug/error/task topilganda `docs/Tasks.md` ga qo'shiladi:**

Format: `T-XXX | [KATEGORIYA] | Sarlavha | Mas'ul | Vaqt`
- Kategoriyalar: BACKEND, FRONTEND, DEVOPS, IKKALASI
- Prioritetlar: P0 (kritik), P1 (muhim), P2 (o'rta), P3 (past)

**Fix bo'lgandan keyin:**
1. `docs/Tasks.md` dan o'chiriladi
2. `docs/Done.md` ga ko'chiriladi (sana + qisqa yechim)

**Qoidalar:**
- Bug/task topilgan paytda DARHOL yoziladi
- Har sessiyada avval `docs/Tasks.md` o'qib, T-raqamni davom ettirish
- Takroriy task yaratmaslik, mavjudini yangilash

---

## SHARED FILE PROTOCOL

`packages/types/` yoki `packages/utils/` o'zgartirish kerak bo'lsa:

```
1. Telegram/chat orqali ikkinchi dasturchiga xabar ber
2. Tasdiq olingach o'zgartir
3. Commit: "types: [nima qo'shildi] ([ism])"
4. Ikkinchi dasturchi DARHOL pull qiladi
```

---

## GIT QOIDALARI

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

## DEFINITIONS

| Atama | Ma'nosi |
|-------|---------|
| `weekly_bought` | Snapshot DELTA — `ordersAmount` farqi (cumulative emas!) |
| `rOrdersAmount` | Rounded JAMI buyurtma (haftalik emas, ishlatma!) |
| `availableAmount` | Per-order limit (masalan 5) — real stok EMAS |
| `totalAvailableAmount` | Haqiqiy ombor stoki (masalan 2659) |
| `score` | Mahsulot reytingi — `packages/utils/src/index.ts` dagi formula |
| `BigInt` | Prisma ID/balance — JSON serialize uchun `.toString()` MAJBURIY |
| `account_id` | Multi-tenant filter — HAR query da bo'lishi SHART |
| `FBO/FBS` | Uzum fulfillment turi — FBO = Uzum omborida, FBS = sotuvchida |

---

## LOCAL DEVELOPMENT

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

## XAVFLI ZONALAR (IKKALA DASTURCHI UCHUN)

```
❌ prisma migrate reset — ma'lumotlar yo'qoladi!
❌ main branch'ga to'g'ridan push — PR orqali
❌ .env faylni commit qilma — .gitignore da bo'lishi kerak
❌ O'zga dasturchining papkasiga teginma (apps/api ↔ apps/web)
❌ packages/* o'zgartirish — avval kelishib olish
```

---

*CLAUDE.md | VENTRA Analytics Platform | 2026-02-26*
