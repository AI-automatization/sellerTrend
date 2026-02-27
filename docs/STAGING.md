# VENTRA — Staging Environment

## Arxitektura

```
feature-branch → PR → staging (auto-deploy) → test → merge → main → production
```

## Railway Preview Deployments

### Setup
1. Railway loyihada "Enable PR Deploys" yoqish
2. Har PR uchun preview environment avtomatik yaratiladi
3. Preview URL: `ventra-pr-{number}.up.railway.app`

### Environment Variables (Staging)
```env
NODE_ENV=staging
DATABASE_URL=postgresql://...staging-db...
REDIS_URL=redis://...staging-redis...
JWT_SECRET=staging-secret-key
SENTRY_DSN=...staging-dsn...
```

### CI Pipeline (staging)
```yaml
# .github/workflows/ci.yml staging job auto-triggers on PR
# 1. Type check (api + web + worker + bot)
# 2. Unit tests
# 3. Railway auto-deploys preview
```

## Staging vs Production

| Aspect | Staging | Production |
|--------|---------|------------|
| DB | Alohida PostgreSQL | Production DB |
| Redis | Alohida instance | Production Redis |
| Data | Seed data only | Real user data |
| Uzum API | Rate limited (1 req/5s) | Normal |
| AI | Disabled / mock | Anthropic API |
| Billing | Test mode | Real charges |
| Domain | `staging.ventra.uz` | `ventra.uz` |

## Branch Strategy

```
main (production)
  └── staging (auto-deploy → staging env)
       └── bekzod/feat-xxx
       └── sardor/feat-xxx
```

### Merge Flow
1. Feature branch → PR → staging auto-deploy
2. QA test on staging URL
3. Approve PR → merge to main
4. Main auto-deploys to production

---

*STAGING.md | VENTRA Analytics | 2026-02-26*
