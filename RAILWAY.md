# Railway Deployment Guide — Uzum Trend Finder

## Architecture

```
Railway Project: uzum-trend-finder
├── postgres   (PostgreSQL 16 plugin)
├── redis      (Redis plugin)
├── api        (NestJS — apps/api/Dockerfile)
├── worker     (BullMQ — apps/worker/Dockerfile)
├── web        (nginx/React — apps/web/Dockerfile)
└── bot        (grammY — apps/bot/Dockerfile)
```

**Networking:** All services communicate via Railway's private network (`*.railway.internal`)

---

## Step 1 — Railway Account & CLI

```bash
npm install -g @railway/cli
railway login
```

---

## Step 2 — Create Railway Project

1. Go to [railway.app](https://railway.app) → **New Project**
2. Name it: `uzum-trend-finder`

---

## Step 3 — Add PostgreSQL

> Railway's standard Postgres plugin **does NOT include pgvector**.
> Use a custom Docker service instead.

### Option A — Custom pgvector service (RECOMMENDED)

1. In your Railway project → **+ New** → **Docker Image**
2. Image: `pgvector/pgvector:pg16`
3. Service name: `postgres`
4. Set environment variables:
   ```
   POSTGRES_USER=uzum
   POSTGRES_PASSWORD=<strong-password>
   POSTGRES_DB=uzum_trend_finder
   ```
5. Add a **Volume** → mount at `/var/lib/postgresql/data`

### Option B — Railway Postgres plugin

1. **+ New** → **Database** → **PostgreSQL**
2. Then manually enable pgvector via Railway's query tool:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

After setup, copy the `DATABASE_URL` from the service's **Variables** tab.

---

## Step 4 — Add Redis

1. **+ New** → **Database** → **Redis**
2. Service name: `redis`
3. Copy `REDIS_URL` from Variables tab.

---

## Step 5 — Add API Service

1. **+ New** → **GitHub Repo** → select `sellerTrend`
2. Service name: **`api`** (exact name, used for private networking)
3. In service **Settings**:
   - **Root Directory**: `/` (repo root — DO NOT change)
   - **Config File Path**: `railway/api.toml`
4. Set **Environment Variables**:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Reference from postgres service |
| `REDIS_URL` | Reference from redis service |
| `JWT_SECRET` | Strong random string (min 32 chars) |
| `JWT_EXPIRES_IN` | `7d` |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |

5. Click **Deploy**

---

## Step 6 — Add Worker Service

1. **+ New** → **GitHub Repo** → same repo
2. Service name: **`worker`**
3. In service **Settings**:
   - **Root Directory**: `/`
   - **Config File Path**: `railway/worker.toml`
4. Set **Environment Variables**:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Reference from postgres service |
| `REDIS_URL` | Reference from redis service |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` |
| `NODE_ENV` | `production` |

5. Click **Deploy**

---

## Step 7 — Add Web Service

1. **+ New** → **GitHub Repo** → same repo
2. Service name: **`web`**
3. In service **Settings**:
   - **Root Directory**: `/`
   - **Config File Path**: `railway/web.toml`
4. Set **Environment Variables**:

| Variable | Value |
|----------|-------|
| `API_UPSTREAM` | `api.railway.internal:3000` |

> `PORT` is automatically set by Railway — nginx template handles it.

5. Add a **Custom Domain** (or use Railway's auto-generated domain)
6. Click **Deploy**

---

## Step 8 — Add Bot Service

1. **+ New** → **GitHub Repo** → same repo
2. Service name: **`bot`**
3. In service **Settings**:
   - **Root Directory**: `/`
   - **Config File Path**: `railway/bot.toml`
4. Set **Environment Variables**:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Reference from postgres service |
| `TELEGRAM_BOT_TOKEN` | `7926900328:AAE...` |
| `NODE_ENV` | `production` |

5. Click **Deploy**

---

## How to Reference Variables Between Services

In Railway, you can reference another service's variable:
1. Go to the target service's **Variables** tab
2. Click **+ New Variable**
3. Value: `${{postgres.DATABASE_URL}}` (Railway's reference syntax)

---

## Private Networking (Railway.internal)

Services reach each other via:
```
api.railway.internal:3000     ← API (used by web nginx proxy)
redis.railway.internal:6379   ← Redis (alternative to REDIS_URL plugin)
postgres.railway.internal:5432 ← Postgres (alternative to DATABASE_URL plugin)
```

---

## Auto-Deploy on Push

Railway automatically redeploys each service when you push to `main` (linked GitHub branch). No extra CI/CD steps needed.

To control which branch triggers deploys:
- Service Settings → **Source** → **Branch** → select branch

---

## Useful Commands (Railway CLI)

```bash
# Link local to Railway project
railway link

# View logs
railway logs --service api
railway logs --service worker
railway logs --service web
railway logs --service bot

# Open service in browser
railway open

# Run one-off command (e.g., prisma migrate)
railway run --service api pnpm exec prisma migrate deploy

# Check service status
railway status
```

---

## Troubleshooting

### API won't start — Prisma migration error
```bash
railway run --service api pnpm exec prisma db push
```

### pgvector extension missing
```bash
# Connect to postgres and run:
CREATE EXTENSION IF NOT EXISTS vector;
```

### Web can't reach API (502 Bad Gateway)
- Check `API_UPSTREAM` is `api.railway.internal:3000`
- Ensure API service name in Railway is exactly `api`
- Check API health: `railway logs --service api`

### Worker not processing jobs
- Verify `REDIS_URL` matches the Redis service URL
- Check: `railway logs --service worker`

---

## Environment Variables Summary

| Service | Required Variables |
|---------|-------------------|
| api | DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_EXPIRES_IN, ANTHROPIC_API_KEY, PORT, NODE_ENV |
| worker | DATABASE_URL, REDIS_URL, ANTHROPIC_API_KEY, NODE_ENV |
| web | API_UPSTREAM |
| bot | DATABASE_URL, TELEGRAM_BOT_TOKEN, NODE_ENV |

---

*RAILWAY.md | Uzum Trend Finder | 2026-02-24*
