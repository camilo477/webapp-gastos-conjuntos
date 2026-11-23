import { test, expect } from '@playwright/test';
import type { Page, APIRequestContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import { firestoreValue } from '../../src/repositories/financial/events';

async function owner(page: Page,request: APIRequestContext) {
  const email = `financial-${randomUUID()}@example.invalid`;
  await page.goto('/registro'); await page.getByLabel('Tu nombre',{ exact: true }).fill('Camilo sintético');
  await page.getByLabel('Correo electrónico').fill(email); await page.getByLabel('Contraseña',{ exact: true }).fill('Synthetic-test-984!');
  await page.getByRole('button',{ name: 'Crear cuenta',exact: true }).click();
  await expect(page.getByRole('heading',{ name: 'Verificar correo',exact: true })).toBeVisible();
  const response = await request.get('http://127.0.0.1:9199/emulator/v1/projects/demo-gastos-compartidos/oobCodes');
  const codes = await response.json() as { oobCodes: { email: string;oobCode: string }[] };
  const code = codes.oobCodes.find(code => code.email === email)!;
  expect((await request.post('http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-not-a-real-api-key',{ data: { oobCode: code.oobCode } })).ok()).toBe(true);
  await page.goto('/verificar'); await page.getByRole('button',{ name: 'Actualizar verificación' }).click(); await expect(page.getByText('Tu correo está verificado.',{ exact: true })).toBeVisible();
  return email;
}
async function create(page: Page) {
  const title = `Finanzas ${randomUUID().slice(0,8)}`;
  await page.goto('/viajes/nuevo'); await page.getByLabel('Nombre del viaje').fill(title);
  await page.getByLabel('Fecha inicial',{ exact: true }).fill('2026-11-21'); await page.getByLabel('Fecha final',{ exact: true }).fill('2026-11-24');
  await page.getByLabel('Presupuesto total (opcional)',{ exact: true }).fill('400000'); await page.getByRole('button',{ name: 'Crear viaje',exact: true }).click();
  await expect(page.getByRole('heading',{ name: title,exact: true })).toBeVisible(); await expect(page.getByText('Registro confirmado por el servidor',{ exact: true })).toBeVisible();
  return new URL(page.url()).pathname;
}
async function add(page: Page,concept: string,amount: string,waitForServer = true) {
  await page.getByRole('link',{ name: 'Agregar gasto',exact: true }).click(); await page.getByLabel('Concepto',{ exact: true }).fill(concept);
  await page.getByLabel('Importe en COP',{ exact: true }).fill(amount); await page.getByRole('button',{ name: 'Guardar gasto',exact: true }).click();
  await expect(page.getByRole('link',{ name: new RegExp(concept) })).toBeVisible();
  if (waitForServer) await expect(page.getByText('Sincronizado',{ exact: true })).toBeVisible({ timeout: 60000 });
}

test('two independent members see expenses, revisions, settlement corrections, budgets and statistics without manual refresh', async ({ page,request,browser }) => {
  test.setTimeout(150000);
  await owner(page,request); const base = await create(page);
  await page.getByRole('link',{ name: 'Gestionar invitaciones',exact: true }).click(); await page.getByRole('button',{ name: 'Generar invitación',exact: true }).click();
  const link = await page.getByLabel('Enlace de invitación',{ exact: true }).inputValue();
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4184',serviceWorkers: 'block',viewport: { width: 390,height: 844 } });
  const guest = await context.newPage();
  try {
    await guest.goto(link); await guest.getByRole('button',{ name: 'Validar invitación',exact: true }).click(); await guest.getByLabel('Tu nombre en el viaje',{ exact: true }).fill('Diana sintética'); await guest.getByRole('button',{ name: 'Unirme al viaje',exact: true }).click();
    await expect(guest.getByText('Registro confirmado por el servidor',{ exact: true })).toBeVisible();
    await page.goto(base); await add(page,'Café real','60000');
    await expect(guest.getByRole('link',{ name: /Café real/ })).toBeVisible(); await expect(guest.getByTestId('trip-total')).toHaveText('COP $60.000'); await expect(guest.getByTestId('own-balance')).toHaveText('-COP $30.000');
    await add(guest,'Taxi real','40000');
    await expect(page.getByRole('link',{ name: /Taxi real/ })).toBeVisible(); await expect(page.getByTestId('trip-total')).toHaveText('COP $100.000'); await expect(page.getByTestId('own-balance')).toHaveText('COP $10.000');
    await guest.getByRole('link',{ name: 'Ver balances y deudas' }).click();
    await guest.getByRole('link',{ name: 'Registrar abono',exact: true }).click(); await guest.getByLabel('Importe en COP',{ exact: true }).fill('5000'); await guest.getByRole('button',{ name: 'Guardar abono',exact: true }).click();
    await expect(guest.getByRole('region',{ name: 'Transferencias sugeridas' })).toContainText('COP $5.000');
    await expect(page.getByTestId('own-balance')).toHaveText('COP $5.000'); await expect(page.getByTestId('trip-total')).toHaveText('COP $100.000');
    await page.getByRole('link',{ name: /Café real/ }).click(); const detail = new URL(page.url()).pathname;
    await page.getByRole('link',{ name: 'Editar gasto',exact: true }).click(); await page.getByLabel('Importe en COP',{ exact: true }).fill('80000'); await page.getByRole('button',{ name: 'Guardar gasto',exact: true }).click();
    await expect(page.getByTestId('trip-total')).toHaveText('COP $120.000'); await expect(guest.getByRole('region',{ name: 'Transferencias sugeridas' })).toContainText('COP $15.000'); await expect(page.getByText('Sincronizado',{ exact: true })).toBeVisible();
    await page.goto(detail); await page.getByRole('button',{ name: 'Eliminar gasto',exact: true }).click(); await page.getByRole('button',{ name: 'Confirmar eliminación',exact: true }).click();
    await expect(page.getByTestId('trip-total')).toHaveText('COP $40.000'); await expect(guest.getByRole('region',{ name: 'Transferencias sugeridas' })).toContainText('COP $25.000'); await expect(page.getByText('Sincronizado',{ exact: true })).toBeVisible();
    await page.goto(detail); await page.getByRole('button',{ name: 'Restaurar gasto',exact: true }).click(); await page.getByRole('button',{ name: 'Confirmar restauración',exact: true }).click();
    await expect(page.getByTestId('trip-total')).toHaveText('COP $120.000'); await expect(guest.getByRole('region',{ name: 'Transferencias sugeridas' })).toContainText('COP $15.000'); await expect(page.getByText('Sincronizado',{ exact: true })).toBeVisible();
    await guest.getByRole('link',{ name: 'Corregir abono',exact: true }).click(); await guest.getByLabel('Importe en COP',{ exact: true }).fill('8000'); await guest.getByRole('button',{ name: 'Guardar abono',exact: true }).click();
    await expect(guest.getByRole('region',{ name: 'Transferencias sugeridas' })).toContainText('COP $12.000'); await expect(page.getByTestId('own-balance')).toHaveText('COP $12.000');
    await guest.getByRole('button',{ name: 'Eliminar abono',exact: true }).click(); await guest.getByRole('button',{ name: 'Confirmar eliminación',exact: true }).click(); await expect(page.getByTestId('own-balance')).toHaveText('COP $20.000');
    await guest.getByRole('button',{ name: 'Restaurar abono',exact: true }).click(); await guest.getByRole('button',{ name: 'Confirmar restauración',exact: true }).click(); await expect(page.getByTestId('own-balance')).toHaveText('COP $12.000');
    await page.goto(`${base}/presupuesto`); await page.getByText('Modificar presupuesto',{ exact: true }).click(); await page.getByLabel('Presupuesto total',{ exact: true }).fill('450000'); await page.getByLabel('Cupo manual a modificar',{ exact: true }).selectOption('2026-11-24'); await page.getByLabel('Importe del cupo manual',{ exact: true }).fill('50000'); await page.getByRole('button',{ name: 'Guardar presupuesto',exact: true }).click();
    await expect(page.getByText('COP $450.000 / COP $120.000',{ exact: true })).toBeVisible();
    await guest.goto(`${base}/presupuesto`); await expect(guest.getByText('COP $450.000 / COP $120.000',{ exact: true })).toBeVisible(); await expect(guest.getByText('Modificar presupuesto',{ exact: true })).toHaveCount(0); await expect(guest.getByRole('region',{ name: 'Evolución del presupuesto' })).toContainText('Reserva manual');
    for (const actor of [page,guest]) { await actor.goto(`${base}/estadisticas`); await expect(actor.getByTestId('statistics-total')).toHaveText('COP $120.000'); await expect(actor.getByRole('region',{ name: 'Gasto por categoría' })).toContainText('COP $120.000'); }
    await page.goto(`${base}/actividad`); for (const label of ['Gasto creado · Café real','Gasto modificado · Café real','Gasto eliminado · Café real','Gasto restaurado · Café real','Abono creado','Abono modificado','Abono eliminado','Abono restaurado','Presupuesto modificado']) await expect(page.getByRole('heading',{ name: label,exact: true })).toBeVisible();
    const newBase = await create(page); await expect(page.getByText('Café real',{ exact: true })).toHaveCount(0); await expect(page.getByTestId('trip-total')).toHaveText('COP $0');
    await guest.goto(newBase); await expect(guest.getByRole('heading',{ name: 'Acceso no disponible',exact: true })).toBeVisible();
  } finally { await context.close(); }
});

test('lost HTTP response is recovered with the same operation and offline writes remain durable', async ({ page,request,context }) => {
  await owner(page,request); await create(page);
  let commits = 0,lostResponse = false;
  await page.route('**/documents:commit',async route => { commits++; await route.fetch(); await route.abort('failed'); lostResponse = true; });
  await add(page,'Una sola operación','101',false);
  await expect.poll(() => lostResponse).toBe(true); await page.unroute('**/documents:commit'); await page.getByRole('button',{ name: 'Sincronizar ahora',exact: true }).click(); await expect(page.getByText('Sincronizado',{ exact: true })).toBeVisible({ timeout: 60000 }); await expect(page.getByTestId('trip-total')).toHaveText('COP $101'); expect(commits).toBe(1);
  await context.setOffline(true); await add(page,'Guardado sin conexión','200',false); await expect(page.getByTestId('trip-total')).toHaveText('COP $301'); await expect(page.getByText(/cambios guardados en este dispositivo/)).toBeVisible();
  await context.setOffline(false); await expect(page.getByText('Sincronizado',{ exact: true })).toBeVisible({ timeout: 60000 }); await expect(page.getByTestId('trip-total')).toHaveText('COP $301');
});

for (const width of [320,390,768,1440]) test(`financial forms and views are accessible and reflow in both themes at ${width}px`, async ({ page,request },info) => {
  test.setTimeout(120000); await page.setViewportSize({ width,height: 844 }); await owner(page,request); const base = await create(page);
  await add(page,'Compra accesible','100');
  for (const theme of ['light','dark']) {
    await page.getByRole('combobox',{ name: 'Tema',exact: true }).selectOption(theme);
    for (const path of [base,`${base}/gastos/nuevo`,`${base}/balance`,`${base}/presupuesto`,`${base}/estadisticas`,`${base}/actividad`]) {
      await page.goto(path); await expect(page.getByText('Registro confirmado por el servidor',{ exact: true })).toBeVisible();
      if (path.endsWith('/nuevo')) { await expect(page.getByLabel('Importe en COP')).toHaveAttribute('inputmode','numeric'); await page.getByText('Pagadores y división',{ exact: true }).click(); await page.getByText('Categoría, fecha, hora y nota',{ exact: true }).click(); }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze(); expect(axe.violations).toEqual([]);
    }
    await page.screenshot({ path: info.outputPath(`financial-${theme}.png`),fullPage: true });
  }
  await page.goto(`${base}/gastos/nuevo`); await page.getByLabel('Concepto',{ exact: true }).fill('Validación'); await page.getByLabel('Importe en COP',{ exact: true }).fill('1.5'); await page.getByRole('button',{ name: 'Guardar gasto',exact: true }).click(); await expect(page.getByRole('alert')).toContainText('Importe inválido');
  await page.evaluate(() => { const sizes = [...document.querySelectorAll<HTMLElement>('body *')].map(element => ({ element,size: parseFloat(getComputedStyle(element).fontSize) * 2 })); for (const { element,size } of sizes) element.style.fontSize = `${size}px`; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.getByLabel('Concepto',{ exact: true }).focus(); await expect(page.getByLabel('Concepto',{ exact: true })).toBeFocused();
});

test('a live trip projects 500 confirmed expenses and keeps the activity list bounded', async ({ page,request }) => {
  test.setTimeout(120000);
  const email = await owner(page,request), base = await create(page), tripId = base.split('/').at(-1)!;
  const login = await request.post('http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-not-a-real-api-key',{ data: { email,password: 'Synthetic-test-984!',returnSecureToken: true } });
  const auth = await login.json() as { idToken: string;localId: string };
  const started = Date.now();
  for (let batch = 0; batch < 50; batch++) {
    const writes = Array.from({ length: 10 },(_,offset) => {
      const id = randomUUID(), data = { schemaVersion: 2,operationId: id,entityId: id,entityKind: 'expense',action: 'create',actorUid: auth.localId,actorPersonId: auth.localId,parentIds: [],logicalClock: 0,before: [],merge: null,authoredAt: '2026-11-23T15:00:00.000Z',payload: { title: `Carga ${batch * 10 + offset}`,total: 1,category: 'other',note: null,occurredAt: '2026-11-23T15:00:00.000Z',day: '2026-11-23',payerIds: [auth.localId],payerAmounts: [1],participantIds: [auth.localId],shareAmounts: [1],splitMode: 'equal',weights: [1],visual: null,attachmentId: null,status: 'active',mergedInto: null } };
      return { update: { name: `projects/demo-gastos-compartidos/databases/(default)/documents/trips/${tripId}/events/${id}`,fields: Object.fromEntries(Object.entries(data).map(([key,value]) => [key,firestoreValue(value)])) },currentDocument: { exists: false },updateTransforms: [{ fieldPath: 'receivedAt',setToServerValue: 'REQUEST_TIME' }] };
    });
    const result = await request.post('http://127.0.0.1:8180/v1/projects/demo-gastos-compartidos/databases/(default)/documents:commit',{ headers: { Authorization: `Bearer ${auth.idToken}` },data: { writes } });
    expect(result.ok(),await result.text()).toBe(true);
  }
  await expect(page.getByTestId('trip-total')).toHaveText('COP $500');
  console.log(`500 expenses through ordinary authenticated rules and live UI: ${Date.now() - started} ms`);
  await page.goto(`${base}/estadisticas`); await expect(page.getByTestId('statistics-total')).toHaveText('COP $500'); await expect(page.getByText('500 gastos · 0 abonos',{ exact: true })).toBeVisible();
  await page.goto(`${base}/actividad`); const history = page.getByRole('region',{ name: 'Historial financiero' });
  await expect(history.getByRole('listitem')).toHaveCount(50); await history.getByRole('button',{ name: 'Mostrar más actividad' }).click(); await expect(history.getByRole('listitem')).toHaveCount(100);
});

test('advanced splits keep contributions separate from consumption and reject percentages below 100%', async ({ page,request,browser }) => {
  test.setTimeout(120000); await owner(page,request); const base = await create(page);
  await page.getByRole('link',{ name: 'Gestionar invitaciones',exact: true }).click(); await page.getByRole('button',{ name: 'Generar invitación',exact: true }).click(); const link = await page.getByLabel('Enlace de invitación',{ exact: true }).inputValue();
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4184',serviceWorkers: 'block' }), guest = await context.newPage();
  try {
    await guest.goto(link); await guest.getByRole('button',{ name: 'Validar invitación',exact: true }).click(); await guest.getByLabel('Tu nombre en el viaje',{ exact: true }).fill('Diana sintética'); await guest.getByRole('button',{ name: 'Unirme al viaje',exact: true }).click(); await expect(guest.getByText('Registro confirmado por el servidor',{ exact: true })).toBeVisible();
    await page.goto(`${base}/gastos/nuevo`); await page.getByLabel('Concepto',{ exact: true }).fill('Hotel compartido'); await page.getByLabel('Importe en COP',{ exact: true }).fill('200000'); await page.getByText('Pagadores y división',{ exact: true }).click();
    await page.getByRole('group',{ name: 'Quién pagó',exact: true }).getByRole('checkbox',{ name: 'Diana sintética',exact: true }).check(); await page.getByLabel('Aporte de Camilo sintético',{ exact: true }).fill('150000'); await page.getByLabel('Aporte de Diana sintética',{ exact: true }).fill('50000'); await page.getByRole('button',{ name: 'Guardar gasto',exact: true }).click(); await expect(page.getByTestId('own-balance')).toHaveText('COP $50.000'); await expect(guest.getByTestId('own-balance')).toHaveText('-COP $50.000');
    await page.goto(`${base}/gastos/nuevo`); await page.getByLabel('Concepto',{ exact: true }).fill('Porcentaje'); await page.getByLabel('Importe en COP',{ exact: true }).fill('100'); await page.getByText('Pagadores y división',{ exact: true }).click(); await page.getByLabel('División del gasto',{ exact: true }).selectOption('percentage'); await page.getByLabel('Porcentaje de Camilo sintético',{ exact: true }).fill('70'); await page.getByLabel('Porcentaje de Diana sintética',{ exact: true }).fill('29.99'); await page.getByRole('button',{ name: 'Guardar gasto',exact: true }).click(); await expect(page.getByRole('alert')).toContainText('100%'); await expect(page.getByLabel('Concepto',{ exact: true })).toBeEditable(); await page.getByLabel('Porcentaje de Diana sintética',{ exact: true }).fill('30'); await page.getByRole('button',{ name: 'Guardar gasto',exact: true }).click(); await expect(page.getByTestId('own-balance')).toHaveText('COP $50.030');
    await page.goto(`${base}/gastos/nuevo`); await page.getByLabel('Concepto',{ exact: true }).fill('Importes exactos'); await page.getByLabel('Importe en COP',{ exact: true }).fill('100000'); await page.getByText('Pagadores y división',{ exact: true }).click(); await page.getByLabel('División del gasto',{ exact: true }).selectOption('fixed'); await page.getByLabel('Cuota de Camilo sintético',{ exact: true }).fill('60000'); await page.getByLabel('Cuota de Diana sintética',{ exact: true }).fill('40000'); await page.getByRole('button',{ name: 'Guardar gasto',exact: true }).click(); await expect(page.getByTestId('own-balance')).toHaveText('COP $90.030');
    await page.goto(`${base}/gastos/nuevo`); await page.getByLabel('Concepto',{ exact: true }).fill('Solo para mí'); await page.getByLabel('Importe en COP',{ exact: true }).fill('20000'); await page.getByText('Pagadores y división',{ exact: true }).click(); await page.getByRole('group',{ name: 'Participantes incluidos',exact: true }).getByRole('checkbox',{ name: 'Diana sintética',exact: true }).uncheck(); await page.getByRole('button',{ name: 'Guardar gasto',exact: true }).click(); await expect(page.getByTestId('own-balance')).toHaveText('COP $90.030'); await expect(guest.getByTestId('trip-total')).toHaveText('COP $320.100');
  } finally { await context.close(); }
});

test('simultaneous edits preserve both proposals and show provisional balances instead of a winner', async ({ page,request,browser }) => {
  test.setTimeout(120000); await owner(page,request); const base = await create(page);
  await page.getByRole('link',{ name: 'Gestionar invitaciones',exact: true }).click(); await page.getByRole('button',{ name: 'Generar invitación',exact: true }).click(); const link = await page.getByLabel('Enlace de invitación',{ exact: true }).inputValue();
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4184',serviceWorkers: 'block' }), guest = await context.newPage();
  try {
    await guest.goto(link); await guest.getByRole('button',{ name: 'Validar invitación',exact: true }).click(); await guest.getByLabel('Tu nombre en el viaje',{ exact: true }).fill('Diana sintética'); await guest.getByRole('button',{ name: 'Unirme al viaje',exact: true }).click(); await expect(guest.getByText('Registro confirmado por el servidor',{ exact: true })).toBeVisible();
    await page.goto(base); await add(page,'Edición simultánea','100'); await expect(guest.getByRole('link',{ name: /Edición simultánea/ })).toBeVisible();
    await page.getByRole('link',{ name: /Edición simultánea/ }).click(); await page.getByRole('link',{ name: 'Editar gasto',exact: true }).click();
    await guest.getByRole('link',{ name: /Edición simultánea/ }).click(); await guest.getByRole('link',{ name: 'Editar gasto',exact: true }).click(); await expect(guest.getByLabel('Importe en COP',{ exact: true })).toHaveValue('100');
    await page.getByLabel('Importe en COP',{ exact: true }).fill('120'); await guest.getByLabel('Importe en COP',{ exact: true }).fill('90'); await page.getByRole('button',{ name: 'Guardar gasto',exact: true }).click(); await expect(page.getByTestId('trip-total')).toHaveText('COP $120'); await guest.getByRole('button',{ name: 'Guardar gasto',exact: true }).click();
    for (const actor of [page,guest]) { await expect(actor.getByText('Balances provisionales',{ exact: true })).toBeVisible(); await expect(actor.getByTestId('trip-total')).toHaveText('COP $0'); await actor.getByRole('link',{ name: 'Actividad financiera',exact: true }).click(); await expect(actor.getByRole('heading',{ name: 'Gasto modificado · Edición simultánea',exact: true })).toHaveCount(2); }
  } finally { await context.close(); }
});
