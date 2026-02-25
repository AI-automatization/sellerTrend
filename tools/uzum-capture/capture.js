#!/usr/bin/env node
/**
 * uzum-capture.js
 * Uzum saytini ochib, barcha GraphQL / REST API response'larni ./out/ ga saqlaydi.
 *
 * Ishlatish:
 *   node capture.js "https://uzum.uz/ru/category/makiyazh--10091"
 *   node capture.js "https://uzum.uz/ru/category/makiyazh--10091" --headless
 *   node capture.js "https://uzum.uz/ru/category/makiyazh--10091" --all   (barcha JSON'larni saqlaydi)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// ─── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const targetUrl = args.find(a => a.startsWith('http'));
const headless = args.includes('--headless');
const captureAll = args.includes('--all'); // default: faqat graphql + api.uzum.uz

if (!targetUrl) {
  console.error('Usage: node capture.js "<URL>" [--headless] [--all]');
  console.error('Example: node capture.js "https://uzum.uz/ru/category/makiyazh--10091"');
  process.exit(1);
}

// ─── Output dir ──────────────────────────────────────────────────────────────
const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });

const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
let counter = 0;

// ─── Qaysi responselarni ushlash ─────────────────────────────────────────────
function shouldCapture(url) {
  if (captureAll) {
    // Barcha JSON response'lar
    return url.includes('uzum.uz');
  }
  return (
    url.includes('graphql.uzum.uz') ||
    url.includes('/api/graphql') ||
    url.includes('api.uzum.uz/api/v') // REST API ham
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n🚀 Uzum Capture`);
  console.log(`   URL     : ${targetUrl}`);
  console.log(`   Headless: ${headless}`);
  console.log(`   Output  : ${outDir}\n`);

  const browser = await chromium.launch({
    headless,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled', // bot detection bypass
    ],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'ru-RU',
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: {
      'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
    },
  });

  const page = await context.newPage();

  // ─── Response listener ───────────────────────────────────────────────────
  page.on('response', async (response) => {
    const url = response.url();
    if (!shouldCapture(url)) return;

    const status = response.status();
    const method = response.request().method();

    let json = null;
    try {
      const contentType = response.headers()['content-type'] ?? '';
      if (!contentType.includes('json')) return; // faqat JSON
      json = await response.json();
    } catch {
      return; // JSON parse bo'lmadi — o'tkazib yuborish
    }

    counter++;
    const n = String(counter).padStart(3, '0');
    const base = `${ts}_${n}`;

    // JSON data
    const dataFile = path.join(outDir, `${base}.json`);
    fs.writeFileSync(dataFile, JSON.stringify(json, null, 2), 'utf8');

    // Metadata
    let postData = null;
    try { postData = response.request().postData(); } catch {}

    const meta = {
      n: counter,
      responseUrl: url,
      status,
      method,
      requestHeaders: response.request().headers(),
      responseHeaders: response.headers(),
      postData: postData ? tryParseJson(postData) : null,
      capturedAt: new Date().toISOString(),
    };
    const metaFile = path.join(outDir, `${base}.meta.json`);
    fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2), 'utf8');

    // Console log
    const shortUrl = url.replace('https://', '').slice(0, 70);
    const keys = json && typeof json === 'object' ? Object.keys(json).join(', ').slice(0, 60) : '';
    console.log(`  ✅ [${n}] ${status} ${method} ${shortUrl}`);
    if (keys) console.log(`        keys: ${keys}`);
  });

  // ─── Sahifani ochamiz ────────────────────────────────────────────────────
  console.log('📄 Sahifa yuklanmoqda...');
  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
  } catch {
    // networkidle timeout bo'lsa davom etamiz
    console.log('   (networkidle timeout — davom etamiz)');
  }

  console.log('✅ Sahifa yuklandi\n');

  // ─── Auto scroll ─────────────────────────────────────────────────────────
  console.log('📜 Auto-scroll (ko\'proq ma\'lumot yuklash uchun)...');
  for (let i = 1; i <= 5; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.5));
    await page.waitForTimeout(1500);
    console.log(`   scroll ${i}/5`);
  }

  // ─── Oxirgi kutish ───────────────────────────────────────────────────────
  console.log('\n⏳ 5 soniya kutilmoqda (late responses uchun)...');
  await page.waitForTimeout(5000);

  await browser.close();

  // ─── Natija ──────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`✅ Tugadi. ${counter} ta response saqlandi.`);
  console.log(`📁 ${outDir}`);

  if (counter === 0) {
    console.log('\n⚠️  Hech narsa ushlanapmadi.');
    console.log('   • --all flag qo\'shib qayta ishga tushiring');
    console.log('   • Yoki brauzer DevTools → Network → graphql filter bilan qo\'lda ko\'ring');
  } else {
    // Topilgan endpointlarni chiqarish
    const metaFiles = fs.readdirSync(outDir).filter(f => f.endsWith('.meta.json') && f.startsWith(ts));
    const urls = new Set();
    metaFiles.forEach(f => {
      try {
        const m = JSON.parse(fs.readFileSync(path.join(outDir, f), 'utf8'));
        const u = new URL(m.responseUrl);
        urls.add(`${m.method} ${u.origin}${u.pathname}`);
      } catch {}
    });
    console.log('\n📋 Topilgan endpointlar:');
    [...urls].forEach(u => console.log(`   ${u}`));
  }
})();

function tryParseJson(str) {
  try { return JSON.parse(str); } catch { return str; }
}
