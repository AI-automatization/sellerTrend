FROM node:20-alpine AS base
RUN npm install -g pnpm@10.30.1

# ── deps ──────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
ENV HUSKY=0
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .pnpmfile.cjs ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
RUN pnpm install --no-frozen-lockfile --filter api --filter @uzum/types --filter @uzum/utils

# ── build ─────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
WORKDIR /app/apps/api
RUN pnpm exec prisma generate
RUN pnpm run build

# ── runner ────────────────────────────────────────────────────
# node:20-bookworm-slim (Debian) — Playwright/Chromium uchun kerak (Alpine qo'llab-quvvatlamaydi)
FROM node:20-bookworm-slim AS runner
RUN npm install -g pnpm@10.30.1
WORKDIR /app
ENV NODE_ENV=production
ENV HUSKY=0
# System Chromium ishlatamiz — bundled binary (~300MB) o'rniga system package (~120MB)
ENV PLAYWRIGHT_BROWSERS_PATH=0
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

# System Chromium va minimal dependency'lar — apt cache bir qadamda tozalanadi
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .pnpmfile.cjs ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
RUN pnpm install --no-frozen-lockfile --prod --filter api --filter @uzum/types --filter @uzum/utils

# Prisma CLI needed at runtime for db push in entrypoint — install globally to avoid pnpm conflict
RUN npm install -g prisma@6.19.2

# Ensure swagger-ui-dist top-level symlink exists for NestJS Swagger static serving
RUN ln -sf /app/node_modules/.pnpm/swagger-ui-dist@5.17.14/node_modules/swagger-ui-dist \
    /app/node_modules/swagger-ui-dist

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

WORKDIR /app/apps/api

# Generate Prisma Client using globally installed prisma CLI
RUN prisma generate

# Migration entrypoint — uses DIRECT_DATABASE_URL for DDL (bypasses PgBouncer)
COPY apps/api/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000
CMD ["/app/entrypoint.sh"]
