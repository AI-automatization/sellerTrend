# VENTRA — CDN Setup

## Arxitektura

```
User → Cloudflare CDN → nginx (API proxy only)
                      → CDN cache (static assets)
```

## Cloudflare Setup

### 1. DNS
```
A     ventra.uz          → server IP (proxied)
CNAME www.ventra.uz      → ventra.uz (proxied)
CNAME api.ventra.uz      → ventra.uz (proxied)
```

### 2. Page Rules
```
# Static assets — cache 30 kun
ventra.uz/assets/*
  Cache Level: Cache Everything
  Edge TTL: 30 days
  Browser TTL: 7 days

# API — cache bypass
api.ventra.uz/api/*
  Cache Level: Bypass

# HTML — short cache
ventra.uz/*.html
  Cache Level: Cache Everything
  Edge TTL: 1 hour
```

### 3. Cloudflare Settings
- SSL: Full (strict)
- Minify: JS + CSS + HTML
- Brotli: ON
- HTTP/2: ON
- Early Hints: ON
- Rocket Loader: OFF (SPA)

## Vite Build → CDN

### vite.config.ts
```typescript
export default defineConfig({
  build: {
    // Content-hash filenames for cache busting
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
});
```

Vite default holatda hash-based filenames ishlatadi — CDN safe.

## Nginx (API proxy only)

```nginx
server {
    listen 80;
    server_name ventra.uz;

    # Static — Cloudflare CDN handles, nginx fallback
    location /assets/ {
        root /usr/share/nginx/html;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # API proxy
    location /api/ {
        proxy_pass http://api:3000;
        add_header Cache-Control "no-store";
    }

    # SPA fallback
    location / {
        root /usr/share/nginx/html;
        try_files $uri /index.html;
        add_header Cache-Control "no-cache";
    }
}
```

## Performance Budget

| Metrika | Maqsad |
|---------|--------|
| FCP | < 1.5s |
| LCP | < 2.5s |
| TTI | < 3.0s |
| CLS | < 0.1 |
| Bundle size (gzip) | < 300KB |

---

*CDN.md | VENTRA Analytics | 2026-02-26*
