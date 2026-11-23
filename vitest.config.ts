import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { 'virtual:pwa-register/react': fileURLToPath(new URL('./tests/pwa-register.ts', import.meta.url)) } },
  test: {
    restoreMocks: true,
    projects: [
      { extends: true, test: { name: 'domain', environment: 'node', include: ['src/domain/**/*.test.ts'], setupFiles: [] } },
      { extends: true, test: { name: 'ui', environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'], exclude: ['src/domain/**'], setupFiles: ['tests/setup.ts'] } },
    ],
  },
});
