import { randomUUID } from 'node:crypto';
import { test,expect } from '@playwright/test';
import { owner,create,invite,confirmed } from '../offline-e2e/helpers';
import { begin,pick,syntheticImage,localImages,remoteImages } from './helpers';

test('three hundred immutable thumbnails stay outside financial subscriptions and load only on demand',async ({ page,request,browser },info) => {
  test.setTimeout(180000); await owner(page,request); const base = await create(page),peer = await invite(page,browser,base);
  try {
    await peer.guest.goto(`${base}/estadisticas`); await begin(page,'Referencia de carga'); await pick(page,await syntheticImage(page,{ width: 100,height: 100 })); await page.getByRole('button',{ name: 'Guardar gasto',exact: true }).click(); await expect.poll(async () => (await remoteImages(request,base)).length).toBe(1); await confirmed(page);
    const original = (await localImages(page))[0]!,rootId = original.attachment.expenseId,path = `projects/demo-gastos-compartidos/databases/(default)/documents/trips/${base.split('/').at(-1)}`;
    const headers = { Authorization: 'Bearer owner' },root = await (await request.get(`http://127.0.0.1:8180/v1/${path}/events/${rootId}`,{ headers })).json(),image = (await remoteImages(request,base))[0];
    // Emulator-only fixtures. Ordinary-client authorization is tested in rules;
    // here every cloned financial root still passes the real domain projector.
    const writes: unknown[] = [];
    for (let i = 0;i < 300;i++) {
      const expenseId = randomUUID(),attachmentId = randomUUID(),eventFields = structuredClone(root.fields),imageFields = structuredClone(image.fields);
      eventFields.operationId.stringValue = eventFields.entityId.stringValue = expenseId; eventFields.payload.mapValue.fields.title.stringValue = `Miniatura sintética ${i}`; eventFields.payload.mapValue.fields.attachmentId.stringValue = attachmentId;
      imageFields.expenseId.stringValue = expenseId; writes.push({ update: { name: `${path}/events/${expenseId}`,fields: eventFields },currentDocument: { exists: false } },{ update: { name: `${path}/attachments/${attachmentId}`,fields: imageFields },currentDocument: { exists: false } });
    }
    const start = Date.now();
    for (let i = 0;i < writes.length;i += 400) expect((await request.post('http://127.0.0.1:8180/v1/projects/demo-gastos-compartidos/databases/(default)/documents:commit',{ headers,data: { writes: writes.slice(i,i+400) } })).ok()).toBe(true);
    await expect(peer.guest.getByTestId('statistics-total')).toHaveText('COP $6.020.000',{ timeout: 60000 }); expect((await localImages(peer.guest))).toHaveLength(0);
    await peer.guest.goto(base); await expect(peer.guest.getByTestId('trip-total')).toHaveText('COP $6.020.000'); await peer.guest.getByRole('heading',{ name: 'Movimientos recientes',exact: true }).scrollIntoViewIfNeeded(); await expect.poll(async () => (await localImages(peer.guest)).length).toBeGreaterThan(0); const downloaded = await localImages(peer.guest); expect(downloaded.length).toBeLessThanOrEqual(8);
    const before = downloaded.length; await peer.guest.goto(`${base}/estadisticas`); await peer.guest.goto(base); await peer.guest.getByRole('heading',{ name: 'Movimientos recientes',exact: true }).scrollIntoViewIfNeeded(); await expect.poll(async () => (await localImages(peer.guest)).length).toBe(before);
    await info.attach('lazy-300.json',{ body: Buffer.from(JSON.stringify({ remoteThumbnails: 301,remoteImageBytes: original.attachment.byteLength * 301,localThumbnails: before,localImageBytes: downloaded.reduce((n,r) => n+r.attachment.byteLength,0),seedAndProjectionMs: Date.now()-start })),contentType: 'application/json' });
  } finally { await peer.context.close(); }
});
