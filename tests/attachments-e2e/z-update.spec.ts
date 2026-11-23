import { test,expect } from '@playwright/test';
import { owner,create,confirmed } from '../offline-e2e/helpers';
import { begin,pick,syntheticImage,localImages,remoteImages } from './helpers';
import { installCommitFault,clearCommitFault } from '../offline-e2e/commitFaults';

test('a real Service Worker update preserves the pending financial revision and its independent image',async ({ page,request,context }) => {
  await request.post('/__test/version/a');
  try {
    await owner(page,request); const base = await create(page); await context.setOffline(true); await begin(page,'Foto durante actualización'); await pick(page,await syntheticImage(page)); await page.getByRole('button',{ name: 'Guardar gasto',exact: true }).click(); await expect(page.getByTestId('trip-total')).toHaveText('COP $20.000'); const before = (await localImages(page))[0]!;
    await installCommitFault(context,'unavailable','all',false); await context.setOffline(false); await request.post('/__test/version/b'); await page.evaluate(async () => { await (await navigator.serviceWorker.ready).update(); }); await expect(page.getByText('Hay una nueva versión',{ exact: true })).toBeVisible(); await page.getByRole('button',{ name: 'Actualizar ahora',exact: true }).click(); await expect(page.locator('#root')).toHaveAttribute('data-build','offline-b'); await expect(page.getByTestId('trip-total')).toHaveText('COP $20.000'); expect((await localImages(page))[0]!.attachmentId).toBe(before.attachmentId); expect((await localImages(page))[0]!.state).not.toBe('confirmed');
    await clearCommitFault(context); await page.getByRole('button',{ name: 'Sincronizar ahora',exact: true }).click(); await confirmed(page); await expect.poll(async () => (await localImages(page))[0]?.state,{ timeout: 60000 }).toBe('confirmed'); expect((await remoteImages(request,base))).toHaveLength(1);
    const urls = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async key => (await (await caches.open(key)).keys()).map(r => r.url)))).flat()); expect(urls.some(url => url.includes(':8180') || url.includes(':9199') || url.includes('api.openverse.org'))).toBe(false);
  } finally { await request.post('/__test/version/a'); }
});
