import { defineConfig } from '@playwright/test';
import { browserProjects } from './playwright.browsers';

export default defineConfig({
  testDir: './tests/emulator-e2e', workers: 1, fullyParallel: false, timeout: 60000,
  outputDir: 'test-results/access',
  expect: { timeout: 15000 },
  reporter: [['list'],['json',{ outputFile: 'test-results/access/results.json' }],['html',{ outputFolder: 'playwright-report/emulators', open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4184', serviceWorkers: 'block', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: browserProjects,
  webServer: {
    // Exercise the same compiled emulator PWA as offline/images, without Vite HMR.
    command: 'node scripts/build-offline-e2e.mjs && node tests/e2e/server.mjs', url: 'http://127.0.0.1:4184', timeout: 120000,reuseExistingServer: false,
    env: { GASTOS_STATIC_ROOT: 'dist-e2e/offline',GASTOS_STATIC_PORT: '4184' },
  },
});
