import { defineConfig } from '@playwright/test';
import offline from './playwright.offline.config';
export default defineConfig({ ...offline,testDir: './tests/attachments-e2e',timeout: 120000,outputDir: 'test-results/attachments',reporter: [['list'],['json',{ outputFile: 'test-results/attachments/results.json' }]] });
