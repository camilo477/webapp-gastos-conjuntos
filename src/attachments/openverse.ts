import { attributionSchema,publicHttps } from './contracts';
import type { Attribution,Thumbnail } from './contracts';
import { compressImage } from './process';
const API = 'https://api.openverse.org/v1';
export const stockThumbnail = (id: string) => `${API}/images/${id}/thumb/?compressed=true`;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseStock(raw: unknown): Attribution | null {
  if (!raw || typeof raw !== 'object') return null; const r = raw as Record<string,unknown>;
  if (typeof r.id !== 'string' || !uuid.test(r.id) || typeof r.thumbnail !== 'string' || !publicHttps(r.thumbnail) || typeof r.url !== 'string' || !publicHttps(r.url) || r.mature === true) return null;
  const parsed = attributionSchema.safeParse({ id: r.id,title: r.title ?? '',source: typeof r.source === 'string' ? r.source.trim() : r.source,foreignLandingUrl: r.foreign_landing_url,creator: typeof r.creator === 'string' ? r.creator.trim() : r.creator,creatorUrl: r.creator_url || null,license: r.license,licenseVersion: r.license_version ?? '',licenseUrl: r.license_url,thumbnailUrl: stockThumbnail(r.id),modified: true });
  return parsed.success ? parsed.data : null;
}
export class OpenverseClient {
  private pending: AbortController | null = null; private blockedUntil = 0; private lastRequest = 0;
  private cache = new Map<string,{ values: Attribution[];more: boolean }>();
  cancel() { this.pending?.abort(); this.pending = null; }
  async search(query: string,page = 1): Promise<{ values: Attribution[];more: boolean }> {
    this.cancel(); const q = query.trim(); if (q.length < 2 || q.length > 80 || !Number.isInteger(page) || page < 1 || page > 3) throw Error('Busca entre 2 y 80 caracteres; se consultan hasta tres páginas.');
    const key = `${q.toLowerCase()}/${page}`,cached = this.cache.get(key); if (cached) return cached;
    const now = Date.now(); if (now < this.blockedUntil) throw Error('Openverse pidió esperar antes de otra búsqueda. Prueba más tarde o utiliza un icono.');
    if (now - this.lastRequest < 1000) throw Error('Espera un momento antes de otra búsqueda.'); this.lastRequest = now;
    const controller = new AbortController(); this.pending = controller; const timer = setTimeout(() => controller.abort('timeout'),10000);
    try {
      const params = new URLSearchParams({ q,page: String(page),page_size: '8',license: 'cc0,by',mature: 'false',filter_dead: 'true',format: 'json' });
      const response = await fetch(`${API}/images/?${params}`,{ signal: controller.signal,mode: 'cors',credentials: 'omit',cache: 'no-store',redirect: 'error',referrerPolicy: 'no-referrer' });
      if (response.status === 429) { const seconds = Number(response.headers.get('Retry-After')); this.blockedUntil = Date.now() + Math.max(30000,Math.min(300000,Number.isFinite(seconds) ? seconds * 1000 : 60000)); throw Error('Openverse limita temporalmente las solicitudes. Espera o utiliza un icono.'); }
      if (!response.ok) throw Error('Openverse no está disponible. Puedes utilizar un icono o una foto local.');
      const data = await response.json() as { results?: unknown[];next?: unknown };
      if (!Array.isArray(data.results)) throw Error('Openverse devolvió una respuesta no compatible.');
      const result = { values: data.results.slice(0,8).flatMap(raw => { const item = parseStock(raw); return item ? [item] : []; }),more: !!data.next && page < 3 };
      if (this.cache.size >= 12) this.cache.delete(this.cache.keys().next().value!); this.cache.set(key,result); return result;
    } catch (error) { if (controller.signal.aborted) throw new Error(controller.signal.reason === 'timeout' ? 'La búsqueda tardó demasiado. Puedes continuar con un icono.' : 'Búsqueda cancelada.',{ cause: error }); if (error instanceof Error && !(error instanceof TypeError) && !(error instanceof SyntaxError)) throw error; throw Error('No se pudo consultar Openverse. Comprueba la conexión o utiliza un icono.',{ cause: error }); }
    finally { clearTimeout(timer); if (this.pending === controller) this.pending = null; }
  }
}
export async function downloadStock(metadata: Attribution,signal: AbortSignal): Promise<Thumbnail> {
  const m = attributionSchema.parse(metadata); if (!uuid.test(m.id)) throw Error('Imagen sin identificador Openverse válido.');
  const timer = new AbortController(),abort = () => timer.abort(signal.reason); signal.addEventListener('abort',abort,{ once: true }); const timeout = setTimeout(() => timer.abort(),10000);
  try {
    signal.throwIfAborted(); const response = await fetch(stockThumbnail(m.id),{ signal: timer.signal,mode: 'cors',credentials: 'omit',cache: 'no-store',redirect: 'error',referrerPolicy: 'no-referrer' });
    if (!response.ok || !/^image\/(jpeg|png|webp)(;|$)/.test(response.headers.get('Content-Type') ?? '') || Number(response.headers.get('Content-Length') ?? 0) > 2 * 1024 * 1024 || !response.body) throw Error('La miniatura remota no se puede descargar. No estará disponible offline; puedes conservar su atribución y usar un icono.');
    const reader = response.body.getReader(),chunks: Uint8Array[] = []; let size = 0;
    try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 2 * 1024 * 1024) throw Error('La miniatura remota es demasiado grande. Utiliza un icono.'); chunks.push(part.value); } } finally { await reader.cancel().catch(() => {}); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.length; }
    return await compressImage(new Blob([bytes.buffer],{ type: response.headers.get('Content-Type')!.split(';')[0]! }),signal);
  } catch (error) { if (signal.aborted) throw Error('Selección cancelada.',{ cause: error }); if (error instanceof Error && error.message.includes('miniatura')) throw error; throw Error('No se pudo descargar la miniatura (conexión, CORS o tiempo de espera). No se promete disponibilidad offline. Puedes usar un icono y conservar la atribución.',{ cause: error }); }
  finally { clearTimeout(timeout); signal.removeEventListener('abort',abort); }
}
