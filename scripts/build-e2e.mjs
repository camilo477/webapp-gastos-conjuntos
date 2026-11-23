import { spawnSync } from 'node:child_process';

for (const version of ['a', 'b']) {
  const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', `dist-e2e/${version}`, '--emptyOutDir'], {
    stdio: 'inherit', env: { ...process.env, GASTOS_BUILD_ID: version, VITE_FIREBASE_MODE: 'demo' },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
