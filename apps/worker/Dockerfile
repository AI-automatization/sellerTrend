FROM node:20-alpine AS base
RUN npm install -g pnpm@10.30.1

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .pnpmfile.cjs ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
RUN pnpm install --frozen-lockfile --filter worker --filter @uzum/types --filter @uzum/utils

FROM deps AS builder
WORKDIR /app
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

# Create a standalone production bundle — pnpm deploy resolves all workspace
# symlinks into real directory copies so no symlinks exist in the output
WORKDIR /app
RUN pnpm --filter=worker deploy --prod /app/worker-deploy
# Copy worker compiled output into the bundle
RUN cp -r /app/apps/worker/dist /app/worker-deploy/
RUN cp -r /app/apps/worker/prisma /app/worker-deploy/
# Inject built package dist (pnpm deploy excludes dist/ because it is in .gitignore)
RUN cp -r /app/packages/types/dist /app/worker-deploy/node_modules/@uzum/types/
RUN cp -r /app/packages/utils/dist /app/worker-deploy/node_modules/@uzum/utils/

# Use Debian slim for Playwright Chromium support (Alpine lacks required libs)
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

# Tell Playwright to use system Chromium (skip downloading its own)
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
ENV NODE_ENV=production

# Copy the entire standalone deployment bundle (real directories, no symlinks)
COPY --from=builder /app/worker-deploy ./

# Generate Prisma client (schema is at ./prisma/schema.prisma)
RUN ./node_modules/.bin/prisma generate

CMD ["node", "dist/apps/worker/src/main"]
