import { test,expect } from '@playwright/test';
import { owner,create,invite,add,localGroups,confirmed,serverOperations } from './helpers';
import { installCommitFault,commitFaultState,clearCommitFault } from './commitFaults';

for (const order of ['owner-first','guest-first']) test(`two devices retain four offline purchases across reload and converge ${order}`, async ({ page,request,browser,context }) => {
  await owner(page,request); const base = await create(page); const peer = await invite(page,browser,base);
  try {
    await context.setOffline(true); await peer.context.setOffline(true);
    await add(page,'Café offline','20000'); await add(page,'Transporte offline','15000');
    await add(peer.guest,'Almuerzo offline','50000'); await add(peer.guest,'Entradas offline','40000');
    const idsA = (await localGroups(page)).filter(g => g.state !== 'confirmed').flatMap(g => g.events.map(e => e.operationId));
    const idsB = (await localGroups(peer.guest)).filter(g => g.state !== 'confirmed').flatMap(g => g.events.map(e => e.operationId));
    expect(idsA).toHaveLength(2); expect(idsB).toHaveLength(2);
    await page.reload(); await peer.guest.reload(); await expect(page.getByTestId('trip-total')).toHaveText('COP $35.000'); await expect(peer.guest.getByTestId('trip-total')).toHaveText('COP $90.000'); await expect(page.getByText('Balances provisionales',{ exact: true })).toBeVisible();
    const reopened = await peer.context.newPage(); await peer.guest.close(); await reopened.goto(base); await expect(reopened.getByTestId('trip-total')).toHaveText('COP $90.000');
    if (order === 'owner-first') { await context.setOffline(false); await confirmed(page); await peer.context.setOffline(false); }
    else { await peer.context.setOffline(false); await confirmed(reopened); await context.setOffline(false); }
    for (const actor of [page,reopened]) { await confirmed(actor); await expect(actor.getByTestId('trip-total')).toHaveText('COP $125.000'); await actor.getByRole('link',{ name: 'Ver balances y deudas' }).click(); await expect(actor.getByRole('region',{ name: 'Transferencias sugeridas' })).toContainText('COP $27.500'); }
    const server = await serverOperations(request,base); expect(server).toHaveLength(5); for (const id of [...idsA,...idsB]) expect(server.filter(stored => stored === id)).toHaveLength(1);
    expect((await localGroups(page)).filter(g => g.state !== 'confirmed')).toHaveLength(0); expect((await localGroups(reopened)).filter(g => g.state !== 'confirmed')).toHaveLength(0);
    for (const id of [...idsA,...idsB]) expect((await localGroups(page)).flatMap(g => g.events.map(e => e.operationId)).includes(id) || (await localGroups(reopened)).flatMap(g => g.events.map(e => e.operationId)).includes(id)).toBe(true);
  } finally { await peer.context.close(); }
});

test('offline creation uses persistent storage and catches up with remote events created while disconnected', async ({ page,request,browser,context }) => {
  await owner(page,request); const base = await create(page), peer = await invite(page,browser,base);
  try {
    await context.setOffline(true); await add(page,'Pendiente recuperable','101'); await page.reload(); await expect(page.getByTestId('trip-total')).toHaveText('COP $101');
    await add(peer.guest,'Publicado remotamente','200'); await confirmed(peer.guest);
    await context.setOffline(false); await confirmed(page); await expect(page.getByTestId('trip-total')).toHaveText('COP $301'); await expect(peer.guest.getByTestId('trip-total')).toHaveText('COP $301');
  } finally { await peer.context.close(); }
});

test('a trip not downloaded never accepts offline financial writes', async ({ page,request,context }) => {
  await owner(page,request); await create(page); await context.setOffline(true); await page.goto('/viajes/00000000-0000-4000-8000-000000000099/gastos/nuevo'); await expect(page.getByText('Viaje no descargado',{ exact: true })).toBeVisible(); await expect(page.getByRole('button',{ name: 'Guardar gasto',exact: true })).toHaveCount(0);
});

test('lost commit response and two tabs never duplicate a durable operation', async ({ page,request,context }) => {
  await owner(page,request); const base = await create(page);
  await context.setOffline(true); await add(page,'Un único café','20000'); const groups = await localGroups(page), original = groups.find(g => g.state !== 'confirmed')!;
  const second = await context.newPage(); await second.goto(base); await expect(second.getByTestId('trip-total')).toHaveText('COP $20.000');
  await installCommitFault(context,'lose-ack','financial');
  await context.setOffline(false); await expect.poll(async () => (await commitFaultState(page)).arrived).toBe(true);
  await clearCommitFault(context); await page.getByRole('button',{ name: 'Sincronizar ahora',exact: true }).click();
  await confirmed(page); await confirmed(second); await expect(page.getByTestId('trip-total')).toHaveText('COP $20.000');
  expect((await serverOperations(request,base)).filter(id => id === original.events[0]!.operationId)).toHaveLength(1);
  expect((await localGroups(page)).filter(g => g.id === original.id)).toHaveLength(1); expect((await localGroups(page)).find(g => g.id === original.id)?.events[0]?.operationId).toBe(original.events[0]!.operationId); expect((await commitFaultState(page)).financialWrites).toBe(1);
});

test('quota failure preserves the form, exposes a copy and never reports a successful local save', async ({ page,request }) => {
  await owner(page,request); const base = await create(page);
  await page.getByRole('link',{ name: 'Agregar gasto',exact: true }).click(); await page.getByLabel('Concepto',{ exact: true }).fill('No perder por cuota'); await page.getByLabel('Importe en COP',{ exact: true }).fill('123');
  await page.evaluate(() => { const original = IDBObjectStore.prototype.add; IDBObjectStore.prototype.add = function(...args: Parameters<typeof original>) { if (this.name === 'operations') throw new DOMException('Synthetic quota fault','QuotaExceededError'); return original.apply(this,args); }; });
  await page.getByRole('button',{ name: 'Guardar gasto',exact: true }).click(); await expect(page.getByRole('alert')).toContainText('No se pudo guardar'); await expect(page.getByLabel('Concepto',{ exact: true })).toHaveValue('No perder por cuota'); await expect(page.getByLabel('Propuesta recuperable',{ exact: true })).toHaveValue(/No perder por cuota/); expect((await localGroups(page)).some(g => g.events.some(e => e.payload.title === 'No perder por cuota'))).toBe(false);
  await page.getByRole('link',{ name: 'Inicio del viaje',exact: true }).click(); await expect(page.getByTestId('trip-total')).toHaveText('COP $0'); await page.goto(base);
});

test('IndexedDB opening failure does not pretend a download or a financial save', async ({ page,request,context }) => {
  await owner(page,request); const base = await create(page);
  await context.addInitScript(() => { const original = IDBFactory.prototype.open; IDBFactory.prototype.open = function(...args: Parameters<typeof original>) { if (args[0].startsWith('gastos-offline-v1:')) throw new DOMException('Synthetic unavailable storage','InvalidStateError'); return original.apply(this,args); }; });
  await page.goto(base); await expect(page.getByText('Almacenamiento no disponible',{ exact: true })).toBeVisible(); await expect(page.getByText(/Viaje descargado para este usuario/)).toHaveCount(0);
});

test('a transient IndexedDB opening error recovers without discarding the downloaded trip or changing the operation ID', async ({ page,request,context }) => {
  await owner(page,request); const base = await create(page);
  await context.addInitScript(() => {
    const original = IDBFactory.prototype.open; let failed = false;
    IDBFactory.prototype.open = function(...args: Parameters<typeof original>) {
      if (!failed && args[0].startsWith('gastos-offline-v1:')) { failed = true; throw new DOMException('Transient storage failure','InvalidStateError'); }
      return original.apply(this,args);
    };
  });
  await page.reload(); await expect(page.getByText(/Viaje descargado para este usuario/)).toBeVisible();
  await context.setOffline(true); await add(page,'Recuperado tras error local','913');
  const pending = (await localGroups(page)).find(group => group.state !== 'confirmed')!;
  await page.reload(); await expect(page.getByTestId('trip-total')).toHaveText('COP $913');
  await context.setOffline(false); await confirmed(page);
  expect((await serverOperations(request,base)).filter(id => id === pending.events[0]!.operationId)).toHaveLength(1);
  expect((await localGroups(page)).find(group => group.id === pending.id)?.state).toBe('confirmed');
});

test('an interrupted local receipt after server commit recovers the sending lease and confirms the same immutable operation', async ({ page,request,context }) => {
  await owner(page,request); const base = await create(page);
  await context.setOffline(true); await add(page,'Confirmación interrumpida','12001');
  const original = (await localGroups(page)).find(group => group.state !== 'confirmed')!;
  await installCommitFault(context,'hold-ack','financial');
  try {
    await context.setOffline(false); await expect.poll(async () => (await commitFaultState(page)).arrived).toBe(true);
    expect((await serverOperations(request,base)).filter(id => id === original.id)).toHaveLength(1);
    await page.goto('/icons/app.svg'); await clearCommitFault(context);
    expect((await localGroups(page)).find(group => group.id === original.id)?.state).toBe('sending');
    await page.goto(base); await expect(page.getByTestId('trip-total')).toHaveText('COP $12.001');
    await confirmed(page);
    expect((await localGroups(page)).find(group => group.id === original.id)?.state).toBe('confirmed');
    expect((await serverOperations(request,base)).filter(id => id === original.id)).toHaveLength(1);
    expect((await commitFaultState(page)).financialWrites).toBe(1);
  } finally { await clearCommitFault(context); }
});

test('a failed durable trip-cache transaction retries without falsely reporting storage success or losing an expense', async ({ page,request,context }) => {
  await owner(page,request); const base = await create(page);
  await context.addInitScript(() => {
    const put = IDBObjectStore.prototype.put; let failed = false;
    IDBObjectStore.prototype.put = function(...args: Parameters<typeof put>) {
      if (!failed && this.name === 'trips') { failed = true; throw new DOMException('Transient cache write failure','UnknownError'); }
      return put.apply(this,args);
    };
  });
  await page.reload(); const error = page.getByText('No se pudo completar la descarga en este dispositivo. No salgas sin copiar los datos pendientes.',{ exact: true });
  await expect(error).toBeVisible(); await expect(error).not.toBeVisible({ timeout: 15000 });
  await context.setOffline(true); await add(page,'Descarga reintentada','817');
  const pending = (await localGroups(page)).find(group => group.state !== 'confirmed')!;
  await page.reload(); await expect(page.getByTestId('trip-total')).toHaveText('COP $817');
  await context.setOffline(false); await confirmed(page);
  expect((await serverOperations(request,base)).filter(id => id === pending.id)).toHaveLength(1);
});
