# uzum-capture

Uzum saytini real brauzerda ochib, barcha GraphQL va API response'larni faylga yozib oladi.

## O'rnatish

```bash
cd tools/uzum-capture
npm install
npx playwright install chromium
```

## Ishlatish

```bash
# Kategoriya sahifasi (GUI brauzer bilan)
node capture.js "https://uzum.uz/ru/category/makiyazh--10091"

# Headless rejimda
node capture.js "https://uzum.uz/ru/category/makiyazh--10091" --headless

# Barcha JSON response'larni saqlash (nafaqat graphql/api)
node capture.js "https://uzum.uz/ru/category/makiyazh--10091" --all

# Mahsulot sahifasi
node capture.js "https://uzum.uz/ru/product/lavant-laboratory-tush-803436"
```

## Natija

`./out/` papkasida:
- `TIMESTAMP_001.json` — response body
- `TIMESTAMP_001.meta.json` — URL, method, headers, postData

## Maqsad

Uzum'ning GraphQL query'lari va API endpoint'larini aniqlash uchun.
Topilgan query'larni `apps/worker/src/processors/discovery.processor.ts` ga integratsiya qilish.
