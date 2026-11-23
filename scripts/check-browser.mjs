import { chromium, firefox, webkit } from '@playwright/test';
import { chromiumChannel } from '../playwright.browsers.ts';

const name = process.argv[2];
if (!['chromium', 'firefox', 'webkit'].includes(name)) {
  throw new Error('Indica chromium, firefox o webkit.');
}
// Fail once for an infrastructure problem, before retrying every application test.
// The same sandbox setting is required by all three Playwright configurations.
const browser = await ({ chromium, firefox, webkit })[name].launch({
  ...(name === 'chromium' ? { chromiumSandbox: true, channel: chromiumChannel } : {}), timeout: 20_000,
});
try {
  const page = await browser.newPage();
  await page.goto('data:text/html,<title>Browser preflight</title>');
  if (await page.title() !== 'Browser preflight') throw new Error('El navegador no pudo abrir una página.');
  console.log(`${name}${name === 'chromium' && chromiumChannel ? ` (${chromiumChannel})` : ''}: arranque y página comprobados; ${browser.version()}`);
} finally {
  await browser.close();
}
