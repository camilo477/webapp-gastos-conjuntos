import { z } from 'zod';
import { operationIdSchema } from '../domain';
import type { OfflineStore } from '../sync/storage';
import { attachmentSchema,sameAttachment } from './contracts';
import type { Attachment } from './contracts';
const rowSchema = z.strictObject({ id: z.string(),project: z.string(),uid: z.string(),tripId: operationIdSchema,attachmentId: operationIdSchema,revisionId: operationIdSchema.nullable(),attachment: attachmentSchema,state: z.enum(['pending','sending','error','rejected','confirmed']),attempts: z.number().int().nonnegative(),nextAttemptAt: z.number(),leaseOwner: z.string().nullable(),leaseUntil: z.number(),error: z.string().nullable() });
export type LocalAttachment = z.infer<typeof rowSchema>;
export const idbRequest = <T,>(request: IDBRequest<T>) => new Promise<T>((resolve,reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
export class AttachmentStore {
  constructor(readonly store: OfflineStore) {}
  private parse(raw: unknown): LocalAttachment { const row = rowSchema.parse(raw); if (row.project !== this.store.project || row.uid !== this.store.uid || row.id !== `${row.tripId}/${row.attachmentId}`) throw Error('Partición de imagen inválida.'); return row; }
  async get(tripId: string,id: string,expenseId?: string): Promise<LocalAttachment | null> {
    const raw = await this.store.withAttachments('readonly',s => idbRequest(s.get(`${tripId}/${id}`))); if (!raw) return null; const row = this.parse(raw); if (expenseId && row.attachment.expenseId !== expenseId) throw Error('La miniatura pertenece a otro gasto.'); return row;
  }
  async save(tripId: string,id: string,raw: Attachment,revisionId: string) {
    const attachment = attachmentSchema.parse(raw),trip = await this.store.trip(tripId);
    if (!trip?.downloaded || trip.blocked || trip.trip.status !== 'active' || attachment.createdBy !== this.store.uid || !trip.trip.memberBindings[this.store.uid]) throw Error('No se puede guardar esta imagen en la sesión actual.');
    const row = this.parse({ id: `${tripId}/${id}`,project: this.store.project,uid: this.store.uid,tripId,attachmentId: id,revisionId,attachment,state: 'pending',attempts: 0,nextAttemptAt: 0,leaseOwner: null,leaseUntil: 0,error: null });
    await this.store.withAttachments('readwrite',async s => { const existing = await idbRequest(s.get(row.id)); if (existing) { if (!sameAttachment(this.parse(existing).attachment,attachment)) throw Error('ID de imagen ocupado.'); return; } await idbRequest(s.add(row)); });
  }
  async cache(tripId: string,id: string,raw: Attachment) {
    const attachment = attachmentSchema.parse(raw);
    await this.store.withAttachments('readwrite',async s => {
      const existing = await idbRequest(s.get(`${tripId}/${id}`));
      if (existing) { const old = this.parse(existing); if (!sameAttachment(old.attachment,attachment)) throw Error('El ID remoto contiene una imagen distinta.'); if (old.state === 'confirmed') return; }
      await idbRequest(s.put(this.parse({ id: `${tripId}/${id}`,project: this.store.project,uid: this.store.uid,tripId,attachmentId: id,revisionId: null,attachment,state: 'confirmed',attempts: 0,nextAttemptAt: 0,leaseOwner: null,leaseUntil: 0,error: null })));
    });
  }
  async pending(): Promise<LocalAttachment[]> { return this.store.withAttachments('readonly',async s => (await idbRequest(s.index('state').getAll(IDBKeyRange.lowerBound('error'))) as unknown[]).map(raw => this.parse(raw))); }
  async claim(id: string,owner: string): Promise<LocalAttachment | null> {
    return this.store.withAttachments('readwrite',async s => { const raw = await idbRequest(s.get(id)); if (!raw) return null; const row = this.parse(raw),now = Date.now(); if (['confirmed','rejected'].includes(row.state) || row.nextAttemptAt > now || row.leaseUntil > now) return null; const next = { ...row,state: 'sending' as const,leaseOwner: owner,leaseUntil: now + 45000,attempts: row.attempts + 1 }; await idbRequest(s.put(next)); return next; });
  }
  async result(row: LocalAttachment,owner: string,result: Attachment | { message: string;permanent: boolean;nextAttemptAt: number }) {
    await this.store.withAttachments('readwrite',async s => { const raw = await idbRequest(s.get(row.id)); if (!raw) return; const current = this.parse(raw); if (current.leaseOwner !== owner || current.state === 'confirmed') return;
      await idbRequest(s.put('bytes' in result ? { ...current,state: 'confirmed',attachment: result,error: null,leaseOwner: null,leaseUntil: 0,nextAttemptAt: 0 } : { ...current,state: result.permanent ? 'rejected' : 'error',error: result.message,leaseOwner: null,leaseUntil: 0,nextAttemptAt: result.nextAttemptAt })); });
  }
  async retry(id?: string,includeRejected = true) { await this.store.withAttachments('readwrite',async s => { const rows = await idbRequest(s.index('state').getAll(IDBKeyRange.lowerBound('error'))) as unknown[]; for (const raw of rows) { const row = this.parse(raw); if ((includeRejected || row.state !== 'rejected') && (!id || row.id === id) && row.leaseUntil <= Date.now()) await idbRequest(s.put({ ...row,state: 'pending',nextAttemptAt: 0,error: null })); } }); }
}
