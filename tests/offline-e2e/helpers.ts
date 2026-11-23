import { expect } from '@playwright/test';
import type { APIRequestContext, Page, Browser } from '@playwright/test';
import { randomUUID } from 'node:crypto';
export const baseURL = 'http://127.0.0.1:4191';
export async function owner(page: Page,request: APIRequestContext) {
  const email = `offline-${randomUUID()}@example.invalid`;
  await page.goto('/'); await page.getByRole('link',{ name: 'Crear cuenta',exact: true }).click(); await page.getByLabel('Tu nombre',{ exact: true }).fill('Camilo sintético'); await page.getByLabel('Correo electrónico').fill(email); await page.getByLabel('Contraseña',{ exact: true }).fill('Synthetic-test-984!'); await page.getByRole('button',{ name: 'Crear cuenta',exact: true }).click();
  await expect(page.getByRole('heading',{ name: 'Verificar correo',exact: true })).toBeVisible();
  const records = await (await request.get('http://127.0.0.1:9199/emulator/v1/projects/demo-gastos-compartidos/oobCodes')).json() as { oobCodes: { email: string;oobCode: string }[] };
  const record = records.oobCodes.find(row => row.email === email)!;
  expect((await request.post('http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-not-a-real-api-key',{ data: { oobCode: record.oobCode } })).ok()).toBe(true);
  await page.goto('/verificar'); await page.getByRole('button',{ name: 'Actualizar verificación' }).click(); await expect(page.getByText('Tu correo está verificado.',{ exact: true })).toBeVisible();
  return email;
}
export async function create(page: Page) {
  const title = `Offline ${randomUUID().slice(0,8)}`;
  await page.goto('/viajes/nuevo'); await page.getByLabel('Nombre del viaje').fill(title); await page.getByLabel('Fecha inicial',{ exact: true }).fill('2026-11-21'); await page.getByLabel('Fecha final',{ exact: true }).fill('2026-11-24'); await page.getByLabel('Presupuesto total (opcional)',{ exact: true }).fill('400000'); await page.getByRole('button',{ name: 'Crear viaje',exact: true }).click();
  await expect(page.getByRole('heading',{ name: title,exact: true })).toBeVisible(); await expect(page.getByText('Sincronizado',{ exact: true })).toBeVisible(); await expect(page.getByText(/Viaje descargado para este usuario/)).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange',() => resolve(),{ once: true })); });
  return new URL(page.url()).pathname;
}
export async function invite(page: Page,browser: Browser,base: string) {
  await page.goto(`${base}/invitaciones`); await page.getByRole('button',{ name: 'Generar invitación',exact: true }).click(); const link = await page.getByLabel('Enlace de invitación',{ exact: true }).inputValue();
  const context = await browser.newContext({ baseURL,serviceWorkers: 'allow' }), guest = await context.newPage();
  await guest.goto(link); await guest.getByRole('button',{ name: 'Validar invitación',exact: true }).click(); await guest.getByLabel('Tu nombre en el viaje',{ exact: true }).fill('Diana sintética'); await guest.getByRole('button',{ name: 'Unirme al viaje',exact: true }).click(); await expect(guest.getByText('Sincronizado',{ exact: true })).toBeVisible(); await expect(guest.getByText(/Viaje descargado para este usuario/)).toBeVisible();
  await guest.evaluate(async () => { await navigator.serviceWorker.ready; if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange',() => resolve(),{ once: true })); });
  await page.goto(base); await expect(page.getByText('2/10, incluido el organizador',{ exact: true })).toBeVisible(); await expect(page.getByText('Sincronizado',{ exact: true })).toBeVisible();
  return { context,guest };
}
export async function add(page: Page,title: string,amount: string) {
  await page.getByRole('link',{ name: 'Agregar gasto',exact: true }).click(); await page.getByLabel('Concepto',{ exact: true }).fill(title); await page.getByLabel('Importe en COP',{ exact: true }).fill(amount); await page.getByRole('button',{ name: 'Guardar gasto',exact: true }).click(); await expect(page.getByRole('link',{ name: new RegExp(title.trim()) }).first()).toBeVisible();
}
export async function localGroups(page: Page) {
  return page.evaluate(async () => {
    const databases = await indexedDB.databases(), result: { id: string;state: string;events: { operationId: string;entityId: string;actorUid: string;entityKind: string;action: string;parentIds: string[];payload: Record<string,unknown> }[] }[] = [];
    for (const info of databases.filter(db => db.name?.startsWith('gastos-offline-v1:'))) {
      const db = await new Promise<IDBDatabase>((resolve,reject) => { const r = indexedDB.open(info.name!); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
      const rows = await new Promise<typeof result>((resolve,reject) => { const tx = db.transaction('operations'), r = tx.objectStore('operations').getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); db.close(); result.push(...rows);
    }
    return result;
  });
}
export async function confirmed(page: Page) { await expect(page.getByText('Sincronizado',{ exact: true })).toBeVisible({ timeout: 60000 }); }
// Emulator-only observer used by tests; application delivery always uses the user's token.
export async function serverOperations(request: APIRequestContext,base: string): Promise<string[]> {
  const result = await request.get(`http://127.0.0.1:8180/v1/projects/demo-gastos-compartidos/databases/(default)/documents/trips/${base.split('/').at(-1)}/events`,{ headers: { Authorization: 'Bearer owner' } });
  expect(result.ok()).toBe(true); const data = await result.json() as { documents?: { fields: { operationId: { stringValue: string } } }[] }; return (data.documents ?? []).map(row => row.fields.operationId.stringValue);
}
