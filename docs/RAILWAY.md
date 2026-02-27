# VENTRA — Railway Production Deployment Guide

## Arxitektura

```
GitHub (main push)
    │
    ├─→ GitHub Actions CI ──→ lint, typecheck, test, build
    │                              │
    │                              ▼ (CI o'tgach)
    │                         Railway CLI Deploy
    │                              │
    ▼                              ▼
Railway Project: ventra-analytics
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  ┌─────────┐    ┌─────────┐                              │
│  │ Postgres │    │  Redis  │  ← Railway Managed Plugins  │
│  │ pgvector │    │  v7     │                              │
│  │  :5432   │    │  :6379  │                              │
│  └────┬─────┘    └────┬────┘                              │
│       │               │                                   │
│  ┌────┴───────────────┴──────────────────────────┐       │
│  │           Private Network (.railway.internal)  │       │
│  │                                                │       │
│  │  ┌───────┐  ┌────────┐  ┌─────┐  ┌─────────┐ │       │
│  │  │  API  │  │ Worker │  │ Bot │  │   Web   │ │       │
│  │  │ :3000 │  │ BullMQ │  │ TG  │  │  nginx  │ │       │
│  │  │NestJS │  │Chromium│  │grammY│  │  React  │ │       │
│  │  └───────┘  └────────┘  └─────┘  └────┬────┘ │       │
│  │                                        │      │       │
│  └────────────────────────────────────────┘      │       │
│                                                   │       │
│                        Custom Domain ─────────────┘       │
│                        app.ventra.uz                      │
└──────────────────────────────────────────────────────────┘
```

### Service'lar

| Service | Dockerfile | Port | Health Check |
|---------|-----------|------|-------------|
| **api** | `apps/api/Dockerfile` | 3000 | `/api/v1/health` |
| **worker** | `apps/worker/Dockerfile` | — | Internal |
| **web** | `apps/web/Dockerfile` | 80 (auto) | `/` |
| **bot** | `apps/bot/Dockerfile` | — | Internal |
| **postgres** | Railway Plugin | 5432 | Built-in |
| **redis** | Railway Plugin | 6379 | Built-in |

---

## Bosqich 1 — Railway Account

```bash
# Railway CLI o'rnatish
npm install -g @railway/cli

# Login
railway login
```

Railway dashboard: [railway.app](https://railway.app) → **New Project** → `ventra-analytics`

---

## Bosqich 2 — Infrastructure (PostgreSQL + Redis)

### PostgreSQL (pgvector bilan)

**Variant A — Railway Plugin + pgvector extension (Tavsiya)**

1. Railway dashboard → **+ New** → **Database** → **PostgreSQL**
2. Postgres sozlamalarida SQL console ochib:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Variables tab'dan `DATABASE_URL` nusxa oling

**Variant B — Custom Docker Image**

1. **+ New** → **Docker Image** → `pgvector/pgvector:pg16`
2. Service name: `postgres`
3. Volume: `/var/lib/postgresql/data`
4. Env vars:
   ```
   POSTGRES_USER=uzum
   POSTGRES_PASSWORD=<strong-32-char-password>
   POSTGRES_DB=uzum_trend_finder
   ```

### Redis

1. **+ New** → **Database** → **Redis**
2. Variables tab'dan `REDIS_URL` nusxa oling (parol avtomatik)

---

## Bosqich 3 — Application Services

Har bir service uchun:
1. **+ New** → **GitHub Repo** → `AI-automatization/sellerTrend` tanlang
2. Service name kiriting (pastdagi nomlar AYNAN shu bo'lishi kerak — private networking uchun)
3. Settings → **Dockerfile Path** belgilang

### API Service

| Sozlama | Qiymat |
|---------|--------|
| Service name | `api` |
| Dockerfile Path | `apps/api/Dockerfile` |
| Root Directory | `/` |

**Environment Variables:**

| Variable | Qiymat | Izoh |
|----------|--------|------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Railway reference |
| `DIRECT_DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Migration uchun (pooler bypass) |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` | Railway reference |
| `JWT_SECRET` | `openssl rand -hex 32` natijasi | Min 32 belgi |
| `JWT_EXPIRES_IN` | `7d` | |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | Claude AI uchun |
| `WEB_URL` | `https://app.ventra.uz` | CORS uchun |
| `NODE_ENV` | `production` | |
| `PORT` | `3000` | |

### Worker Service

| Sozlama | Qiymat |
|---------|--------|
| Service name | `worker` |
| Dockerfile Path | `apps/worker/Dockerfile` |
| Root Directory | `/` |

**Environment Variables:**

| Variable | Qiymat |
|----------|--------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `DIRECT_DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` |
| `SERPAPI_API_KEY` | (optional) |
| `ALIEXPRESS_APP_KEY` | (optional) |
| `ALIEXPRESS_APP_SECRET` | (optional) |
| `NODE_ENV` | `production` |

### Web Service

| Sozlama | Qiymat |
|---------|--------|
| Service name | `web` |
| Dockerfile Path | `apps/web/Dockerfile` |
| Root Directory | `/` |

**Environment Variables:**

| Variable | Qiymat | Izoh |
|----------|--------|------|
| `API_UPSTREAM` | `api.railway.internal:3000` | Private network! |

> `PORT` Railway avtomatik beradi — nginx template `${PORT}` ishlatadi.

**Custom Domain:**
- Settings → Networking → **Generate Domain** yoki **Custom Domain** → `app.ventra.uz`
- DNS: `CNAME app.ventra.uz → <railway-generated-domain>`
- SSL: Avtomatik (Let's Encrypt)

### Bot Service

| Sozlama | Qiymat |
|---------|--------|
| Service name | `bot` |
| Dockerfile Path | `apps/bot/Dockerfile` |
| Root Directory | `/` |

**Environment Variables:**

| Variable | Qiymat |
|----------|--------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `TELEGRAM_BOT_TOKEN` | `7926900328:AAE...` |
| `NODE_ENV` | `production` |

---

## Bosqich 4 — CI/CD Pipeline

### Arxitektura

```
Developer → git push main
                │
                ▼
        GitHub Actions CI
        ├── pnpm install
        ├── prisma generate
        ├── tsc --noEmit (api, web, worker, bot)
        ├── unit tests
        ├── lint
        └── build
                │
                ▼ (CI PASSED)
        GitHub Actions Deploy
        ├── railway up --service api
        ├── railway up --service worker
        ├── railway up --service web
        ├── railway up --service bot
        └── prisma db push (migration)
```

### GitHub Secrets Sozlash

1. Railway dashboard → Account Settings → **Tokens** → **New Token**
2. GitHub repo → Settings → Secrets → **New Repository Secret**:
   - Name: `RAILWAY_TOKEN`
   - Value: Railway token

### GitHub Environment

1. GitHub repo → Settings → Environments → **New Environment**: `production`
2. Protection rules (optional):
   - Required reviewers
   - Wait timer

### Workflow fayli

`.github/workflows/ci.yml` — allaqachon yaratilgan:
- **CI job**: lint, typecheck, test, build (har push/PR da)
- **Deploy job**: Railway CLI deploy (faqat main push + CI o'tgach)

---

## Bosqich 5 — Private Networking

Railway'da service'lar bir-birini **private network** orqali ko'radi:

```
api.railway.internal:3000        ← Web nginx proxy target
redis.railway.internal:6379      ← BullMQ connection
postgres.railway.internal:5432   ← Prisma connection
```

**MUHIM:** Railway reference syntax (`${{Postgres.DATABASE_URL}}`) avtomatik private URL beradi. Manual yozmang.

**Istisno:** Web service'da `API_UPSTREAM=api.railway.internal:3000` manual yozish kerak (nginx envsubst uchun).

---

## Bosqich 6 — Migration va pgvector

### Birinchi deploy

API Dockerfile entrypoint avtomatik `prisma db push` bajaradi.

### Qo'lda migration

```bash
railway run --service api -- pnpm exec prisma db push --skip-generate
```

### pgvector tekshirish

```bash
railway run --service api -- pnpm exec prisma db execute --stdin <<< "SELECT extversion FROM pg_extension WHERE extname = 'vector';"
```

---

## Foydali Komandalar

```bash
# Loyihaga ulash
railway link

# Log ko'rish
railway logs --service api
railway logs --service worker
railway logs --service web
railway logs --service bot

# Status
railway status

# Brauzerda ochish
railway open

# One-off command
railway run --service api -- pnpm exec prisma studio

# Env var qo'shish
railway variables set --service api JWT_SECRET=new_secret_value

# Rollback (oldingi deploy'ga)
railway rollback --service api
```

---

## Xatoliklarni Tuzatish

### API ishga tushmaydi — Prisma migration xatosi
```bash
# Direct connection bilan migration
railway run --service api -- sh -c 'DATABASE_URL=$DIRECT_DATABASE_URL pnpm exec prisma db push'
```

### Web 502 Bad Gateway
1. `API_UPSTREAM` = `api.railway.internal:3000` tekshiring
2. Railway'da API service nomi AYNAN `api` bo'lishi kerak
3. `railway logs --service api` — xatolarni ko'ring

### Worker job'lar ishlamaydi
1. `REDIS_URL` to'g'riligini tekshiring
2. `railway logs --service worker` — connection xatolarini qidiring

### Bot javob bermaydi
1. `TELEGRAM_BOT_TOKEN` to'g'riligini tekshiring
2. Webhook vs long-polling: bot long-polling ishlatadi, webhook sozlamang

---

## Xavfsizlik Checklist

- [ ] `JWT_SECRET` kamida 32 belgi, random (`openssl rand -hex 32`)
- [ ] `POSTGRES_PASSWORD` kuchli, 32+ belgi
- [ ] `ANTHROPIC_API_KEY` prod key (test key emas)
- [ ] `.env` fayllari `.gitignore` da
- [ ] Railway Variables — "Raw Editor" da secret'lar asterisk bilan ko'rinadi
- [ ] Custom domain + SSL (HTTPS) sozlangan
- [ ] Bot token rotate qilingan (BotFather → /revoke)

---

## Monitoring

### Railway Built-in
- **Logs**: Har service uchun real-time log stream
- **Metrics**: CPU, RAM, Network, Disk usage
- **Deploys**: Deploy history, rollback imkoniyati

### Tavsiya etiladigan qo'shimcha
- **Uptime**: UptimeRobot yoki BetterStack — `https://app.ventra.uz/api/v1/health` monitor
- **Errors**: Sentry integration (API + Worker)
- **Alerts**: Railway → Settings → Notifications → Slack/Email

---

## Environment Variables Xulosa

| Service | Env Vars | Izoh |
|---------|----------|------|
| **api** | DATABASE_URL, DIRECT_DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_EXPIRES_IN, ANTHROPIC_API_KEY, WEB_URL, NODE_ENV, PORT | 9 ta |
| **worker** | DATABASE_URL, DIRECT_DATABASE_URL, REDIS_URL, ANTHROPIC_API_KEY, SERPAPI_API_KEY, ALIEXPRESS_APP_KEY, ALIEXPRESS_APP_SECRET, NODE_ENV | 8 ta |
| **web** | API_UPSTREAM | 1 ta (PORT avtomatik) |
| **bot** | DATABASE_URL, TELEGRAM_BOT_TOKEN, NODE_ENV | 3 ta |

---

*RAILWAY.md | VENTRA Analytics Platform | 2026-02-27*
