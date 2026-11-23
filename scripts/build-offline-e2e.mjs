import { spawnSync } from 'node:child_process';
for (const version of ['a','b']) {
  const result = spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--mode','emulator-pwa','--outDir',`dist-e2e/offline/${version}`,'--emptyOutDir'],{
    stdio: 'inherit',env: { ...process.env,GASTOS_BUILD_ID: `offline-${version}`,VITE_FIREBASE_MODE: 'emulators',VITE_FIREBASE_PROJECT_ID: 'demo-gastos-compartidos',VITE_FIREBASE_API_KEY: 'demo-not-a-real-api-key',VITE_FIREBASE_APP_ID: 'demo-not-a-real-app-id',VITE_FIREBASE_AUTH_DOMAIN: 'localhost',VITE_FIREBASE_EMULATOR_HOST: '127.0.0.1',VITE_FIREBASE_AUTH_EMULATOR_PORT: '9199',VITE_FIREBASE_FIRESTORE_EMULATOR_PORT: '8180' },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
