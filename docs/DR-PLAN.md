# VENTRA — Disaster Recovery Plan

## RTO / RPO

| Metrika | Qiymati | Izoh |
|---------|---------|------|
| **RTO** (Recovery Time Objective) | 30 daqiqa | Tizim qayta ishga tushguncha vaqt |
| **RPO** (Recovery Point Objective) | 6 soat | Maksimal yo'qotiladigan data hajmi |

---

## Backup Strategiyasi

### PostgreSQL
- **Kunlik**: `scripts/backup-db.sh` — `pg_dump` → gzip → S3/R2 (03:00 UTC)
- **Haftalik**: To'liq dump + WAL archive (yakshanba 04:00 UTC)
- **Saqlash**: 30 kun (kunlik), 90 kun (haftalik)
- **Restore**: `scripts/restore-db.sh <backup-file>`

### Redis
- **AOF**: `appendonly yes` (docker-compose volume: `redis_data:/data`)
- **Snapshot**: RDB har 60 soniyada (agar 1000+ key o'zgarsa)

### Application Code
- Git repository (GitHub) — barcha kod versiyalangan
- Docker images: `ventra-api`, `ventra-worker`, `ventra-web` (SHA-tagged)

---

## Failover Runbook

### 1. Database crash
```bash
# 1. Holatni tekshirish
docker compose -f docker-compose.prod.yml ps db

# 2. Container restart
docker compose -f docker-compose.prod.yml restart db

# 3. Agar restart ishlamasa — restore from backup
./scripts/restore-db.sh backups/latest.sql.gz

# 4. Prisma migration sync
cd apps/api && npx prisma db push
```

### 2. API server down
```bash
# 1. Health check
curl http://localhost:3000/api/v1/health

# 2. Container restart
docker compose -f docker-compose.prod.yml restart api

# 3. Log tekshirish
docker compose -f docker-compose.prod.yml logs --tail=100 api
```

### 3. Worker down
```bash
# 1. Worker health check
curl http://localhost:3001/health

# 2. Redis queue depth tekshirish
redis-cli LLEN bull:discovery:wait
redis-cli LLEN bull:reanalysis:wait

# 3. Worker restart
docker compose -f docker-compose.prod.yml restart worker
```

### 4. Redis crash
```bash
# 1. Redis restart (AOF + RDB auto-restore)
docker compose -f docker-compose.prod.yml restart redis

# 2. Agar data yo'qolsa — queue'lar o'zi to'ladi (cron re-enqueue)
```

### 5. Full server failure
```bash
# 1. Yangi server provision (Railway/VPS)
# 2. Docker compose pull + up
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# 3. DB restore
./scripts/restore-db.sh backups/latest.sql.gz

# 4. DNS yangilash (A record yoki Cloudflare proxy)
```

---

## Monitoring & Alerts

| Xizmat | Monitoring | Alert |
|--------|-----------|-------|
| API | `/api/v1/health` (30s interval) | Telegram bot — DOWN alert |
| Worker | `:3001/health` | Telegram bot — queue depth > 100 |
| DB | pg_isready | Auto-restart (Docker restart policy) |
| Redis | redis-cli ping | Auto-restart |
| SSL | Cert expiry check | 7 kun oldin Telegram alert |

---

## Kontakt

| Rol | Kishi | Kanal |
|-----|-------|-------|
| Backend | Bekzod | Telegram |
| Frontend | Sardor | Telegram |

---

*DR-PLAN.md | VENTRA Analytics | 2026-02-26*
