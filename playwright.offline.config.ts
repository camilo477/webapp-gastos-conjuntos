import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/offline-e2e',workers: 1,fullyParallel: false,timeout: 120000,expect: { timeout: 20000 },
  outputDir: 'test-results/offline',reporter: [['list'],['json',{ outputFile: 'test-results/offline/results.json' }]],
  use: { baseURL: 'http://127.0.0.1:4191',serviceWorkers: 'allow',trace: 'retain-on-failure',screenshot: 'only-on-failure' },
  projects: [{ name: 'firefox',use: { browserName: 'firefox' } },{ name: 'chromium',use: { browserName: 'chromium',launchOptions: { chromiumSandbox: true } } },{ name: 'webkit',use: { browserName: 'webkit' } }],
  webServer: { command: 'node scripts/build-offline-e2e.mjs && node tests/e2e/server.mjs',url: 'http://127.0.0.1:4191',timeout: 120000,reuseExistingServer: false,env: { GASTOS_STATIC_ROOT: 'dist-e2e/offline',GASTOS_STATIC_PORT: '4191' } },
});
