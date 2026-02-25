# VENTRA — DEVOPS AUDIT HISOBOTI
# Senior DevOps Engineer ko'zi bilan
# Sana: 2026-02-26

---

# XULOSA — 20 ta topilma

| Darajasi | Soni | Kategoriya |
|----------|------|------------|
| KRITIK | 5 | Security, Backup, CI/CD |
| OGOHLANTIRISH | 10 | Monitoring, Infra, Config |
| YAXSHILASH | 5 | Performance, Scaling |
| **JAMI** | **20** | |

---

# I. SECURITY

---

## #1 🔴 KRITIK — Nginx Security Headers Yo'q ❌ TODO

**Muammo:** `apps/web/nginx.conf.template` da hech qanday security header yo'q.

**Yo'q headerlar:**
- `X-Frame-Options: DENY` — clickjacking himoya
- `X-Content-Type-Options: nosniff` — MIME sniffing
- `Strict-Transport-Security` — HTTPS majburlash
- `Content-Security-Policy` — XSS/injection
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — kamera, mikrofon, geolocation cheklash

**Yechim:** nginx.conf.template ga qo'shish:
```nginx
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

**Mas'ul:** Bekzod
**Taxminiy vaqt:** 30 minut

---

## #2 🔴 KRITIK — .env Secrets Git Tarixida ❌ TODO

**Muammo:** `.env` fayllar `.gitignore` da bor, LEKIN git tarixida eski commitlarda secrets ko'rinadi:
- `JWT_SECRET` — plain text
- `ANTHROPIC_API_KEY` — `sk-ant-api03-...`
- `TELEGRAM_BOT_TOKEN` — bot token

**Xavf:** Git tarixini kim ko'rsa — barcha API kalitlarni oladi.

**Yechim:**
1. Barcha secretlarni DARHOL rotate qilish (yangi kalit olish)
2. Railway/production da env variables orqali saqlash
3. `git filter-branch` yoki `git-filter-repo` bilan tarixni tozalash (optional)
4. `.env.local` pattern ga o'tish

**Mas'ul:** Bekzod
**Taxminiy vaqt:** 1 soat (rotate) + 2 soat (tarix tozalash)

---

## #3 🟡 OGOH — Rate Limiting Faqat Global ❌ TODO

**Hozirgi holat:**
```typescript
ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }])
```
60 req/min BARCHA foydalanuvchilar uchun bir xil.

**Muammo:**
- Bitta foydalanuvchi 60 req ishlatsa — boshqalar ham sekinlashadi
- API key plan bo'yicha farq yo'q (Free vs Pro)
- Discovery/Sourcing og'ir endpointlar oddiy GET bilan bir xil limit

**Yechim:**
- Per-account rate limiting: `@Throttle({ default: { ttl: 60, limit: 100 } })`
- Og'ir endpointlar uchun alohida limit: Discovery = 5 req/min, Sourcing = 3 req/min
- API key plan ga qarab limit: Free=30, Pro=120, Enterprise=unlimited

**Mas'ul:** Bekzod
**Taxminiy vaqt:** 3-4 soat

---

# II. BACKUP & DISASTER RECOVERY

---

## #4 🔴 KRITIK — Database Backup Strategiyasi Yo'q ❌ TODO

**Muammo:** PostgreSQL uchun hech qanday backup rejasi yo'q:
- Nightly dump yo'q
- Point-in-time recovery (PITR) sozlanmagan
- Restore test qilinmagan
- Railway volume yo'qolsa — BARCHA DATA YO'QOLADI

**Yechim:**
```bash
# Variant A — Railway cron service:
pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d).sql.gz
# S3/R2 ga upload

# Variant B — pg_basebackup + WAL archiving (PITR):
# postgresql.conf: archive_mode = on, archive_command = '...'

# Variant C — Railway automatic backups (agar plugin bo'lsa)
```

**Minimal reja:**
1. Kunlik `pg_dump` → S3/R2 (7 kunlik saqlash)
2. Haftalik to'liq backup → alohida storage (30 kunlik)
3. Oylik restore test — backup ishlashini tekshirish

**Mas'ul:** Bekzod
**Taxminiy vaqt:** 4-6 soat

---

## #5 🟡 OGOH — Disaster Recovery Plan Yo'q ❌ TODO

**Muammo:** Agar server crash bo'lsa — qayta tiklash tartibi hujjatlashtirilmagan.

**Kerak:**
- RTO (Recovery Time Objective): necha minutda tiklash kerak?
- RPO (Recovery Point Objective): necha soatlik data yo'qolishi qabul qilinadi?
- Runbook: qadam-baqadam restore qilish yo'riqnomasi
- Failover: ikkinchi instance ga o'tish rejasi

**Mas'ul:** Bekzod
**Taxminiy vaqt:** 2-3 soat (hujjatlash)

---

# III. CI/CD PIPELINE

---

## #6 🔴 KRITIK — CI Pipeline Chala ❌ TODO

**Hozirgi `.github/workflows/ci.yml`:**
```yaml
# Faqat:
- pnpm install
- prisma generate
- pnpm build
- pnpm --filter web lint
```

**Yo'q qadamlar:**
- `tsc --noEmit` — API va Worker type check
- `pnpm test` — hech qanday test yo'q
- `docker build` — image build tekshiruvi yo'q
- Security scan — dependency vulnerability check yo'q
- API lint — faqat web lint bor

**Yechim — to'liq pipeline:**
```yaml
jobs:
  lint:
    - pnpm --filter web lint
    - pnpm --filter api lint
  typecheck:
    - pnpm --filter api exec tsc --noEmit
    - pnpm --filter web exec tsc --noEmit
    - pnpm --filter worker exec tsc --noEmit
  build:
    - pnpm build
  security:
    - pnpm audit --audit-level=high
    # yoki: npx snyk test
  docker:
    - docker build -f apps/api/Dockerfile .
    - docker build -f apps/web/Dockerfile .
    - docker build -f apps/worker/Dockerfile .
```

**Mas'ul:** Bekzod
**Taxminiy vaqt:** 3-4 soat

---

## #7 🟡 OGOH — Auto Migration Production da Xavfli ❌ TODO

**Muammo:** API Dockerfile da:
```dockerfile
CMD sh -c "pnpm exec prisma db push --skip-generate && node dist/main"
```

`prisma db push` HAR SAFAR container qayta ishga tushganda ishlaydi. Production da:
- Schema o'zgarishi deploy paytida AVTOMATIK qo'llanadi — rollback imkoniyati yo'q
- Agar migration xato bo'lsa — API umuman ishga tushmaydi
- Parallel instancelar bir vaqtda migration qilishi mumkin — race condition

**Yechim:**
1. Migration ni alohida CI/CD step sifatida ishlatish (deploy OLDIN)
2. API CMD dan `prisma db push` olib tashlash
3. Railway da: `railway run --service api pnpm exec prisma migrate deploy`

**Mas'ul:** Bekzod
**Taxminiy vaqt:** 1-2 soat

---

## #8 🟡 OGOH — Docker Image Tag Strategiyasi Yo'q ❌ TODO

**Muammo:** Barcha Dockerfile `latest` tag ishlatadi. Rollback qilish uchun qaysi version ga qaytish noma'lum.

**Yechim:**
- Git SHA tag: `ventra-api:abc1234`
- Semver tag: `ventra-api:1.5.3`
- CI da avtomatik tag: `${{ github.sha }}` yoki `${{ github.ref_name }}-${{ github.run_number }}`

**Mas'ul:** Bekzod
**Taxminiy vaqt:** 1 soat

---

# IV. MONITORING & OBSERVABILITY

---

## #9 🔴 KRITIK — APM/Monitoring Yo'q ❌ TODO

**Muammo:** Hech qanday real-time monitoring yo'q:
- CPU/RAM foydalanish — ko'rinmaydi
- Request latency (p50, p95, p99) — o'lchanmaydi
- Error rate — faqat DB ga yoziladi, alert yo'q
- Queue depth (BullMQ) — monitoring yo'q

**Hozirgi holat:** File-based logs → faqat SSH bilan serverga kirib o'qish mumkin.

**Yechim (ketma-ketlik):**
1. **Sentry** — error tracking (bepul tier bor): `@sentry/nestjs` + `@sentry/react`
2. **Prometheus + Grafana** — metrics (self-hosted yoki Railway da)
3. **Alerting** — Telegram/Slack ga xabar: error rate > 5%, latency > 2s, CPU > 80%

**Minimal variant (bepul):**
- Sentry (10k events/oy bepul)
- UptimeRobot (50 monitor bepul) — `/api/v1/health` ping
- Railway built-in metrics

**Mas'ul:** Bekzod
**Taxminiy vaqt:** 4-6 soat (Sentry) + 6-8 soat (Prometheus)

---

## #10 🟡 OGOH — Worker/Bot Health Check Yo'q ❌ TODO

**Muammo:** Worker va Bot containerlar uchun health check yo'q.
- Worker BullMQ crash bo'lsa — hech kim bilmaydi
- Bot Telegram API dan uzilsa — hech kim bilmaydi
- Railway restart qilmaydi (health check failure bo'lmasa)

**Yechim:**
```typescript
// Worker: minimal HTTP health server
import http from 'http';
http.createServer((req, res) => {
  if (req.url === '/health') {
    const redisOk = await redis.ping();
    res.writeHead(redisOk ? 200 : 503);
    res.end(JSON.stringify({ status: redisOk ? 'ok' : 'unhealthy' }));
  }
}).listen(3001);
```

**Mas'ul:** Bekzod
**Taxminiy vaqt:** 2 soat

---

## #11 🟡 OGOH — Health Endpoint Redis Tekshirmaydi ❌ TODO

**Hozirgi:**
```typescript
// health.controller.ts
GET /health → { status, db, timestamp }
// Faqat Postgres tekshiriladi
```

**Muammo:** Redis crash bo'lsa — health endpoint hali ham 200 qaytaradi. Queue ishlamaydi lekin tizim "sog'lom" ko'rinadi.

**Yechim:**
```typescript
const dbOk = await prisma.$queryRaw`SELECT 1`;
const redisOk = await redis.ping();
return {
  status: dbOk && redisOk ? 'healthy' : 'degraded',
  db: dbOk ? 'ok' : 'down',
  redis: redisOk ? 'ok' : 'down',
  queue_depth: await queue.getWaitingCount(),
  timestamp: new Date(),
};
```

**Mas'ul:** Bekzod
**Taxminiy vaqt:** 30 minut

---

## #12 🟡 OGOH — Log Aggregation Yo'q ❌ TODO

**Muammo:** Loglar faqat container ichida faylga yoziladi:
- Container o'chirilsa — loglar yo'qoladi
- 4 ta service — 4 ta alohida log fayl — qidiruv qiyin
- Request ID bilan cross-service tracing mumkin emas

**Yechim (bosqichma-bosqich):**
1. **Minimal:** `stdout` ga yozish (Railway avtomatik ko'rsatadi)
2. **O'rtacha:** Loki + Grafana (self-hosted, bepul)
3. **Ideal:** Datadog/CloudWatch (pullik, lekin qulay)

**Mas'ul:** Bekzod
**Taxminiy vaqt:** 2-4 soat (stdout) | 8+ soat (Loki)

---

# V. INFRASTRUCTURE & CONFIG

---

## #13 🟡 OGOH — .dockerignore Yo'q ❌ TODO

**Muammo:** `.dockerignore` fayli yo'q → Docker build context juda katta:
- `node_modules/` (100+ MB) context ga kiradi
- `.git/` (50+ MB) context ga kiradi
- Build vaqti 2-3x sekinroq

**Yechim:**
```dockerignore
node_modules
.git
dist
*.log
.env*
!.env.example
.playwright-mcp
docs
*.md
.turbo
```

**Mas'ul:** Bekzod
**Taxminiy vaqt:** 15 minut

---

## #14 🟡 OGOH — DB Connection Pooling Yo'q ❌ TODO

**Muammo:** Prisma to'g'ridan-to'g'ri PostgreSQL ga ulanadi. Har request yangi connection ochadi.

- API (30+ concurrent users) + Worker (6 queue) + Bot = 40+ connection
- PostgreSQL default max = 100 connection
- Railway PostgreSQL ko'pincha 20-50 limit qo'yadi

**Yechim:** PgBouncer qo'shish:
```yaml
# docker-compose.prod.yml
pgbouncer:
  image: bitnami/pgbouncer
  environment:
    POSTGRESQL_HOST: postgres
    PGBOUNCER_POOL_MODE: transaction
    PGBOUNCER_MAX_CLIENT_CONN: 200
    PGBOUNCER_DEFAULT_POOL_SIZE: 20
```

Yoki Prisma connection pool: `DATABASE_URL` ga `?connection_limit=10&pool_timeout=10`

**Mas'ul:** Bekzod
**Taxminiy vaqt:** 2-3 soat

---

## #15 🟡 OGOH — Git Hooks Yo'q ❌ TODO

**Muammo:** Pre-commit hook yo'q:
- Secret commit bo'lishi mumkin (yana)
- Lint xatolar push bo'ladi
- Type error merge bo'ladi

**Yechim:**
```bash
pnpm add -Dw husky lint-staged
npx husky init

# .husky/pre-commit:
pnpm lint-staged

# package.json:
"lint-staged": {
  "*.ts": ["eslint --fix"],
  "*.tsx": ["eslint --fix"],
  ".env*": ["echo 'BLOCKED: .env file!' && exit 1"]
}
```

**Mas'ul:** Bekzod
**Taxminiy vaqt:** 1 soat

---

# VI. PERFORMANCE & SCALING

---

## #16 🟡 YAXSHILASH — CDN Static Assets Uchun ❌ TODO

**Muammo:** Barcha static fayllar (JS, CSS, images) nginx orqali serve bo'ladi. Global foydalanuvchilar uchun sekin.

**Yechim:** Cloudflare (bepul tier) yoki AWS CloudFront
- Vite build output `/assets/*` → CDN
- nginx faqat API proxy va SPA fallback

**Mas'ul:** Bekzod
**Taxminiy vaqt:** 2-3 soat

---

## #17 🟡 YAXSHILASH — Redis Persistence Sozlanmagan ❌ TODO

**Muammo:** Redis default holatda `appendonly no`. Container restart bo'lsa — barcha queue job lar yo'qoladi.

**Yechim:**
```yaml
# docker-compose.prod.yml
redis:
  command: redis-server --appendonly yes --appendfsync everysec
  volumes:
    - redis_data:/data
```

**Mas'ul:** Bekzod
**Taxminiy vaqt:** 15 minut

---

## #18 🟡 YAXSHILASH — Dependency Vulnerability Scanning ❌ TODO

**Muammo:** `pnpm audit` yoki `snyk test` hech qachon ishlatilmagan. Dependency larda zaiflik bo'lishi mumkin.

**Yechim:** CI ga qo'shish:
```yaml
- name: Security audit
  run: pnpm audit --audit-level=high
```

Yoki: GitHub Dependabot enable qilish (repo settings)

**Mas'ul:** Bekzod
**Taxminiy vaqt:** 30 minut

---

## #19 🟡 YAXSHILASH — Graceful Shutdown ❌ TODO

**Muammo:** Container to'xtatilganda (deploy, restart):
- Aktiv API requestlar — abrupt cut
- BullMQ job processing — yarmicha to'xtaydi
- WebSocket connectionlar — disconnect without reason

**Yechim:**
```typescript
// main.ts
app.enableShutdownHooks();

process.on('SIGTERM', async () => {
  // 1. Yangi request qabul qilishni to'xtat
  // 2. Aktiv requestlarni tugatishni kut (30s)
  // 3. BullMQ worker.close()
  // 4. Redis/DB disconnect
  await app.close();
});
```

**Mas'ul:** Bekzod
**Taxminiy vaqt:** 2 soat

---

## #20 🟡 YAXSHILASH — Staging Environment Yo'q ❌ TODO

**Muammo:** Faqat `development` (local) va `production` (Railway). O'rtada test qilish muhiti yo'q.

**Xavf:** Yangi feature to'g'ridan-to'g'ri production ga chiqadi — xato bo'lsa foydalanuvchilar ko'radi.

**Yechim:**
- Railway da `staging` branch → alohida environment
- `docker-compose.staging.yml` yoki Railway preview deployments
- Feature branch → staging auto-deploy → manual promote to production

**Mas'ul:** Bekzod
**Taxminiy vaqt:** 4-6 soat

---

# 🚀 PRIORITETLANGAN ISH TARTIBI

```
HOZIROQ (deploy oldin):
  #1  Nginx security headers (30 min)
  #2  Secretlarni rotate qilish (1 soat)
  #13 .dockerignore yaratish (15 min)
  #11 Health endpoint — Redis tekshiruv (30 min)
  #17 Redis persistence (15 min)
  #18 pnpm audit CI ga qo'shish (30 min)

1-HAFTA:
  #4  Database backup strategiya (4-6 soat)
  #6  CI pipeline to'ldirish (3-4 soat)
  #7  Auto migration olib tashlash (1-2 soat)
  #9  Sentry integration (4-6 soat)
  #10 Worker/Bot health check (2 soat)
  #15 Git hooks (husky) (1 soat)

2-HAFTA:
  #3  Per-account rate limiting (3-4 soat)
  #14 PgBouncer connection pool (2-3 soat)
  #19 Graceful shutdown (2 soat)
  #8  Docker image tagging (1 soat)
  #12 Log aggregation (4-8 soat)

3-HAFTA:
  #5  DR plan hujjatlash (2-3 soat)
  #20 Staging environment (4-6 soat)
  #16 CDN setup (2-3 soat)
```

---

*DEVOPS_AUDIT.md | VENTRA Analytics Platform | 2026-02-26*
*Senior DevOps Engineer*
