FROM node:20-slim AS base
RUN npm install -g pnpm@10.30.1

FROM base AS deps
WORKDIR /app
ENV HUSKY=0
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .pnpmfile.cjs ./
COPY apps/landing/package.json ./apps/landing/
RUN pnpm install --no-frozen-lockfile --filter landing

FROM deps AS builder
WORKDIR /app
# Install Chromium dependencies for Playwright prerender
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-noto-cjk \
    fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY apps/landing/ ./apps/landing/
WORKDIR /app/apps/landing
RUN npx playwright install --with-deps chromium 2>/dev/null || true
RUN pnpm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/landing/dist /usr/share/nginx/html
COPY apps/landing/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
