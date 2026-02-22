FROM node:20-alpine AS base
RUN npm install -g pnpm@10.30.1

# ── deps ──────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
RUN pnpm install --frozen-lockfile --filter api --filter @uzum/types --filter @uzum/utils

# ── build ─────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
WORKDIR /app/apps/api
RUN pnpm run build

# ── runner ────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN npm install -g pnpm@10.30.1
WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
RUN pnpm install --frozen-lockfile --prod --filter api --filter @uzum/types --filter @uzum/utils

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

WORKDIR /app/apps/api
RUN pnpm exec prisma generate

EXPOSE 3000
CMD ["sh", "-c", "pnpm exec prisma db push --skip-generate && node dist/main"]
