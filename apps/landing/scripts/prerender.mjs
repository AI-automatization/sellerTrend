/**
 * Prerender script — renders the SPA to static HTML so crawlers see full content.
 *
 * How it works:
 * 1. Starts a local HTTP server serving the dist/ folder
 * 2. Opens Playwright Chromium and navigates to the page
 * 3. Waits for the React app to fully render (footer visible)
 * 4. Extracts the rendered HTML from <div id="root">
 * 5. Writes the prerendered content back into dist/index.html
 * 6. Result: dist/index.html has full HTML content (not empty <div id="root"></div>)
 */

import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST_DIR = join(__dirname, '..', 'dist');
const INDEX_PATH = join(DIST_DIR, 'index.html');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
};

if (!existsSync(INDEX_PATH)) {
  console.error('dist/index.html not found. Run vite build first.');
  process.exit(1);
}

// Start a minimal static file server
function startServer(port) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let filePath = join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);

      // SPA fallback
      if (!existsSync(filePath)) {
        filePath = INDEX_PATH;
      }

      try {
        const content = readFileSync(filePath);
        const ext = extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(port, '127.0.0.1', () => {
      console.log(`[prerender] Static server on http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

async function prerender() {
  const PORT = 4399;
  const server = await startServer(PORT);

  let browser;
  try {
    // Dynamic import — playwright is a devDependency
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log('[prerender] Navigating to page...');
    await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'networkidle' });

    // Wait for the React app to fully render — footer is the last section
    await page.waitForSelector('footer', { timeout: 15000 });

    // Small delay to let final animations/effects settle
    await page.waitForTimeout(500);

    console.log('[prerender] Extracting rendered HTML...');

    // Get the rendered content inside <div id="root">
    const rootInnerHtml = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? root.innerHTML : '';
    });

    if (!rootInnerHtml || rootInnerHtml.length < 100) {
      console.error('[prerender] Rendered content too short, aborting.');
      process.exit(1);
    }

    // XSS guard — ensure rendered content cannot break document structure
    if (rootInnerHtml.includes('</html>') || rootInnerHtml.includes('</body>') || rootInnerHtml.includes('</head>')) {
      console.error('[prerender] Rendered HTML contains suspicious structural tags, aborting.');
      process.exit(1);
    }

    // Read the original dist/index.html and replace the empty root div
    let html = readFileSync(INDEX_PATH, 'utf-8');

    // Replace <div id="root"></div> with <div id="root">...rendered content...</div>
    html = html.replace(
      /<div id="root"><\/div>/,
      `<div id="root">${rootInnerHtml}</div>`
    );

    writeFileSync(INDEX_PATH, html, 'utf-8');

    // Verify
    const finalHtml = readFileSync(INDEX_PATH, 'utf-8');
    const h1Count = (finalHtml.match(/<h1[\s>]/g) || []).length;
    const contentLength = finalHtml.length;

    console.log(`[prerender] Done! index.html: ${contentLength} bytes, ${h1Count} <h1> tag(s)`);

    if (h1Count === 0) {
      console.warn('[prerender] WARNING: No <h1> found in prerendered HTML!');
    }
  } catch (err) {
    console.error('[prerender] Error:', err.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

prerender();
