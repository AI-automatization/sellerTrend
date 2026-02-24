FROM node:20-alpine AS base
RUN npm install -g pnpm@10.30.1

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .pnpmfile.cjs ./
COPY apps/bot/package.json ./apps/bot/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
RUN pnpm install --frozen-lockfile --filter bot --filter @uzum/types --filter @uzum/utils

FROM deps AS builder
WORKDIR /app
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/bot/ ./apps/bot/
COPY apps/api/prisma/ ./apps/bot/prisma/
# Build shared packages first so @uzum/* resolve to JS at runtime
WORKDIR /app/packages/types
RUN pnpm run build
WORKDIR /app/packages/utils
RUN pnpm run build
WORKDIR /app/apps/bot
RUN pnpm exec prisma generate
RUN pnpm run build

FROM node:20-alpine AS runner
RUN npm install -g pnpm@10.30.1
WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .pnpmfile.cjs ./
COPY apps/bot/package.json ./apps/bot/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
RUN pnpm install --frozen-lockfile --prod --filter bot --filter @uzum/types --filter @uzum/utils

COPY --from=builder /app/apps/bot/dist ./apps/bot/dist
COPY --from=builder /app/apps/bot/prisma ./apps/bot/prisma
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist

WORKDIR /app/apps/bot
RUN pnpm exec prisma generate
CMD ["node", "dist/apps/bot/src/main"]
