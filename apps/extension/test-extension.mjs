/**
 * Chrome Extension E2E test — Playwright bilan.
 * Extension ni yuklaydi, login qiladi, overlay ni tekshiradi.
 */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.join(__dirname, "build", "chrome-mv3-dev");
const SCREENSHOTS_DIR = path.join(__dirname, "..", "..", "screenshots");

const API_CREDS = { email: "admin@ventra.uz", password: "Admin123!" };

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("1. Launching Chrome with extension...");
  console.log("   Extension path:", EXTENSION_PATH);

  // Launch with extension — requires persistent context
  const context = await chromium.launchPersistentContext("", {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      "--no-first-run",
      "--disable-default-apps",
    ],
  });

  // Wait for service worker to register
  let serviceWorker;
  if (context.serviceWorkers().length === 0) {
    serviceWorker = await context.waitForEvent("serviceworker");
  } else {
    serviceWorker = context.serviceWorkers()[0];
  }

  // Extract extension ID from service worker URL
  const extensionId = serviceWorker.url().split("/")[2];
  console.log("   Extension ID:", extensionId);

  // ── Step 2: Login via popup ────────────────────────────
  console.log("\n2. Opening extension popup for login...");
  const popupPage = await context.newPage();
  await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
  await popupPage.waitForLoadState("domcontentloaded");
  await sleep(1000);

  // Take screenshot before login
  await popupPage.screenshot({
    path: path.join(SCREENSHOTS_DIR, "ext-01-popup-login.png"),
  });
  console.log("   Screenshot: ext-01-popup-login.png");

  // Fill login form
  const emailInput = popupPage.locator('input[type="email"]');
  const passwordInput = popupPage.locator('input[type="password"]');

  if ((await emailInput.count()) > 0) {
    await emailInput.fill(API_CREDS.email);
    await passwordInput.fill(API_CREDS.password);
    await popupPage.locator('button[type="submit"]').click();

    console.log("   Logging in...");
    await sleep(3000);

    await popupPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, "ext-02-popup-logged-in.png"),
    });
    console.log("   Screenshot: ext-02-popup-logged-in.png");
  } else {
    console.log("   Already logged in or different UI state");
    await popupPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, "ext-02-popup-state.png"),
    });
  }

  // ── Step 3: Product page test ──────────────────────────
  console.log("\n3. Opening Uzum product page...");
  const productPage = await context.newPage();
  await productPage.goto(
    "https://uzum.uz/uz/product/smartfon-ajib-x1-1176929",
    { waitUntil: "domcontentloaded", timeout: 30000 }
  );

  // Wait for page + extension content script to load
  console.log("   Waiting for page render + content script...");
  await sleep(5000);

  await productPage.screenshot({
    path: path.join(SCREENSHOTS_DIR, "ext-03-product-page.png"),
    fullPage: false,
  });
  console.log("   Screenshot: ext-03-product-page.png");

  // Check for VENTRA overlay in DOM
  const venturaOverlay = await productPage.evaluate(() => {
    // Check shadow DOM containers from Plasmo
    const plasmoEls = document.querySelectorAll("plasmo-csui");
    const results = [];
    plasmoEls.forEach((el) => {
      const shadow = el.shadowRoot;
      if (shadow) {
        const card = shadow.querySelector(".ventra-score-card");
        const hint = shadow.querySelector(".ventra-login-hint");
        results.push({
          hasScoreCard: !!card,
          hasLoginHint: !!hint,
          innerHTML: shadow.innerHTML.substring(0, 200),
        });
      }
    });
    return { plasmoCount: plasmoEls.length, overlays: results };
  });

  console.log("   Plasmo CSUI elements:", venturaOverlay.plasmoCount);
  venturaOverlay.overlays.forEach((o, i) => {
    console.log(`   Overlay ${i}:`, {
      scoreCard: o.hasScoreCard,
      loginHint: o.hasLoginHint,
    });
    if (o.innerHTML) console.log(`   HTML preview: ${o.innerHTML.substring(0, 100)}...`);
  });

  // ── Step 4: Category page test ─────────────────────────
  console.log("\n4. Opening Uzum category page...");
  const categoryPage = await context.newPage();
  await categoryPage.goto("https://uzum.uz/ru/category/smartfony--879", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  console.log("   Waiting for page render + badges...");
  await sleep(6000);

  await categoryPage.screenshot({
    path: path.join(SCREENSHOTS_DIR, "ext-04-category-page.png"),
    fullPage: false,
  });
  console.log("   Screenshot: ext-04-category-page.png");

  // Check for badges
  const badgeInfo = await categoryPage.evaluate(() => {
    const badges = document.querySelectorAll("[data-ventra-badge]");
    const cards = document.querySelectorAll(
      '[data-test-id="product-card--default"]'
    );
    return {
      totalCards: cards.length,
      badgesInjected: badges.length,
      firstBadgeText: badges[0]?.textContent ?? null,
    };
  });

  console.log("   Product cards found:", badgeInfo.totalCards);
  console.log("   Badges injected:", badgeInfo.badgesInjected);
  if (badgeInfo.firstBadgeText)
    console.log("   First badge:", badgeInfo.firstBadgeText);

  // ── Step 5: SPA navigation test ────────────────────────
  console.log("\n5. SPA navigation test (category → product)...");
  const firstProductLink = await categoryPage.evaluate(() => {
    const link = document.querySelector(
      '[data-test-id="product-card--default"] a[href*="/product/"]'
    );
    return link?.getAttribute("href") ?? null;
  });

  if (firstProductLink) {
    console.log("   Clicking product link:", firstProductLink);
    await categoryPage.click(
      '[data-test-id="product-card--default"] a[href*="/product/"]'
    );
    await sleep(5000);

    await categoryPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, "ext-05-spa-navigation.png"),
      fullPage: false,
    });
    console.log("   Screenshot: ext-05-spa-navigation.png");
  } else {
    console.log("   No product link found — skipping SPA test");
  }

  // ── Summary ────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════");
  console.log("NATIJA:");
  console.log("  Popup:    login form ko'rindi");
  console.log(
    `  Product:  ${venturaOverlay.overlays.some((o) => o.hasScoreCard) ? "ScoreCard KO'RINDI ✅" : venturaOverlay.overlays.some((o) => o.hasLoginHint) ? "Login hint KO'RINDI ⚠️ (login kerak)" : venturaOverlay.plasmoCount > 0 ? "Plasmo CSUI bor, lekin overlay yo'q ⚠️" : "Overlay TOPILMADI ❌"}`
  );
  console.log(
    `  Category: ${badgeInfo.badgesInjected} / ${badgeInfo.totalCards} badge ${badgeInfo.badgesInjected > 0 ? "✅" : "⚠️"}`
  );
  console.log("  Screenshots: screenshots/ papkada");
  console.log("═══════════════════════════════════════════");

  // Close
  console.log("\nBrauzer 10s dan keyin yopiladi...");
  await sleep(10000);
  await context.close();
}

main().catch((err) => {
  console.error("TEST XATOSI:", err);
  process.exit(1);
});
