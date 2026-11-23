import { test,expect } from '@playwright/test';
import { owner,create,invite,confirmed,serverOperations } from '../offline-e2e/helpers';
import { begin,pick,syntheticImage,localImages,remoteImages } from './helpers';

test('two tabs recover a lost image acknowledgement without duplicating the image or expense',async ({ page,request,context }) => {
  await owner(page,request); const base = await create(page),second = await context.newPage(); await second.goto(base); await confirmed(second); await expect(second.getByText(/Viaje descargado para este usuario/)).toBeVisible(); let lost = false;
  await context.route('**/documents:commit',async route => {
    if (!lost && route.request().postData()?.includes('/attachments/')) { lost = true; const response = await route.fetch(); expect(response.ok()).toBe(true); await route.abort('failed'); }
    else await route.continue();
  });
  await context.setOffline(true); await begin(page,'Acuse perdido'); await pick(page,await syntheticImage(page)); await page.getByRole('button',{ name: 'Guardar gasto',exact: true }).click(); await expect(page.getByTestId('trip-total')).toHaveText('COP $20.000'); const id = (await localImages(page))[0]!.attachmentId;
  await context.setOffline(false);
  await expect.poll(async () => (await localImages(page))[0]?.state,{ timeout: 60000 }).toBe('confirmed');
  expect(lost).toBe(true); expect((await remoteImages(request,base))).toHaveLength(1); expect((await serverOperations(request,base))).toHaveLength(2); expect((await localImages(second))[0]!.attachmentId).toBe(id); await confirmed(second); await expect(second.getByTestId('trip-total')).toHaveText('COP $20.000'); await second.close();
});

test('a compressed image draft survives offline reload before an expense is created',async ({ page,request,context }) => {
  await owner(page,request); const base = await create(page); await context.setOffline(true); await begin(page,'Borrador con foto'); await pick(page,await syntheticImage(page,{ type: 'image/webp' })); await page.getByRole('button',{ name: 'Guardar borrador',exact: true }).click(); await expect(page.getByText('Borrador guardado en este dispositivo. Todavía no es un gasto registrado.',{ exact: true })).toBeVisible();
  await page.reload(); await page.getByRole('button',{ name: 'Recuperar borrador',exact: true }).click(); await expect(page.getByLabel('Concepto',{ exact: true })).toHaveValue('Borrador con foto'); await expect(page.getByRole('img',{ name: 'Vista previa de la miniatura',exact: true })).toBeVisible(); expect((await serverOperations(request,base))).toHaveLength(1);
  await page.getByRole('button',{ name: 'Guardar gasto',exact: true }).click(); await expect(page.getByTestId('trip-total')).toHaveText('COP $20.000'); expect((await localImages(page))).toHaveLength(1); await context.setOffline(false); await expect.poll(async () => (await remoteImages(request,base)).length,{ timeout: 60000 }).toBe(1);
});

test('revocation preserves the rejected local image and expense without publishing private bytes',async ({ page,request,browser }) => {
  await owner(page,request); const base = await create(page),peer = await invite(page,browser,base);
  try {
    await peer.context.setOffline(true); await begin(peer.guest,'Foto revocada'); await pick(peer.guest,await syntheticImage(peer.guest)); await peer.guest.getByRole('button',{ name: 'Guardar gasto',exact: true }).click(); await expect(peer.guest.getByTestId('trip-total')).toHaveText('COP $20.000');
    await page.goto(`${base}/personas`); await page.getByRole('button',{ name: 'Revocar acceso de Diana sintética',exact: true }).click(); await page.getByRole('button',{ name: 'Confirmar revocación',exact: true }).click(); await expect(page.getByText('Acceso retirado; historial conservado.',{ exact: true })).toBeVisible();
    await peer.context.setOffline(false); await peer.guest.goto('/estado'); await expect(peer.guest.getByText('Rechazado · Requiere revisión',{ exact: true })).toBeVisible({ timeout: 60000 }); await expect(peer.guest.getByText('Fotografía de un gasto · Imagen rechazada · propuesta conservada',{ exact: true })).toBeVisible({ timeout: 60000 }); await peer.guest.getByText('Revisar imagen local',{ exact: true }).click(); await peer.guest.locator('.detail-image').scrollIntoViewIfNeeded(); await expect(peer.guest.getByRole('img',{ name: 'Miniatura del gasto',exact: true })).toBeVisible(); await peer.guest.getByText('Copiar miniatura local',{ exact: true }).click(); await expect(peer.guest.getByLabel('Miniatura recuperable',{ exact: true })).toHaveValue(/^data:image\/webp;base64,/);
    expect((await remoteImages(request,base))).toHaveLength(0); expect((await serverOperations(request,base))).toHaveLength(1); await page.goto(base); await expect(page.getByTestId('trip-total')).toHaveText('COP $0');
  } finally { await peer.context.close(); }
});

test('changing accounts hides private pending thumbnails and never sends them as the new UID',async ({ page,request,context }) => {
  await owner(page,request); const base = await create(page); await context.setOffline(true); await begin(page,'Imagen privada de A'); await pick(page,await syntheticImage(page)); await page.getByRole('button',{ name: 'Guardar gasto',exact: true }).click(); await expect(page.getByTestId('trip-total')).toHaveText('COP $20.000');
  await page.getByRole('button',{ name: 'Más opciones',exact: true }).click(); await page.getByRole('button',{ name: 'Cerrar sesión',exact: true }).click(); await page.getByRole('button',{ name: 'Confirmar cierre de sesión',exact: true }).click(); await page.goto('/viajes'); await expect(page.getByRole('link',{ name: 'Iniciar sesión',exact: true })).toBeVisible(); await context.setOffline(false);
  await owner(page,request); await page.goto('/estado'); await expect(page.getByText('No hay miniaturas pendientes.',{ exact: true })).toBeVisible(); await expect(page.getByRole('img',{ name: 'Miniatura del gasto',exact: true })).toHaveCount(0); expect((await remoteImages(request,base))).toHaveLength(0); expect((await serverOperations(request,base))).toHaveLength(1); expect((await localImages(page))).toHaveLength(1);
});
