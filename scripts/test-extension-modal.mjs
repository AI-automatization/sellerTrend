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
  console.log('EXTENSION MODAL TEST — AUTO-CLOSE BUG');
  console.log('='.repeat(70));
  console.log('');

  let browser = null;
  let page = null;

  try {
    console.log('1. Launching browser with extension...');
    browser = await chromium.launchPersistentContext(
      path.join(__dirname, '../.test-extension-modal-profile'),
      {
        headless: false,
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
          '--disable-blink-features=AutomationControlled',
        ],
        viewport: { width: 1280, height: 800 },
      }
    );
    console.log('   ✓ Browser launched\n');

    console.log('2. Navigating to uzum.uz product page...');
    page = browser.pages()[0] || (await browser.newPage());

    // Navigate to a product page
    const productUrl = 'https://uzum.uz/uz/product/smartfon-samsung-galaxy-a15-256gb-6gb-2180897';
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      .catch(e => console.log('   ⚠ Navigation warning:', e.message));

    await page.waitForTimeout(2000);
    console.log('   ✓ Product page loaded\n');

    // Take screenshot of product page
    console.log('3. Taking screenshot of product page...');
    const ss1 = path.join(screenshotDir, 'modal-test-01-product-page.png');
    await page.screenshot({ path: ss1, fullPage: false });
    console.log(`   ✓ Screenshot: modal-test-01-product-page.png\n`);

    // Open extension popup
    console.log('4. Opening extension popup...');
    // Get extension popup URL
    const targets = await page.context().browser().backgroundPages();
    console.log(`   Found ${targets.length} background pages`);

    // Try to access extension popup by opening new page with chrome-extension URL
    // First, get the extension ID from the loaded extensions
    const extensionPages = await page.context().pages();
    console.log(`   Total pages: ${extensionPages.length}`);

    // For now, try to open extension as a popup by simulating a click
    // We'll navigate to the extension popup directly
    const newPage = await browser.newPage();
    const manifest = JSON.parse(fs.readFileSync(path.join(extensionPath, 'manifest.json'), 'utf8'));
    console.log(`   Extension: ${manifest.name}\n`);

    // Try finding the popup URL - in Plasmo it's usually the first page
    let popupUrl = null;
    const extensionId = extensionPath.split('\\').pop().split('-').pop(); // Rough extraction

    // Alternative: Try to find popup.html in extension
    // For now, let's take a different approach - watch the console and logs

    console.log('5. Setting up console message listener...');
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[')) {
        consoleLogs.push(text);
        console.log(`   Console: ${text}`);
      }
    });

    page.on('pageerror', err => {
      console.error(`   PageError:`, err);
    });

    console.log('');
    console.log('6. Waiting for extension popup to be accessible...');
    await page.waitForTimeout(3000);

    // Check if we can find the extension popup in available pages
    let popupPage = null;
    const allPages = browser.contexts()[0].pages();
    for (const p of allPages) {
      const url = p.url();
      if (url.includes('popup') || url.includes('chrome-extension')) {
        console.log(`   Found extension page: ${url.substring(0, 60)}...`);
        popupPage = p;
        break;
      }
    }

    if (!popupPage) {
      console.log('   ⚠ Could not find popup page directly');
      console.log('   Creating new page and navigating to product with extension...\n');

      // The extension should be active on this product page
      // Check for extension button on the page
      const extensionButton = await page.locator('[data-testid="extension-button"], .extension-btn, .ventra-btn')
        .first()
        .isVisible()
        .catch(() => false);

      console.log(`   Extension button visible: ${extensionButton}`);
      console.log('   Taking screenshot of page with extension...');
      const ss2 = path.join(screenshotDir, 'modal-test-02-product-with-extension.png');
      await page.screenshot({ path: ss2, fullPage: false });
      console.log(`   ✓ Screenshot: modal-test-02-product-with-extension.png\n`);
    }

    console.log('7. Checking network requests and timing...');
    const requests = [];
    page.on('request', req => {
      if (req.url().includes('quick-score') || req.url().includes('api')) {
        const timestamp = new Date().toLocaleTimeString();
        requests.push(`[${timestamp}] ${req.method()} ${req.url().substring(0, 80)}`);
      }
    });

    page.on('response', res => {
      if (res.url().includes('quick-score') || res.url().includes('api')) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`   Response: [${timestamp}] ${res.status()} ${res.url().substring(0, 80)}`);
      }
    });

    console.log('');
    console.log('8. Waiting and monitoring for auto-close behavior...');
    console.log('   (Observing for ~15 seconds for modal behavior)');

    const startTime = Date.now();
    const modalStates = [];

    // Check if modal exists and track its state
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(500);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      // Try to detect modal
      const hasDialog = await page.locator('dialog').isVisible().catch(() => false);
      const hasModal = await page.locator('.modal').isVisible().catch(() => false);
      const hasLoading = await page.locator('.loading').isVisible().catch(() => false);

      const state = { time: elapsed, dialog: hasDialog, modal: hasModal, loading: hasLoading };
      modalStates.push(state);

      if (i % 4 === 0) {
        console.log(`   [${elapsed}s] modal=${hasModal} dialog=${hasDialog} loading=${hasLoading}`);
      }
    }

    console.log('');
    console.log('9. Taking final screenshot...');
    const ss3 = path.join(screenshotDir, 'modal-test-03-final-state.png');
    await page.screenshot({ path: ss3, fullPage: false });
    console.log(`   ✓ Screenshot: modal-test-03-final-state.png\n`);

    console.log('='.repeat(70));
    console.log('TEST RESULTS');
    console.log('='.repeat(70));
    console.log('');
    console.log('Modal State Timeline:');
    modalStates.forEach((state, idx) => {
      if (idx % 4 === 0) {
        console.log(`  [${state.time}s] modal=${state.modal} dialog=${state.dialog} loading=${state.loading}`);
      }
    });

    if (consoleLogs.length > 0) {
      console.log('');
      console.log('Extension Console Logs:');
      consoleLogs.slice(0, 10).forEach(log => console.log(`  ${log}`));
    }

    console.log('');
    console.log('Network Requests:');
    requests.slice(0, 5).forEach(req => console.log(`  ${req}`));

    console.log('');
    console.log('='.repeat(70));
    console.log('Screenshots saved to: screenshots/');
    console.log('  - modal-test-01-product-page.png');
    console.log('  - modal-test-02-product-with-extension.png');
    console.log('  - modal-test-03-final-state.png');
    console.log('');
    console.log('Browser will stay open for 10 seconds...');
    console.log('');

    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testExtensionModal();
