/**
 * Singleton BrowserPool — manages a single shared Chromium instance
 * across all scrapers (sourcing, discovery, weekly-scrape).
 *
 * On Railway (2GB RAM), each Chromium instance uses 300-600MB.
 * Running 2+ concurrent instances = OOM crash.
 *
 * Usage:
 *   const browser = await browserPool.getBrowser();
 *   const context = await browser.newContext({ ... });
 *   try {
 *     const page = await context.newPage();
 *     // ... scraping
 *   } finally {
 *     await context.close();
 *     await browserPool.release();
 *   }
 *
 * Each scraper creates its own BrowserContext for isolation
 * (separate cookies, sessions, anti-detection fingerprints).
 * The shared Browser process is kept alive between jobs
 * and only closed on process shutdown via browserPool.shutdown().
 */

import { chromium, Browser } from 'playwright';

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-extensions',
  '--single-process',
  '--disable-blink-features=AutomationControlled',
];

class BrowserPool {
  private static instance: BrowserPool;
  private browser: Browser | null = null;
  private launching: Promise<Browser> | null = null;
  private activeUsers = 0;

  static getInstance(): BrowserPool {
    if (!BrowserPool.instance) {
      BrowserPool.instance = new BrowserPool();
    }
    return BrowserPool.instance;
  }

  /**
   * Get (or launch) the shared Chromium browser.
   * Multiple callers may await this concurrently — only one launch occurs.
   */
  async getBrowser(): Promise<Browser> {
    this.activeUsers++;

    if (this.browser?.isConnected()) {
      return this.browser;
    }

    // Prevent concurrent launches — second caller awaits the same promise
    if (this.launching) {
      return this.launching;
    }

    this.launching = chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
      proxy: process.env.PROXY_URL ? { server: process.env.PROXY_URL } : undefined,
      args: LAUNCH_ARGS,
    });

    try {
      this.browser = await this.launching;
    } finally {
      this.launching = null;
    }

    // Auto-cleanup reference on unexpected disconnect (crash, OOM kill)
    this.browser.on('disconnected', () => {
      this.browser = null;
    });

    return this.browser;
  }

  /**
   * Signal that a scraper has finished using the browser.
   * Does NOT close the browser — kept alive for next job.
   */
  async release(): Promise<void> {
    this.activeUsers = Math.max(0, this.activeUsers - 1);
  }

  /** Number of scrapers currently holding a browser reference. */
  getActiveUsers(): number {
    return this.activeUsers;
  }

  /**
   * Forcefully close the shared browser.
   * Call on process shutdown (SIGTERM/SIGINT).
   */
  async shutdown(): Promise<void> {
    if (this.browser?.isConnected()) {
      await this.browser.close().catch(() => { /* already closed */ });
      this.browser = null;
    }
    this.activeUsers = 0;
  }
}

export const browserPool = BrowserPool.getInstance();
