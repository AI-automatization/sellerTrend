/**
 * Generate OG image (1200x630 PNG) from SVG template using Playwright.
 * Run: node scripts/generate-og-image.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SVG_PATH = join(__dirname, '..', 'public', 'og-image.svg');
const PNG_PATH = join(__dirname, '..', 'public', 'og-image.png');

async function generate() {
  if (!existsSync(SVG_PATH)) {
    console.error('og-image.svg not found');
    process.exit(1);
  }

  const svgContent = readFileSync(SVG_PATH, 'utf-8');
  const html = `<!DOCTYPE html><html><head><style>body{margin:0;padding:0;}</style></head><body>${svgContent}</body></html>`;

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(html, { waitUntil: 'load' });

  const screenshot = await page.screenshot({ type: 'png', fullPage: false });
  writeFileSync(PNG_PATH, screenshot);

  await browser.close();
  console.log(`[og-image] Generated ${PNG_PATH} (${screenshot.length} bytes)`);
}

generate().catch((err) => {
  console.error('[og-image] Error:', err.message);
  process.exit(1);
});
