import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = ['/', '/balance', '/actividad', '/viajes', '/gasto', '/presupuesto', '/personas'];
const viewports = [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }];

async function controlled(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
  });
}

async function noOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    width: innerWidth, scroll: document.documentElement.scrollWidth,
    elements: [...document.querySelectorAll('body *')].filter(element => {
      const rect = element.getBoundingClientRect(); return rect.right > innerWidth + 1 || rect.left < -1;
    }).map(element => `${element.tagName}.${element.className}`),
  }));
  expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width + 1);
}

test.beforeEach(async ({ request }) => { await request.post('/__test/version/a'); });

test('starts, navigates, preserves theme and displays missing Firebase settings', async ({ page }) => {
  const failures: string[] = [];
  page.on('pageerror', error => failures.push(error.message));
  await page.goto('/');
  await expect(page.getByText(/Fase 2 · datos ficticios/)).toBeVisible();
  await page.getByRole('combobox', { name: 'Tema' }).selectOption('dark');
  await page.getByRole('navigation', { name: 'Navegación principal', exact: true }).getByRole('link', { name: 'Balance', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Balance', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Registrar abono' })).toBeDisabled();
  await page.getByRole('link', { name: 'Sin sincronización' }).click();
  await expect(page.getByText('Firebase sin configurar', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#main')).toBeFocused();
  expect(failures).toEqual([]);
});

for (const viewport of viewports) for (const theme of ['light', 'dark']) {
  test(`responsive ${viewport.width}x${viewport.height} ${theme}`, async ({ page }, info) => {
    await page.setViewportSize(viewport); await page.goto('/');
    await page.getByRole('combobox', { name: 'Tema' }).selectOption(theme);
    for (const path of routes) {
      await page.goto(path); await expect(page.locator('h1')).toBeVisible(); await noOverflow(page);
      if (path === '/gasto') { await expect(page.getByRole('button', { name: 'Guardar gasto' })).toBeDisabled(); await expect(page.getByLabel('Concepto', { exact: true })).toBeDisabled(); }
      if (viewport.width <= 700 && path !== '/gasto') {
        const nav = page.getByRole('navigation', { name: 'Navegación principal móvil' }); await expect(nav).toBeVisible();
        const links = nav.getByRole('link');
        for (const link of await links.all()) { const rect = await link.boundingBox(); expect(rect!.height).toBeGreaterThanOrEqual(44); expect(rect!.width).toBeGreaterThanOrEqual(44); }
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        const last = await page.locator('main').evaluate(element => element.lastElementChild?.getBoundingClientRect().bottom ?? 0);
        const top = await nav.evaluate(element => element.getBoundingClientRect().top);
        expect(last).toBeLessThanOrEqual(top + 1);
      }
    }
    await page.goto('/');
    await page.screenshot({ path: info.outputPath(`home-${theme}.png`), fullPage: true });
  });
}

test('reflows long names, large amounts and enlarged text without hiding content', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 }); await page.goto('/');
  await page.locator('.movement-title').first().evaluate(element => { element.textContent = 'Almuerzo compartido con participantes y nombres de establecimientos muy largos'; });
  await page.locator('.movement-end').first().evaluate(element => { element.firstChild!.textContent = '$999.999.999.999'; });
  await page.evaluate(() => {
    const sizes = [...document.querySelectorAll<HTMLElement>('body *')].map(element => ({ element, size: parseFloat(getComputedStyle(element).fontSize) * 2 }));
    for (const { element, size } of sizes) element.style.fontSize = `${size}px`;
  });
  await noOverflow(page);
  await expect(page.getByText('$999.999.999.999', { exact: false })).toBeVisible();
});

test('supports keyboard focus, native dialog Escape and origin focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  expect(await focused.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
  const more = page.getByRole('button', { name: 'Más opciones', exact: true });
  await more.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible(); await expect(more).toBeFocused();
  await more.click(); await page.getByRole('dialog').getByRole('link', { name: 'Personas' }).click();
  await expect(page.getByRole('heading', { name: 'Personas', level: 1 })).toBeVisible();
  await expect(page.locator('#main')).toBeFocused();
});

test('passes automated accessibility checks on all available screens in both themes', async ({ page }) => {
  for (const theme of ['light', 'dark']) for (const path of routes) {
    await page.goto(path); await page.getByRole('combobox', { name: 'Tema' }).selectOption(theme);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations).toEqual([]);
  }
});

test('prepares a valid manifest and local icons; never contacts Firebase in demo mode', async ({ page }) => {
  const external: string[] = [];
  page.on('request', request => { if (new URL(request.url()).origin !== 'http://127.0.0.1:4173') external.push(request.url()); });
  await page.goto('/actividad'); await controlled(page);
  const manifest = await page.evaluate(async () => {
    const href = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')!.href;
    return await (await fetch(href)).json() as { display: string; start_url: string; icons: { src: string; sizes: string; purpose: string }[] };
  });
  expect(manifest.display).toBe('standalone'); expect(manifest.start_url).toBe('/');
  expect(manifest.icons.map(icon => icon.sizes)).toContain('192x192');
  expect(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons) expect(await page.evaluate(async path => {
    const image = new Image(); image.src = path; await image.decode(); return `${image.naturalWidth}x${image.naturalHeight}`;
  }, icon.src)).toBe(icon.sizes);
  expect(external).toEqual([]);
});

test('reopens and reloads deep routes offline using the real cached shell', async ({ page, context }) => {
  await page.goto('/'); await controlled(page);
  await context.setOffline(true);
  await page.goto('/balance'); await expect(page.getByRole('heading', { name: 'Balance', level: 1 })).toBeVisible();
  await page.reload(); await expect(page.getByRole('heading', { name: 'Balance', level: 1 })).toBeVisible();
  const reopened = await context.newPage(); await reopened.goto('/actividad');
  await expect(reopened.getByText(/Puedes recorrer la interfaz si se descargó antes/)).toBeVisible();
  await expect(reopened.getByText('Firebase sin configurar', { exact: true })).toBeVisible();
  const keys = await reopened.evaluate(async () => {
    const result: string[] = [];
    for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) result.push(request.url);
    return result;
  });
  expect(keys.length).toBeGreaterThan(0);
  expect(keys.every(key => new URL(key).origin === 'http://127.0.0.1:4173')).toBe(true);
});

test('offers a real new worker and switches builds only after confirmation', async ({ page, request, context }) => {
  await page.goto('/'); await controlled(page); await expect(page.locator('#root')).toHaveAttribute('data-build', 'a');
  await request.post('/__test/version/b');
  await page.evaluate(async () => { const registration = await navigator.serviceWorker.ready; await registration.update(); });
  await expect(page.getByText('Hay una nueva versión', { exact: true })).toBeVisible();
  await expect(page.locator('#root')).toHaveAttribute('data-build', 'a');
  await page.getByRole('button', { name: 'Actualizar ahora' }).click();
  await expect(page.locator('#root')).toHaveAttribute('data-build', 'b');
  await context.setOffline(true); await page.reload();
  await expect(page.locator('#root')).toHaveAttribute('data-build', 'b');
});
