import { test,expect,firefox } from '@playwright/test';
import { mkdtemp,rm,mkdir } from 'node:fs/promises';
import { owner,create,invite,add,localGroups,confirmed,baseURL } from './helpers';
import type { Page } from '@playwright/test';
async function logout(page: Page) { await page.getByRole('button',{ name: 'Más opciones',exact: true }).click(); await page.getByRole('button',{ name: 'Cerrar sesión',exact: true }).click(); await page.getByRole('button',{ name: 'Confirmar cierre de sesión',exact: true }).click(); await page.goto('/viajes'); await expect(page.getByRole('link',{ name: 'Iniciar sesión',exact: true })).toBeVisible(); }

test('logout and account change isolate pending operations across tabs and only the original UID resumes them',async ({ page,request,context }) => {
  const emailA = await owner(page,request),base = await create(page); await context.setOffline(true); await add(page,'Privado de Camilo','21000'); const original = (await localGroups(page))[0]!;
  const second = await context.newPage(); await second.goto(base); await expect(second.getByTestId('trip-total')).toHaveText('COP $21.000');
  await logout(page); await expect(second.getByRole('heading',{ name: 'Iniciar sesión',exact: true })).toBeVisible(); await context.setOffline(false);
  await owner(page,request); await page.goto('/estado'); await expect(page.getByRole('heading',{ name: 'Privado de Camilo',exact: true })).toHaveCount(0); await expect(second.getByText('Privado de Camilo',{ exact: true })).toHaveCount(0);
  expect((await localGroups(page)).find(g => g.id === original.id)?.state).not.toBe('confirmed');
  await logout(page); await page.goto('/login'); await page.getByLabel('Correo electrónico').fill(emailA); await page.getByLabel('Contraseña',{ exact: true }).fill('Synthetic-test-984!'); await page.getByRole('button',{ name: 'Iniciar sesión',exact: true }).click(); await expect(page.getByRole('heading',{ name: 'Mis viajes',exact: true })).toBeVisible(); await page.goto(base); await confirmed(page); await expect(page.getByTestId('trip-total')).toHaveText('COP $21.000'); expect((await localGroups(page)).find(g => g.id === original.id)?.events[0]?.actorUid).toBe(original.events[0]!.actorUid);
});

test('revocation preserves and exposes rejected proposals to their author without confirming writes',async ({ page,request,browser }) => {
  await owner(page,request); const base = await create(page),peer = await invite(page,browser,base);
  try {
    await peer.context.setOffline(true); await add(peer.guest,'Propuesta revocada','12345'); const operation = (await localGroups(peer.guest)).find(g => g.state !== 'confirmed')!;
    await page.goto(`${base}/personas`); await page.getByRole('button',{ name: 'Revocar acceso de Diana sintética',exact: true }).click(); await page.getByRole('button',{ name: 'Confirmar revocación',exact: true }).click(); await expect(page.getByText('Acceso retirado; historial conservado.',{ exact: true })).toBeVisible();
    await peer.context.setOffline(false); await peer.guest.goto('/estado'); await expect(peer.guest.getByText('Rechazado · Requiere revisión',{ exact: true })).toBeVisible({ timeout: 60000 }); await peer.guest.getByText('Revisar movimiento',{ exact: true }).click(); await expect(peer.guest.getByLabel('Propuesta recuperable de Propuesta revocada')).toContainText('12345'); expect((await localGroups(peer.guest)).find(g => g.id === operation.id)?.state).toBe('rejected');
    await page.goto(base); await confirmed(page); await expect(page.getByTestId('trip-total')).toHaveText('COP $0');
  } finally { await peer.context.close(); }
});

test('an administrative closure fixture rejects later offline writes and keeps their contents recoverable',async ({ page,request,context }) => {
  await owner(page,request); const base = await create(page); await context.setOffline(true); await add(page,'Pendiente al cerrar','19000');
  const result = await request.patch(`http://127.0.0.1:8180/v1/projects/demo-gastos-compartidos/databases/(default)/documents/trips/${base.split('/').at(-1)}?updateMask.fieldPaths=status&updateMask.fieldPaths=closedAt`,{ headers: { Authorization: 'Bearer owner' },data: { fields: { status: { stringValue: 'closed' },closedAt: { timestampValue: new Date().toISOString() } } } }); expect(result.ok()).toBe(true);
  await context.setOffline(false); await page.goto('/estado'); await expect(page.getByText('Rechazado · Requiere revisión',{ exact: true })).toBeVisible({ timeout: 60000 }); await page.getByText('Revisar movimiento',{ exact: true }).click(); await expect(page.getByLabel('Propuesta recuperable de Pendiente al cerrar')).toContainText('19000'); await page.goto(base); await expect(page.getByRole('button',{ name: 'Finalizar viaje',exact: true })).toBeDisabled(); await expect(page.getByText('Edición no disponible',{ exact: true })).toBeVisible(); await expect(page.getByTestId('trip-total')).toHaveText('COP $0');
});

test('a closed Firefox process reopens the same profile offline with its durable pending operation',async ({ request,browserName }) => {
  test.skip(browserName !== 'firefox','Persistent-process recovery is measured with Firefox.'); test.setTimeout(240000);
  await mkdir('.cache/phase6/profiles',{ recursive: true }); const profile = await mkdtemp('.cache/phase6/profiles/offline-'); let context = await firefox.launchPersistentContext(profile,{ baseURL,serviceWorkers: 'allow',headless: true });
  try {
    const page = await context.newPage(); await owner(page,request); const base = await create(page); await context.setOffline(true); await add(page,'Sobrevive al proceso','777'); const id = (await localGroups(page))[0]!.id; await context.close();
    context = await firefox.launchPersistentContext(profile,{ baseURL,serviceWorkers: 'allow',headless: true }); await context.setOffline(true); const reopened = await context.newPage(); await reopened.goto(base); await expect(reopened.getByTestId('trip-total')).toHaveText('COP $777'); expect((await localGroups(reopened))[0]!.id).toBe(id); await context.setOffline(false); await confirmed(reopened); expect((await localGroups(reopened))[0]!.state).toBe('confirmed');
  } finally { await context.close(); await rm(profile,{ recursive: true,force: true }); }
});

test('explicit expense drafts survive reload and are removed atomically when converted to an operation',async ({ page,request,context }) => {
  await owner(page,request); await create(page); await context.setOffline(true); await page.getByRole('link',{ name: 'Agregar gasto',exact: true }).click(); await page.getByLabel('Concepto',{ exact: true }).fill('Borrador conservado'); await page.getByLabel('Importe en COP',{ exact: true }).fill('456'); await page.getByRole('button',{ name: 'Guardar borrador',exact: true }).click(); await expect(page.getByText('Borrador guardado en este dispositivo. Todavía no es un gasto registrado.',{ exact: true })).toBeVisible(); await page.reload(); await page.getByRole('button',{ name: 'Recuperar borrador',exact: true }).click(); await expect(page.getByLabel('Concepto',{ exact: true })).toHaveValue('Borrador conservado'); await page.getByRole('button',{ name: 'Guardar gasto',exact: true }).click(); await expect(page.getByTestId('trip-total')).toHaveText('COP $456'); await page.getByRole('link',{ name: 'Agregar gasto',exact: true }).click(); await expect(page.getByRole('button',{ name: 'Recuperar borrador',exact: true })).toHaveCount(0);
});

test('deleting device storage removes the offline copy and requires a fresh download',async ({ page,request,context }) => {
  await owner(page,request); const base = await create(page); await context.setOffline(true);
  await page.evaluate(async () => { for (const info of await indexedDB.databases()) if (info.name?.startsWith('gastos-offline-v1:')) await new Promise<void>((resolve,reject) => { const r = indexedDB.deleteDatabase(info.name!); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); }); });
  await page.reload(); await expect(page.getByText('Viaje no descargado',{ exact: true })).toBeVisible(); await expect(page.getByRole('button',{ name: 'Guardar gasto',exact: true })).toHaveCount(0); await context.setOffline(false); await page.goto(base); await confirmed(page);
});

test('IndexedDB v1 data upgrades to the delivery index without losing pending IDs or snapshots',async ({ page,request,context }) => {
  await owner(page,request); const base = await create(page); await context.setOffline(true); await add(page,'Migración conservadora','901'); const id = (await localGroups(page))[0]!.id;
  // Same-origin static document stops all app code before preparing the old schema fixture.
  await page.goto('/icons/app.svg'); await page.evaluate(async () => {
    const name = (await indexedDB.databases()).find(d => d.name?.startsWith('gastos-offline-v1:'))!.name!;
    const open = (version?: number) => new Promise<IDBDatabase>((resolve,reject) => { const r = version ? indexedDB.open(name,version) : indexedDB.open(name); r.onupgradeneeded = () => { for (const store of ['trips','operations','drafts','operationIds']) r.result.createObjectStore(store,{ keyPath: 'id' }); }; r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const old = await open(); const stores = ['trips','operations','drafts','operationIds']; const rows = await Promise.all(stores.map(store => new Promise<unknown[]>((resolve,reject) => { const r = old.transaction(store).objectStore(store).getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }))); old.close();
    await new Promise<void>((resolve,reject) => { const r = indexedDB.deleteDatabase(name); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); });
    const legacy = await open(1); const tx = legacy.transaction(stores,'readwrite'); const done = new Promise<void>((resolve,reject) => { tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error); }); stores.forEach((store,index) => rows[index]!.forEach(row => tx.objectStore(store).put(row))); await done; legacy.close();
  });
  await page.goto(base); await expect(page.getByTestId('trip-total')).toHaveText('COP $901'); expect((await localGroups(page))[0]!.id).toBe(id); expect(await page.evaluate(async () => (await indexedDB.databases()).find(d => d.name?.startsWith('gastos-offline-v1:'))!.version)).toBe(3); await context.setOffline(false); await confirmed(page);
});
