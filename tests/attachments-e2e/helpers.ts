import { expect } from '@playwright/test';
import type { Page,APIRequestContext } from '@playwright/test';
export async function syntheticImage(page: Page,options: { width?: number;height?: number;type?: string;noise?: boolean;orientation?: number } = {}) {
  const base64 = await page.evaluate(async options => {
    const canvas = document.createElement('canvas'); canvas.width = options.width ?? 1600; canvas.height = options.height ?? 1000; const ctx = canvas.getContext('2d')!;
    if (options.noise) { const data = ctx.createImageData(canvas.width,canvas.height); let value = 17; for (let i = 0;i < data.data.length;i += 4) { value = (value * 1664525 + 1013904223) >>> 0; data.data[i] = value & 255; data.data[i+1] = value >>> 8 & 255; data.data[i+2] = value >>> 16 & 255; data.data[i+3] = 255; } ctx.putImageData(data,0,0); }
    else { ctx.fillStyle = '#ddd8b8'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle = '#143e2e'; ctx.fillRect(0,0,canvas.width / 3,canvas.height); ctx.font = `${Math.max(24,canvas.width / 14)}px sans-serif`; ctx.fillStyle = '#222'; ctx.fillText('FOTO SINTÉTICA',canvas.width / 3,canvas.height / 2); }
    return canvas.toDataURL(options.type ?? 'image/png',0.9).split(',')[1]!;
  },options);
  let buffer = Buffer.from(base64,'base64');
  if (options.orientation) {
    const data = Buffer.alloc(64); data.write('Exif\0\0',0,'binary'); data.write('II',6); data.writeUInt16LE(42,8); data.writeUInt32LE(8,10); data.writeUInt16LE(1,14); data.writeUInt16LE(0x112,16); data.writeUInt16LE(3,18); data.writeUInt32LE(1,20); data.writeUInt16LE(options.orientation,24); data.write('SYNTHETIC-GPS-DO-NOT-PERSIST',32,'ascii'); const marker = Buffer.alloc(4); marker[0] = 255; marker[1] = 225; marker.writeUInt16BE(data.length+2,2); buffer = Buffer.concat([buffer.subarray(0,2),marker,data,buffer.subarray(2)]);
  }
  return { name: options.type === 'image/jpeg' ? 'synthetic.jpg' : options.type === 'image/webp' ? 'synthetic.webp' : 'synthetic.png',mimeType: options.type ?? 'image/png',buffer };
}
export async function pick(page: Page,file: { name: string;mimeType: string;buffer: Buffer }) {
  await page.getByRole('button',{ name: 'Elegir imagen',exact: true }).click(); await page.getByLabel('Elegir de galería',{ exact: true }).setInputFiles(file); await expect(page.getByRole('img',{ name: 'Vista previa de la miniatura',exact: true })).toBeVisible(); await page.getByRole('button',{ name: 'Usar esta imagen',exact: true }).click();
}
export async function begin(page: Page,title = 'Gasto con foto',amount = '20000') { await page.getByRole('link',{ name: 'Agregar gasto',exact: true }).click(); await page.getByLabel('Concepto',{ exact: true }).fill(title); await page.getByLabel('Importe en COP',{ exact: true }).fill(amount); }
export async function localImages(page: Page) { return page.evaluate(async () => { const names = (await indexedDB.databases()).filter(d => d.name?.startsWith('gastos-offline-v1:')); const all: { id: string;state: string;attachmentId: string;attachment: { bytes: Uint8Array;byteLength: number;width: number;height: number;expenseId: string } }[] = []; for (const info of names) { const db = await new Promise<IDBDatabase>((resolve,reject) => { const r = indexedDB.open(info.name!); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); if (db.objectStoreNames.contains('attachments')) { const rows = await new Promise<typeof all>((resolve,reject) => { const r = db.transaction('attachments').objectStore('attachments').getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); all.push(...rows); } db.close(); } return all.map(row => ({ ...row,attachment: { ...row.attachment,bytes: Array.from(row.attachment.bytes) } })); }); }
export async function remoteImages(request: APIRequestContext,base: string) { const r = await request.get(`http://127.0.0.1:8180/v1/projects/demo-gastos-compartidos/databases/(default)/documents/trips/${base.split('/').at(-1)}/attachments`,{ headers: { Authorization: 'Bearer owner' } }); expect(r.ok()).toBe(true); return (await r.json()).documents ?? []; }
