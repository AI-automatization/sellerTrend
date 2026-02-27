#!/usr/bin/env node
/**
 * Ventra — Bulk Product Analyzer
 * Playwright request API orqali mahsulot.md dagi barcha URL'larni tahlil qiladi.
 * Har xil user accountlaridan foydalanadi.
 *
 * Ishlatish: node scripts/analyze-all-products.mjs
 */

import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────
const API_BASE = 'http://localhost:3000/api/v1';
const WEB_URL  = 'http://localhost:5173';
const DELAY_MS = 1500; // delay between analyze calls (Uzum API rate limit)

// ── User Accounts ─────────────────────────────────────────────
const ACCOUNTS = [
  { email: 'admin@ventra.uz',                   password: 'Admin123!',  name: 'Admin' },
  { email: 'demo@ventra.uz',                    password: 'Demo123!',   name: 'Demo' },
  { email: 'aziz@toshkent-electronics.uz',      password: 'Test123!',   name: 'Aziz' },
  { email: 'malika@toshkent-electronics.uz',     password: 'Test123!',   name: 'Malika' },
  { email: 'jasur@samarkand-fashion.uz',         password: 'Test123!',   name: 'Jasur' },
  { email: 'nilufar@samarkand-fashion.uz',       password: 'Test123!',   name: 'Nilufar' },
  { email: 'sherzod@buxoro-cosmetics.uz',        password: 'Test123!',   name: 'Sherzod' },
  { email: 'gulnora@buxoro-cosmetics.uz',        password: 'Test123!',   name: 'Gulnora' },
  { email: 'bobur@andijon-foods.uz',             password: 'Test123!',   name: 'Bobur' },
  { email: 'dilshod@andijon-foods.uz',           password: 'Test123!',   name: 'Dilshod' },
  { email: 'sardor@namangan-tech.uz',            password: 'Test123!',   name: 'Sardor' },
  { email: 'kamola@namangan-tech.uz',            password: 'Test123!',   name: 'Kamola' },
];

// ── Parse URLs from mahsulot.md ───────────────────────────────
function parseUrls() {
  const filePath = resolve(__dirname, '..', 'mahsulot.md');
  const content = readFileSync(filePath, 'utf-8');
  const urlRegex = /https:\/\/uzum\.uz\/[^\s)]+/g;
  const urls = [...new Set(content.match(urlRegex) || [])];
  return urls;
}

// ── Distribute URLs across accounts ────────────────────────────
function distributeUrls(urls, accounts) {
  const batches = accounts.map(acc => ({ ...acc, urls: [] }));
  urls.forEach((url, i) => {
    batches[i % accounts.length].urls.push(url);
  });
  return batches;
}

// ── Login and get JWT token ────────────────────────────────────
async function login(request, email, password) {
  const res = await request.post(`${API_BASE}/auth/login`, {
    data: { email, password },
  });
  if (res.status() !== 201 && res.status() !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status()} ${res.statusText()}`);
  }
  const body = await res.json();
  return body.access_token;
}

// ── Analyze a single URL ───────────────────────────────────────
async function analyzeUrl(request, token, url) {
  const res = await request.post(`${API_BASE}/uzum/analyze`, {
    data: { url },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status() === 402) {
    return { error: 'BILLING', message: "To'lov yetarli emas" };
  }
  if (res.status() !== 201 && res.status() !== 200) {
    const text = await res.text();
    return { error: 'FAILED', message: `${res.status()} — ${text.slice(0, 200)}` };
  }
  return await res.json();
}

// ── Track a product ────────────────────────────────────────────
async function trackProduct(request, token, productId) {
  const res = await request.post(`${API_BASE}/products/${productId}/track`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.status() === 200 || res.status() === 201;
}

// ── Sleep helper ───────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Progress bar ───────────────────────────────────────────────
function progressBar(current, total, width = 30) {
  const pct = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  return `[${bar}] ${pct}% (${current}/${total})`;
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   VENTRA — Bulk Product Analyzer (Playwright API)   ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // 1. Parse URLs
  const allUrls = parseUrls();
  console.log(`📦 Jami URL'lar: ${allUrls.length}\n`);

  if (allUrls.length === 0) {
    console.log('❌ mahsulot.md da URL topilmadi!');
    process.exit(1);
  }

  // 2. Distribute across accounts
  const batches = distributeUrls(allUrls, ACCOUNTS);
  console.log('👥 Account taqsimoti:');
  for (const b of batches) {
    console.log(`   ${b.name.padEnd(12)} → ${b.urls.length} ta URL`);
  }
  console.log('');

  // 3. Launch Playwright
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const request = context.request;

  // 4. Process each account
  const results = {
    success: 0,
    tracked: 0,
    failed: 0,
    billing: 0,
    errors: [],
  };

  let globalIndex = 0;

  for (const batch of batches) {
    if (batch.urls.length === 0) continue;

    console.log(`\n${'─'.repeat(55)}`);
    console.log(`👤 ${batch.name} (${batch.email})`);
    console.log(`   ${batch.urls.length} ta mahsulot tahlil qilinadi...\n`);

    // Login
    let token;
    try {
      token = await login(request, batch.email, batch.password);
      console.log(`   ✅ Login muvaffaqiyatli\n`);
    } catch (err) {
      console.log(`   ❌ Login xato: ${err.message}`);
      console.log(`   ⏭  Bu account o'tkazildi\n`);
      results.failed += batch.urls.length;
      results.errors.push(...batch.urls.map(u => ({ url: u, error: 'LOGIN_FAILED', account: batch.email })));
      globalIndex += batch.urls.length;
      continue;
    }

    // Analyze each URL
    for (let i = 0; i < batch.urls.length; i++) {
      const url = batch.urls[i];
      globalIndex++;
      process.stdout.write(`   ${progressBar(globalIndex, allUrls.length)} `);

      try {
        const data = await analyzeUrl(request, token, url);

        if (data.error === 'BILLING') {
          console.log(`💰 BILLING — ${batch.name}`);
          results.billing++;
          results.errors.push({ url, error: 'BILLING', account: batch.email });
          // Switch to next account — billing exhausted
          console.log(`   ⚠  Balance tugadi, qolgan URL'lar keyingi accountga o'tadi`);
          // Re-distribute remaining URLs
          const remaining = batch.urls.slice(i + 1);
          if (remaining.length > 0) {
            const nextBatchIdx = batches.indexOf(batch) + 1;
            if (nextBatchIdx < batches.length) {
              batches[nextBatchIdx].urls.push(...remaining);
              console.log(`   ➡  ${remaining.length} ta URL ${batches[nextBatchIdx].name} ga berildi`);
            }
          }
          break;
        }

        if (data.error) {
          console.log(`❌ ${data.message?.slice(0, 60)}`);
          results.failed++;
          results.errors.push({ url, error: data.message, account: batch.email });
        } else {
          // Track the product
          const tracked = await trackProduct(request, token, data.product_id);
          const scoreColor = data.score >= 6 ? '🟢' : data.score >= 4 ? '🟡' : '⚪';
          console.log(
            `${scoreColor} ${data.title?.slice(0, 35).padEnd(35)} | Score: ${data.score?.toFixed(2)} | Orders: ${data.orders_quantity}`
          );
          results.success++;
          if (tracked) results.tracked++;
        }
      } catch (err) {
        console.log(`❌ ${err.message?.slice(0, 60)}`);
        results.failed++;
        results.errors.push({ url, error: err.message, account: batch.email });
      }

      // Rate limit delay
      if (i < batch.urls.length - 1) {
        await sleep(DELAY_MS);
      }
    }
  }

  // 5. Cleanup
  await context.close();
  await browser.close();

  // 6. Summary
  console.log(`\n${'═'.repeat(55)}`);
  console.log('📊 NATIJA:');
  console.log(`   ✅ Muvaffaqiyatli tahlil: ${results.success}`);
  console.log(`   📌 Kuzatuvga qo'shilgan:  ${results.tracked}`);
  console.log(`   ❌ Xato:                   ${results.failed}`);
  console.log(`   💰 Billing xato:           ${results.billing}`);
  console.log(`   📦 Jami:                   ${allUrls.length}`);
  console.log(`${'═'.repeat(55)}\n`);

  if (results.errors.length > 0) {
    console.log('⚠  Xatolar ro\'yxati:');
    for (const e of results.errors.slice(0, 20)) {
      console.log(`   ${e.account} | ${e.error} | ${e.url}`);
    }
    if (results.errors.length > 20) {
      console.log(`   ... va yana ${results.errors.length - 20} ta xato`);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
