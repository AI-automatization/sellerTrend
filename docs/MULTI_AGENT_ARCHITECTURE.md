# VENTRA — Claude Multi-Agent Arxitekturasi
# Versiya: 1.0 | Sana: 2026-03-01
# Muallif: Bekzod (Backend Architect)

---

## 1. HOZIRGI HOLAT — SINGLE AGENT MODEL

### 1.1 Ishlash tartibi

```
┌─────────────────────────────────────────────────────┐
│                  DEVELOPER TERMINAL                  │
│                                                      │
│  1. claude → "Salom! Kimligingiz?"                  │
│  2. Bekzod/Sardor tanlash                           │
│  3. CLAUDE_BACKEND.md / CLAUDE_FRONTEND.md yuklash  │
│  4. docs/Tasks.md o'qish                            │
│  5. Bitta task tanlash                              │
│  6. Ketma-ket ishlash (sequential)                  │
│  7. Done.md yangilash                               │
│  8. Keyingi task                                    │
│                                                      │
│  ⏱️ 1 sessiya = 1 developer = 1 agent = 1 task     │
└─────────────────────────────────────────────────────┘
```

### 1.2 Bottlenecklar

| Muammo | Ta'siri | Miqdori |
|--------|---------|---------|
| **Sequential execution** | Bir vaqtda faqat 1 ta task | -60% parallelism |
| **Context switching** | Har yangi sessiyada CLAUDE.md + Tasks.md qayta o'qish | ~3-5 min/sessiya |
| **Manual coordination** | Bekzod/Sardor Telegram orqali kelishadi | ~10-15 min/kun |
| **No isolation** | Ikkala dev main branch da ishlaydi | Conflict riski yuqori |
| **Single brain** | Murakkab task uchun 1 agent yetarli emas | Sifat yo'qolishi |
| **No validation pipeline** | QA qo'lda — `tsc && build` dev o'zi qiladi | Bug merge riski |

### 1.3 Hozirgi unumdorlik bahosi

```
╔══════════════════════════════════════════════════════╗
║  HOZIRGI UNUMDORLIK: ~35-40%                        ║
╠══════════════════════════════════════════════════════╣
║  Parallelism:       10%  (1 agent, sequential)       ║
║  Context efficiency: 60%  (qayta yuklash kerak)       ║
║  Coordination:      40%  (manual Telegram)            ║
║  Quality assurance:  50%  (qo'lda tsc/build)          ║
║  Conflict prevention:30%  (main branch direct push)   ║
╚══════════════════════════════════════════════════════╝
```

---

## 2. MAQSAD — MULTI-AGENT MODEL

### 2.1 Arxitektura diagrammasi

```
                    ┌───────────────────────┐
                    │   🎯 ORCHESTRATOR     │
                    │   (Main Claude CLI)    │
                    │                       │
                    │  • Tasks.md parser    │
                    │  • Dependency graph   │
                    │  • Agent dispatcher   │
                    │  • Merge controller   │
                    │  • Progress tracker   │
                    └───────────┬───────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
    ┌───────▼───────┐  ┌───────▼───────┐  ┌───────▼───────┐
    │  BACKEND      │  │  FRONTEND     │  │   QA AGENT    │
    │  AGENT        │  │  AGENT        │  │               │
    │               │  │               │  │  • tsc check  │
    │  • NestJS     │  │  • React      │  │  • build      │
    │  • Prisma     │  │  • Tailwind   │  │  • lint       │
    │  • BullMQ     │  │  • i18n       │  │  • test       │
    │  • Worker     │  │  • Components │  │  • conflict   │
    │               │  │               │  │    detection  │
    │  Worktree: A  │  │  Worktree: B  │  │  Main branch  │
    └───────┬───────┘  └───────┬───────┘  └───────┬───────┘
            │                   │                   │
            └───────────────────┼───────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │     GIT REPOSITORY    │
                    │                       │
                    │  main ← PR merge      │
                    │  agent/backend-xxx    │
                    │  agent/frontend-xxx   │
                    └───────────────────────┘
```

### 2.2 Agent turlari va vazifalari

#### ORCHESTRATOR (Main Session)
```yaml
Turi: Main Claude CLI session
Vazifalari:
  - docs/Tasks.md o'qish va parsing
  - Task dependency graph qurish (DAG)
  - Parallel tasklarni aniqlash
  - Sub-agentlarni ishga tushirish (Agent tool)
  - Natijalarni yig'ish va merge qilish
  - docs/Tasks.md → docs/Done.md ko'chirish
  - Progress monitoring va reporting
  - Conflict resolution
Tools:
  - Agent (subagent dispatch)
  - TaskCreate / TaskUpdate / TaskList
  - Read / Edit (docs fayllar)
  - Bash (git merge, status)
```

#### BACKEND AGENT
```yaml
Turi: Agent tool → subagent_type: "general-purpose"
Isolation: worktree (git worktree)
Kontekst: CLAUDE_BACKEND.md qoidalari
Zona: apps/api/, apps/worker/, apps/bot/, packages/utils/
Vazifalari:
  - NestJS module/service/controller
  - Prisma schema + migration
  - BullMQ processor/job
  - API endpoint yaratish
  - Bug fix (backend)
Qoidalar:
  - apps/web/ ga TEGINMA
  - any type TAQIQLANGAN
  - account_id HAR query da
  - NestJS Logger (console.log EMAS)
  - BigInt → .toString()
```

#### FRONTEND AGENT
```yaml
Turi: Agent tool → subagent_type: "general-purpose"
Isolation: worktree (git worktree)
Kontekst: CLAUDE_FRONTEND.md qoidalari
Zona: apps/web/src/, apps/desktop/
Vazifalari:
  - React component/page
  - Tailwind + DaisyUI styling
  - i18n (uz, ru, en)
  - Hook va state management
  - UX improvement
Qoidalar:
  - apps/api/ ga TEGINMA
  - Max 300 qator per component
  - useI18n + t() mandatory
  - Loading/error state har doim
  - DaisyUI v5 classes (v4 EMAS)
```

#### QA AGENT
```yaml
Turi: Agent tool → subagent_type: "general-purpose"
Isolation: yo'q (main branch tekshiradi)
Vazifalari:
  - tsc --noEmit (api, web, worker, bot)
  - pnpm build (turbo)
  - eslint --quiet
  - pnpm --filter @uzum/utils test
  - Git conflict detection
  - Regression check (build + type safe)
Trigger: Har merge dan OLDIN
```

#### EXPLORER AGENT
```yaml
Turi: Agent tool → subagent_type: "Explore"
Isolation: yo'q (read-only)
Vazifalari:
  - Codebase research
  - File/function topish
  - Architecture analysis
  - Bug root cause topish
  - Dependency analysis
Trigger: Murakkab task boshida
```

#### PLANNER AGENT
```yaml
Turi: Agent tool → subagent_type: "Plan"
Isolation: yo'q (read-only)
Vazifalari:
  - Task decomposition
  - Dependency graph
  - Risk assessment
  - Architecture decision
  - Implementation strategy
Trigger: P0/P1 task yoki multi-file change
```

---

## 3. ALGORITHM — TASK EXECUTION PIPELINE

### 3.1 To'liq workflow

```
QADAM 1: INIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Orchestrator:
    1. Developer identifikatsiya (Bekzod/Sardor)
    2. docs/Tasks.md parsing
    3. Ochiq tasklarni kategoriyalash
    4. MEMORY.md dan kontekst yuklash

QADAM 2: PLANNING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Orchestrator:
    1. Task → DAG (Directed Acyclic Graph) qurish
    2. Dependency aniqlash:
       - T-241 (schema) ← T-269 (data cleanup) — sequential
       - T-276 (uz i18n) || T-277 (ru i18n)    — parallel
       - T-214 (backend) || T-202 (frontend)    — parallel
    3. Critical path topish
    4. Parallel batch aniqlash

QADAM 3: DISPATCH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Orchestrator → Agent tool:
    Batch 1 (parallel):
      ├─ Backend Agent [worktree] → T-241 (Prisma migration)
      ├─ Frontend Agent [worktree] → T-276 (i18n UZ)
      └─ Explorer Agent → T-260 (research: category API)

    Batch 1 tugashi:
      → QA Agent → tsc + build + test

    Batch 2 (parallel, Batch 1 natijasiga bog'liq):
      ├─ Backend Agent [worktree] → T-214 (batch-quick-score)
      └─ Frontend Agent [worktree] → T-277 (i18n RU)

QADAM 4: EXECUTION (per agent)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Sub-agent (worktree ichida):
    1. Task kontekstni o'qish
    2. Tegishli CLAUDE_*.md qoidalarni yuklash
    3. Explorer/Planner agar kerak bo'lsa
    4. Kod yozish / o'zgartirish
    5. O'z ichida tsc --noEmit tekshirish
    6. Natija qaytarish → Orchestrator ga

QADAM 5: VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  QA Agent:
    1. Har worktree dan o'zgarishlarni ko'rish
    2. tsc --noEmit (barcha 4 app)
    3. pnpm build (turbo)
    4. Unit tests
    5. File conflict detection
    6. ✅ PASS → merge ruxsati
       ❌ FAIL → tegishli agent ga qaytarish

QADAM 6: MERGE + ARCHIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Orchestrator:
    1. Worktree branch → main merge
    2. docs/Tasks.md dan o'chirish
    3. docs/Done.md ga yozish
    4. MEMORY.md yangilash (agar kerak)
    5. Keyingi batch ga o'tish
```

### 3.2 Dependency Graph Algorithm

```
FUNCTION buildTaskDAG(tasks: Task[]): DAG {
  // 1. Har task uchun dependencies aniqlash
  for task in tasks:
    task.deps = []

    // Schema o'zgarishi → data migration dan oldin
    if task.type == 'MIGRATION':
      task.deps += tasks.filter(t => t.touchesSchema)

    // Backend endpoint → Frontend component dan oldin
    if task.type == 'FRONTEND' && task.needsApi:
      task.deps += tasks.filter(t => t.type == 'BACKEND' && t.providesApi)

    // packages/* → ikkalasi depend qiladi
    if task.touches('packages/'):
      task.deps += tasks.filter(t => t.touches('packages/') && t.id < task.id)

  // 2. Topological sort
  return topologicalSort(tasks)
}

FUNCTION getParallelBatches(dag: DAG): Batch[] {
  batches = []
  remaining = dag.allTasks()

  while remaining.length > 0:
    // Dependency-free tasklar = parallel batch
    ready = remaining.filter(t => t.deps.every(d => d.completed))

    // Zone conflict prevention
    // Bitta zona da 1 ta agent
    batch = []
    usedZones = Set()
    for task in ready:
      if task.zone not in usedZones:
        batch.push(task)
        usedZones.add(task.zone)

    batches.push(batch)
    remaining -= batch

  return batches
}
```

### 3.3 Zone Conflict Prevention

```
ZONES = {
  'backend':  ['apps/api/', 'apps/worker/', 'apps/bot/'],
  'frontend': ['apps/web/'],
  'shared':   ['packages/types/', 'packages/utils/'],
  'devops':   ['docker-compose*', '.github/', 'Dockerfile*'],
  'docs':     ['docs/', 'CLAUDE*.md'],
}

RULE: Bitta zone da bir vaqtda FAQAT 1 agent ishlaydi.
RULE: 'shared' zone → barcha agentlar KUTADI, faqat biri ishlaydi.
RULE: 'docs' zone → faqat Orchestrator yozadi.

CONFLICT MATRIX:
              Backend  Frontend  Shared  Devops  Docs
  Backend      ❌       ✅        ⚠️       ✅      ❌
  Frontend     ✅       ❌        ⚠️       ✅      ❌
  Shared       ⚠️       ⚠️        ❌       ✅      ❌
  Devops       ✅       ✅        ✅       ❌      ❌

  ✅ = parallel ok    ❌ = conflict    ⚠️ = lock kerak
```

---

## 4. IMPLEMENTATION — Claude Code Tools Mapping

### 4.1 Orchestrator sessiyasi (developer terminal)

```typescript
// QADAM 1: Task parsing
Read('docs/Tasks.md')
Read('docs/Done.md')

// QADAM 2: Planning — Planner agent
Agent({
  subagent_type: 'Plan',
  prompt: `Analyze these open tasks and create execution batches:
    ${openTasks}
    Rules:
    - Backend tasks: apps/api/, apps/worker/, apps/bot/
    - Frontend tasks: apps/web/
    - Never mix zones in one agent
    - Identify parallel opportunities
    Return: ordered batches with dependencies`
})

// QADAM 3: Parallel dispatch
// Batch 1 — independent tasks
Agent({
  subagent_type: 'general-purpose',
  isolation: 'worktree',
  prompt: `You are BACKEND AGENT. Follow CLAUDE_BACKEND.md rules.
    TASK: T-241 — totalAvailableAmount Prisma schema qo'shish
    FILES: apps/api/prisma/schema.prisma, apps/api/src/uzum/
    RULES: any TAQIQLANGAN, account_id mandatory, BigInt→toString()
    After: run tsc --noEmit in apps/api/`,
  run_in_background: true  // parallel
})

Agent({
  subagent_type: 'general-purpose',
  isolation: 'worktree',
  prompt: `You are FRONTEND AGENT. Follow CLAUDE_FRONTEND.md rules.
    TASK: T-276 — UZ i18n faylidagi inglizcha qiymatlarni tarjima qilish
    FILES: apps/web/src/i18n/uz.ts
    RULES: max 300 line components, useI18n + t()
    After: run tsc --noEmit in apps/web/`,
  run_in_background: true  // parallel
})

// QADAM 4: QA validation (foreground, blocking)
Agent({
  subagent_type: 'general-purpose',
  prompt: `You are QA AGENT. Validate all changes:
    1. cd /c/Users/User/Desktop/TrendShopAnalyze
    2. pnpm --filter api exec tsc --noEmit
    3. pnpm --filter web exec tsc --noEmit
    4. pnpm --filter worker exec tsc --noEmit
    5. pnpm build
    6. pnpm --filter @uzum/utils test
    Report: PASS/FAIL with details`
})

// QADAM 5: Merge + Archive
Bash('git merge agent/backend-xxx --no-ff')
Bash('git merge agent/frontend-xxx --no-ff')
Edit('docs/Tasks.md')  // remove completed
Edit('docs/Done.md')   // add completed
```

### 4.2 Agent prompt template

```
AGENT PROMPT TEMPLATE:
━━━━━━━━━━━━━━━━━━━━━
You are {AGENT_TYPE} AGENT for VENTRA Analytics Platform.

## IDENTITY
Role: {Backend | Frontend | QA | DevOps}
Zone: {allowed directories}
Forbidden: {restricted directories}

## CONTEXT
Project: VENTRA — SaaS analytics for uzum.uz marketplace
Stack: {relevant stack}
Rules: {relevant CLAUDE_*.md rules — top 5}

## TASK
ID: T-{XXX}
Priority: P{0-3}
Title: {task title}
Description: {detailed description}
Files to touch: {file list}
Dependencies: {completed prerequisite tasks}

## DELIVERABLES
1. Code changes (edit/create files)
2. Self-validation (tsc --noEmit for your zone)
3. Summary: what changed, why, files modified

## CONSTRAINTS
- DO NOT touch files outside your zone
- DO NOT modify docs/Tasks.md or docs/Done.md
- DO NOT commit — Orchestrator handles commits
- Follow TypeScript strict mode — no `any`
- If blocked, return error description, do not guess
```

---

## 5. COLLABORATION PROTOCOL — Barcha Collaborator lar uchun

### 5.1 Multi-developer sessiya tartibi

```
DEVELOPER SESSION START:
━━━━━━━━━━━━━━━━━━━━━━━

  ┌──────────────────────────────────────────────┐
  │  Claude: "Salom! VENTRA Multi-Agent System"  │
  │                                              │
  │  1. Bekzod (Backend Orchestrator)            │
  │  2. Sardor (Frontend Orchestrator)           │
  │  3. Full-Stack (Both zones)                  │
  │                                              │
  │  Mode:                                       │
  │  A. Single Task (1 agent, oddiy task)        │
  │  B. Multi-Agent (parallel, murakkab sprint)  │
  │  C. Review Only (QA + code review)           │
  └──────────────────────────────────────────────┘

  If Bekzod + Mode B:
    → Load CLAUDE_BACKEND.md
    → Read docs/Tasks.md (backend + shared tasks)
    → Plan batch execution
    → Launch backend agents in worktrees
    → QA validation
    → Merge + archive

  If Sardor + Mode B:
    → Load CLAUDE_FRONTEND.md
    → Read docs/Tasks.md (frontend + shared tasks)
    → Plan batch execution
    → Launch frontend agents in worktrees
    → QA validation
    → Merge + archive

  If Full-Stack + Mode B:
    → Load BOTH CLAUDE_*.md
    → Full task graph from Tasks.md
    → Backend + Frontend agents parallel
    → Cross-zone dependency management
    → QA validation
    → Merge + archive
```

### 5.2 Parallel sessiya — ikkala developer bir vaqtda

```
REAL-WORLD SCENARIO:
━━━━━━━━━━━━━━━━━━━

  Bekzod (Terminal 1)              Sardor (Terminal 2)
  ────────────────────             ────────────────────
  claude → Backend Orch.           claude → Frontend Orch.
    │                                │
    ├─ Agent: T-241 (Prisma)         ├─ Agent: T-276 (i18n UZ)
    ├─ Agent: T-214 (batch API)      ├─ Agent: T-277 (i18n RU)
    │                                ├─ Agent: T-202 (ProductPage UX)
    ├─ QA: tsc api+worker            ├─ QA: tsc web
    │                                │
    ├─ Commit + push                 ├─ Commit + push
    └─ Done.md update                └─ Done.md update

  CONFLICT PREVENTION:
  ✅ Backend ←→ Frontend: parallel (different zones)
  ⚠️ packages/*: LOCK — birinchi kelgan ishlaydi
  ⚠️ docs/*: LOCK — Orchestrator level
```

### 5.3 Shared Package Protocol (yangilangan)

```
packages/types/ yoki packages/utils/ o'zgartirish kerak:

ESKI (manual):
  1. Telegram xabar → 10-15 min kutish
  2. Tasdiqlash olish
  3. O'zgartirish

YANGI (automated lock):
  1. Orchestrator: "packages/types ni o'zgartiraman"
     → .claude/locks/packages-types.lock yaratish
     → {agent: "bekzod-backend", task: "T-241", time: "..."}
  2. Ikkinchi Orchestrator: lock faylni tekshirish
     → Lock mavjud → KUTISH yoki boshqa task
  3. O'zgartirish tugagach → lock o'chirish
  4. Ikkinchi dev: git pull → yangi types

LOCK FILE FORMAT:
  .claude/locks/{zone-name}.lock
  {
    "agent": "bekzod-backend-agent",
    "task": "T-241",
    "files": ["packages/types/src/index.ts"],
    "locked_at": "2026-03-01T10:30:00Z",
    "ttl_minutes": 30
  }
```

---

## 6. TASK CLASSIFICATION MATRIX

### 6.1 Qaysi task qaysi agent ga ketadi

```
CLASSIFICATION RULES:
━━━━━━━━━━━━━━━━━━━━━

Task fayllariga qarab agent tanlanadi:

  apps/api/**          → BACKEND AGENT
  apps/worker/**       → BACKEND AGENT
  apps/bot/**          → BACKEND AGENT
  apps/web/**          → FRONTEND AGENT
  apps/desktop/**      → FRONTEND AGENT
  packages/types/**    → SHARED (lock + either agent)
  packages/utils/**    → SHARED (lock + either agent)
  prisma/schema.prisma → BACKEND AGENT (migration)
  docker-compose*      → DEVOPS (manual/Orchestrator)
  .github/**           → DEVOPS (manual/Orchestrator)
  docs/**              → ORCHESTRATOR ONLY

TASK SIZE → AGENT MODE:
  < 30 min (1-2 fayl)     → Single Agent (no worktree)
  30-60 min (3-5 fayl)    → Single Agent + worktree
  > 60 min (5+ fayl)      → Multi-Agent + worktrees
  Cross-zone (IKKALASI)   → Sequential: Backend → Frontend
```

### 6.2 Hozirgi ochiq tasklarni classification

```
BACKEND AGENTS (5 task, ~3h):
  T-241 | Prisma totalAvailableAmount      | 30min | Single
  T-214 | batch-quick-score endpoint       | 1h    | Single+worktree
  T-239 | Per-user rate limiting           | 30min | Single
  T-150 | naming consultant_id→account_id  | 10min | Single
  T-240 | DTO validatsiya                  | 30min | Single

FRONTEND AGENTS (8 task, ~4h):
  T-202 | ProductPage UX                   | 1h    | Multi
  T-206 | Raqiblar "50ta" + "topilmadi"    | 10min | Single
  T-264 | Admin role redirect              | 30min | Single
  T-266 | Empty state CTA                  | 30min | Single
  T-257 | Granular ErrorBoundary           | —     | Single
  T-276 | UZ i18n tarjima                  | 60min | Single
  T-277 | RU i18n tarjima                  | 30min | Single
  T-278+T-279 | i18n kalitlar fix          | 10min | Single

CROSS-ZONE (3 task, ~6.5h):
  T-237 | Product rasmi (API+UI)           | 2h    | Sequential
  T-260 | Discovery category nomi          | 1.5h  | Sequential
  T-261 | Discovery drawer                 | 3h    | Sequential

DEVOPS (14 task, ~8h):
  T-262 | Railway DB seed                  | 15min | Manual
  T-263 | SUPER_ADMIN user                 | 10min | Manual
  T-280 | EU region migration              | 2h    | Manual
  T-281 | Cloudflare CDN                   | 1.5h  | Manual
  + 10 ta P1/P2 devops tasks

CHROME EXTENSION (26 task, ~41h):
  T-208..T-233 | 9 faza                    | 41h   | Multi-Agent Sprint
```

---

## 7. EXECUTION PLAN — Hozirdan Finish gacha

### 7.1 Sprint rejasi

```
SPRINT 1: Core Fixes (1-2 kun)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Parallel Batch A:
    Backend Agent:  T-241 (Prisma) + T-150 (naming)
    Frontend Agent: T-276 (UZ i18n) + T-277 (RU i18n)
    QA Agent:       Validate

  Parallel Batch B:
    Backend Agent:  T-214 (batch API) + T-239 (rate limit)
    Frontend Agent: T-278+T-279 (i18n fix) + T-206 (UI fix)
    QA Agent:       Validate

  Sequential:
    Backend Agent:  T-240 (DTO)
    Frontend Agent: T-264 (admin redirect) + T-266 (empty state)

  Capacity: ~7h backend + ~4h frontend = 11h
  Multi-agent: ~6-7h real time (40% parallelism gain)

SPRINT 2: Cross-Zone Features (2-3 kun)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  T-237: Product rasmi
    1. Backend Agent: API endpoint + Uzum image URL
    2. Frontend Agent: ProductPage image component

  T-260: Discovery category nomi
    1. Explorer Agent: Uzum category API research
    2. Backend Agent: API endpoint + cache
    3. Frontend Agent: UI component

  T-261: Discovery drawer
    1. Planner Agent: Architecture plan
    2. Backend Agent: Enhanced API response
    3. Frontend Agent: Rich drawer UI

  Capacity: ~6.5h sequential, ~4.5h with agents

SPRINT 3: DevOps Production (1-2 kun)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  T-262, T-263: Railway seed + admin (manual)
  T-280: EU migration (manual, downtime window)
  T-281: Cloudflare CDN (manual)
  + P1/P2 devops tasks

SPRINT 4: Chrome Extension (5-7 kun)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  26 task, 9 faza — MULTI-AGENT INTENSIVE

  Faza 1 (Setup): T-208..T-211
    Agent 1: Manifest V3 + build pipeline
    Agent 2: API client + JWT storage
    QA: Build validation

  Faza 2 (Content Script): T-212..T-213
    Agent 1: Product overlay
    Agent 2: Catalog badge
    QA: Integration test

  Faza 3-9: Har faza 2-3 parallel agent

  Capacity: ~41h sequential, ~25-28h with agents (32% gain)

SPRINT 5: Frontend Polish (2-3 kun)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  T-202, T-257 + UX improvements
  Final QA sweep
  Performance audit
```

### 7.2 Timeline

```
HOZIRGI: 46 ochiq task + 26 Chrome Extension = 72 task
DONE:    340+ task completed

Sequential (eski model):
  Sprint 1: 3 kun
  Sprint 2: 4 kun
  Sprint 3: 3 kun
  Sprint 4: 10 kun
  Sprint 5: 3 kun
  JAMI: ~23 ish kuni (4.5 hafta)

Multi-Agent (yangi model):
  Sprint 1: 1.5 kun  (-50%)
  Sprint 2: 2.5 kun  (-37%)
  Sprint 3: 2 kun    (-33%)
  Sprint 4: 6 kun    (-40%)
  Sprint 5: 1.5 kun  (-50%)
  JAMI: ~13.5 ish kuni (2.7 hafta)

VAQT TEJASH: ~9.5 kun (41% tezroq)
```

---

## 8. UNUMDORLIK METRIKALARI — Oldin vs Keyin

```
╔═══════════════════════════════════════════════════════════════╗
║                  UNUMDORLIK TAQQOSLASHI                       ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  METRIKA              HOZIR (35%)    KEYIN (75%)    O'SISH   ║
║  ──────────────────   ───────────    ──────────     ──────   ║
║  Parallelism          10%            70%            +60%     ║
║  Context efficiency   60%            90%            +30%     ║
║  Coordination         40%            85%            +45%     ║
║  Quality assurance    50%            95%            +45%     ║
║  Conflict prevention  30%            90%            +60%     ║
║  Task throughput      3-4/kun        7-10/kun       +150%    ║
║  Bug escape rate      ~15%           ~3%            -80%     ║
║  Dev time per task    avg 45min      avg 25min      -44%     ║
║                                                               ║
║  OVERALL PRODUCTIVITY:  35-40%  →  70-80%  (+100% yaxshi)   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

TUSHUNTIRISH:
━━━━━━━━━━━━━

Parallelism (10% → 70%):
  Oldin: 1 agent, 1 task, sequential
  Keyin: 2-3 agent parallel, worktree isolation

Context efficiency (60% → 90%):
  Oldin: Har sessiyada CLAUDE.md qayta o'qish, task tanlash
  Keyin: MEMORY.md persistent, agent template automatic

Coordination (40% → 85%):
  Oldin: Manual Telegram, "Sardor, types o'zgartirdim!"
  Keyin: Lock files, zone separation, automated dependency

Quality assurance (50% → 95%):
  Oldin: Dev o'zi tsc qiladi, ba'zan unutadi
  Keyin: QA Agent har merge dan oldin MAJBURIY

Conflict prevention (30% → 90%):
  Oldin: Ikkala dev main branch, merge conflict
  Keyin: Worktree isolation, zone matrix, lock protocol

Task throughput (3-4 → 7-10/kun):
  Oldin: Sequential, 45min avg per task
  Keyin: Parallel batches, 25min avg, QA pipeline
```

---

## 9. CLAUDE CODE CONFIGURATION

### 9.1 CLAUDE.md yangilash (multi-agent qo'shimchalar)

CLAUDE.md ga qo'shiladigan bo'lim:

```markdown
## MULTI-AGENT MODE

### Agent tushirish (developer terminal da)
Developer: "Multi-agent mode, Sprint 1 backend tasks"
Claude:
  1. docs/Tasks.md o'qish
  2. Backend tasklarni filter
  3. Dependency graph
  4. Parallel batch aniqlash
  5. Agent launch (worktree isolation)
  6. QA validation
  7. Merge + archive

### Qoidalar
- Har agent faqat O'Z ZONE sida ishlaydi
- packages/* = LOCK protocol (birinchi kelgan)
- docs/* = FAQAT Orchestrator yozadi
- QA Agent = MAJBURIY har merge dan oldin
- Worktree nomlanishi: agent/{developer}-{task-id}
```

### 9.2 .claude/settings.json (tavsiya)

```jsonc
{
  "permissions": {
    "allow": [
      "Bash(git *)",
      "Bash(pnpm *)",
      "Bash(npx prisma *)",
      "Bash(node *)",
      "Read(*)",
      "Write(docs/*)",
      "Edit(*)",
      "Glob(*)",
      "Grep(*)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(git push --force *)",
      "Bash(git reset --hard *)",
      "Bash(prisma migrate reset *)"
    ]
  }
}
```

### 9.3 Memory fayl tuzilishi

```
.claude/
  projects/
    VENTRA/
      memory/
        MEMORY.md           ← Asosiy kontekst (auto-loaded, 200 line max)
        uzum-api-recon.md   ← Uzum API recon natijalari
        sprint-log.md       ← Sprint progress log (NEW)
        agent-patterns.md   ← Agent da ishlagan/ishlamagan patternlar (NEW)
        lock-history.md     ← Lock conflict tarixi (NEW)
```

---

## 10. MONITORING va REPORTING

### 10.1 Sprint dashboard (har sessiya oxirida)

```
SPRINT 1 PROGRESS:
━━━━━━━━━━━━━━━━━━
  Completed: 8/11 tasks
  Failed:    1 (T-241 — Prisma migration conflict)
  Pending:   2 (T-240, T-257)

  Agents used: 4 (2 backend, 1 frontend, 1 QA)
  Worktrees:   3 created, 3 merged, 0 abandoned
  Conflicts:   1 (packages/types — resolved via lock)
  QA passes:   3/4 (1 retry needed)

  Time:
    Sequential estimate: 11h
    Actual:              6.5h
    Efficiency:          59% time saved

  Quality:
    tsc errors caught: 3
    Build errors caught: 1
    Runtime bugs: 0
```

### 10.2 docs/Tasks.md auto-metrics (header ga qo'shish)

```markdown
# VENTRA — OCHIQ VAZIFALAR
# Yangilangan: 2026-03-01
# Jami: 72 ochiq | 340+ bajarilgan | Sprint: 1/5
# Parallelism: 70% | Throughput: 8 task/kun
```

---

## 11. XAVFLAR va YECHIMLAR

| Xavf | Ehtimollik | Ta'sir | Yechim |
|------|-----------|--------|--------|
| Worktree merge conflict | O'rta | Yuqori | Zone separation + lock protocol |
| Agent hallucination (noto'g'ri kod) | Past | Yuqori | QA Agent mandatory validation |
| packages/* simultaneous edit | Yuqori | Yuqori | Lock file + TTL (30 min) |
| Agent context overflow | O'rta | O'rta | Task scope limit (max 3 fayl) |
| Network/API timeout | Past | Past | Agent retry (max 2) |
| Developer confusion | O'rta | Past | Clear mode selection at start |

---

## 12. XULOSA

```
HOZIR:                          KEYIN:
━━━━━━                          ━━━━━━
1 agent                         3-5 parallel agents
Sequential tasks                Batched parallel execution
Manual coordination             Automated zone locking
No QA pipeline                  QA Agent every merge
Direct main push                Worktree → PR → merge
35-40% efficiency               70-80% efficiency
3-4 tasks/day                   7-10 tasks/day
23 kun to finish                13.5 kun to finish
```

```
ROADMAP:
━━━━━━━━
Phase 1 (Day 1):    Shu arxitektura tasdiqlash
Phase 2 (Day 1-2):  CLAUDE.md + lock protocol qo'shish
Phase 3 (Day 2):    Birinchi multi-agent sprint sinov
Phase 4 (Day 3+):   Full multi-agent workflow
Phase 5 (Ongoing):  Metrics + optimization
```

---

*MULTI_AGENT_ARCHITECTURE.md | VENTRA Analytics Platform | 2026-03-01*
