// CI can use the runner's Chrome at its AppArmor-approved installation path.
// Local runs retain the exact Chromium revision installed by Playwright.
const requested = process.env.GASTOS_CHROMIUM_CHANNEL;
if (requested && requested !== 'chrome') throw new Error('GASTOS_CHROMIUM_CHANNEL solo admite chrome.');
export const chromiumChannel = requested || undefined;
export const browserProjects = [
  { name: 'chromium', use: { browserName: 'chromium' as const, channel: chromiumChannel, launchOptions: { chromiumSandbox: true } } },
  { name: 'firefox', use: { browserName: 'firefox' as const } },
  { name: 'webkit', use: { browserName: 'webkit' as const } },
];
