/**
 * Seed script: 10 users × 20 product URLs = 200 analyses
 * Usage: node scripts/seed-test-data.mjs
 * Resume mode: node scripts/seed-test-data.mjs --from=9   (start from user 9)
 */

import { readFileSync } from 'fs';

const API = 'https://diligent-courage-production.up.railway.app/api/v1';
const ADMIN = { email: 'admin@uzum-trend.uz', password: 'Admin123!' };
const DEPOSIT_AMOUNT = 500000;
const DELAY_MS = 4000; // 4s between analyze calls
const FETCH_TIMEOUT = 60000; // 60s timeout per request
const MAX_RETRIES = 3;

// Parse --from=N flag for resume mode
const fromArg = process.argv.find(a => a.startsWith('--from='));
const START_FROM = fromArg ? parseInt(fromArg.split('=')[1]) - 1 : 0; // 0-indexed

const users = [
  { email: 'technostar@ventra.uz', password: 'TestPass123!', company_name: 'TechnoStar UZ' },
  { email: 'beautyline@ventra.uz', password: 'TestPass123!', company_name: 'BeautyLine Pro' },
  { email: 'fashionhub@ventra.uz', password: 'TestPass123!', company_name: 'Fashion Hub' },
  { email: 'kitobxon@ventra.uz', password: 'TestPass123!', company_name: 'Kitobxon Store' },
  { email: 'sportmax@ventra.uz', password: 'TestPass123!', company_name: 'SportMax UZ' },
  { email: 'oshxonaplus@ventra.uz', password: 'TestPass123!', company_name: 'Oshxona Plus' },
  { email: 'digitalshop@ventra.uz', password: 'TestPass123!', company_name: 'Digital Shop' },
  { email: 'bolalar@ventra.uz', password: 'TestPass123!', company_name: 'Bolalar Dunyosi' },
  { email: 'avtoparts@ventra.uz', password: 'TestPass123!', company_name: 'Avto Parts UZ' },
  { email: 'homeplus@ventra.uz', password: 'TestPass123!', company_name: 'Home Plus Store' },
];

// Extract all Uzum product URLs from mahsulot.md
const content = readFileSync('./mahsulot.md', 'utf-8');
const allUrls = [...content.matchAll(/https:\/\/uzum\.uz[^\s)]+/g)]
  .map(m => m[0].replace(/\?utm_[^\s]*/g, '').replace(/\?skuid=[^\s&]*/gi, ''))
  .filter((url, i, arr) => arr.indexOf(url) === i);

console.log(`Found ${allUrls.length} unique URLs`);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function api(path, options = {}, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

      const res = await fetch(`${API}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      clearTimeout(timeout);

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }

      // Don't retry 400/401/404 — these won't succeed on retry
      if (res.status === 400 || res.status === 401 || res.status === 404) {
        return { status: res.status, data, ok: false };
      }

      if (!res.ok && res.status !== 409) {
        throw new Error(`HTTP ${res.status}: ${JSON.stringify(data).substring(0, 150)}`);
      }
      return { status: res.status, data, ok: true };
    } catch (e) {
      if (attempt < retries) {
        const wait = 5000 * attempt;
        console.log(`   [retry ${attempt}] ${e.message.substring(0, 50)}... waiting ${wait / 1000}s`);
        await sleep(wait);
        continue;
      }
      throw e;
    }
  }
}

async function main() {
  console.log('\n=== VENTRA Seed: 10 users x 20 products ===\n');

  // 0. Login admin
  console.log('0) Admin login...');
  const adminLogin = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify(ADMIN),
  });
  if (!adminLogin.ok) {
    throw new Error('Admin login failed: ' + JSON.stringify(adminLogin.data));
  }
  const adminToken = adminLogin.data.access_token;
  console.log(`   Admin logged in (role: ${JSON.parse(atob(adminToken.split('.')[1])).role})\n`);

  // 1. Register + login users
  console.log('1) Users setup...');
  const userTokens = [];

  for (const user of users) {
    await api('/auth/register', { method: 'POST', body: JSON.stringify(user) });

    const loginRes = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: user.email, password: user.password }),
    });
    const token = loginRes.data.access_token;
    const accountId = loginRes.data.account_id;
    userTokens.push({ email: user.email, token, accountId });

    process.stdout.write('.');
  }
  console.log(`\n   ${userTokens.length} users ready\n`);

  // 1.5 Deposit balance to each user
  console.log('1.5) Depositing balance...');
  for (const { email, accountId } of userTokens) {
    try {
      const depositRes = await api(`/admin/accounts/${accountId}/deposit`, {
        method: 'POST',
        body: JSON.stringify({ amount: DEPOSIT_AMOUNT, description: 'Seed deposit' }),
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (depositRes.ok) {
        process.stdout.write('+');
      } else {
        console.log(`\n   WARN: deposit failed for ${email}: ${JSON.stringify(depositRes.data).substring(0, 80)}`);
      }
    } catch (e) {
      console.log(`\n   ERR: deposit failed for ${email}: ${e.message.substring(0, 60)}`);
    }
  }
  console.log(`\n   Deposits done\n`);

  // 2. Analyze (with auto-relogin on 401)
  console.log('2) Analyzing...\n');
  if (START_FROM > 0) console.log(`   Resuming from user ${START_FROM + 1}\n`);
  let ok = 0, fail = 0, notFound = 0;

  for (let i = START_FROM; i < userTokens.length; i++) {
    let { email, token } = userTokens[i];
    const password = users[i].password;
    const userUrls = allUrls.slice(i * 20, (i + 1) * 20);

    console.log(`--- [${i + 1}/10] ${email} (${userUrls.length} URLs) ---`);

    for (let j = 0; j < userUrls.length; j++) {
      const url = userUrls[j];
      const slug = url.split('/').pop().substring(0, 30);

      try {
        let result = await api('/uzum/analyze', {
          method: 'POST',
          body: JSON.stringify({ url }),
          headers: { Authorization: `Bearer ${token}` },
        });

        // Auto-relogin on 401 (JWT expired)
        if (result.status === 401) {
          console.log(`  [relogin] Token expired for ${email}, refreshing...`);
          const relogin = await api('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          });
          if (relogin.ok) {
            token = relogin.data.access_token;
            userTokens[i].token = token;
            // Retry the analyze call with fresh token
            result = await api('/uzum/analyze', {
              method: 'POST',
              body: JSON.stringify({ url }),
              headers: { Authorization: `Bearer ${token}` },
            });
          } else {
            console.log(`  ${j + 1}. ERR ${slug} | relogin failed`);
            fail++;
            continue;
          }
        }

        if (!result.ok) {
          console.log(`  ${j + 1}. SKIP ${slug} (not found on Uzum)`);
          notFound++;
        } else {
          const d = result.data;
          const score = d.score ?? d.product?.score ?? '?';
          console.log(`  ${j + 1}. OK score=${score} | ${slug}`);
          ok++;
        }
      } catch (e) {
        console.log(`  ${j + 1}. ERR ${slug} | ${e.message.substring(0, 60)}`);
        fail++;
      }

      if (j < userUrls.length - 1) await sleep(DELAY_MS);
    }

    console.log(`  >> Total so far: ${ok} ok / ${notFound} skip / ${fail} err\n`);
  }

  console.log('========= DONE =========');
  console.log(`OK: ${ok} | Not found: ${notFound} | Error: ${fail} | Total: ${ok + notFound + fail}`);
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
