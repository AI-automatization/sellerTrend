# ── Build stage (Alpine — lightweight for compilation) ──────
FROM node:20-alpine AS builder
RUN npm install -g pnpm@10.30.1
WORKDIR /app
ENV HUSKY=0

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .pnpmfile.cjs ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
RUN pnpm install --frozen-lockfile --filter worker --filter @uzum/types --filter @uzum/utils

COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/
COPY apps/api/prisma/ ./apps/worker/prisma/

# Build shared packages first so @uzum/* resolve to JS at runtime
WORKDIR /app/packages/types
RUN pnpm run build
WORKDIR /app/packages/utils
RUN pnpm run build
WORKDIR /app/apps/worker
RUN pnpm exec prisma generate
RUN pnpm run build

# ── Runner (Debian slim for Playwright Chromium) ────────────
FROM node:20-slim AS runner
RUN npm install -g pnpm@10.30.1

# Install Playwright Chromium system dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    libglib2.0-0 \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
ENV NODE_ENV=production
ENV HUSKY=0

# Copy workspace root files for pnpm install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .pnpmfile.cjs ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/

# Install production deps
RUN pnpm install --frozen-lockfile --prod --filter worker --filter @uzum/types --filter @uzum/utils

# Debug: show what pnpm created
RUN echo "=== After pnpm install ===" && \
    echo "--- packages/utils:" && ls -la /app/packages/utils/ && \
    echo "--- worker node_modules/@uzum:" && ls -la /app/apps/worker/node_modules/@uzum/ 2>/dev/null || echo "NO worker nm" && \
    echo "--- root node_modules/@uzum:" && ls -la /app/node_modules/@uzum/ 2>/dev/null || echo "NO root nm" && \
    echo "--- Resolve utils symlink:" && readlink -f /app/apps/worker/node_modules/@uzum/utils 2>/dev/null || readlink -f /app/node_modules/@uzum/utils 2>/dev/null || echo "NO LINK"

# Copy built package dist AFTER pnpm install
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist

# Debug: verify dist was copied
RUN echo "=== After dist copy ===" && \
    echo "--- packages/utils/dist:" && ls -la /app/packages/utils/dist/ && \
    echo "--- Resolve and check:" && \
    RESOLVED=$(readlink -f /app/apps/worker/node_modules/@uzum/utils 2>/dev/null || readlink -f /app/node_modules/@uzum/utils 2>/dev/null) && \
    echo "Resolved to: $RESOLVED" && \
    ls -la "$RESOLVED/dist/" 2>/dev/null || echo "DIST NOT AT RESOLVED PATH"

# Copy worker compiled output + prisma schema
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/prisma ./apps/worker/prisma

WORKDIR /app/apps/worker
RUN pnpm exec prisma generate

# Verify modules can be loaded
RUN node -e "console.log(require.resolve('@uzum/utils'))" || echo "RESOLVE FAILED"

CMD ["node", "dist/apps/worker/src/main"]
