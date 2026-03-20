# CLAUDE.md — VENTRA Analytics Platform
# Bu fayl Claude CLI tomonidan avtomatik o'qiladi
# Uchala dasturchi uchun UMUMIY qoidalar

---

## BIRINCHI QADAM (MAJBURIY)

**Har yangi terminal sessiyasida Claude quyidagini so'rashi SHART:**

```
Salom! Men VENTRA loyihasidaman.

Kimligingizni aniqlay olmayman — ismingiz kim?
  1. Bekzod (PM — loyiha boshqaruvi, task yaratish, code review)
  2. Sardor (Full-Stack Developer — barcha apps, packages, infra)
  3. Ziyoda (Backend + Frontend Web)

Ishlash rejimi:
  A. Single Task  — 1 agent, oddiy task
  B. Multi-Agent  — parallel agentlar, sprint mode
  C. Review Only  — QA + code review
```

Javob kelgach:
1. Tegishli faylni o'qib kontekstga kirish:
   - Bekzod → PM sifatida, `docs/Tasks.md` o'qib boshqaradi (kod yozmaydi)
   - Sardor → `CLAUDE_BACKEND.md` + `CLAUDE_FRONTEND.md` (barcha kod zonalari)
   - Ziyoda → `CLAUDE_BACKEND.md` (backend + web zona)
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
apps/api/        → Backend API (Sardor, Ziyoda)
apps/worker/     → Worker (Sardor, Ziyoda)
apps/web/        → Frontend Web (Sardor, Ziyoda)
apps/landing/    → Landing page (Sardor)
apps/desktop/    → Desktop app (Sardor)
apps/bot/        → Telegram bot (Sardor)
apps/extension/  → Chrome Extension (Sardor)
packages/types/  → Shared types (HAMMASI — kelishib)
packages/utils/  → Shared utils (HAMMASI — kelishib)
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
- Har sessiyada avval `docs/Tasks.md` o'qib, T-raqamni davom ettirish (hozirgi: T-410, keyingi: T-411)
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
ziyoda/feat-[feature-name]

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

> To'liq arxitektura: `docs/MULTI_AGENT_ARCHITECTURE.md`

### Agent turlari

| Agent | Tool | Zona | Vazifasi |
|-------|------|------|----------|
| **Orchestrator** | Main CLI session | docs/, git | Task parsing, dispatch, merge, archive |
| **Backend Agent** | `Agent(subagent_type: "general-purpose", isolation: "worktree")` | apps/api, worker, bot | NestJS, Prisma, BullMQ |
| **Web Agent** | `Agent(subagent_type: "general-purpose", isolation: "worktree")` | apps/web, extension | React, Tailwind, i18n (Bekzod) |
| **Landing Agent** | `Agent(subagent_type: "general-purpose", isolation: "worktree")` | apps/landing, desktop | Landing + Desktop (Sardor) |
| **QA Agent** | `Agent(subagent_type: "general-purpose")` | read-only, barcha fayllar | tsc, build, lint, test |
| **PM Agent** | `Agent(subagent_type: "general-purpose")` | docs/ (read+write) | Sprint planning, velocity, task decomposition |
| **BA Agent** | `Agent(subagent_type: "general-purpose")` | read-only + admin API | Marketplace analytics, biznes hisobotlar |
| **Explorer** | `Agent(subagent_type: "Explore")` | read-only | Code research, bug analysis |
| **Planner** | `Agent(subagent_type: "Plan")` | read-only | Architecture, decomposition |

### Ishlash tartibi (Mode B)

```
1. PM PLAN  — PM Agent: Tasks.md + Done.md + git log → sprint plan, prioritet, dependency graph
2. BA CONTEXT — BA Agent: marketplace data tahlili → qaysi tasklar biznesga eng katta ta'sir (ixtiyoriy)
3. DISPATCH — Parallel agentlar ishga tushirish (worktree isolation)
   ├─ Backend Agent  → backend task (worktree A)
   ├─ Web Agent      → frontend web task (worktree B) — Bekzod
   ├─ Landing Agent  → landing/desktop task (worktree C) — Sardor
   └─ Explorer Agent → research (read-only, agar kerak)
4. VALIDATE — QA Agent: tsc + build + test (MAJBURIY, har merge dan oldin)
5. MERGE   — Orchestrator: worktree → main, conflict resolve
6. PM RETRO — PM Agent: sprint natijasi, velocity hisoblash, docs/Done.md yangilash
7. BA MEASURE — BA Agent: o'zgarish ta'sirini o'lchash (ixtiyoriy, katta feature uchun)
8. ARCHIVE — Tasks.md → Done.md ko'chirish
```

### Zone qoidalari — QATTIQ

```
ZONE MATRIX:
                Backend    Web        Landing    Shared    Docs
  Backend Agent:  ✅ o'zi    ❌ tegma   ❌ tegma   🔒 lock   ❌ tegma
  Web Agent:      ❌ tegma   ✅ o'zi    ❌ tegma   🔒 lock   ❌ tegma
  Landing Agent:  ❌ tegma   ❌ tegma   ✅ o'zi    🔒 lock   ❌ tegma
  QA Agent:       👁 read    👁 read    👁 read   👁 read   ❌ tegma
  PM Agent:       👁 read    👁 read    👁 read   👁 read   ✅ yozadi
  BA Agent:       👁 read    👁 read    👁 read   👁 read   ✅ yozadi
  Orchestrator:   👁 read    👁 read    👁 read   ✅ merge  ✅ yozadi

ZONE MAP:
  backend  = apps/api/, apps/worker/                   (Sardor, Ziyoda)
  web      = apps/web/                                 (Sardor, Ziyoda)
  landing  = apps/landing/, apps/desktop/              (Sardor)
  frontend = apps/bot/, apps/extension/                (Sardor)
  shared   = packages/types/, packages/utils/
  docs     = docs/, CLAUDE*.md
```

### Lock protocol (packages/* uchun)

```
Lock fayl: .claude/locks/{zone}.lock
Format:    {"agent":"...", "task":"T-XXX", "locked_at":"ISO", "ttl_minutes":30}

Qoidalar:
  1. O'zgartirish OLDIN lock tekshir
  2. Lock mavjud → KUTISH yoki boshqa task
  3. Lock TTL 30 daqiqa — expired lock = bo'sh
  4. O'zgartirish tugagach → lock o'chirish
  5. Orchestrator expired lock larni tozalashi mumkin
```

### Agent prompt template

Har sub-agent ga beriladigan prompt formati:

```
You are {ROLE} AGENT for VENTRA Analytics Platform.

ZONE:       {allowed directories}
FORBIDDEN:  {restricted directories — DO NOT touch}
RULES:      {top 5 rules from CLAUDE_BACKEND.md or CLAUDE_FRONTEND.md}

TASK:
  ID:    T-{XXX}
  Title: {task title}
  Files: {expected files to modify}
  Deps:  {prerequisite tasks — already done}

DELIVERABLES:
  1. Code changes within your ZONE only
  2. Self-check: tsc --noEmit for your app
  3. Summary: files changed + what + why

CONSTRAINTS:
  - DO NOT touch files outside your zone
  - DO NOT modify docs/Tasks.md or docs/Done.md
  - DO NOT commit — Orchestrator handles git
  - NO `any` type — TypeScript strict
  - If blocked → return error, do not guess
```

### Task classification

```
Task fayllariga qarab agent tanlanadi:

  apps/api/**          → Backend Agent (Sardor / Ziyoda)
  apps/worker/**       → Backend Agent (Sardor / Ziyoda)
  apps/bot/**          → Frontend Agent (Sardor)
  apps/web/**          → Web Agent (Sardor / Ziyoda)
  apps/extension/**    → Frontend Agent (Sardor)
  apps/landing/**      → Landing Agent (Sardor)
  apps/desktop/**      → Landing Agent (Sardor)
  packages/**          → Lock → birinchi kelgan agent
  prisma/schema.prisma → Backend Agent (Sardor / Ziyoda)
  UCHALA tasks         → Sequential: Backend → Web

Task hajmi → mode:
  < 30 min, 1-2 fayl   → Single Agent (worktree'siz)
  30-60 min, 3-5 fayl   → Single Agent + worktree
  > 60 min, 5+ fayl     → Multi-Agent + worktrees
  Cross-zone (IKKALASI)  → Sequential: Backend birinchi, keyin Frontend
```

### QA Agent — MAJBURIY validatsiya

```
Har merge dan OLDIN QA Agent quyidagilarni tekshiradi:

  1. pnpm --filter api exec tsc --noEmit
  2. pnpm --filter web exec tsc --noEmit
  3. pnpm --filter worker exec tsc --noEmit
  4. pnpm --filter bot exec tsc --noEmit
  5. pnpm build
  6. pnpm --filter @uzum/utils test

NATIJA:
  ✅ PASS → Orchestrator merge qiladi
  ❌ FAIL → Tegishli agent ga error qaytariladi, tuzatish kerak
```

### PM Agent — Sprint Planning & Velocity

```
PM Agent VAZIFASI:
  Sprint boshlashda va tugashda ishga tushadi.
  Kod YOZMAYDI — faqat docs/ papkaga yozadi.

KIRISH (o'qiydi):
  - docs/Tasks.md         → ochiq tasklar, prioritetlar, dependency
  - docs/Done.md          → bajarilgan ishlar, vaqt, ta'sir
  - git log --oneline -50 → oxirgi commitlar (velocity hisoblash)
  - docs/Tasks-Bekzod.md  → developer-specific backlog

CHIQISH (yozadi):
  - docs/sprint-plan.md   → joriy sprint plani (task ro'yxati, tartib, vaqt)

QOBILIYATLARI:
  1. Sprint Planning:
     - Tasks.md dan P0/P1 tasklarni ajratish
     - Dependency graph: T-418 → T-419 (ketma-ket), T-420 || T-421 (parallel)
     - Developer yuk taqsimoti: Sardor 8h, Ziyoda 8h (Bekzod = PM, kod yozmaydi)
  2. Velocity Tracking:
     - Done.md dan "Vaqt" maydonini o'qish → actual vs planned
     - Oxirgi 7 kun: N ta task / X soat = velocity score
     - Trend: tezlashyapti / sekinlashyapti / barqaror
  3. Task Decomposition:
     - Katta task (4h+) → 2-3 kichik sub-task ga bo'lish
     - Har sub-task: aniq fayllar, deliverable, vaqt
  4. Sprint Retro:
     - Nima yaxshi ishladi / nima to'siq bo'ldi
     - Keyingi sprintga tavsiyalar

CHEKLOVLAR:
  - Kod fayllarni O'ZGARTIRMAYDI
  - Tasks.md ga task QO'SHMAYDI (faqat Orchestrator qiladi)
  - git commit/push QILMAYDI
```

### BA Agent — Marketplace Analytics & Business Intelligence

```
BA Agent VAZIFASI:
  Biznes qarorlar uchun ma'lumot tahlili.
  Kod YOZMAYDI — faqat docs/ papkaga hisobot yozadi.

KIRISH (o'qiydi):
  - docs/Done.md           → qanday feature'lar qo'shilgani
  - apps/api/prisma/schema.prisma → DB model tuzilishi
  - Admin API endpointlari (read-only):
      GET /admin/stats              → foydalanuvchi/mahsulot statistikasi
      GET /admin/monitoring/metrics → tizim holati
      GET /admin/monitoring/capacity → sig'im baholash

CHIQISH (yozadi):
  - docs/ba-report.md      → marketplace analytics hisoboti

QOBILIYATLARI:
  1. Marketplace Intelligence:
     - Qaysi kategoriyalar o'sish trendida (category_path tahlili)
     - Top mahsulotlar va ularning score dinamikasi
     - Niche imkoniyatlari: kam raqobat + yuqori talab
  2. Feature Impact Assessment:
     - Yangi feature qo'shilgandan keyin: foydalanuvchi faolligi o'zgardimi?
     - A/B taqqoslash: oldin vs keyin (Done.md sanalar bo'yicha)
  3. User Behavior Analysis:
     - Eng ko'p ishlatiladigan endpointlar
     - Churn signallari: so'nggi 7 kunda login qilmagan accountlar
  4. Revenue Forecasting:
     - Billing tranzaksiyalar trendi
     - Plan upgrade/downgrade nisbati

CHEKLOVLAR:
  - Kod fayllarni O'ZGARTIRMAYDI
  - DB ga to'g'ridan yozmaydi (faqat GET so'rovlar)
  - Maxfiy ma'lumotlarni (email, password) hisobotga YOZMAYDI
  - git commit/push QILMAYDI
```

### Uchala developer bir vaqtda ishlasa

```
  Bekzod (Terminal 1)         Ziyoda (Terminal 2)         Sardor (Terminal 3)
  ═══════════════════         ═══════════════════         ═══════════════════
  Mode B → PM Orch.            Mode B → Backend Orch.      Mode B → Full Orch.
    │                           │                           │
    ├─ Task yaratish            ├─ Agent: GraphQL scrape    ├─ Agent: Bright Data
    ├─ Sprint planning          ├─ Agent: API task          ├─ Agent: Landing task
    ├─ Code review              ├─ QA: tsc api+web+worker   ├─ QA: tsc all
    ├─ Done.md update           ├─ git commit + push        ├─ git commit + push
    └─ docs/ boshqaruvi         └─ Done.md update           └─ Done.md update

  Bekzod ZONASI:  docs/ (PM — kod yozmaydi)
  Ziyoda ZONASI:  apps/api + apps/web + apps/worker
  Sardor ZONASI:  HAMMASI (full access)

  ⚠️  SARDOR + ZIYODA OVERLAP: ikkalasi api/web/worker da ishlaydi
     → Bir xil faylda ishlamaslik uchun TASK LOCKING MAJBURIY
     → Bir faylni ikkalasi o'zgartirsa → git merge conflict xavfi
  BEKZOD: PM — faqat docs/ bilan ishlaydi, kod fayllariga tegmaydi
  SHARED ZONE: packages/* → LOCK protocol faollashadi
```

---

## ZONA HIMOYASI (pre-commit hook MAJBURIY)

**Git pre-commit hook (`.husky/pre-commit`) avtomatik tekshiradi:**

```
SARDOR ZONASI (FULL — hech qanday cheklov yo'q):
  ✅ apps/api/        — Backend API
  ✅ apps/web/        — Frontend Web dashboard
  ✅ apps/worker/     — BullMQ Worker
  ✅ apps/landing/    — Landing page
  ✅ apps/desktop/    — Desktop app
  ✅ apps/bot/        — Telegram Bot
  ✅ apps/extension/  — Chrome Extension

BEKZOD ZONASI (landing/desktop/bot/extension TAQIQLANGAN):
  ✅ apps/api/        — Backend API
  ✅ apps/web/        — Frontend Web dashboard
  ✅ apps/worker/     — BullMQ Worker
  ❌ apps/landing/    — Landing page
  ❌ apps/desktop/    — Desktop app
  ❌ apps/bot/        — Telegram Bot
  ❌ apps/extension/  — Chrome Extension

ZIYODA ZONASI (landing/desktop/bot/extension TAQIQLANGAN):
  ✅ apps/api/        — Backend API
  ✅ apps/web/        — Frontend Web dashboard
  ✅ apps/worker/     — BullMQ Worker
  ❌ apps/landing/    — Landing page
  ❌ apps/desktop/    — Desktop app
  ❌ apps/bot/        — Telegram Bot
  ❌ apps/extension/  — Chrome Extension

UMUMIY ZONA (hammasi, kelishib):
  ✅ packages/        — Shared types/utils (lock protocol)
  ✅ docs/            — Dokumentatsiya
```

**Hook qanday ishlaydi:**
1. `git config user.name` va `user.email` orqali committer aniqlanadi
2. Bekzod identifikatsiyasi: PM — `apps/` va `packages/` BLOKLANGAN
3. Ziyoda identifikatsiyasi: `apps/landing/`, `apps/desktop/`, `apps/bot/`, `apps/extension/` BLOKLANGAN
4. Sardor — **FULL ACCESS**, hech qanday zona blokirovkasi yo'q
5. Xato xabari bilan taqiqlangan fayllar ro'yxati ko'rsatiladi

**Claude CLI uchun qo'shimcha qoida:**
- Sardor sessiyasida — **barcha fayllarga** EDIT/WRITE ruxsat (full zona)
- Bekzod sessiyasida `apps/`, `packages/` dagi fayllarni EDIT/WRITE **TAQIQLANGAN** — faqat `docs/` bilan ishlaydi
- Ziyoda sessiyasida `apps/landing/`, `apps/desktop/`, `apps/bot/`, `apps/extension/` dagi fayllarni EDIT/WRITE **TAQIQLANGAN**

---

## XAVFLI ZONALAR

```
❌ prisma migrate reset — ma'lumotlar yo'qoladi!
❌ main branch'ga to'g'ridan push — PR orqali
❌ .env faylni commit qilma — .gitignore da bo'lishi kerak
❌ packages/* o'zgartirish — avval kelishib olish (yoki lock protocol)
❌ Multi-Agent: agent zone dan tashqari fayl o'zgartirishi TAQIQLANGAN
❌ Multi-Agent: QA Agent tekshirmasdan merge qilish TAQIQLANGAN
```

---

*CLAUDE.md | VENTRA Analytics Platform | 2026-03-20*
