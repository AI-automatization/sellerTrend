# CLAUDE.md — VENTRA Analytics Platform
# Bu fayl Claude CLI tomonidan avtomatik o'qiladi
# Ikkala dasturchi uchun UMUMIY qoidalar

---

## BIRINCHI QADAM (MAJBURIY)

**Har yangi terminal sessiyasida Claude quyidagini so'rashi SHART:**

```
Salom! Men VENTRA loyihasidaman.

Kimligingizni aniqlay olmayman — ismingiz kim?
  1. Bekzod (PM — loyiha boshqaruvi, task yaratish, code review)
  2. Sardor (Full-Stack Developer — barcha apps, packages, infra)

Ishlash rejimi:
  A. Single Task  — 1 agent, oddiy task
  B. Multi-Agent  — parallel agentlar, sprint mode
  C. Review Only  — QA + code review
```

Javob kelgach:
1. Tegishli faylni o'qib kontekstga kirish:
   - Bekzod → PM sifatida, `docs/Tasks.md` o'qib boshqaradi (kod yozmaydi)
   - Sardor → `CLAUDE_BACKEND.md` + `CLAUDE_FRONTEND.md` (barcha kod zonalari)
2. `git pull origin main` — eng yangi holatni olish
3. `docs/Tasks.md` o'qib ochiq tasklarni ko'rish + `pending[X]` statuslarni tekshirish
4. Task boshlashdan oldin **GIT-BASED TASK LOCKING** protokolini bajarish (pastda)
5. **Mode B** tanlansa → Multi-Agent Protocol (pastda) faollashadi

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
apps/api/        → Backend API (Sardor)
apps/worker/     → Worker (Sardor)
apps/web/        → Frontend Web (Sardor)
apps/landing/    → Landing page (Sardor)
apps/desktop/    → Desktop app (Sardor)
apps/bot/        → Telegram bot (Sardor)
apps/extension/  → Chrome Extension (Sardor)
packages/types/  → Shared types (Sardor)
packages/utils/  → Shared utils (Sardor)
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

## TASK TRACKING v2 (MAJBURIY)

**Loyiha vazifalari 2 ta faylda boshqariladi:**

| Fayl | Vazifasi |
|------|----------|
| `docs/Tasks.md` | Ochiq vazifalar + task formati qoidalari (batafsil shablon ichida) |
| `docs/Done.md` | Bajarilgan ishlar arxivi (manba, muammo, yechim, ta'sir) |

**Task formati `docs/Tasks.md` ichida batafsil yozilgan — U YERDAN O'QI.**

**Qisqa eslatma:**

```
SARLAVHA:   ### T-XXX | P(0-3) | KATEGORIYA | Sarlavha | Vaqt
MAJBURIY:   Sana, Manba, Mas'ul, Tahlil, Muammo, Yechim, Fayllar
IXTIYORIY:  Topilgan joyda, Qo'shimcha kontekst, Screenshot

MANBA TEGLARI (standart):
  kod-audit | production-bug | ai-tahlil | user-feedback |
  code-review | dependency-update | sentry-alert |
  self-improve | regression | performance
```

**Qoidalar:**
- Bug/task topilgan paytda DARHOL yoziladi
- Har sessiyada avval `docs/Tasks.md` o'qib, T-raqamni davom ettirish (hozirgi: T-427, keyingi: T-428)
- Takroriy task yaratmaslik, mavjudini yangilash
- **Tahlil** maydoni MAJBURIY — "nega" bu muammo, ta'sir ko'lami yozilishi SHART
- **Done.md** ga ko'chirganda **Ta'sir** maydoni MAJBURIY — nima yaxshilandi

### GIT-BASED TASK LOCKING (MAJBURIY)

**Taskni boshlashdan OLDIN quyidagi qadamlar bajariladi:**

```
1. git pull origin main                          ← eng yangi holatni ol
2. docs/Tasks.md ni o'qi                         ← pending[Sardor/Bekzod] bormi tekshir
3. Agar task pending[boshqa_dasturchi] bo'lsa     ← TEGIZMA, boshqa task ol
4. Task ochiq bo'lsa → pending[SeningSming] yoz   ← masalan: pending[Bekzod]
5. git add docs/Tasks.md
6. git commit -m "task: claim T-XXX [Bekzod]"
7. git push origin main                          ← boshqalar ko'rishi uchun
8. ENDI ishni boshlash mumkin
```

**Tasks.md da status format:**

```markdown
### T-241 | P1 | BACKEND | totalAvailableAmount ... | pending[Bekzod]
### T-264 | P1 | FRONTEND | Admin route ... | pending[Bekzod]
### T-280 | P0 | DEVOPS | Railway EU migration ... |              ← ochiq, hech kim olmagan
```

**Task tugaganda:**
```
1. Tasks.md dan taskni o'chirish
2. Done.md ga ko'chirish
3. git add docs/Tasks.md docs/Done.md
4. git commit + push
```

**Xavflardan himoya:**
- `git push` reject bo'lsa → `git pull --rebase` qilib qayta push
- 1 soatdan ortiq pending[X] o'zgarishsiz tursa → task "stuck" deb hisoblanadi, boshqasi olishi mumkin
- Multi-agent mode da: barcha batch tasklarni BIR commit da claim qilish (conflict kamaytirish)

---

## SHARED FILE PROTOCOL

`packages/types/` yoki `packages/utils/` o'zgartirish kerak bo'lsa:

**Single mode:**
```
1. Telegram/chat orqali ikkinchi dasturchiga xabar ber
2. Tasdiq olingach o'zgartir
3. Commit: "types: [nima qo'shildi] ([ism])"
4. Ikkinchi dasturchi DARHOL pull qiladi
```

**Multi-Agent mode:**
```
1. Orchestrator lock faylni tekshiradi
2. Lock bo'sh → .claude/locks/packages-{name}.lock yaratadi
3. Agent o'zgarishni bajaradi
4. Tugagach lock faylni o'chiradi
5. Ikkinchi agent endi ishlashi mumkin
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
# Root-level commands (turbo):
pnpm dev                    # Barcha applarni ishga tushirish
pnpm build                  # Production build (turbo)
pnpm lint                   # Lint (turbo)
pnpm typecheck              # tsc --noEmit (api + web)

# Infra (postgres + redis):
docker-compose up -d

# App-specific:
cd apps/api && pnpm dev     # Backend API (:3000)
cd apps/worker && pnpm dev  # Worker
cd apps/web && pnpm dev     # Web dashboard (:5173)

# Prisma migration (FAQAT Bekzod):
cd apps/api && npx prisma migrate dev --name [migration-name]
npx prisma generate

# Type check (individual):
pnpm --filter api exec tsc --noEmit
pnpm --filter web exec tsc --noEmit
```

---

## SCREENSHOT VA TEMP FAYLLAR

**Root papkani musorga to'ldirmaslik uchun:**

| Fayl/Papka | Maqsad | .gitignore |
|-------------|--------|------------|
| `screenshots/` | Playwright, MCP, debug screenshotlar | ✅ ignore |
| `test-results/` | Playwright test natijalari | ✅ ignore |
| `*.png` (root) | Tasodifiy screenshot | ✅ ignore |
| `tmp_*.json` | Vaqtinchalik debug JSON fayllar | ✅ ignore |
| `hato/` | Xato loglar papkasi | ✅ ignore |

**Qoidalar:**
- Screenshot olsang — `screenshots/` papkaga saqla, root'ga EMAS
- Playwright test: `--output screenshots/` flag ishlatish
- `apps/web/public/**/*.png` va `apps/desktop/resources/**/*.png` — BUNDAN MUSTASNO (asset)
- Root'da `.png` yoki `tmp_*.json` paydo bo'lsa — tegishli papkaga ko'chirish

---

## MULTI-AGENT PROTOCOL

> **To'liq arxitektura:** `docs/MULTI_AGENT_ARCHITECTURE.md` (agent turlari, prompt template, DAG algorithm, sprint plan)

### Agent turlari (qisqa)

| Agent | Tool | Vazifasi |
|-------|------|----------|
| **Orchestrator** | Main CLI | Task parsing, dispatch, merge, archive |
| **Backend Agent** | `general-purpose` + worktree | NestJS, Prisma, BullMQ (Sardor) |
| **Web Agent** | `general-purpose` + worktree | React, Tailwind, i18n (Sardor) |
| **Landing Agent** | `general-purpose` + worktree | Landing, Desktop, Bot, Extension (Sardor) |
| **QA Agent** | `general-purpose` | tsc + build + test (MAJBURIY har merge da) |
| **PM Agent** | `general-purpose` | Sprint planning → `docs/sprint-plan.md` |
| **BA Agent** | `general-purpose` | Marketplace analytics → `docs/ba-report.md` |
| **Explorer** | `Explore` | Code research (read-only) |
| **Planner** | `Plan` | Architecture decisions (read-only) |

### Mode B — ishlash tartibi

`PM PLAN → DISPATCH (parallel worktrees) → VALIDATE (QA) → MERGE → ARCHIVE`

### Task → agent tanlash

| Fayl pattern | Agent |
|---|---|
| `apps/api/**`, `apps/worker/**` | Backend Agent (Sardor) |
| `apps/web/**` | Web Agent (Sardor) |
| `apps/landing/**`, `apps/desktop/**`, `apps/bot/**`, `apps/extension/**` | Landing Agent (Sardor) |
| `packages/**` | Sardor (lock kerak emas) |
| Cross-zone | Sequential: Backend → Frontend (Sardor) |

**Task hajmi:** <30min → Single Agent | 30-60min → Single + worktree | >60min → Multi-Agent + worktrees

### QA — har merge dan oldin (MAJBURIY)

```bash
pnpm --filter api exec tsc --noEmit && pnpm --filter web exec tsc --noEmit && pnpm --filter worker exec tsc --noEmit && pnpm --filter bot exec tsc --noEmit && pnpm build && pnpm --filter @uzum/utils test
```

### Zone qoidalari → pastdagi ZONA HIMOYASI bo'limiga qarang

---

## ZONA HIMOYASI (pre-commit hook MAJBURIY)

**Git pre-commit hook (`.husky/pre-commit`) avtomatik tekshiradi:**

```
BEKZOD ZONASI (PM — kod yozmaydi):
  ✅ docs/            — Task boshqaruvi, dokumentatsiya
  ❌ apps/*           — Barcha kod Sardor zonasi
  ❌ packages/*       — Barcha kod Sardor zonasi

SARDOR ZONASI (Full-Stack Developer — hamma narsa):
  ✅ apps/api/        — Backend API
  ✅ apps/web/        — Frontend Web dashboard
  ✅ apps/worker/     — BullMQ Worker
  ✅ apps/landing/    — Landing page
  ✅ apps/desktop/    — Desktop app
  ✅ apps/bot/        — Telegram Bot
  ✅ apps/extension/  — Chrome Extension
  ✅ packages/        — Shared types/utils
  ✅ docs/            — Dokumentatsiya
```

**Hook qanday ishlaydi:**
1. `git config user.name` va `user.email` orqali committer aniqlanadi
2. Bekzod identifikatsiyasi: ism yoki email da "bekzod" bo'lsa
3. Agar Bekzod `apps/` yoki `packages/` dagi faylni stage qilgan bo'lsa → **commit BLOKLADI**
4. Sardor — barcha papkalarga to'liq ruxsat

**Claude CLI uchun qo'shimcha qoida:**
- Bekzod sessiyasida `apps/`, `packages/` dagi fayllarni EDIT/WRITE qilish **TAQIQLANGAN** — faqat `docs/` bilan ishlaydi
- Sardor sessiyasida barcha fayllarni EDIT/WRITE qilish **RUXSAT BERILGAN**

---

## XAVFLI ZONALAR

```
❌ prisma migrate reset — ma'lumotlar yo'qoladi!
❌ main branch'ga to'g'ridan push — PR orqali
❌ .env faylni commit qilma — .gitignore da bo'lishi kerak
❌ Bekzod: apps/* yoki packages/* ga teginish — PM faqat docs/ bilan ishlaydi
❌ Multi-Agent: agent zone dan tashqari fayl o'zgartirishi TAQIQLANGAN
❌ Multi-Agent: QA Agent tekshirmasdan merge qilish TAQIQLANGAN
```

---

*CLAUDE.md | VENTRA Analytics Platform | 2026-03-10*
