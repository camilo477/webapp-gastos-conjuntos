import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/emulator-e2e', workers: 1, fullyParallel: false, timeout: 60000,
  outputDir: 'test-results/access',
  expect: { timeout: 15000 },
  reporter: [['list'],['json',{ outputFile: 'test-results/access/results.json' }],['html',{ outputFolder: 'playwright-report/emulators', open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4184', serviceWorkers: 'block', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', launchOptions: { chromiumSandbox: true } } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: {
    command: 'npm run dev -- --port 4184 --strictPort', url: 'http://127.0.0.1:4184', reuseExistingServer: false,
    env: { VITE_FIREBASE_MODE: 'emulators', VITE_FIREBASE_PROJECT_ID: 'demo-gastos-compartidos', VITE_FIREBASE_API_KEY: 'demo-not-a-real-api-key', VITE_FIREBASE_APP_ID: 'demo-not-a-real-app-id', VITE_FIREBASE_AUTH_DOMAIN: 'localhost', VITE_FIREBASE_EMULATOR_HOST: '127.0.0.1', VITE_FIREBASE_AUTH_EMULATOR_PORT: '9199', VITE_FIREBASE_FIRESTORE_EMULATOR_PORT: '8180' },
  },
});
