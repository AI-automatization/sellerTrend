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

async function testExtensionModal() {
  console.log('='.repeat(70));
  console.log('EXTENSION MODAL TEST — v2 (Simple Monitoring)');
  console.log('='.repeat(70));
  console.log('');

  let browser = null;
  const allLogs = [];

  try {
    console.log('1. Launching browser with extension...');
    browser = await chromium.launchPersistentContext(
      path.join(__dirname, '../.test-modal-profile-v2'),
      {
        headless: false,
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
        ],
        viewport: { width: 1280, height: 720 },
      }
    );
    console.log('   ✓ Browser launched\n');

    const page = browser.pages()[0];

    console.log('2. Setting up monitoring...');
    page.on('console', msg => {
      const text = msg.text();
      const timestamp = new Date().toLocaleTimeString();
      allLogs.push(`[${timestamp}] ${text}`);
      if (text.includes('modal') || text.includes('Modal') || text.includes('quick-score')) {
        console.log(`   Console: ${text}`);
      }
    });

    page.on('pageerror', err => {
      console.error(`   PageError: ${err.message}`);
    });

    console.log('   ✓ Console listener ready\n');

    console.log('3. Navigating to product page...');
    await page.goto('https://uzum.uz/uz/product/smartfon-samsung-galaxy-a15-256gb-6gb-2180897', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    }).catch(e => console.log('   Note:', e.message));

    await page.waitForTimeout(2000);
    console.log('   ✓ Product page loaded\n');

    // Screenshot
    console.log('4. Taking screenshot...');
    const ss1 = path.join(screenshotDir, 'modal-v2-01-before.png');
    await page.screenshot({ path: ss1 });
    console.log(`   ✓ Saved: modal-v2-01-before.png\n`);

    // Wait for extension to load and listen for any modal elements
    console.log('5. Monitoring DOM for modal elements...');

    // Listen for any DOM elements being added/removed
    let modalDetections = [];

    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(500);
      const elapsed = (i * 0.5).toFixed(1);

      try {
        // Check for various modal selectors
        const dialogExists = await page.evaluate(() => document.querySelector('dialog') !== null);
        const divModalExists = await page.evaluate(() => document.querySelector('.modal') !== null);
        const modalBoxExists = await page.evaluate(() => document.querySelector('.modal-box') !== null);
        const loadingExists = await page.evaluate(() => document.querySelector('.loading') !== null);

        modalDetections.push({
          time: elapsed,
          dialog: dialogExists,
          divModal: divModalExists,
          modalBox: modalBoxExists,
          loading: loadingExists,
        });

        if (i % 4 === 0) {
          console.log(`   [${elapsed}s] dialog=${dialogExists} modal=${divModalExists} loading=${loadingExists}`);
        }
      } catch (e) {
        console.log(`   [${elapsed}s] Error checking DOM:`, e.message);
      }
    }

    console.log('\n6. Taking final screenshot...');
    const ss2 = path.join(screenshotDir, 'modal-v2-02-after.png');
    await page.screenshot({ path: ss2 });
    console.log(`   ✓ Saved: modal-v2-02-after.png\n`);

    // Get all messages from extension
    console.log('7. Extension console messages captured:');
    const extensionMsgs = allLogs.filter(log => log.includes('[quick-score]') || log.includes('[Popup]') || log.includes('[Modal]'));
    if (extensionMsgs.length === 0) {
      console.log('   (No extension messages found - extension may not be active on this page)');
    } else {
      extensionMsgs.slice(0, 20).forEach(msg => console.log(`   ${msg}`));
    }

    console.log('\n' + '='.repeat(70));
    console.log('MODAL DETECTION TIMELINE');
    console.log('='.repeat(70));
    modalDetections.forEach((det, idx) => {
      if (idx % 4 === 0) {
        const state = [
          det.dialog ? '✓dialog' : ' dialog',
          det.divModal ? '✓modal' : ' modal',
          det.loading ? '✓load' : ' load',
        ].join(' ');
        console.log(`[${det.time}s] ${state}`);
      }
    });

    // Analyze: when did modal appear/disappear
    const firstModalTime = modalDetections.findIndex(d => d.divModal || d.modalBox);
    const lastModalTime = modalDetections.findLastIndex(d => d.divModal || d.modalBox);

    console.log('\n' + '='.repeat(70));
    console.log('ANALYSIS');
    console.log('='.repeat(70));
    console.log(`Modal first appeared at: ${firstModalTime >= 0 ? (firstModalTime * 0.5).toFixed(1) + 's' : 'Never'}`);
    console.log(`Modal last detected at: ${lastModalTime >= 0 ? (lastModalTime * 0.5).toFixed(1) + 's' : 'Never'}`);
    console.log(`Modal visible duration: ${firstModalTime >= 0 && lastModalTime >= 0 ? ((lastModalTime - firstModalTime) * 0.5).toFixed(1) + 's' : 'N/A'}`);

    console.log('\nExtension status:');
    console.log(`Total console messages: ${allLogs.length}`);
    console.log(`Extension messages: ${extensionMsgs.length}`);

    if (extensionMsgs.length === 0) {
      console.log('\n⚠ WARNING: Extension does not appear to be running on this page');
      console.log('  Possible reasons:');
      console.log('  1. Content script not injected');
      console.log('  2. Extension not loaded properly');
      console.log('  3. Product page is not recognized as product page');
    }

    console.log('\nScreenshots:');
    console.log(`  modal-v2-01-before.png`);
    console.log(`  modal-v2-02-after.png`);

    console.log('\nBrowser stays open for 10 seconds...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testExtensionModal();
