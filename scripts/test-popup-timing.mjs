import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(path.join(__dirname, '../apps/extension/build/chrome-mv3-prod'));
const screenshotDir = path.join(__dirname, '../screenshots');

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function testPopupTiming() {
  console.log('='.repeat(70));
  console.log('POPUP TIMING TEST — Modal Auto-Close');
  console.log('='.repeat(70));
  console.log('');

  let browser = null;

  try {
    console.log('1. Launching browser...');
    browser = await chromium.launchPersistentContext(
      path.join(__dirname, '../.test-popup-timing-profile'),
      {
        headless: false,
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
        ],
        viewport: { width: 1280, height: 800 },
      }
    );
    console.log('   ✓ Browser launched\n');

    const page = browser.pages()[0];

    console.log('2. Navigating to product page...');
    await page.goto('https://uzum.uz/uz/product/smartfon-samsung-galaxy-a15-256gb-6gb-2180897', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    }).catch(e => console.log('   Note:', e.message));

    await page.waitForTimeout(2000);
    console.log('   ✓ Product page loaded\n');

    // Set up listener for all console logs
    const logs = [];
    const errors = [];

    page.on('console', msg => {
      const text = msg.text();
      const level = msg.type();
      const timestamp = new Date().toLocaleTimeString('uz-UZ', { hour12: false });
      const logEntry = `[${timestamp}] ${text}`;

      if (level === 'error') {
        errors.push(text);
        console.error(`   ❌ ERROR: ${text}`);
      } else if (text.includes('quick-score') || text.includes('Modal') || text.includes('modal')) {
        logs.push(logEntry);
        console.log(`   📋 ${logEntry}`);
      }
    });

    page.on('pageerror', err => {
      console.error(`   💥 PageError: ${err.message}`);
    });

    console.log('3. Waiting for user to open extension popup...');
    console.log('   (You have 30 seconds to:)');
    console.log('   1. Click extension icon');
    console.log('   2. Click "📊 Tez Tahlil" button');
    console.log('   3. Observe what happens to the modal');
    console.log('');

    // Wait and monitor for 30 seconds
    const startTime = Date.now();
    let lastLogCount = 0;

    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(500);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      // Show progress every 3 seconds
      if (i % 6 === 0) {
        const newLogs = logs.length - lastLogCount;
        console.log(`   [${elapsed}s] Waiting... (new logs: ${newLogs})`);
        lastLogCount = logs.length;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n4. Test duration: ${duration}s\n`);

    // Take final screenshot
    console.log('5. Taking final screenshot...');
    const screenshot = path.join(screenshotDir, 'popup-timing-final.png');
    await page.screenshot({ path: screenshot, fullPage: false });
    console.log(`   ✓ Saved: popup-timing-final.png\n`);

    console.log('='.repeat(70));
    console.log('ANALYSIS');
    console.log('='.repeat(70));
    console.log('');
    console.log('Console logs with "modal", "quick-score", or "Modal":');
    if (logs.length === 0) {
      console.log('  (No logs found - extension may not have been triggered)');
    } else {
      logs.forEach(log => console.log(`  ${log}`));
    }

    if (errors.length > 0) {
      console.log('\nErrors encountered:');
      errors.forEach(err => console.log(`  ❌ ${err}`));
    }

    console.log('\n' + '='.repeat(70));
    console.log('NEXT STEPS');
    console.log('='.repeat(70));
    console.log('');
    console.log('Please check the screenshot at:');
    console.log(`  ${screenshot}`);
    console.log('');
    console.log('And check the console logs above to see:');
    console.log('  1. When modal opened');
    console.log('  2. When loading started');
    console.log('  3. If error occurred (~1 sec)');
    console.log('  4. If modal closed automatically');
    console.log('');

    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testPopupTiming();
