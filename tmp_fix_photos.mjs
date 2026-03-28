import { PrismaClient } from './apps/api/node_modules/@prisma/client/index.js';

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://uzum:uzum_pass@127.0.0.1:5432/uzum_trend_finder' } }
});

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Origin: 'https://uzum.uz',
  Referer: 'https://uzum.uz/',
  Accept: 'application/json',
};

async function fetchPhoto(productId) {
  try {
    const res = await fetch(`https://api.uzum.uz/api/v2/product/${productId}`, { headers: HEADERS });
    if (!res.ok) return null;
    const data = await res.json();
    const p = data?.payload?.data ?? data?.payload;
    if (!p?.photos?.[0]) return null;
    return Object.values(p.photos[0].photo)[0]?.high ?? null;
  } catch { return null; }
}

// Winner products without photo_url
const products = await prisma.product.findMany({
  where: { photo_url: null },
  select: { id: true, title: true },
  take: 200,
});

console.log(`Updating ${products.length} products...`);

for (const p of products) {
  const url = await fetchPhoto(Number(p.id));
  if (url) {
    await prisma.product.update({ where: { id: p.id }, data: { photo_url: url } });
    console.log(`✅ ${p.id} — ${url.slice(0, 60)}`);
  } else {
    console.log(`⏭  ${p.id} — no photo`);
  }
  await new Promise(r => setTimeout(r, 200)); // rate limit
}

await prisma.$disconnect();
console.log('Done!');
