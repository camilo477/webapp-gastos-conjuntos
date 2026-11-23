import { z } from 'zod';
import { openverseMetadataSchema,operationIdSchema,personIdSchema,receivedTimestampSchema } from '../domain';
export const MAX_BYTES = 40960, MAX_SIDE = 640;
export const imageIcons = ['receipt','utensils','car','mountain','wallet','mapPin'] as const;
export function publicHttps(value: string): boolean {
  try { const u = new URL(value),h = u.hostname.toLowerCase(); return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') && !u.hash && !h.includes(':') && !/^[\d.]+$/.test(h) && h.includes('.') && !/(^|\.)(localhost|local|internal|invalid|test|example)$/.test(h); } catch { return false; }
}
export function licenseMatches(license: string,version: string,url: string) {
  return license === 'cc0' ? version === '1.0' && url === 'https://creativecommons.org/publicdomain/zero/1.0/' : license === 'by' && ['1.0','2.0','2.5','3.0','4.0'].includes(version) && url === `https://creativecommons.org/licenses/by/${version}/`;
}
export const attributionSchema = openverseMetadataSchema.superRefine((m,ctx) => {
  const urls = [m.foreignLandingUrl,m.licenseUrl,m.thumbnailUrl,...(m.creatorUrl ? [m.creatorUrl] : [])];
  const serverUrl = /^https:\/\/[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9-]+)*\.[a-zA-Z][a-zA-Z0-9-]*(:443)?(\/[^\s#]*)?$/;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m.id) || m.thumbnailUrl !== `https://api.openverse.org/v1/images/${m.id}/thumb/?compressed=true` || !urls.every(url => serverUrl.test(url)) || m.creator !== m.creator.trim() || m.source !== m.source.trim() || !urls.every(publicHttps) || !licenseMatches(m.license,m.licenseVersion,m.licenseUrl) || !m.creator.trim() || !m.source.trim()) ctx.addIssue({ code: 'custom',message: 'La imagen necesita URLs públicas y atribución CC0 o CC BY verificable.' });
});
export type Attribution = z.infer<typeof attributionSchema>;
export interface Thumbnail { bytes: Uint8Array<ArrayBuffer>;byteLength: number;width: number;height: number }
export function webpDimensions(bytes: Uint8Array,allowMetadata = false): { width: number;height: number } {
  const fail = () => { throw new Error('La miniatura no es WebP válido sin metadatos.'); };
  const text = (i: number,n: number) => String.fromCharCode(...bytes.slice(i,i+n));
  if (bytes.length < 20 || text(0,4) !== 'RIFF' || text(8,4) !== 'WEBP') return fail();
  const v = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if (v.getUint32(4,true) + 8 !== bytes.length) return fail();
  let dimensions: { width: number;height: number } | null = null,image = false;
  for (let i = 12;i < bytes.length;) {
    if (i + 8 > bytes.length) return fail(); const type = text(i,4),size = v.getUint32(i+4,true),p = i+8;
    if (p + size > bytes.length || (allowMetadata ? ['ANIM','ANMF'] : ['EXIF','XMP ','ANIM','ANMF']).includes(type)) return fail();
    if (type === 'VP8X') { if (size !== 10 || bytes[p]! & (allowMetadata ? 0x02 : 0x0e)) return fail(); dimensions = { width: 1 + bytes[p+4]! + (bytes[p+5]! << 8) + (bytes[p+6]! << 16),height: 1 + bytes[p+7]! + (bytes[p+8]! << 8) + (bytes[p+9]! << 16) }; }
    if (type === 'VP8 ') { if (size < 10 || text(p+3,3) !== '\x9d\x01\x2a') return fail(); const d = { width: v.getUint16(p+6,true) & 0x3fff,height: v.getUint16(p+8,true) & 0x3fff }; if (dimensions && (dimensions.width !== d.width || dimensions.height !== d.height)) return fail(); dimensions = d; image = true; }
    if (type === 'VP8L') { if (size < 5 || bytes[p] !== 0x2f) return fail(); const bits = v.getUint32(p+1,true),d = { width: (bits & 0x3fff)+1,height: ((bits >>> 14) & 0x3fff)+1 }; if (dimensions && (dimensions.width !== d.width || dimensions.height !== d.height)) return fail(); dimensions = d; image = true; }
    i = p + size + (size % 2);
  }
  if (!image || !dimensions || !dimensions.width || !dimensions.height) return fail(); return dimensions;
}
export const attachmentSchema = z.strictObject({
  schemaVersion: z.literal(1),expenseId: operationIdSchema,createdBy: personIdSchema,createdAt: receivedTimestampSchema,
  mimeType: z.literal('image/webp'),bytes: z.instanceof(Uint8Array),byteLength: z.number().int().min(1).max(MAX_BYTES),
  width: z.number().int().min(1).max(MAX_SIDE),height: z.number().int().min(1).max(MAX_SIDE),sourceKind: z.enum(['photo','openverse']),attribution: attributionSchema.nullable(),
}).superRefine((a,ctx) => {
  try { const d = webpDimensions(a.bytes); if (a.bytes.length !== a.byteLength || d.width !== a.width || d.height !== a.height || (a.sourceKind === 'photo') !== (a.attribution === null)) throw Error(); } catch { ctx.addIssue({ code: 'custom',message: 'Bytes, dimensiones o procedencia de la miniatura inválidos.' }); }
});
export type Attachment = z.infer<typeof attachmentSchema>;
export interface ImageChoice { visual: { kind: 'icon';key: string } | Attribution | null;attachmentId: string | null;thumbnail?: Thumbnail | undefined;sourceKind?: 'photo' | 'openverse' | undefined }
export function sameAttachment(a: Attachment,b: Attachment) { const data = (v: Attachment) => ({ ...v,bytes: [...v.bytes],createdAt: null }); return JSON.stringify(data(a)) === JSON.stringify(data(b)); }
export const imageChoiceSchema = z.strictObject({ visual: z.union([z.null(),z.strictObject({ kind: z.literal('icon'),key: z.enum(imageIcons) }),attributionSchema]),attachmentId: operationIdSchema.nullable(),thumbnail: z.strictObject({ bytes: z.instanceof(Uint8Array),byteLength: z.number().int().min(1).max(MAX_BYTES),width: z.number().int().min(1).max(MAX_SIDE),height: z.number().int().min(1).max(MAX_SIDE) }).optional(),sourceKind: z.enum(['photo','openverse']).optional() }).superRefine((value,ctx) => {
  if (!value.thumbnail) return;
  try {
    const image = value.thumbnail,d = webpDimensions(image.bytes);
    if (!value.attachmentId || !value.sourceKind || image.bytes.length !== image.byteLength || d.width !== image.width || d.height !== image.height || (value.sourceKind === 'openverse' && (!value.visual || 'kind' in value.visual))) throw Error();
  } catch { ctx.addIssue({ code: 'custom',message: 'La miniatura del borrador no cumple el contrato de imagen.' }); }
}).transform((value): ImageChoice => value);
