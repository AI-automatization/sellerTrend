import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 0,
  /* Run projects sequentially to avoid auth rate-limiting */
  workers: 1,
  projects: [
    {
      name: 'api',
      testMatch: /api\/.*/,
      use: {
        baseURL: 'http://localhost:3000',
        extraHTTPHeaders: { 'Content-Type': 'application/json' },
      },
    },
    {
      name: 'ui-desktop',
      testMatch: /ui\/.*/,
      dependencies: ['api'],
      use: {
        baseURL: 'http://localhost:5173',
        ...devices['Desktop Chrome'],
        screenshot: 'only-on-failure',
      },
    },
    {
      name: 'ui-mobile',
      testMatch: /ui\/.*/,
      dependencies: ['ui-desktop'],
      use: {
        baseURL: 'http://localhost:5173',
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        screenshot: 'only-on-failure',
      },
    },
  ],
  reporter: [['list']],
  outputDir: './test-results',
});
