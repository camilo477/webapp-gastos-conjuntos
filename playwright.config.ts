import { defineConfig } from '@playwright/test';
import { browserProjects } from './playwright.browsers';

export default defineConfig({
  outputDir: 'test-results/shell',
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/e2e-results.json' }], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4173', serviceWorkers: 'allow', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: browserProjects,
  webServer: { command: 'node tests/e2e/server.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: false, timeout: 15_000 },
});
