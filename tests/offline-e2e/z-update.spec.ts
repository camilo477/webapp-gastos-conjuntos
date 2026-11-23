import { test,expect } from '@playwright/test';
import { owner,create,add,localGroups,confirmed } from './helpers';
test('a real waiting Service Worker update preserves an unconfirmed IndexedDB operation',async ({ page,request,context }) => {
  await request.post('/__test/version/a');
  try {
    await owner(page,request); const base = await create(page); await context.setOffline(true); await add(page,'Pendiente durante actualización','888'); const before = (await localGroups(page))[0]!;
    await context.route('**/documents:commit',route => route.fulfill({ status: 503,body: '{}' })); await context.setOffline(false); await request.post('/__test/version/b'); await page.evaluate(async () => { await (await navigator.serviceWorker.ready).update(); });
    await expect(page.getByText('Hay una nueva versión',{ exact: true })).toBeVisible(); await page.getByRole('button',{ name: 'Actualizar ahora',exact: true }).click(); await expect(page.locator('#root')).toHaveAttribute('data-build','offline-b'); await expect(page.getByTestId('trip-total')).toHaveText('COP $888');
    expect((await localGroups(page)).find(g => g.id === before.id)?.state).not.toBe('confirmed'); await context.unroute('**/documents:commit'); await page.getByRole('button',{ name: 'Sincronizar ahora',exact: true }).click(); await confirmed(page); expect((await localGroups(page)).find(g => g.id === before.id)?.state).toBe('confirmed'); await page.goto(base); await expect(page.getByTestId('trip-total')).toHaveText('COP $888');
    const cachedURLs = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async name => (await (await caches.open(name)).keys()).map(r => r.url)))).flat()); expect(cachedURLs.some(url => url.includes(':8180') || url.includes(':9199'))).toBe(false);
  } finally { await request.post('/__test/version/a'); }
});
