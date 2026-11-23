import { MAX_BYTES,MAX_SIDE,webpDimensions } from './contracts';
import type { Thumbnail } from './contracts';
export const MAX_INPUT_BYTES = 20 * 1024 * 1024,MAX_PIXELS = 16777216;
const cancelled = (signal?: AbortSignal) => signal?.throwIfAborted();
export function inspectInput(bytes: Uint8Array): { mime: string;width?: number;height?: number } {
  const v = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if (bytes.length >= 24 && bytes[0] === 137 && String.fromCharCode(...bytes.slice(1,8)) === 'PNG\r\n\x1a\n') return { mime: 'image/png',width: v.getUint32(16),height: v.getUint32(20) };
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP') return { mime: 'image/webp',...webpDimensions(bytes,true) };
  if (bytes[0] === 255 && bytes[1] === 216) {
    for (let p = 2;p + 8 < bytes.length;) { if (bytes[p] !== 255) break; const marker = bytes[p+1]!; p += 2; if (marker === 0xda || marker === 0xd9) break; const size = v.getUint16(p); if (size < 2 || p+size > bytes.length) break; if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) return { mime: 'image/jpeg',height: v.getUint16(p+3),width: v.getUint16(p+5) }; p += size; }
    return { mime: 'image/jpeg' };
  }
  throw new Error('Archivo no compatible. Elige JPEG, PNG o WebP; convierte HEIC/HEIF a JPEG antes de seleccionarlo.');
}
function checkDimensions(width: number,height: number) {
  if (width * height > MAX_PIXELS || width > 16384 || height > 16384) throw new Error('La fotografía tiene demasiados píxeles. Elige una versión de hasta 16 megapíxeles.');
  if (Math.min(width,height) < 24) throw new Error('La imagen es demasiado pequeña o estrecha para una miniatura legible.');
}
export async function compressImage(file: Blob,signal?: AbortSignal): Promise<Thumbnail> {
  cancelled(signal);
  if (!file.size || file.size > MAX_INPUT_BYTES) throw new Error('La fotografía supera 20 MiB o está vacía. Elige una versión más pequeña.');
  const raw = await file.arrayBuffer(),input = inspectInput(new Uint8Array(raw)); cancelled(signal);
  if (file.type && !['image/jpeg','image/png','image/webp','application/octet-stream'].includes(file.type)) throw new Error('Formato no compatible. Convierte HEIC/HEIF a JPEG o elige PNG/WebP.');
  if (input.width && input.height) checkDimensions(input.width,input.height);
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(new Blob([raw],{ type: input.mime }),{ imageOrientation: 'from-image' }); } catch { throw new Error('No se pudo decodificar la fotografía. Elige otra imagen o continúa sin foto.'); }
  const canvas = document.createElement('canvas');
  try {
    cancelled(signal); checkDimensions(bitmap.width,bitmap.height);
    for (const side of [MAX_SIDE,512,384,320]) {
      const ratio = Math.min(1,side / Math.max(bitmap.width,bitmap.height)); canvas.width = Math.max(1,Math.round(bitmap.width * ratio)); canvas.height = Math.max(1,Math.round(bitmap.height * ratio));
      checkDimensions(canvas.width,canvas.height);
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Este navegador no puede preparar imágenes. Puedes continuar sin foto.');
      ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      for (const quality of [0.86,0.74,0.62]) {
        cancelled(signal); const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve,'image/webp',quality)); cancelled(signal);
        if (!blob || blob.type !== 'image/webp') throw new Error('Este navegador no puede generar WebP. Puedes continuar sin foto.');
        if (blob.size <= MAX_BYTES) { const bytes = new Uint8Array(await blob.arrayBuffer()),d = webpDimensions(bytes); return { bytes,byteLength: bytes.length,...d }; }
      }
      if (Math.max(bitmap.width,bitmap.height) <= side) continue;
    }
    throw new Error('No se logró una miniatura legible de hasta 40 KiB. Elige otra imagen o continúa sin foto.');
  } finally { bitmap.close(); canvas.width = canvas.height = 0; }
}
