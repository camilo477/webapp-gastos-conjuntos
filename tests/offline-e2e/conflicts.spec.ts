import { test,expect } from '@playwright/test';
import { owner,create,invite,add,localGroups,confirmed,serverOperations } from './helpers';
import type { Page } from '@playwright/test';
async function delivered(page: Page) { await expect.poll(async () => (await localGroups(page)).filter(g => g.state !== 'confirmed').length,{ timeout: 60000 }).toBe(0); }
async function amount(page: Page,value: string) { await page.getByLabel('Importe en COP',{ exact: true }).fill(value); await page.getByRole('button',{ name: 'Guardar gasto',exact: true }).click(); }

for (const order of ['owner-first','guest-first']) test(`simultaneous offline revisions, corrected resolutions, concurrent resolutions and a late branch preserve every proposal ${order}`,async ({ page,request,browser,context }) => {
  await owner(page,request); const base = await create(page),peer = await invite(page,browser,base);
  try {
    await add(page,'Café conflictivo','20000'); await confirmed(page); await expect(peer.guest.getByTestId('trip-total')).toHaveText('COP $20.000');
    const detail = await page.getByRole('link',{ name: /Café conflictivo/ }).getAttribute('href');
    const late = await peer.context.newPage(); await late.goto(`${detail}/editar`); await expect(late.getByLabel('Concepto',{ exact: true })).toHaveValue('Café conflictivo');
    await page.goto(`${detail}/editar`); await peer.guest.goto(`${detail}/editar`); await context.setOffline(true); await peer.context.setOffline(true); await amount(page,'25000'); await amount(peer.guest,'30000');
    if (order === 'owner-first') { await context.setOffline(false); await delivered(page); await peer.context.setOffline(false); await delivered(peer.guest); } else { await peer.context.setOffline(false); await delivered(peer.guest); await context.setOffline(false); await delivered(page); }
    for (const p of [page,peer.guest]) { await p.goto(`${base}/actividad`); await expect(p.getByRole('heading',{ name: 'Este movimiento necesita revisión' })).toBeVisible(); await expect(p.getByRole('region',{ name: 'Comparar propuestas' })).toContainText('COP $25.000'); await expect(p.getByRole('region',{ name: 'Comparar propuestas' })).toContainText('COP $30.000'); }
    await context.setOffline(true); await peer.context.setOffline(true);
    await page.getByRole('link',{ name: 'Crear versión corregida' }).click(); await amount(page,'27000');
    await peer.guest.getByRole('button',{ name: 'Usar propuesta 2',exact: true }).click();
    if (order === 'owner-first') { await context.setOffline(false); await delivered(page); await peer.context.setOffline(false); await delivered(peer.guest); } else { await peer.context.setOffline(false); await delivered(peer.guest); await context.setOffline(false); await delivered(page); }
    await page.goto(`${base}/actividad`); await expect(page.getByRole('heading',{ name: 'Este movimiento necesita revisión' })).toBeVisible(); await page.getByRole('button',{ name: 'Usar propuesta 1',exact: true }).click(); await delivered(page); await expect(page.getByRole('heading',{ name: 'Este movimiento necesita revisión' })).toHaveCount(0);
    // The editor captured the original root before any competing revision arrived.
    await amount(late,'35000'); await delivered(late); await expect(page.getByRole('heading',{ name: 'Este movimiento necesita revisión' })).toBeVisible(); await page.getByRole('button',{ name: 'Usar propuesta 1',exact: true }).click(); await delivered(page);
    for (const p of [page,peer.guest]) { await p.goto(base); await confirmed(p); }
    expect(await page.getByTestId('trip-total').textContent()).toBe(await peer.guest.getByTestId('trip-total').textContent());
    const groups = [...await localGroups(page),...await localGroups(peer.guest)]; expect(groups.flatMap(g => g.events).filter(e => e.payload.total === 25000 && e.action === 'replace')).toHaveLength(1); expect(groups.flatMap(g => g.events).filter(e => e.payload.total === 35000 && e.action === 'replace')).toHaveLength(1);
  } finally { await peer.context.close(); }
});

test('similar real purchases stay separate by explicit decision; an offline atomic merge counts once and supports correction',async ({ page,request,browser,context }) => {
  await owner(page,request); const base = await create(page),peer = await invite(page,browser,base);
  try {
    await context.setOffline(true); await add(page,'Café parecido','20000'); await add(page,'  CAFÉ parecido  ','20000'); await page.goto(`${base}/actividad`);
    await expect(page.getByText('Encontramos dos gastos que podrían ser el mismo',{ exact: true })).toBeVisible(); await page.getByRole('button',{ name: 'Mantener separados' }).click(); await expect(page.getByText('Encontramos dos gastos que podrían ser el mismo',{ exact: true })).toHaveCount(0);
    await page.goto(base); await expect(page.getByTestId('trip-total')).toHaveText('COP $40.000'); await add(page,'Hotel duplicado','100000'); await add(page,'Hotel duplicado','100000'); await page.goto(`${base}/actividad`);
    await page.getByText('Unificar estos gastos',{ exact: true }).click(); await page.getByLabel('Confirmo que fue una sola compra').check(); await page.getByRole('button',{ name: 'Confirmar unificación' }).click(); await expect(page.getByText('Encontramos dos gastos que podrían ser el mismo',{ exact: true })).toHaveCount(0);
    const groups = await localGroups(page); expect(groups.filter(g => g.events.length === 2)).toHaveLength(1); await page.reload();
    await context.setOffline(false); await delivered(page); await page.goto(base); await confirmed(page); await expect(page.getByTestId('trip-total')).toHaveText('COP $140.000'); await expect(peer.guest.getByTestId('trip-total')).toHaveText('COP $140.000'); const server = await serverOperations(request,base); for (const group of groups) for (const e of group.events) expect(server.filter(id => id === e.operationId)).toHaveLength(1);
    await page.getByRole('link',{ name: /Hotel duplicado/ }).click(); await page.getByRole('link',{ name: 'Editar gasto',exact: true }).click(); await amount(page,'120000'); await delivered(page); await page.goto(`${base}/actividad`); await expect(page.getByRole('heading',{ name: 'Una unificación necesita revisión' })).toBeVisible(); await page.getByRole('button',{ name: 'Reafirmar unificación conservando Hotel duplicado',exact: true }).click(); await delivered(page); await page.goto(base); await confirmed(page); await expect(page.getByTestId('trip-total')).toHaveText('COP $160.000'); await expect(peer.guest.getByTestId('trip-total')).toHaveText('COP $160.000');
  } finally { await peer.context.close(); }
});
