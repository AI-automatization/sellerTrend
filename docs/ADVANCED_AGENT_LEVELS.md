# VENTRA — Advanced Agent Levels (Level 5-18)
# Hozirgi: Level 4 (Multi-Agent Orchestration) — DONE
# Maqsad: Level 5-18 — Kuchli va Mukammal AI-Driven Development
# Sana: 2026-03-08

---

## UMUMIY KO'RINISH

```
LEVEL XARITASI:
==============================================================================

  Level 1-4:  ASOSIY (sizda DONE)
  ──────────────────────────────────
  L1: Single Prompt         — 1 savol, 1 javob
  L2: Tools + Context       — Read/Edit/Bash + CLAUDE.md
  L3: Sub-Agents            — Explore, Plan, general-purpose
  L4: Multi-Agent Orch.     — Zone-based, worktree, QA, lock protocol

  Level 5-8:  AVTOMATIZATSIYA
  ──────────────────────────────────
  L5: Headless CI/CD        — Claude pipeline ichida, PR auto-review
  L6: Custom MCP Server     — VENTRA-specific tools (deploy, migrate, scrape)
  L7: Event-Driven Loop     — Webhook → Agent → Fix → PR → Deploy
  L8: Multi-Session Coord   — 2+ Claude sessiya, Redis pub/sub sync

  Level 9-12: AVTONOM AGENTLAR
  ──────────────────────────────────
  L9:  Autonomous Task      — Agent o'zi task oladi, PR ochadi
  L10: Full Pipeline        — Alert → Diagnose → Fix → Deploy
  L11: Self-Improving       — Agent o'z CLAUDE.md ni evolyutsiya qildiradi
  L12: Multi-Model Swarm    — Opus/Sonnet/Haiku + cost optimization

  Level 13-15: INTELLEKT
  ──────────────────────────────────
  L13: Auto Sprint          — 15 task → 8 soat → 15 PR, tested
  L14: Production-Aware     — Sentry/Datadog → auto-fix
  L15: Cross-Project KB     — VENTRA pattern → yangi loyihalar

  Level 16-18: EVOLYUTSIYA
  ──────────────────────────────────
  L16: Self-Healing Infra   — Railway/DB/SSL auto-repair
  L17: AI Product Manager   — Analytics → Spec → Implementation
  L18: Codebase Evolution   — Arxitekturani avtonom refactoring

==============================================================================
```

---

# ═══════════════════════════════════════════════════════════
# LEVEL 5: HEADLESS CI/CD INTEGRATION
# ═══════════════════════════════════════════════════════════

## 5.1 Nima?

Claude Code ni **interaktiv terminal** siz, **CI/CD pipeline** ichida ishlatish.
GitHub Actions, Railway build hook, yoki cron job sifatida.

## 5.2 Arxitektura

```
┌─────────────────────────────────────────────────────────────┐
│                    GITHUB ACTIONS PIPELINE                   │
│                                                              │
│  Trigger:                                                    │
│    - PR ochilganda         → auto code review               │
│    - Push to main          → auto test + lint                │
│    - Issue yaratilganda    → auto task analysis              │
│    - Schedule (cron)       → nightly audit                   │
│    - Manual dispatch       → sprint execution                │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  claude -p    │    │  claude -p    │    │  claude -p    │  │
│  │  "review PR"  │    │  "fix lint"   │    │  "run audit"  │  │
│  │  --json       │    │  --json       │    │  --json       │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│  PR Comment         Auto-commit           Issue comment     │
│  (review natijasi)  (lint fix)            (audit report)    │
└─────────────────────────────────────────────────────────────┘
```

## 5.3 GitHub Actions Workflow — PR Auto Review

```yaml
# .github/workflows/claude-review.yml
name: Claude Code Review

on:
  pull_request:
    types: [opened, synchronize]
    branches: [main]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # full history for diff

      - name: Setup Node + pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Install Claude Code
        run: npm install -g @anthropic-ai/claude-code

      - name: Get PR diff
        id: diff
        run: |
          DIFF=$(git diff origin/main...HEAD --stat)
          echo "diff<<EOF" >> $GITHUB_OUTPUT
          echo "$DIFF" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Claude Review
        id: review
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          REVIEW=$(claude -p "
            Sen VENTRA loyihasining QA Agent isan.

            PR DIFF:
            $(git diff origin/main...HEAD)

            QOIDALAR (CLAUDE_BACKEND.md dan):
            1. any type TAQIQLANGAN
            2. account_id har query da bo'lishi SHART
            3. BigInt → .toString() MAJBURIY
            4. console.log TAQIQLANGAN (NestJS Logger)
            5. Max 400 qator per fayl
            6. Inline styles TAQIQLANGAN
            7. Magic numbers TAQIQLANGAN

            TEKSHIR:
            1. TypeScript strict mode buzilganmi?
            2. Security vulnerability bormi? (SQL injection, XSS)
            3. Performance muammo bormi? (N+1 query, memory leak)
            4. VENTRA naming convention buzilganmi?
            5. Test kerakmi lekin yo'qmi?

            FORMAT:
            ## Review Summary
            **Overall:** APPROVE / REQUEST_CHANGES / COMMENT
            **Risk Level:** LOW / MEDIUM / HIGH / CRITICAL

            ### Issues Found
            - [SEVERITY] file:line — description

            ### Suggestions
            - file:line — suggestion

            ### Positive
            - What was done well
          " --output-format text --max-tokens 2000)

          echo "review<<EOF" >> $GITHUB_OUTPUT
          echo "$REVIEW" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Post Review Comment
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `## Claude Code Review\n\n${{ steps.review.outputs.review }}`
            });
```

## 5.4 Nightly Audit Workflow

```yaml
# .github/workflows/claude-nightly-audit.yml
name: Claude Nightly Audit

on:
  schedule:
    - cron: '0 2 * * *'  # Har kuni soat 2:00 UTC
  workflow_dispatch:       # Qo'lda ham trigger qilish mumkin

jobs:
  audit:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - name: Install Claude Code
        run: npm install -g @anthropic-ai/claude-code

      - name: Run Security Audit
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          claude -p "
            VENTRA loyihasini tekshir:

            1. DEPENDENCY AUDIT:
               - pnpm audit natijasini tahlil qil
               - Critical/High vulnerability bormi?

            2. CODE QUALITY:
               - 400+ qatorli fayllar bormi?
               - any type ishlatilganmi?
               - Hardcoded secret bormi?
               - console.log qolganmi?

            3. SECURITY:
               - SQL injection riski
               - XSS riski
               - Missing auth check
               - Exposed env variables

            4. PERFORMANCE:
               - N+1 query pattern
               - Missing index
               - Memory leak pattern
               - Unbounded query (LIMIT yo'q)

            Natijani docs/audit-$(date +%Y%m%d).md ga yoz.
          " --allowedTools Read,Grep,Glob,Bash,Write
```

## 5.5 Issue → Task Auto-Conversion

```yaml
# .github/workflows/claude-issue-triage.yml
name: Claude Issue Triage

on:
  issues:
    types: [opened]

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Triage Issue
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          claude -p "
            GitHub Issue:
            Title: ${{ github.event.issue.title }}
            Body: ${{ github.event.issue.body }}

            1. Bu issue ni docs/Tasks.md formatiga o'gir:
               ### T-XXX | P(0-3) | KATEGORIYA | Sarlavha | Vaqt
            2. Priority aniqlash:
               - Production bug = P0
               - Feature request = P2
               - Enhancement = P3
            3. Qaysi agent zone: BACKEND/FRONTEND/DEVOPS/IKKALASI
            4. Tahminiy vaqt: 15min/30min/1h/2h/4h/8h
            5. Kerakli fayllar ro'yxati

            docs/Tasks.md ga qo'sh (mavjud T-raqamdan keyingi raqam).
          " --allowedTools Read,Edit,Bash
```

## 5.6 VENTRA uchun foyda

```
CI/CD INTEGRATION NATIJALARI:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  PR Review:
    Oldin:  Bekzod qo'lda ko'radi (15-30 min)
    Keyin:  Claude 2-3 min da review + comment
    Tejash: 80% review vaqti

  Nightly Audit:
    Oldin:  Hech kim qilmaydi (vaqt yo'q)
    Keyin:  Har kecha avtomatik (0 odam vaqti)
    Foyda:  Security bug larni erta topish

  Issue Triage:
    Oldin:  Manual Tasks.md ga yozish (5-10 min per issue)
    Keyin:  Avtomatik format + priority + zone (0 min)
    Foyda:  Tezlik + izchillik
```

---

# ═══════════════════════════════════════════════════════════
# LEVEL 6: CUSTOM MCP SERVER — ventra-mcp
# ═══════════════════════════════════════════════════════════

## 6.1 Nima?

O'zingizning **MCP (Model Context Protocol) server** yaratish.
Claude bu server orqali VENTRA-specific operatsiyalarni native tool sifatida ishlatadi.

## 6.2 Arxitektura

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLAUDE CODE SESSION                         │
│                                                                  │
│   Mavjud toollar:                                               │
│     Read, Edit, Bash, Glob, Grep    ← universal                │
│     mcp__pencil__*                   ← design                   │
│     mcp__playwright__*               ← browser                  │
│                                                                  │
│   + YANGI:                                                       │
│     mcp__ventra__deploy_staging      ← Railway deploy           │
│     mcp__ventra__deploy_production   ← Railway deploy (confirm) │
│     mcp__ventra__run_migration       ← Prisma migrate           │
│     mcp__ventra__scrape_product      ← Uzum product fetch       │
│     mcp__ventra__db_query            ← Safe SELECT only         │
│     mcp__ventra__health_check        ← All services status      │
│     mcp__ventra__env_get             ← Safe env read            │
│     mcp__ventra__redis_status        ← Queue/cache stats        │
│     mcp__ventra__user_stats          ← Active users, plans      │
│     mcp__ventra__run_worker_job      ← Trigger BullMQ job       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

                              │
                    stdio / SSE transport
                              │
                              ▼

┌─────────────────────────────────────────────────────────────────┐
│                     VENTRA MCP SERVER                            │
│                   (Node.js + TypeScript)                         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Railway API  │  │  Prisma CLI  │  │  Uzum REST   │          │
│  │  (deploy,     │  │  (migrate,   │  │  (product,   │          │
│  │   logs,       │  │   seed,      │  │   category,  │          │
│  │   status)     │  │   studio)    │  │   search)    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐          │
│  │  Redis       │  │  PostgreSQL  │  │  BullMQ      │          │
│  │  (cache,     │  │  (read-only  │  │  (job status,│          │
│  │   sessions)  │  │   queries)   │  │   trigger)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## 6.3 MCP Server Implementatsiyasi

```
Fayl tuzilishi:
packages/mcp-server/
  package.json
  tsconfig.json
  src/
    index.ts              ← MCP server entry point
    tools/
      deploy.ts           ← Railway deploy tools
      database.ts         ← Prisma/DB tools
      uzum.ts             ← Uzum API tools
      monitoring.ts       ← Health check, metrics
      worker.ts           ← BullMQ job tools
    guards/
      safety.ts           ← Xavfli operatsiyalardan himoya
    types.ts
```

```typescript
// packages/mcp-server/src/index.ts — Asosiy server

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "ventra",
  version: "1.0.0",
  description: "VENTRA Analytics Platform — DevOps & Operations tools",
});

// ─── DEPLOY TOOLS ─────────────────────────────────────────

server.tool(
  "deploy_staging",
  "Deploy VENTRA API/Web/Worker to Railway staging environment",
  {
    service: z.enum(["api", "web", "worker", "bot"]).describe("Qaysi service"),
    commit: z.string().optional().describe("Specific commit SHA (default: HEAD)"),
  },
  async ({ service, commit }) => {
    // Railway CLI orqali deploy
    const cmd = commit
      ? `railway up --service ${service} --environment staging --detach --commit ${commit}`
      : `railway up --service ${service} --environment staging --detach`;

    const result = await execCommand(cmd);

    return {
      content: [{
        type: "text",
        text: `Staging deploy initiated for ${service}\n` +
              `Commit: ${commit || "HEAD"}\n` +
              `Status: ${result.exitCode === 0 ? "STARTED" : "FAILED"}\n` +
              `Output: ${result.stdout}\n` +
              `URL: https://${service}-staging.ventra.uz`,
      }],
    };
  }
);

server.tool(
  "deploy_production",
  "Deploy to production — REQUIRES explicit confirmation",
  {
    service: z.enum(["api", "web", "worker", "bot"]),
    confirm: z.literal("YES_DEPLOY_TO_PRODUCTION")
      .describe("Xavfsizlik uchun aynan shu qiymatni yozing"),
    reason: z.string().describe("Nima uchun deploy kerak"),
  },
  async ({ service, confirm, reason }) => {
    // Double confirmation
    if (confirm !== "YES_DEPLOY_TO_PRODUCTION") {
      return { content: [{ type: "text", text: "BLOCKED: Confirmation string noto'g'ri" }] };
    }

    // Pre-deploy checks
    const healthCheck = await checkServiceHealth(service);
    if (!healthCheck.ok) {
      return { content: [{ type: "text", text: `BLOCKED: ${service} health check failed: ${healthCheck.error}` }] };
    }

    const result = await execCommand(
      `railway up --service ${service} --environment production --detach`
    );

    // Log the deployment
    await logDeployment({ service, reason, timestamp: new Date().toISOString() });

    return {
      content: [{
        type: "text",
        text: `PRODUCTION deploy for ${service}\n` +
              `Reason: ${reason}\n` +
              `Status: ${result.exitCode === 0 ? "DEPLOYING" : "FAILED"}\n` +
              `Monitor: https://railway.app/project/ventra`,
      }],
    };
  }
);

// ─── DATABASE TOOLS ───────────────────────────────────────

server.tool(
  "db_query",
  "Execute READ-ONLY SQL query against VENTRA database (SELECT only)",
  {
    query: z.string().describe("SQL SELECT query"),
    environment: z.enum(["local", "staging"]).default("local"),
    limit: z.number().max(100).default(20).describe("Max rows returned"),
  },
  async ({ query, environment, limit }) => {
    // SAFETY: Faqat SELECT
    const normalized = query.trim().toUpperCase();
    if (!normalized.startsWith("SELECT")) {
      return { content: [{ type: "text", text: "BLOCKED: Faqat SELECT query ruxsat etilgan" }] };
    }

    // Xavfli so'zlar tekshirish
    const dangerous = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE", "GRANT"];
    for (const word of dangerous) {
      if (normalized.includes(word)) {
        return { content: [{ type: "text", text: `BLOCKED: '${word}' so'zi taqiqlangan` }] };
      }
    }

    // LIMIT qo'shish (agar yo'q bo'lsa)
    const finalQuery = normalized.includes("LIMIT")
      ? query
      : `${query} LIMIT ${limit}`;

    const result = await executeReadOnlyQuery(finalQuery, environment);

    return {
      content: [{
        type: "text",
        text: `Query: ${finalQuery}\n` +
              `Rows: ${result.rows.length}\n` +
              `Data:\n${JSON.stringify(result.rows, null, 2)}`,
      }],
    };
  }
);

server.tool(
  "run_migration",
  "Run Prisma migration (dev or deploy mode)",
  {
    name: z.string().describe("Migration nomi (e.g., 'add-weekly-bought')"),
    mode: z.enum(["dev", "deploy"]).describe("dev = local, deploy = staging/prod"),
    environment: z.enum(["local", "staging"]).default("local"),
  },
  async ({ name, mode, environment }) => {
    if (environment === "staging" && mode === "dev") {
      return { content: [{ type: "text", text: "BLOCKED: staging da faqat 'deploy' mode" }] };
    }

    const cmd = mode === "dev"
      ? `cd apps/api && npx prisma migrate dev --name ${name}`
      : `cd apps/api && npx prisma migrate deploy`;

    const result = await execCommand(cmd);

    return {
      content: [{
        type: "text",
        text: `Migration: ${name}\n` +
              `Mode: ${mode}\n` +
              `Env: ${environment}\n` +
              `Status: ${result.exitCode === 0 ? "SUCCESS" : "FAILED"}\n` +
              `Output: ${result.stdout}`,
      }],
    };
  }
);

// ─── UZUM API TOOLS ───────────────────────────────────────

server.tool(
  "scrape_product",
  "Fetch product details from Uzum REST API",
  {
    productId: z.number().describe("Uzum product ID"),
    fields: z.array(z.enum([
      "title", "price", "orders", "reviews", "stock",
      "seller", "category", "images", "weekly_bought"
    ])).optional().describe("Specific fields to return"),
  },
  async ({ productId, fields }) => {
    const response = await fetch(
      `https://api.uzum.uz/api/v2/product/${productId}`,
      { headers: { "User-Agent": "VENTRA-MCP/1.0" } }
    );

    if (!response.ok) {
      return { content: [{ type: "text", text: `Uzum API error: ${response.status}` }] };
    }

    const data = (await response.json()) as any;
    const product = data?.payload?.data;

    if (!product) {
      return { content: [{ type: "text", text: `Product ${productId} topilmadi` }] };
    }

    const result = {
      id: productId,
      title: product.title || product.localizableTitle?.ru,
      price: product.productPrice,
      orders: product.ordersAmount,
      reviews: product.reviewsAmount,
      rating: product.rating,
      seller: product.seller?.title,
      category: product.category?.title,
      totalStock: product.totalAvailableAmount,
      images: product.photos?.map((p: any) => p.photo?.["720"] || p.photo?.["800"]),
    };

    // Filter fields agar so'ralgan bo'lsa
    const filtered = fields
      ? Object.fromEntries(Object.entries(result).filter(([k]) => fields.includes(k as any)))
      : result;

    return {
      content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }],
    };
  }
);

// ─── MONITORING TOOLS ─────────────────────────────────────

server.tool(
  "health_check",
  "Check health of all VENTRA services",
  {
    services: z.array(z.enum(["api", "web", "worker", "bot", "postgres", "redis"]))
      .optional()
      .describe("Specific services (default: all)"),
  },
  async ({ services }) => {
    const targets = services || ["api", "web", "worker", "bot", "postgres", "redis"];
    const results: Record<string, any> = {};

    for (const svc of targets) {
      try {
        switch (svc) {
          case "api":
            const apiRes = await fetch("http://localhost:3000/health", { signal: AbortSignal.timeout(5000) });
            results.api = { status: apiRes.ok ? "UP" : "DOWN", code: apiRes.status };
            break;
          case "web":
            const webRes = await fetch("http://localhost:5173", { signal: AbortSignal.timeout(5000) });
            results.web = { status: webRes.ok ? "UP" : "DOWN", code: webRes.status };
            break;
          case "postgres":
            const pgResult = await execCommand("pg_isready -h localhost -p 5432");
            results.postgres = { status: pgResult.exitCode === 0 ? "UP" : "DOWN" };
            break;
          case "redis":
            const redisResult = await execCommand("redis-cli ping");
            results.redis = { status: redisResult.stdout.trim() === "PONG" ? "UP" : "DOWN" };
            break;
          default:
            results[svc] = { status: "UNKNOWN" };
        }
      } catch (err: any) {
        results[svc] = { status: "DOWN", error: err.message };
      }
    }

    const allUp = Object.values(results).every((r: any) => r.status === "UP");

    return {
      content: [{
        type: "text",
        text: `VENTRA Health Check\n` +
              `Overall: ${allUp ? "ALL UP" : "DEGRADED"}\n\n` +
              Object.entries(results)
                .map(([svc, r]: [string, any]) => `  ${r.status === "UP" ? "[OK]" : "[!!]"} ${svc}: ${r.status}`)
                .join("\n"),
      }],
    };
  }
);

// ─── WORKER TOOLS ─────────────────────────────────────────

server.tool(
  "run_worker_job",
  "Trigger a BullMQ job manually",
  {
    queue: z.enum([
      "import-queue", "discovery-queue", "sourcing-queue",
      "competitor-queue", "weekly-scrape-queue", "billing-queue",
      "alert-delivery-queue"
    ]),
    data: z.record(z.any()).describe("Job payload"),
    priority: z.number().min(1).max(10).default(5),
  },
  async ({ queue, data, priority }) => {
    // Redis orqali job qo'shish
    const jobId = `manual-${Date.now()}`;
    const result = await execCommand(
      `redis-cli XADD bull:${queue}:waiting '*' ` +
      `id ${jobId} data '${JSON.stringify(data)}' priority ${priority}`
    );

    return {
      content: [{
        type: "text",
        text: `Job triggered\n` +
              `Queue: ${queue}\n` +
              `ID: ${jobId}\n` +
              `Priority: ${priority}\n` +
              `Data: ${JSON.stringify(data)}`,
      }],
    };
  }
);

// ─── SERVER START ─────────────────────────────────────────

const transport = new StdioServerTransport();
server.connect(transport);
```

## 6.4 Claude Code ga ulash

```jsonc
// .claude/mcp.json
{
  "mcpServers": {
    "ventra": {
      "type": "stdio",
      "command": "node",
      "args": ["packages/mcp-server/dist/index.js"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}",
        "REDIS_URL": "${REDIS_URL}",
        "RAILWAY_TOKEN": "${RAILWAY_TOKEN}"
      }
    }
  }
}
```

## 6.5 Ishlatish misollari

```
Developer: "API staging ga deploy qil"
Claude:    mcp__ventra__deploy_staging(service: "api")
           → "Staging deploy initiated for api, Status: STARTED"

Developer: "Products jadvalidagi eng ko'p buyurtma olgan 10 ta mahsulot"
Claude:    mcp__ventra__db_query(query: "SELECT title, orders_amount FROM products
           ORDER BY orders_amount DESC", limit: 10)
           → Jadval ko'rinishida natija

Developer: "Uzum dagi 12345 raqamli mahsulotni ko'r"
Claude:    mcp__ventra__scrape_product(productId: 12345)
           → {title, price, orders, stock, ...}

Developer: "Barcha servislar ishlaydimi?"
Claude:    mcp__ventra__health_check()
           → [OK] api: UP, [OK] web: UP, [!!] redis: DOWN ...

Developer: "Weekly scrape ni qo'lda ishga tushir, product 12345"
Claude:    mcp__ventra__run_worker_job(queue: "weekly-scrape-queue",
           data: {productId: 12345, mode: "single"})
```

## 6.6 Xavfsizlik himoyalari

```
SAFETY RULES (MCP server ichida):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. db_query:
   - Faqat SELECT ruxsat
   - DROP/DELETE/UPDATE/INSERT/ALTER/TRUNCATE bloklangan
   - Max 100 rows
   - Timeout: 10 sekund
   - staging/local faqat (production DB ga to'g'ridan access YO'Q)

2. deploy_production:
   - Explicit confirmation string: "YES_DEPLOY_TO_PRODUCTION"
   - Pre-deploy health check MAJBURIY
   - Deploy log yoziladi (kim, qachon, nima uchun)

3. run_migration:
   - staging da faqat "deploy" mode (dev mode bloklangan)
   - Migration nomi validatsiya (alphanumeric + dash)

4. run_worker_job:
   - Faqat ro'yxatdagi queue lar
   - Max 1 job per call (bulk TAQIQLANGAN)
   - Rate limit: 10 job per minute

5. UMUMIY:
   - Har tool call log ga yoziladi
   - Production operatsiyalar double confirmation
   - Timeout: har tool 30 sekund max
```

---

# ═══════════════════════════════════════════════════════════
# LEVEL 7: EVENT-DRIVEN AGENT LOOP
# ═══════════════════════════════════════════════════════════

## 7.1 Nima?

Tashqi **event** (webhook, alert, cron) Claude ni avtomatik trigger qiladi.
Odam aralashmasdan: event → diagnose → fix → PR → deploy.

## 7.2 Arxitektura

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        EVENT-DRIVEN AGENT SYSTEM                         │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   GitHub     │  │   Sentry    │  │   Railway   │  │   Cron      │   │
│  │  Webhook     │  │  Webhook    │  │  Webhook    │  │  Schedule   │   │
│  │             │  │             │  │             │  │             │   │
│  │  • PR open  │  │  • Error    │  │  • Deploy   │  │  • Nightly  │   │
│  │  • Issue    │  │    spike    │  │    fail     │  │    audit    │   │
│  │  • Push     │  │  • New      │  │  • Health   │  │  • Weekly   │   │
│  │  • Comment  │  │    issue    │  │    check    │  │    report   │   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
│         │                │                │                │           │
│         └────────────────┼────────────────┼────────────────┘           │
│                          │                │                            │
│                          ▼                ▼                            │
│                  ┌───────────────────────────────┐                     │
│                  │      EVENT ROUTER             │                     │
│                  │   (Express/Fastify webhook    │                     │
│                  │    receiver + job queue)       │                     │
│                  │                               │                     │
│                  │  event → classify → priority  │                     │
│                  │  → agent prompt → dispatch    │                     │
│                  └──────────────┬────────────────┘                     │
│                                │                                      │
│                    ┌───────────┼───────────┐                          │
│                    │           │           │                          │
│              ┌─────▼─────┐ ┌──▼──────┐ ┌──▼──────┐                  │
│              │ Fix Agent │ │ Review  │ │ Report  │                  │
│              │           │ │ Agent   │ │ Agent   │                  │
│              │ code fix  │ │ PR rev  │ │ summary │                  │
│              │ + test    │ │ + cmnt  │ │ + alert │                  │
│              │ + PR      │ │         │ │         │                  │
│              └─────┬─────┘ └────┬────┘ └────┬────┘                  │
│                    │            │            │                        │
│                    └────────────┼────────────┘                        │
│                                │                                      │
│                    ┌───────────▼───────────┐                          │
│                    │    OUTPUT ROUTER      │                          │
│                    │                       │                          │
│                    │  • GitHub PR/Comment  │                          │
│                    │  • Telegram message   │                          │
│                    │  • Slack notification │                          │
│                    │  • Railway deploy     │                          │
│                    │  • docs/ update       │                          │
│                    └───────────────────────┘                          │
└──────────────────────────────────────────────────────────────────────┘
```

## 7.3 Event Router Implementation

```typescript
// packages/event-router/src/index.ts

import Fastify from "fastify";
import { execSync } from "child_process";

const app = Fastify({ logger: true });

// ─── EVENT CLASSIFICATION ─────────────────────────────────

interface AgentEvent {
  source: "github" | "sentry" | "railway" | "cron";
  type: string;
  priority: "P0" | "P1" | "P2" | "P3";
  data: Record<string, any>;
}

function classifyEvent(source: string, payload: any): AgentEvent {
  // GitHub events
  if (source === "github") {
    if (payload.action === "opened" && payload.pull_request) {
      return { source: "github", type: "pr_opened", priority: "P2", data: payload };
    }
    if (payload.action === "opened" && payload.issue) {
      const isUrgent = payload.issue.labels?.some((l: any) =>
        ["bug", "critical", "P0"].includes(l.name));
      return {
        source: "github",
        type: "issue_opened",
        priority: isUrgent ? "P0" : "P2",
        data: payload,
      };
    }
  }

  // Sentry events
  if (source === "sentry") {
    const level = payload.level || "error";
    const isNew = payload.action === "created";
    return {
      source: "sentry",
      type: "error_alert",
      priority: level === "fatal" ? "P0" : isNew ? "P1" : "P2",
      data: payload,
    };
  }

  // Railway events
  if (source === "railway") {
    if (payload.type === "DEPLOY_FAILED") {
      return { source: "railway", type: "deploy_failed", priority: "P0", data: payload };
    }
    if (payload.type === "HEALTH_CHECK_FAILED") {
      return { source: "railway", type: "health_failed", priority: "P0", data: payload };
    }
  }

  return { source: source as any, type: "unknown", priority: "P3", data: payload };
}

// ─── AGENT DISPATCH ───────────────────────────────────────

async function dispatchToAgent(event: AgentEvent): Promise<string> {
  const promptMap: Record<string, (e: AgentEvent) => string> = {

    // Sentry error → diagnose + fix
    error_alert: (e) => `
      VENTRA PRODUCTION ERROR — AUTO-FIX MODE

      ERROR DETAILS:
      Title: ${e.data.event?.title || e.data.message}
      Level: ${e.data.level}
      URL: ${e.data.url}
      Stack trace:
      ${e.data.event?.exception?.values?.[0]?.stacktrace?.frames
        ?.slice(-5)
        .map((f: any) => `  ${f.filename}:${f.lineno} in ${f.function}`)
        .join("\n") || "N/A"}

      INSTRUCTIONS:
      1. Stack trace dagi fayl va qatorni top
      2. Root cause aniqlash
      3. Fix yozish (minimal, faqat bug fix)
      4. tsc --noEmit tekshir
      5. Git branch: hotfix/sentry-${Date.now()}
      6. Commit: "fix: [module] — [qisqa tavsif]"

      CONSTRAINTS:
      - Faqat bug fix, refactoring EMAS
      - Test buzmaslik (mavjud testlar o'tishi kerak)
      - any type TAQIQLANGAN
    `,

    // Deploy failed → diagnose + retry
    deploy_failed: (e) => `
      RAILWAY DEPLOY FAILED — AUTO-RECOVERY

      SERVICE: ${e.data.service}
      ERROR: ${e.data.error || "unknown"}
      BUILD LOG: ${e.data.buildLog?.slice(-500) || "N/A"}

      INSTRUCTIONS:
      1. Build log dagi error ni tahlil qil
      2. Agar dependency issue → package.json tuzat
      3. Agar TypeScript error → kod tuzat
      4. Agar Dockerfile issue → Dockerfile tuzat
      5. Fix commit qil
      6. Railway redeploy trigger qil (mcp__ventra__deploy_staging)
    `,

    // PR opened → auto review
    pr_opened: (e) => `
      PR AUTO-REVIEW

      PR #${e.data.pull_request.number}: ${e.data.pull_request.title}
      Author: ${e.data.pull_request.user.login}
      Files changed: ${e.data.pull_request.changed_files}

      INSTRUCTIONS:
      1. PR diff ni o'qi
      2. CLAUDE_BACKEND.md / CLAUDE_FRONTEND.md qoidalarini tekshir
      3. Security, performance, code quality review
      4. PR ga comment yoz
    `,

    // GitHub issue → auto-triage + optional fix
    issue_opened: (e) => `
      ISSUE AUTO-TRIAGE

      Issue #${e.data.issue.number}: ${e.data.issue.title}
      Body: ${e.data.issue.body?.slice(0, 500)}
      Labels: ${e.data.issue.labels?.map((l: any) => l.name).join(", ")}

      INSTRUCTIONS:
      1. Issue ni tahlil qil
      2. docs/Tasks.md ga task qo'sh (to'g'ri format)
      3. Priority aniqlash (P0-P3)
      4. Agent zone aniqlash (BACKEND/FRONTEND/DEVOPS)
      5. Agar oddiy bug va P0/P1 → avtomatik fix yozish
      6. PR ochish (agar fix yozilgan bo'lsa)
    `,
  };

  const promptFn = promptMap[event.type];
  if (!promptFn) {
    return `Unknown event type: ${event.type}`;
  }

  const prompt = promptFn(event);

  // Claude Code headless mode
  const result = execSync(
    `claude -p "${prompt.replace(/"/g, '\\"')}" ` +
    `--allowedTools Read,Edit,Grep,Glob,Bash,Write ` +
    `--output-format json ` +
    `--max-turns 20`,
    {
      cwd: "/path/to/TrendShopAnalyze",
      timeout: 300_000, // 5 min max
      encoding: "utf-8",
    }
  );

  return result;
}

// ─── WEBHOOK ENDPOINTS ────────────────────────────────────

app.post("/webhook/github", async (req, reply) => {
  const event = classifyEvent("github", req.body);
  app.log.info({ event: event.type, priority: event.priority }, "GitHub event received");

  if (event.priority === "P0" || event.priority === "P1") {
    // P0/P1 — darhol dispatch
    const result = await dispatchToAgent(event);
    return { status: "dispatched", result };
  } else {
    // P2/P3 — queue ga qo'shish (keyinroq)
    await addToQueue(event);
    return { status: "queued" };
  }
});

app.post("/webhook/sentry", async (req, reply) => {
  const event = classifyEvent("sentry", req.body);
  app.log.info({ event: event.type, priority: event.priority }, "Sentry event received");

  // Sentry → har doim dispatch (production error)
  const result = await dispatchToAgent(event);
  return { status: "dispatched", result };
});

app.post("/webhook/railway", async (req, reply) => {
  const event = classifyEvent("railway", req.body);
  app.log.info({ event: event.type, priority: event.priority }, "Railway event received");

  if (event.type === "deploy_failed" || event.type === "health_failed") {
    const result = await dispatchToAgent(event);
    return { status: "dispatched", result };
  }
  return { status: "ignored" };
});

// Start server
app.listen({ port: 4000, host: "0.0.0.0" });
```

## 7.4 Telegram Integration (Bekzod ga xabar)

```typescript
// Event natijasini Telegram ga yuborish

async function notifyDeveloper(event: AgentEvent, agentResult: string) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const BEKZOD_CHAT_ID = process.env.BEKZOD_TELEGRAM_ID;

  const emoji = {
    P0: "🔴", P1: "🟠", P2: "🟡", P3: "🟢"
  }[event.priority];

  const message = `
${emoji} *VENTRA Agent Alert*

*Source:* ${event.source}
*Type:* ${event.type}
*Priority:* ${event.priority}

*Agent Result:*
${agentResult.slice(0, 500)}

${agentResult.includes("PR #") ? "✅ PR ochildi — review kerak" : ""}
${agentResult.includes("FAILED") ? "❌ Agent tuzatolmadi — qo'lda ko'rish kerak" : ""}
  `.trim();

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: BEKZOD_CHAT_ID,
      text: message,
      parse_mode: "Markdown",
    }),
  });
}
```

---

# ═══════════════════════════════════════════════════════════
# LEVEL 8: MULTI-SESSION COORDINATION
# ═══════════════════════════════════════════════════════════

## 8.1 Nima?

Bekzod va Sardor **bir vaqtda** Claude sessiya ochsa, ular **fayl yoki Redis** orqali
real-time sinxronizatsiya qiladi. Hech qanday conflict yo'q.

## 8.2 Arxitektura

```
┌─────────────────────────┐        ┌─────────────────────────┐
│  BEKZOD SESSION          │        │  SARDOR SESSION          │
│  (Terminal 1)            │        │  (Terminal 2)            │
│                          │        │                          │
│  Claude Orchestrator     │        │  Claude Orchestrator     │
│    ├─ Backend Agent      │        │    ├─ Landing Agent      │
│    ├─ Web Agent          │        │    ├─ Desktop Agent      │
│    └─ QA Agent           │        │    └─ QA Agent           │
│                          │        │                          │
└────────────┬─────────────┘        └────────────┬─────────────┘
             │                                   │
             └──────────────┬────────────────────┘
                            │
              ┌─────────────▼─────────────┐
              │     COORDINATION LAYER     │
              │                            │
              │  Option A: File-based      │
              │    .claude/locks/*.lock    │
              │    .claude/state.json      │
              │                            │
              │  Option B: Redis-based     │
              │    ventra:locks:*          │
              │    ventra:sessions:*       │
              │    ventra:events (pub/sub) │
              └────────────────────────────┘
```

## 8.3 Redis-based Real-time Coordination

```typescript
// packages/agent-coordinator/src/index.ts

import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);
const sub = new Redis(process.env.REDIS_URL);

const LOCK_PREFIX = "ventra:lock:";
const SESSION_PREFIX = "ventra:session:";
const EVENT_CHANNEL = "ventra:agent-events";

// ─── SESSION MANAGEMENT ──────────────────────────────────

interface SessionInfo {
  developer: "Bekzod" | "Sardor";
  startedAt: string;
  mode: "single" | "multi-agent";
  activeTasks: string[];      // ["T-375", "T-380"]
  activeZones: string[];      // ["backend", "web"]
  agentCount: number;
}

async function registerSession(info: SessionInfo): Promise<string> {
  const sessionId = `${info.developer.toLowerCase()}-${Date.now()}`;
  await redis.setex(
    `${SESSION_PREFIX}${sessionId}`,
    3600, // 1 soat TTL
    JSON.stringify(info)
  );

  // Boshqa sessiyaga xabar berish
  await redis.publish(EVENT_CHANNEL, JSON.stringify({
    type: "session_started",
    sessionId,
    developer: info.developer,
    zones: info.activeZones,
  }));

  return sessionId;
}

async function getActiveSessions(): Promise<Record<string, SessionInfo>> {
  const keys = await redis.keys(`${SESSION_PREFIX}*`);
  const sessions: Record<string, SessionInfo> = {};

  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      sessions[key.replace(SESSION_PREFIX, "")] = JSON.parse(data);
    }
  }

  return sessions;
}

// ─── DISTRIBUTED LOCKING ─────────────────────────────────

interface LockInfo {
  sessionId: string;
  developer: string;
  task: string;
  zone: string;
  lockedAt: string;
  ttlMinutes: number;
}

async function acquireLock(
  zone: string,
  sessionId: string,
  developer: string,
  task: string,
  ttlMinutes: number = 30
): Promise<{ acquired: boolean; holder?: LockInfo }> {
  const lockKey = `${LOCK_PREFIX}${zone}`;

  // Atomic SET NX (faqat yo'q bo'lsa set qiladi)
  const lockInfo: LockInfo = {
    sessionId,
    developer,
    task,
    zone,
    lockedAt: new Date().toISOString(),
    ttlMinutes,
  };

  const result = await redis.set(
    lockKey,
    JSON.stringify(lockInfo),
    "EX", ttlMinutes * 60,
    "NX" // Faqat key mavjud bo'lmaganda
  );

  if (result === "OK") {
    // Lock olinadi — boshqa sessiyaga xabar
    await redis.publish(EVENT_CHANNEL, JSON.stringify({
      type: "lock_acquired",
      zone,
      developer,
      task,
    }));
    return { acquired: true };
  }

  // Lock allaqachon bor — kim ushlab turibdi?
  const existing = await redis.get(lockKey);
  return {
    acquired: false,
    holder: existing ? JSON.parse(existing) : undefined,
  };
}

async function releaseLock(zone: string, sessionId: string): Promise<boolean> {
  const lockKey = `${LOCK_PREFIX}${zone}`;
  const existing = await redis.get(lockKey);

  if (!existing) return true; // allaqachon bo'sh

  const info: LockInfo = JSON.parse(existing);
  if (info.sessionId !== sessionId) {
    return false; // boshqa sessiyaning lock i — tegib bo'lmaydi
  }

  await redis.del(lockKey);

  await redis.publish(EVENT_CHANNEL, JSON.stringify({
    type: "lock_released",
    zone: info.zone,
    developer: info.developer,
  }));

  return true;
}

// ─── EVENT SUBSCRIPTION ──────────────────────────────────

sub.subscribe(EVENT_CHANNEL);
sub.on("message", (channel, message) => {
  const event = JSON.parse(message);

  switch (event.type) {
    case "session_started":
      console.log(`[COORD] ${event.developer} yangi sessiya boshladi. Zones: ${event.zones}`);
      // Conflict check
      break;

    case "lock_acquired":
      console.log(`[COORD] ${event.developer} ${event.zone} ni lock qildi (${event.task})`);
      break;

    case "lock_released":
      console.log(`[COORD] ${event.developer} ${event.zone} lock ni bo'shatdi`);
      break;

    case "task_completed":
      console.log(`[COORD] ${event.developer} ${event.task} ni tugatdi`);
      break;

    case "conflict_warning":
      console.log(`[COORD] OGOHLANTIRISH: ${event.message}`);
      break;
  }
});

// ─── PRE-TASK CHECK (Claude Agent ishlatadi) ─────────────

async function preTaskCheck(
  developer: string,
  task: string,
  zones: string[]
): Promise<{
  canProceed: boolean;
  blockers: string[];
  warnings: string[];
}> {
  const blockers: string[] = [];
  const warnings: string[] = [];

  // 1. Boshqa sessiyalar tekshir
  const sessions = await getActiveSessions();
  for (const [id, session] of Object.entries(sessions)) {
    if (session.developer === developer) continue;

    // Zone kesishuvi bormi?
    const overlap = zones.filter(z => session.activeZones.includes(z));
    if (overlap.length > 0) {
      warnings.push(
        `${session.developer} hozir ${overlap.join(", ")} zone da ishlayapti. ` +
        `Ehtiyot bo'ling.`
      );
    }
  }

  // 2. Lock tekshir
  for (const zone of zones) {
    const lockKey = `${LOCK_PREFIX}${zone}`;
    const existing = await redis.get(lockKey);
    if (existing) {
      const info: LockInfo = JSON.parse(existing);
      if (info.developer !== developer) {
        blockers.push(
          `${zone} zone LOCKED by ${info.developer} (${info.task}). ` +
          `Lock expires in ${info.ttlMinutes} min.`
        );
      }
    }
  }

  // 3. Git status tekshir
  // (uncommitted changes in zone files)

  return {
    canProceed: blockers.length === 0,
    blockers,
    warnings,
  };
}
```

---

# ═══════════════════════════════════════════════════════════
# LEVEL 9: AUTONOMOUS TASK EXECUTION
# ═══════════════════════════════════════════════════════════

## 9.1 Nima?

Claude **o'zi** `docs/Tasks.md` dan task oladi, o'zi branch ochadi,
kod yozadi, test qiladi, PR ochadi. Odam faqat **PR approve** da.

## 9.2 Arxitektura

```
┌──────────────────────────────────────────────────────────────────┐
│                   AUTONOMOUS AGENT LOOP                          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  1. TASK SELECTION                                        │   │
│  │     Read docs/Tasks.md                                    │   │
│  │     → Filter: faqat pending[] bo'lmagan, o'z zone si     │   │
│  │     → Sort: P0 > P1 > P2 > P3, keyin vaqt (qisqa birinchi)│  │
│  │     → Select: eng yuqori priority, eng qisqa              │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────▼───────────────────────────────┐   │
│  │  2. CLAIM + BRANCH                                        │   │
│  │     Tasks.md: pending[Claude-Auto] yozish                 │   │
│  │     git checkout -b auto/T-XXX-short-description          │   │
│  │     git push -u origin auto/T-XXX-short-description       │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────▼───────────────────────────────┐   │
│  │  3. RESEARCH (agar kerak)                                 │   │
│  │     Explorer Agent → codebase tahlil                      │   │
│  │     Planner Agent → implementation plan                   │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────▼───────────────────────────────┐   │
│  │  4. IMPLEMENTATION                                        │   │
│  │     Code Agent (worktree) → kod yozish                    │   │
│  │     Self-test: tsc --noEmit + build                       │   │
│  │     Agar fail → retry (max 3)                             │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────▼───────────────────────────────┐   │
│  │  5. QA VALIDATION                                         │   │
│  │     QA Agent → full validation pipeline                   │   │
│  │     tsc (all apps) + build + test                         │   │
│  │     Agar fail → Implementation ga qaytarish               │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────▼───────────────────────────────┐   │
│  │  6. PR CREATION                                           │   │
│  │     git push                                              │   │
│  │     GitHub API → PR ochish:                               │   │
│  │       Title: "fix(module): T-XXX — description"           │   │
│  │       Body: ## Changes\n- file1: what changed\n           │   │
│  │             ## Testing\n- tsc PASS\n- build PASS\n        │   │
│  │             ## Task\nCloses T-XXX                         │   │
│  │     Label: auto-generated, needs-review                   │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────▼───────────────────────────────┐   │
│  │  7. NOTIFY + ARCHIVE                                      │   │
│  │     Telegram → Bekzod ga xabar: "T-XXX PR tayyor"        │   │
│  │     Tasks.md → Done.md (faqat PR merge bo'lgach)          │   │
│  │     Loop → Keyingi task ga o'tish                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  LOOP: 7-qadamni task qolmaguncha takrorlash                   │
└──────────────────────────────────────────────────────────────────┘
```

## 9.3 Autonomous Runner Script

```typescript
// scripts/autonomous-agent.ts
// Ishga tushirish: npx tsx scripts/autonomous-agent.ts --developer=Bekzod --max-tasks=5

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";

interface ParsedTask {
  id: string;        // "T-375"
  priority: number;  // 0, 1, 2, 3
  category: string;  // "BACKEND", "FRONTEND"
  title: string;
  time: string;      // "30min", "1h"
  status: string;    // "" | "pending[Bekzod]"
  description: string;
  files: string[];
}

// ─── CONFIG ───────────────────────────────────────────────

const CONFIG = {
  developer: process.argv.find(a => a.startsWith("--developer="))?.split("=")[1] || "Bekzod",
  maxTasks: parseInt(process.argv.find(a => a.startsWith("--max-tasks="))?.split("=")[1] || "5"),
  maxRetries: 3,
  maxMinutesPerTask: 30,
  zones: {
    Bekzod: ["BACKEND", "FRONTEND", "DEVOPS"],
    Sardor: ["FRONTEND"],  // faqat landing/desktop
  } as Record<string, string[]>,
  allowedZoneFiles: {
    Bekzod: ["apps/api/", "apps/worker/", "apps/bot/", "apps/web/", "apps/extension/"],
    Sardor: ["apps/landing/", "apps/desktop/"],
  } as Record<string, string[]>,
};

// ─── TASK PARSER ──────────────────────────────────────────

function parseTasks(content: string): ParsedTask[] {
  const tasks: ParsedTask[] = [];
  const lines = content.split("\n");

  let currentTask: Partial<ParsedTask> | null = null;
  let descriptionLines: string[] = [];

  for (const line of lines) {
    const taskMatch = line.match(
      /^### (T-\d+) \| P(\d) \| (\w+) \| (.+?) \| (.+?)(?:\s*\|\s*(.*))?$/
    );

    if (taskMatch) {
      // Save previous task
      if (currentTask?.id) {
        currentTask.description = descriptionLines.join("\n");
        tasks.push(currentTask as ParsedTask);
      }

      currentTask = {
        id: taskMatch[1],
        priority: parseInt(taskMatch[2]),
        category: taskMatch[3],
        title: taskMatch[4].trim(),
        time: taskMatch[5].trim(),
        status: taskMatch[6]?.trim() || "",
        files: [],
      };
      descriptionLines = [];
    } else if (currentTask) {
      descriptionLines.push(line);

      // Fayllarni extraction
      const fileMatch = line.match(/\*\*Fayllar?:\*\*\s*(.+)/);
      if (fileMatch) {
        currentTask.files = fileMatch[1]
          .split(/[,;]/)
          .map(f => f.trim().replace(/`/g, ""))
          .filter(Boolean);
      }
    }
  }

  // Last task
  if (currentTask?.id) {
    currentTask.description = descriptionLines.join("\n");
    tasks.push(currentTask as ParsedTask);
  }

  return tasks;
}

// ─── TASK SELECTION ───────────────────────────────────────

function selectNextTask(tasks: ParsedTask[]): ParsedTask | null {
  const allowedCategories = CONFIG.zones[CONFIG.developer];

  const available = tasks
    .filter(t => !t.status.includes("pending["))         // Hech kim olmagan
    .filter(t => allowedCategories.includes(t.category))  // O'z zone si
    .sort((a, b) => {
      // Priority bo'yicha (P0 birinchi)
      if (a.priority !== b.priority) return a.priority - b.priority;
      // Vaqt bo'yicha (qisqa birinchi)
      const timeA = parseTime(a.time);
      const timeB = parseTime(b.time);
      return timeA - timeB;
    });

  return available[0] || null;
}

function parseTime(t: string): number {
  if (t.includes("h")) return parseFloat(t) * 60;
  if (t.includes("min")) return parseFloat(t);
  return 60; // default 1h
}

// ─── MAIN LOOP ────────────────────────────────────────────

async function main() {
  console.log(`\n[AUTONOMOUS AGENT] Developer: ${CONFIG.developer}`);
  console.log(`[AUTONOMOUS AGENT] Max tasks: ${CONFIG.maxTasks}\n`);

  let completed = 0;

  while (completed < CONFIG.maxTasks) {
    // 1. Git pull
    execSync("git checkout main && git pull origin main", { stdio: "inherit" });

    // 2. Parse tasks
    const tasksContent = readFileSync("docs/Tasks.md", "utf-8");
    const tasks = parseTasks(tasksContent);
    const task = selectNextTask(tasks);

    if (!task) {
      console.log("[AUTONOMOUS AGENT] Boshqa ochiq task yo'q. Tugatildi.");
      break;
    }

    console.log(`\n[AUTONOMOUS AGENT] Task tanlandi: ${task.id} — ${task.title}`);
    console.log(`[AUTONOMOUS AGENT] Priority: P${task.priority}, Time: ${task.time}\n`);

    // 3. Claim task
    const updatedContent = tasksContent.replace(
      `### ${task.id} |`,
      `### ${task.id} | pending[Claude-Auto] |` // Hack: prepend status
      // Real implementation: to'g'ri regex bilan status qo'shish
    );
    writeFileSync("docs/Tasks.md", updatedContent);
    execSync(`git add docs/Tasks.md && git commit -m "task: claim ${task.id} [Claude-Auto]" && git push origin main`);

    // 4. Branch ochish
    const branchName = `auto/${task.id.toLowerCase()}-${task.title.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}`;
    execSync(`git checkout -b ${branchName}`);

    // 5. Claude Code bilan task bajarish
    try {
      const prompt = buildTaskPrompt(task);
      const result = execSync(
        `claude -p "${prompt.replace(/"/g, '\\"')}" ` +
        `--allowedTools Read,Edit,Grep,Glob,Bash,Write ` +
        `--max-turns 30`,
        {
          cwd: process.cwd(),
          timeout: CONFIG.maxMinutesPerTask * 60_000,
          encoding: "utf-8",
        }
      );

      console.log(`[AUTONOMOUS AGENT] Claude natijasi:\n${result.slice(0, 500)}`);

      // 6. QA Check
      const qaResult = execSync(
        `claude -p "QA AGENT: tsc --noEmit (api, web, worker) + pnpm build qil. PASS/FAIL report" ` +
        `--allowedTools Bash,Read ` +
        `--max-turns 10`,
        { encoding: "utf-8", timeout: 120_000 }
      );

      if (qaResult.includes("FAIL")) {
        console.log(`[AUTONOMOUS AGENT] QA FAILED for ${task.id}. Skipping.`);
        execSync(`git checkout main && git branch -D ${branchName}`);
        continue;
      }

      // 7. Commit + Push
      execSync(`git add -A && git commit -m "feat: ${task.id} — ${task.title}"`);
      execSync(`git push -u origin ${branchName}`);

      // 8. PR ochish (GitHub CLI)
      execSync(
        `gh pr create --title "auto: ${task.id} — ${task.title}" ` +
        `--body "Automated by Claude Agent\n\nTask: ${task.id}\n${task.title}\n\nQA: PASS" ` +
        `--label "auto-generated,needs-review" ` +
        `--base main`
      );

      completed++;
      console.log(`[AUTONOMOUS AGENT] ${task.id} PR ochildi! (${completed}/${CONFIG.maxTasks})`);

    } catch (err: any) {
      console.error(`[AUTONOMOUS AGENT] ${task.id} FAILED: ${err.message}`);
      execSync(`git checkout main && git branch -D ${branchName} 2>/dev/null || true`);
    }

    // Main ga qaytish
    execSync("git checkout main");
  }

  console.log(`\n[AUTONOMOUS AGENT] Tugatildi. ${completed} task bajarildi.\n`);
}

function buildTaskPrompt(task: ParsedTask): string {
  const claudeRules = CONFIG.developer === "Bekzod"
    ? readFileSync("CLAUDE_BACKEND.md", "utf-8").slice(0, 2000)
    : readFileSync("CLAUDE_FRONTEND.md", "utf-8").slice(0, 2000);

  return `
    Sen VENTRA loyihasining AUTONOMOUS AGENT isan.
    Developer: ${CONFIG.developer}

    TASK:
    ID: ${task.id}
    Priority: P${task.priority}
    Category: ${task.category}
    Title: ${task.title}
    Files: ${task.files.join(", ") || "Aniqlanmagan"}
    Description:
    ${task.description}

    RULES (${CONFIG.developer} zone):
    ${claudeRules.slice(0, 1000)}

    INSTRUCTIONS:
    1. Task dagi muammo va yechimni o'qi
    2. Kerakli fayllarni o'qi (Read tool)
    3. Yechimni implement qil (Edit tool)
    4. tsc --noEmit qil (o'z zone uchun)
    5. Summary yoz: nima o'zgardi, qaysi fayllar

    CONSTRAINTS:
    - Faqat ${CONFIG.allowedZoneFiles[CONFIG.developer].join(", ")} ichida ishla
    - any type TAQIQLANGAN
    - Mavjud testlarni buzma
    - Agar blocker bo'lsa — STOP, tushuntir
  `;
}

main().catch(console.error);
```

---

# ═══════════════════════════════════════════════════════════
# LEVEL 10: FULL AGENTIC PIPELINE
# ═══════════════════════════════════════════════════════════

## 10.1 End-to-End Flow

```
TRIGGER
  │
  ├─ Sentry Alert: "TypeError: Cannot read property 'price' of undefined"
  ├─ Railway Alert: "Health check failed for api service"
  ├─ GitHub Issue: "Dashboard yuklanmayapti"
  ├─ Cron: "Nightly performance regression detected"
  │
  ▼
EVENT ROUTER (Level 7)
  │
  ├─ Classify: P0 production error
  ├─ Deduplicate: bu error oldin ham kelganmi?
  ├─ Context gather: last 5 deploys, recent changes
  │
  ▼
DIAGNOSIS AGENT
  │
  ├─ Error stack trace → fayl:qator aniqlash
  ├─ git log --since="2 hours ago" → recent commits
  ├─ git blame fayl:qator → qaysi commit kiritdi
  ├─ Related code o'qish → root cause
  │
  ├─ Output:
  │   Root Cause: T-375 commit dagi `product.skus[0].price`
  │   null check yo'q — agar sku bo'sh bo'lsa crash qiladi
  │   Fix: optional chaining `product.skus?.[0]?.price ?? 0`
  │
  ▼
FIX AGENT (Level 9)
  │
  ├─ Branch: hotfix/sentry-12345
  ├─ Edit: apps/api/src/products/products.service.ts:142
  │   - const price = product.skus[0].price;
  │   + const price = product.skus?.[0]?.price ?? 0;
  ├─ Self-test: tsc --noEmit PASS
  │
  ▼
QA AGENT
  │
  ├─ tsc --noEmit (api, web, worker, bot) → PASS
  ├─ pnpm build → PASS
  ├─ pnpm test → PASS (no regression)
  ├─ Diff review: minimal change, safe
  │
  ▼
PR CREATION
  │
  ├─ gh pr create --title "hotfix: null check for product skus"
  ├─ PR body: root cause, fix, QA results
  ├─ Label: hotfix, auto-generated, P0
  │
  ▼
NOTIFICATION
  │
  ├─ Telegram → Bekzod: "P0 hotfix PR tayyor, review kerak"
  ├─ GitHub → PR comment: "Auto-generated by VENTRA Agent"
  │
  ▼
HUMAN REVIEW (Bekzod)
  │
  ├─ PR ko'radi → Approve
  │
  ▼
AUTO-DEPLOY
  │
  ├─ GitHub Action: PR merge → staging deploy trigger
  ├─ mcp__ventra__deploy_staging(service: "api")
  ├─ Health check: 30 sekund kutish → API javob beradi
  │
  ▼
SMOKE TEST AGENT
  │
  ├─ Staging API ga test request:
  │   GET /products/12345 → 200 OK (oldin 500 edi)
  │   GET /health → 200 OK
  │   POST /products/analyze → 200 OK
  ├─ Result: ALL PASS
  │
  ▼
PRODUCTION DEPLOY
  │
  ├─ mcp__ventra__deploy_production(
  │     service: "api",
  │     confirm: "YES_DEPLOY_TO_PRODUCTION",
  │     reason: "P0 hotfix — null check for product skus"
  │   )
  ├─ Monitor: 5 min Sentry error rate
  ├─ Confirm: error rate = 0 → SUCCESS
  │
  ▼
ARCHIVE
  │
  ├─ Sentry issue → resolved
  ├─ Tasks.md → Done.md
  ├─ MEMORY.md → "product.skus null check pattern qo'shildi"
  │
  ▼
TOTAL TIME: ~8-12 min (oldin odam bilan: 1-4 soat)
```

---

# ═══════════════════════════════════════════════════════════
# LEVEL 11: SELF-IMPROVING AGENT
# ═══════════════════════════════════════════════════════════

## 11.1 Nima?

Agent har sessiyada **o'z xatolaridan o'rganadi** va CLAUDE.md + MEMORY.md ni
avtomatik yangilaydi. Keyingi sessiyalarda **bir xil xato QAYTARILMAYDI**.

## 11.2 Mexanizm

```
SESSION N:
  1. Agent BigInt serialize xato qildi
  2. Fix qildi
  3. Meta-analysis: "Bu xato oldin ham bo'lganmi?"
  4. MEMORY.md check → Ha, 2 marta bo'lgan
  5. THRESHOLD: 2+ marta = QOIDA yaratish kerak
  6. CLAUDE.md ga yangi qoida qo'shish:
     "BigInt fieldlar: balance, amounts — .toString() MAJBURIY"
  7. MEMORY.md yangilash: "BigInt pattern → CLAUDE.md ga qo'shildi"

SESSION N+1:
  1. Agent CLAUDE.md o'qiydi
  2. BigInt qoidasini ko'radi
  3. Kod yozganda AVTOMATIK .toString() qo'yadi
  4. Xato QAYTARILMAYDI
```

## 11.3 Self-Improvement Engine

```typescript
// scripts/self-improve.ts — Har sessiya oxirida ishga tushadi

interface LearningEntry {
  pattern: string;         // "bigint-serialize"
  description: string;     // "BigInt fields need .toString()"
  occurrences: number;     // 3
  firstSeen: string;       // "2026-02-15"
  lastSeen: string;        // "2026-03-08"
  resolution: string;      // ".toString() qo'shish"
  promotedToRule: boolean; // true — CLAUDE.md ga yozilganmi
}

// ─── PATTERN DETECTION ────────────────────────────────────

const KNOWN_PATTERNS = [
  {
    id: "bigint-serialize",
    detect: (diff: string) => diff.includes("BigInt") && diff.includes("JSON"),
    description: "BigInt → .toString() MAJBURIY for JSON serialization",
    rule: "BigInt fieldlar (balance, amount) → response da .toString() SHART",
  },
  {
    id: "account-id-missing",
    detect: (diff: string) =>
      diff.includes("findMany") && !diff.includes("account_id"),
    description: "DB query da account_id filter yo'q — multi-tenant buzilishi",
    rule: "HAR DB query da account_id: accountId filter bo'lishi SHART",
  },
  {
    id: "any-type-usage",
    detect: (diff: string) => /:\s*any\b/.test(diff),
    description: "TypeScript any type ishlatilgan — strict mode buzilishi",
    rule: "any type TAQIQLANGAN — interface yoki type alias ishlatish",
  },
  {
    id: "console-log",
    detect: (diff: string) => /console\.(log|warn|error)/.test(diff),
    description: "console.log ishlatilgan — NestJS Logger kerak",
    rule: "Backend: NestJS Logger, Frontend: development only console",
  },
  {
    id: "missing-error-state",
    detect: (diff: string) =>
      diff.includes("useQuery") && !diff.includes("isError"),
    description: "React component da error state yo'q",
    rule: "Har useQuery/useMutation da loading + error state MAJBURIY",
  },
  {
    id: "n-plus-one",
    detect: (diff: string) =>
      diff.includes("for") && diff.includes("findUnique"),
    description: "N+1 query pattern — loop ichida DB call",
    rule: "Loop ichida DB call TAQIQLANGAN — findMany + include ishlatish",
  },
  {
    id: "unbounded-query",
    detect: (diff: string) =>
      diff.includes("findMany") && !diff.includes("take:") && !diff.includes("LIMIT"),
    description: "Unbounded query — LIMIT/take yo'q",
    rule: "HAR findMany da take: N (max 100) MAJBURIY",
  },
];

// ─── LEARNING LOOP ────────────────────────────────────────

async function analyzeSessions(): Promise<void> {
  // 1. Oxirgi sessiya diff ini ol
  const diff = execSync("git diff HEAD~5..HEAD", { encoding: "utf-8" });

  // 2. Pattern detection
  const detected = KNOWN_PATTERNS.filter(p => p.detect(diff));

  // 3. MEMORY.md dagi learning entries yangilash
  const memoryPath = ".claude/projects/VENTRA/memory/learning.md";
  let learnings: LearningEntry[] = loadLearnings(memoryPath);

  for (const pattern of detected) {
    const existing = learnings.find(l => l.pattern === pattern.id);
    if (existing) {
      existing.occurrences++;
      existing.lastSeen = new Date().toISOString().split("T")[0];
    } else {
      learnings.push({
        pattern: pattern.id,
        description: pattern.description,
        occurrences: 1,
        firstSeen: new Date().toISOString().split("T")[0],
        lastSeen: new Date().toISOString().split("T")[0],
        resolution: pattern.rule,
        promotedToRule: false,
      });
    }
  }

  // 4. Promotion check: 2+ occurrences → CLAUDE.md ga qoida qo'shish
  for (const learning of learnings) {
    if (learning.occurrences >= 2 && !learning.promotedToRule) {
      console.log(`[SELF-IMPROVE] Promoting "${learning.pattern}" to CLAUDE.md rule`);

      const pattern = KNOWN_PATTERNS.find(p => p.id === learning.pattern);
      if (pattern) {
        appendToClaudeMd(pattern.rule);
        learning.promotedToRule = true;
      }
    }
  }

  // 5. Save updated learnings
  saveLearnings(memoryPath, learnings);
}

function appendToClaudeMd(rule: string): void {
  const claudeMd = readFileSync("CLAUDE.md", "utf-8");

  // "TAQIQLANGAN" section ga qo'shish
  const marker = "### TAQIQLANGAN";
  if (claudeMd.includes(rule)) {
    return; // Allaqachon bor
  }

  const updated = claudeMd.replace(
    marker,
    `${marker}\n- ${rule} (auto-learned ${new Date().toISOString().split("T")[0]})`
  );
  writeFileSync("CLAUDE.md", updated);
}
```

## 11.4 Natijaviy evolyutsiya

```
SESSIYA   XATO                  HARAKAT              QOIDA HOLATI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1       BigInt crash           Fix + memory log     occurrences: 1
  2       BigInt crash yana      Fix + memory log     occurrences: 2 → PROMOTE
  3       (BigInt xato yo'q)     CLAUDE.md qoidasi    CLAUDE.md da qoida bor
  4       (BigInt xato yo'q)     Agent oldindan biladi Pattern stabilized
  ...
  10      N+1 query              Fix + memory log     occurrences: 1
  11      N+1 query yana         Fix + memory log     occurrences: 2 → PROMOTE
  12      (N+1 yo'q)             Pattern stabilized   CLAUDE.md da qoida bor

NATIJA: Har 10-15 sessiyada CLAUDE.md ~3-5 ta yangi qoida bilan boyidi.
        6 oy ichida CLAUDE.md "100+ qoida" bo'ladi — BARCHA bilim agent "miyasida".
```

---

# ═══════════════════════════════════════════════════════════
# LEVEL 12: MULTI-MODEL SWARM
# ═══════════════════════════════════════════════════════════

## 12.1 Nima?

Har task ga **eng mos model** ni tanlash: Opus (murakkab), Sonnet (tez), Haiku (arzon).
**Cost optimization** + **quality maximization**.

## 12.2 Model Selection Matrix

```
TASK COMPLEXITY → MODEL MAPPING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  COMPLEXITY    MODEL             COST/1M tok    USE CASE
  ──────────    ─────             ───────────    ────────
  Trivial       Haiku 4.5         $0.80/$4       i18n, lint fix, format
  Simple        Sonnet 4.6        $3/$15         CRUD endpoint, component
  Medium        Opus 4.6          $15/$75        Multi-file refactor, API design
  Complex       Opus 4.6          $15/$75        Architecture, migration, debug
  Critical      Opus × 2          $30/$150       Consensus: 2 Opus independently
  Research      Opus + Web        $15+ + search  External API docs, library eval

VENTRA TASK → MODEL:
━━━━━━━━━━━━━━━━━━━━
  T-276 (i18n UZ tarjima)          → Haiku  ($0.05 per task)
  T-277 (i18n RU tarjima)          → Haiku  ($0.05 per task)
  T-278 (i18n kalit fix)           → Haiku  ($0.02 per task)
  T-206 (UI "50ta" fix)            → Sonnet ($0.10 per task)
  T-264 (Admin redirect)           → Sonnet ($0.15 per task)
  T-241 (Prisma migration)         → Opus   ($0.50 per task)
  T-214 (batch-quick-score API)    → Opus   ($0.80 per task)
  T-261 (Discovery drawer full)    → Opus   ($1.50 per task)
  T-280 (EU migration)             → Opus×2 ($3.00 — consensus)

JAMI COST TAHLIL (72 task):
  Hammasi Opus:     ~$54    (72 × $0.75 avg)
  Smart routing:    ~$18    (40 Haiku + 20 Sonnet + 12 Opus)
  TEJASH:           ~$36    (67% arzon!)
```

## 12.3 Model Router Implementation

```typescript
// packages/model-router/src/index.ts

interface TaskAnalysis {
  complexity: "trivial" | "simple" | "medium" | "complex" | "critical";
  model: "haiku" | "sonnet" | "opus";
  estimatedTokens: number;
  estimatedCost: number;
  reason: string;
}

function analyzeTask(task: ParsedTask): TaskAnalysis {
  const fileCount = task.files.length;
  const time = parseTime(task.time);
  const category = task.category;

  // Trivial: 1 fayl, <15 min, i18n/lint/format
  if (
    fileCount <= 1 &&
    time <= 15 &&
    (task.title.includes("i18n") || task.title.includes("lint") ||
     task.title.includes("format") || task.title.includes("typo"))
  ) {
    return {
      complexity: "trivial",
      model: "haiku",
      estimatedTokens: 5_000,
      estimatedCost: 0.02,
      reason: "Simple text/format change, 1 file",
    };
  }

  // Simple: 1-2 fayl, <30 min, CRUD
  if (fileCount <= 2 && time <= 30) {
    return {
      complexity: "simple",
      model: "sonnet",
      estimatedTokens: 15_000,
      estimatedCost: 0.12,
      reason: "Standard code change, few files",
    };
  }

  // Medium: 3-5 fayl, 30-60 min
  if (fileCount <= 5 && time <= 60) {
    return {
      complexity: "medium",
      model: "opus",
      estimatedTokens: 30_000,
      estimatedCost: 0.75,
      reason: "Multi-file change requiring deep understanding",
    };
  }

  // Complex: 5+ fayl yoki 60+ min
  if (fileCount > 5 || time > 60) {
    return {
      complexity: "complex",
      model: "opus",
      estimatedTokens: 50_000,
      estimatedCost: 1.50,
      reason: "Large-scale change, architecture decisions",
    };
  }

  // Critical: P0 + production
  if (task.priority === 0) {
    return {
      complexity: "critical",
      model: "opus", // × 2 (consensus mode da 2 ta independent Opus)
      estimatedTokens: 60_000,
      estimatedCost: 3.00,
      reason: "P0 critical — requires consensus from 2 independent agents",
    };
  }

  // Default
  return {
    complexity: "medium",
    model: "sonnet",
    estimatedTokens: 20_000,
    estimatedCost: 0.20,
    reason: "Default medium complexity",
  };
}

// ─── CONSENSUS MODE (Critical tasks) ─────────────────────

async function consensusExecution(task: ParsedTask): Promise<{
  agreed: boolean;
  solution: string;
  disagreements: string[];
}> {
  // 2 ta independent Opus agent bir xil task ni bajaradi
  const [result1, result2] = await Promise.all([
    executeWithModel(task, "opus", "Agent-A"),
    executeWithModel(task, "opus", "Agent-B"),
  ]);

  // Natijalarni taqqoslash
  const comparison = await compareResults(result1, result2);

  if (comparison.similarity > 0.85) {
    // 85%+ mos — birinchisini qabul qil
    return {
      agreed: true,
      solution: result1.code,
      disagreements: [],
    };
  } else {
    // Farq bor — odam qaror qiladi
    return {
      agreed: false,
      solution: "",
      disagreements: comparison.differences,
    };
  }
}
```

---

# ═══════════════════════════════════════════════════════════
# LEVEL 13: AUTONOMOUS SPRINT EXECUTION
# ═══════════════════════════════════════════════════════════

## 13.1 Nima?

Butun **sprint** (15-20 task) ni bitta buyruq bilan ishga tushirish.
Agent army: parallel batch dispatch, auto-merge, auto-archive.

## 13.2 Sprint Execution Flow

```
INPUT:
  Developer: "Sprint 6 ni bajaring. Deadline: juma kuni."
  Tasks: 15 ta (docs/Tasks.md dan)

ORCHESTRATOR ANALYSIS (5 min):
  ┌─────────────────────────────────────────────────────┐
  │  SPRINT 6 PLAN                                       │
  │                                                      │
  │  Total: 15 tasks                                     │
  │  Backend: 6 tasks (T-375..T-380)                     │
  │  Frontend: 7 tasks (T-381..T-387)                    │
  │  Cross-zone: 2 tasks (T-388..T-389)                  │
  │                                                      │
  │  Dependency Graph:                                    │
  │    T-375 ─┬─→ T-376 ──→ T-378                       │
  │           └─→ T-377                                   │
  │    T-381 (independent)                                │
  │    T-382 ─→ T-383                                    │
  │    T-388: Backend first → then Frontend               │
  │                                                      │
  │  Parallel Batches:                                    │
  │    Batch 1: T-375 (BE) ‖ T-381 (FE) ‖ T-384 (FE)   │
  │    Batch 2: T-376 (BE) ‖ T-382 (FE) ‖ T-385 (FE)   │
  │    Batch 3: T-377 (BE) ‖ T-378 (BE) ‖ T-383 (FE)   │
  │    Batch 4: T-388-BE → T-388-FE ‖ T-386 (FE)        │
  │    Batch 5: T-379 (BE) ‖ T-387 (FE) ‖ T-389         │
  │    Batch 6: T-380 (BE) — final, depends on all       │
  │                                                      │
  │  Estimated:                                           │
  │    Sequential: 18 soat                                │
  │    Parallel (3 agent): 7 soat                         │
  │    Model cost: ~$12 (smart routing)                   │
  │                                                      │
  │  Risk: T-388 cross-zone dependency                    │
  └─────────────────────────────────────────────────────┘

EXECUTION (7 soat):

  Soat 0:00 — Batch 1 START
    ┌─────────────────────────────────────────┐
    │  Agent-BE-1: T-375 (monitoring crons)    │ worktree-A
    │  Agent-FE-1: T-381 (dashboard chart)     │ worktree-B
    │  Agent-FE-2: T-384 (responsive fix)      │ worktree-C
    └─────────────────────────────────────────┘

  Soat 0:45 — Batch 1 DONE → QA
    QA Agent: tsc + build + test → ALL PASS
    Merge: worktree-A,B,C → main

  Soat 0:50 — Batch 2 START
    ┌─────────────────────────────────────────┐
    │  Agent-BE-1: T-376 (Redis cache layer)   │ worktree-D
    │  Agent-FE-1: T-382 (filter component)    │ worktree-E
    │  Agent-FE-2: T-385 (loading skeleton)    │ worktree-F
    └─────────────────────────────────────────┘

  ... (5 ta batch davom etadi) ...

  Soat 6:30 — Batch 6 DONE → Final QA
    QA Agent: FULL validation
    → tsc (all 4 apps): PASS
    → pnpm build: PASS
    → pnpm test: PASS (12/12)
    → Regression check: PASS

  Soat 6:45 — SPRINT COMPLETE
    ┌─────────────────────────────────────────┐
    │  SPRINT 6 REPORT                         │
    │                                          │
    │  Tasks: 15/15 completed                  │
    │  Batches: 6                              │
    │  Agents used: 8 (3 BE, 3 FE, 1 QA, 1 Orch) │
    │  Worktrees: 15 created, 15 merged        │
    │  QA retries: 2 (T-376 tsc fix, T-383 import) │
    │  Conflicts: 1 (T-388 cross-zone, resolved) │
    │                                          │
    │  Time: 6h 45min (vs 18h sequential)      │
    │  Speedup: 2.67x                          │
    │  Cost: $11.40                            │
    │                                          │
    │  Files changed: 47                       │
    │  Lines added: 1,847                      │
    │  Lines removed: 423                      │
    │  Net: +1,424 lines                       │
    └─────────────────────────────────────────┘
```

---

# ═══════════════════════════════════════════════════════════
# LEVEL 14: PRODUCTION-AWARE AGENT
# ═══════════════════════════════════════════════════════════

## 14.1 Integration Points

```
VENTRA PRODUCTION MONITORING STACK:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
  │  Sentry  │    │ Railway  │    │  Redis   │    │  Custom  │
  │          │    │  Metrics │    │  Monitor │    │  Metrics │
  │  • Error │    │  • CPU   │    │  • Queue │    │  • Users │
  │    rate  │    │  • RAM   │    │    depth │    │  • API   │
  │  • Stack │    │  • Disk  │    │  • Fail  │    │    resp  │
  │    trace │    │  • Net   │    │    rate  │    │    time  │
  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
       │               │               │               │
       └───────────────┼───────────────┼───────────────┘
                       │               │
              ┌────────▼───────────────▼────────┐
              │     AGENT DECISION ENGINE        │
              │                                  │
              │  IF error_rate > 5/min:          │
              │    → Diagnosis Agent             │
              │    → Auto-fix (agar mumkin)      │
              │    → Rollback (agar fix fail)    │
              │                                  │
              │  IF response_time > 2s:          │
              │    → Performance Agent           │
              │    → Query optimization          │
              │    → Cache layer qo'shish        │
              │                                  │
              │  IF memory > 80%:                │
              │    → Memory Agent                │
              │    → Leak detection              │
              │    → GC pressure fix             │
              │                                  │
              │  IF queue_depth > 1000:          │
              │    → Worker Agent                │
              │    → Concurrency tuning          │
              │    → Dead job cleanup            │
              │                                  │
              │  IF disk > 90%:                  │
              │    → Cleanup Agent               │
              │    → Log rotation                │
              │    → Old data archival           │
              └──────────────────────────────────┘
```

## 14.2 Proactive Optimization

```
DAILY PROACTIVE ANALYSIS (cron: har kuni 06:00):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. SLOW QUERY DETECTION:
     Agent: "Oxirgi 24 soatda eng sekin 10 ta query ni top"
     → mcp__ventra__db_query("SELECT * FROM pg_stat_statements
        ORDER BY mean_exec_time DESC LIMIT 10")
     → Har biri uchun: index qo'shish kerakmi? query optimize?
     → Agar fix kerak → PR ochish

  2. ERROR TREND ANALYSIS:
     Agent: "Oxirgi hafta Sentry error trendini tahlil qil"
     → Eng ko'p takrorlanadigan 5 ta error
     → Har biri uchun root cause + fix priority
     → docs/Tasks.md ga qo'shish

  3. DEPENDENCY VULNERABILITY:
     Agent: "pnpm audit + npm check-updates"
     → Critical vulnerability → auto-update PR
     → Major version update → manual review PR

  4. PERFORMANCE REGRESSION:
     Agent: "API response time trend — regression bormi?"
     → p95 response time 2s dan oshsa → alert
     → Regression commit ni aniqlash → fix PR

  5. COST OPTIMIZATION:
     Agent: "Railway resource usage vs limit"
     → Underutilized service → downscale recommendation
     → Spike pattern → auto-scaling suggestion
```

---

# ═══════════════════════════════════════════════════════════
# LEVEL 15-18: STRATEGIC LEVELS
# ═══════════════════════════════════════════════════════════

## Level 15: Cross-Project Knowledge Base

```
VENTRA PATTERN LIBRARY:
━━━━━━━━━━━━━━━━━━━━━━

  Pattern: "Marketplace Analytics SaaS"
  ├── Authentication: JWT + refresh token + multi-tenant
  ├── Data Pipeline: BullMQ + cron + REST scraping
  ├── Database: Prisma + PostgreSQL + pgvector
  ├── Frontend: React + Vite + Tailwind + DaisyUI
  ├── Monitoring: MetricsService + CapacityEstimator
  ├── Billing: Subscription + usage-based + BigInt
  ├── i18n: 3 til (uz, ru, en) + t() hook
  └── DevOps: Railway + Docker + Cloudflare

  Yangi loyiha: "Wildberries Analytics"
  → Agent VENTRA pattern larni yuklaydi
  → 80% boilerplate tayyor (1-2 soat vs 2-3 hafta)
  → Faqat WB-specific API integration yoziladi
```

## Level 16: Self-Healing Infrastructure

```
AUTO-RECOVERY MATRIX:
━━━━━━━━━━━━━━━━━━━━━

  EVENT                    DETECTION           AUTO-FIX
  ─────                    ─────────           ────────
  API process crash        Railway health      railway redeploy --yes
  DB connection limit      pg_stat_activity    KILL idle connections
  Redis OOM                INFO memory         FLUSHDB (cache only!)
  SSL cert expiring        cert check cron     certbot renew
  Disk 90%+               df -h cron          Log rotation + cleanup
  Worker stuck job         BullMQ stalled      Remove + re-enqueue
  Memory leak (>85%)       heap snapshot       Process restart + alert
  DNS resolution fail      health check        Cloudflare failover
```

## Level 17: AI Product Manager

```
USER FEEDBACK → FEATURE PIPELINE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. DATA COLLECTION:
     - Telegram bot feedback → DB
     - In-app feedback widget → API
     - Sentry error patterns → auto-categorize
     - Usage analytics (PostHog) → behavior patterns

  2. ANALYSIS (Agent):
     - Top 10 pain points (frequency × severity)
     - Feature request clustering
     - Competitor gap analysis (Uzum vs WB vs KaspiKZ)

  3. SPEC GENERATION:
     - PRD (Product Requirements Document)
     - User stories
     - Acceptance criteria
     - Wireframe description

  4. TASK DECOMPOSITION:
     - PRD → Tasks.md (auto-generated)
     - Dependency graph
     - Sprint assignment

  5. IMPLEMENTATION:
     - Level 13 (Auto Sprint) → code
     - Level 14 (Production-Aware) → deploy + monitor

  6. MEASUREMENT:
     - A/B test setup
     - Metric tracking
     - Success criteria check
     - Iterate or ship
```

## Level 18: Codebase Evolution

```
AUTONOMOUS REFACTORING:
━━━━━━━━━━━━━━━━━━━━━━

  MONTHLY CODEBASE HEALTH CHECK:

  1. METRICS COLLECTION:
     - File sizes (400+ qator = warning)
     - Cyclomatic complexity per function
     - Test coverage per module
     - Dependency graph (coupling)
     - Dead code detection
     - Duplicate code detection

  2. REFACTORING PLAN:
     Agent: "ProductsService 847 qator — split kerak"
     → ProductQueryService (read operations)
     → ProductMutationService (write operations)
     → ProductAnalyticsService (score, trends)
     → ProductService (facade, backward compat)

  3. INCREMENTAL MIGRATION:
     Step 1: Yangi service larni yaratish (bo'sh)
     Step 2: Method larni ko'chirish (1 ta per PR)
     Step 3: Import larni yangilash
     Step 4: Eski service dan redirect qilish
     Step 5: Test (regression check)
     Step 6: Eski method ni o'chirish
     → Har step = 1 PR, backward compatible

  4. DOCUMENTATION UPDATE:
     - Architecture diagram yangilash
     - API docs regenerate
     - MEMORY.md yangilash
```

---

# ═══════════════════════════════════════════════════════════
# IMPLEMENTATION ROADMAP
# ═══════════════════════════════════════════════════════════

## Faza 1: Quick Wins (1-2 kun)

```
  [ ] Level 5.3  — GitHub Actions PR Review workflow
  [ ] Level 5.4  — Nightly Audit workflow
  [ ] Level 11.3 — Self-improvement engine (learning.md)
  COST: $0 (GitHub Actions free tier)
  FOYDA: Avtomatik PR review, xato pattern detection
```

## Faza 2: MCP Server (3-5 kun)

```
  [ ] Level 6    — ventra-mcp server skeleton
  [ ] Level 6.3  — deploy, db_query, health_check tools
  [ ] Level 6.3  — scrape_product, run_worker_job tools
  [ ] Level 6.4  — .claude/mcp.json configuration
  COST: ~$0 (local server)
  FOYDA: Terminal dan "deploy staging" deb aytish kifoya
```

## Faza 3: Event-Driven (5-7 kun)

```
  [ ] Level 7    — Event Router (Fastify webhook receiver)
  [ ] Level 7.3  — Sentry → auto-diagnosis
  [ ] Level 7.4  — Telegram notification
  [ ] Level 8    — Redis-based multi-session coordination
  COST: ~$5/oy (Fastify hosting)
  FOYDA: Production error ga 5 min ichida auto-response
```

## Faza 4: Autonomous (7-10 kun)

```
  [ ] Level 9    — Autonomous task runner script
  [ ] Level 10   — Full pipeline (alert → fix → deploy)
  [ ] Level 12   — Multi-model routing (Haiku/Sonnet/Opus)
  COST: ~$20-50/oy (Claude API, model routing)
  FOYDA: Kechasi yotganingizda ham task bajariladi
```

## Faza 5: Strategic (ongoing)

```
  [ ] Level 13   — Auto sprint execution
  [ ] Level 14   — Production-aware proactive optimization
  [ ] Level 15   — Cross-project knowledge base
  [ ] Level 16-18 — Self-healing, AI PM, codebase evolution
  COST: ~$50-100/oy
  FOYDA: 10x developer productivity
```

---

# ═══════════════════════════════════════════════════════════
# COST-BENEFIT ANALYSIS
# ═══════════════════════════════════════════════════════════

```
╔══════════════════════════════════════════════════════════════════╗
║                    OYLIK COST vs FOYDA                           ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  LEVEL    COST/OY     DEV SOAT TEJASH   ROI                    ║
║  ─────    ────────    ──────────────     ───                    ║
║  L5       $0          ~20 soat/oy        Bepul                  ║
║  L6       $0          ~10 soat/oy        Bepul                  ║
║  L7       $5          ~30 soat/oy        600x                   ║
║  L8       $2          ~15 soat/oy        750x                   ║
║  L9       $30         ~60 soat/oy        200x                   ║
║  L10      $40         ~40 soat/oy        100x                   ║
║  L11      $5          ~20 soat/oy        400x                   ║
║  L12      -$36*       Tejash             Model cost saving      ║
║  L13      $50         ~100 soat/oy       200x                   ║
║  L14      $20         ~30 soat/oy        150x                   ║
║  ──────────────────────────────────────────────────────────     ║
║  JAMI     ~$116/oy    ~325 soat/oy                              ║
║                                                                  ║
║  * L12: smart routing $36/oy tejaydi (hammasi Opus vs optimized)║
║                                                                  ║
║  Developer soat narxi: ~$15-25/soat (O'zbekiston)               ║
║  325 soat × $20 = $6,500/oy tejash                             ║
║  $6,500 / $116 = 56x ROI                                       ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

*ADVANCED_AGENT_LEVELS.md | VENTRA Analytics Platform | 2026-03-08*
