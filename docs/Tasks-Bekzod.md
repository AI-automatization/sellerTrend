# BEKZOD — Ochiq Vazifalar
# Fayllar: apps/api/, apps/worker/, apps/bot/, packages/*, docker-*, .github/*, prisma
# Yangilangan: 2026-02-28
# Bajarilganlar → docs/Done.md

---

# OCHIQ BACKEND TASKLAR

## P1 — MUHIM

### T-241 | totalAvailableAmount Prisma schema + saqlash | 30min
### T-269 | Eski noto'g'ri snapshot data tozalash (weekly_bought > 5000) | 30min
### T-270 | Duplicate snapshot'larni tozalash (kuniga 1 ta qoldirish) | 15min
### T-214 | POST /uzum/batch-quick-score endpoint | 1h
### T-235 | Playwright bilan weekly_bought DOM scraping | 2h
### T-236 | parseWeeklyBought kengaytirish — "1,2 тыс" formatlar | 30min
## P2 — O'RTA

### T-239 | Per-user rate limiting — AI endpoint ThrottlerGuard | 30min
### T-150 | naming consultant_id → account_id (migration kerak) | 10min

## P3 — PAST

### T-240 | DTO validatsiya — 5+ endpoint DTO'siz | 30min

---

# IKKALASI (Sardor bilan birga)

### T-237 | ProductPage rasmi — Uzum API dan photo olish (Backend qism) | 1h
### T-260 | Discovery — kategoriya nomi saqlash (Backend qism) | 1h
### T-261 | Discovery drawer — CategoryWinner schema boyitish | 2h

---

# QO'LDA QILINADIGAN ISHLAR

## ENV (ochiq)
| # | Nima | Holat |
|---|------|-------|
| E-006 | ALIEXPRESS_APP_KEY + SECRET | ❌ Region ro'yxat xato |
| E-008 | REDIS_URL parol bilan (dev) | ⬜ |
| E-009 | SENTRY_DSN (optional) | ⬜ |
| E-010 | PROXY_URL (kerak bo'lganda) | ⬜ |

## RAILWAY DEPLOY (ochiq)
| # | Nima | Holat |
|---|------|-------|
| T-262 | Railway DB seed (cargo, platforms) | ⬜ P0 |
| T-263 | SUPER_ADMIN user yaratish | ⬜ P0 |
| T-177 | pgvector extension | ⬜ |
| T-178 | Custom domain + SSL | ⬜ |
| T-179 | Worker memory/CPU limit | ⬜ |
| T-180 | Monitoring + Uptime alert | ⬜ |
| T-181 | DB backup tekshirish | ⬜ |
| T-184 | Staging environment (optional) | ⬜ |
| T-242 | SERPAPI_API_KEY Railway'ga qo'shish | ⬜ |
| T-243 | ALIEXPRESS keys Railway'ga | ⬜ |
| T-244 | SENTRY_DSN Railway'ga | ⬜ |
| T-245 | PROXY_URL Railway'ga (optional) | ⬜ |

---

## XULOSA

| Kategoriya | Soni |
|-----------|------|
| Backend P0 | 0 |
| Backend P1 | 8 |
| Backend P2-P3 | 3 |
| Ikkalasi | 3 |
| ENV manual | 4 |
| Railway manual | 12 |
| **JAMI ochiq** | **32** |

---
*Tasks-Bekzod.md | VENTRA | 2026-02-28*
