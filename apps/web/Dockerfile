FROM node:20-alpine AS base
RUN npm install -g pnpm@10.30.1

FROM base AS deps
WORKDIR /app
ENV HUSKY=0
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .pnpmfile.cjs ./
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --no-frozen-lockfile --filter web --filter @uzum/types

FROM deps AS builder
WORKDIR /app
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
WORKDIR /app/apps/web
RUN pnpm run build

# ── runner (nginx with envsubst for dynamic config) ──
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf.template /etc/nginx/nginx.conf.template

# Default values (overridden by Railway or docker-compose env vars)
ENV PORT=80
ENV API_UPSTREAM=api:3000

EXPOSE 80

# At startup: extract DNS resolver from /etc/resolv.conf, then envsubst into nginx config
CMD ["/bin/sh", "-c", "export NGINX_RESOLVER=$(awk '/^nameserver/{print $2; exit}' /etc/resolv.conf) && envsubst '${PORT} ${API_UPSTREAM} ${NGINX_RESOLVER}' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
