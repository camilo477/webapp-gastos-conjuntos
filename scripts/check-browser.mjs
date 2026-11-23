import { stat } from 'node:fs/promises';
import { chromium, firefox, webkit } from '@playwright/test';

const name = process.argv[2];
if (!['chromium', 'firefox', 'webkit'].includes(name)) {
  throw new Error('Indica chromium, firefox o webkit.');
}
if (name === 'chromium' && process.env.CHROME_DEVEL_SANDBOX) {
  const helper = await stat(process.env.CHROME_DEVEL_SANDBOX);
  if (!helper.isFile() || helper.uid !== 0 || (helper.mode & 0o4000) === 0 || (helper.mode & 0o022) !== 0) {
    throw new Error('El helper de Chromium debe pertenecer a root, tener SUID y no permitir escritura de grupo/otros.');
  }
}

// Fail once for an infrastructure problem, before retrying every application test.
// The same sandbox setting is required by all three Playwright configurations.
const browser = await ({ chromium, firefox, webkit })[name].launch({
  ...(name === 'chromium' ? { chromiumSandbox: true } : {}), timeout: 20_000,
});
try {
  const page = await browser.newPage();
  await page.goto('data:text/html,<title>Browser preflight</title>');
  if (await page.title() !== 'Browser preflight') throw new Error('El navegador no pudo abrir una página.');
  console.log(`${name}: arranque y página comprobados; ${browser.version()}`);
} finally {
  await browser.close();
}
