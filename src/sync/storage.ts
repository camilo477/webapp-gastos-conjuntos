import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';
import { financialEventV2Schema, operationIdSchema, tripContextSchema } from '../domain';
import type { FinancialEventV2Dto, TripContext } from '../domain';
import { tripDocumentSchema } from '../repositories/access/contracts';
import type { TripRecord } from '../repositories/access/contracts';
import { sameOperation } from '../repositories/financial/events';

export class LocalStorageError extends Error {
  constructor() { super('No se pudo guardar en este dispositivo. Comprueba el espacio y los permisos de almacenamiento. Conserva o copia el formulario antes de salir.'); }
}
const timestamp = (value: Timestamp | null) => value ? { seconds: value.seconds, nanoseconds: value.nanoseconds } : null;
export function serializeTrip(trip: TripRecord) { return { ...trip,createdAt: timestamp(trip.createdAt),updatedAt: timestamp(trip.updatedAt),closedAt: timestamp(trip.closedAt) }; }
export function deserializeTrip(raw: unknown): TripRecord {
  const value = raw as ReturnType<typeof serializeTrip>;
  const { id,...document } = value;
  const stamp = (x: { seconds: number;nanoseconds: number } | null) => x ? new Timestamp(x.seconds,x.nanoseconds) : null;
  return { ...tripDocumentSchema.parse({ ...document,createdAt: stamp(value.createdAt),updatedAt: stamp(value.updatedAt),closedAt: stamp(value.closedAt) }),id: operationIdSchema.parse(id) };
}
export interface DownloadedTrip {
  id: string; project: string; uid: string; version: 1;
  trip: ReturnType<typeof serializeTrip>; context: TripContext; events: unknown[];
  downloaded: boolean; blocked: boolean; updatedAt: number;
}
const delivery = z.enum(['pending','sending','error','rejected','confirmed']);
export const pendingGroupSchema = z.strictObject({
  id: operationIdSchema,project: z.string(),uid: z.string(),tripId: operationIdSchema,version: z.literal(1),
  events: z.array(financialEventV2Schema).min(1).max(2),state: delivery,
  attempts: z.number().int().nonnegative(),nextAttemptAt: z.number(),error: z.string().nullable(),
  leaseOwner: z.string().nullable(),leaseUntil: z.number(),createdAt: z.number(),
});
export type PendingGroup = z.infer<typeof pendingGroupSchema>;
const request = <T,>(value: IDBRequest<T>) => new Promise<T>((resolve,reject) => { value.onsuccess = () => resolve(value.result); value.onerror = () => reject(new LocalStorageError()); });
export class OfflineStore {
  readonly name: string;
  private database: Promise<IDBDatabase> | null = null;
  private generation = 0;
  private listeners = new Set<() => void>();
  private channel: BroadcastChannel | null = null;
  private writes = new Set<Promise<unknown>>();
  constructor(readonly project: string,readonly uid: string) {
    this.name = `gastos-offline-v1:${encodeURIComponent(project)}:${encodeURIComponent(uid)}`;
  }
  subscribe = (notify: () => void) => {
    if (!this.channel && typeof BroadcastChannel !== 'undefined') { this.channel = new BroadcastChannel(this.name); this.channel.onmessage = () => { for (const notify of this.listeners) notify(); }; }
    this.listeners.add(notify); return () => { this.listeners.delete(notify); }; };
  private changed() { this.channel?.postMessage('changed'); for (const notify of this.listeners) notify(); }
  async open(): Promise<IDBDatabase> {
    if (!this.database) {
      const generation = this.generation;
      const attempt = new Promise<IDBDatabase>((resolve,reject) => {
        let settled = false;
        const timer = setTimeout(() => fail(),5000);
        const fail = () => { if (!settled) { settled = true; clearTimeout(timer); reject(new LocalStorageError()); } };
        let open: IDBOpenDBRequest;
        try { if (typeof indexedDB === 'undefined') { fail(); return; } open = indexedDB.open(this.name,3); }
        catch { fail(); return; }
        open.onupgradeneeded = () => {
          if (settled || generation !== this.generation) { open.transaction?.abort(); return; }
          for (const name of ['trips','operations','drafts','operationIds','attachments']) if (!open.result.objectStoreNames.contains(name)) open.result.createObjectStore(name,{ keyPath: 'id' });
          const operations = open.transaction!.objectStore('operations');
          if (!operations.indexNames.contains('state')) operations.createIndex('state','state');
          const attachments = open.transaction!.objectStore('attachments');
          if (!attachments.indexNames.contains('state')) attachments.createIndex('state','state');
        };
        open.onerror = open.onblocked = fail;
        open.onsuccess = () => {
          if (settled || generation !== this.generation) { open.result.close(); fail(); return; }
          settled = true; clearTimeout(timer);
          open.result.onversionchange = () => { open.result.close(); if (this.database === connection) { this.database = null; this.generation++; } };
          resolve(open.result);
        };
      });
      const connection = attempt.catch(error => { if (this.database === connection) this.database = null; throw error; });
      this.database = connection;
    }
    return this.database;
  }
  private transaction<T>(names: string[],mode: IDBTransactionMode,body: (tx: IDBTransaction) => Promise<T>): Promise<T> {
    const value = this.performTransaction(names,mode,body);
    if (mode === 'readwrite') { this.writes.add(value); void value.finally(() => this.writes.delete(value)).catch(() => {}); }
    return value;
  }
  async flush() { while (this.writes.size) await Promise.all([...this.writes]); }
  withAttachments<T>(mode: IDBTransactionMode,body: (store: IDBObjectStore) => Promise<T>): Promise<T> {
    return this.transaction(['attachments'],mode,tx => body(tx.objectStore('attachments')));
  }
  private async performTransaction<T>(names: string[],mode: IDBTransactionMode,body: (tx: IDBTransaction) => Promise<T>): Promise<T> {
    try {
      const db = await this.open(), tx = db.transaction(names,mode,mode === 'readwrite' ? { durability: 'strict' } : undefined);
      const completed = new Promise<void>((resolve,reject) => { tx.oncomplete = () => resolve(); tx.onerror = tx.onabort = () => reject(new LocalStorageError()); });
      // Attach before body so a failed request/abort never becomes an unhandled rejection.
      void completed.catch(() => {});
      let result: T;
      try { result = await body(tx); } catch (error) { try { tx.abort(); } catch { /* Already aborted. */ } await completed.catch(() => {}); throw error; }
      await completed;
      if (mode === 'readwrite') this.changed();
      return result;
    } catch (error) { if (error instanceof LocalStorageError) throw error; throw new LocalStorageError(); }
  }
  async trips(): Promise<DownloadedTrip[]> {
    return this.transaction(['trips'],'readonly',async tx => {
      const rows = await request(tx.objectStore('trips').getAll()) as DownloadedTrip[];
      return rows.filter(row => row.version === 1 && row.project === this.project && row.uid === this.uid).map(row => { deserializeTrip(row.trip); tripContextSchema.parse(row.context); return row; });
    });
  }
  async trip(id: string): Promise<DownloadedTrip | null> { return (await this.trips()).find(row => row.id === id) ?? null; }
  async groups(tripId?: string,includeConfirmed = true): Promise<PendingGroup[]> {
    return this.transaction(['operations'],'readonly',async tx => (await request(includeConfirmed ? tx.objectStore('operations').getAll() : tx.objectStore('operations').index('state').getAll(IDBKeyRange.lowerBound('error'))) as unknown[])
      .map(row => pendingGroupSchema.parse(row)).filter(row => row.project === this.project && row.uid === this.uid && (!tripId || row.tripId === tripId)));
  }
  async operationState(id: string): Promise<PendingGroup['state'] | null> {
    return this.transaction(['operations'],'readonly',async tx => {
      const row = await request(tx.objectStore('operations').get(id));
      return row ? pendingGroupSchema.parse(row).state : null;
    });
  }
  async cache(trip: TripRecord,context: TripContext,events: unknown[]): Promise<void> {
    if (!trip.memberBindings[this.uid] || context.id !== trip.id || context.people.length !== trip.participantIds.length) throw new LocalStorageError();
    await this.transaction(['trips'],'readwrite',async tx => {
      const store = tx.objectStore('trips'), previous = await request(store.get(trip.id)) as DownloadedTrip | undefined;
      // Immutable server facts accumulate; an older listener response cannot erase an acknowledged operation.
      const records = new Map((previous?.events ?? []).map((event,index) => [(event as { operationId?: string }).operationId ?? `invalid-${index}`,event]));
      for (const [index,event] of events.entries()) records.set((event as { operationId?: string }).operationId ?? `invalid-new-${index}`,event);
      await request(store.put({ id: trip.id,project: this.project,uid: this.uid,version: 1,trip: serializeTrip(trip),context,events: [...records.values()],downloaded: true,blocked: previous?.blocked ?? false,updatedAt: Date.now() } satisfies DownloadedTrip));
    });
  }
  async block(tripId: string) {
    await this.transaction(['trips'],'readwrite',async tx => { const store = tx.objectStore('trips'), row = await request(store.get(tripId)) as DownloadedTrip | undefined; if (row) await request(store.put({ ...row,blocked: true })); });
  }
  async enqueue(tripId: string,raw: readonly FinancialEventV2Dto[],draftId?: string): Promise<PendingGroup> {
    const events = raw.map(event => financialEventV2Schema.parse(event));
    if (!events.length || events.length > 2 || events.some(event => event.actorUid !== this.uid)) throw new LocalStorageError();
    const group = pendingGroupSchema.parse({ id: events[0]!.operationId,project: this.project,uid: this.uid,tripId,version: 1,events,state: 'pending',attempts: 0,nextAttemptAt: 0,error: null,leaseOwner: null,leaseUntil: 0,createdAt: Date.now() });
    return this.transaction(['trips','operations','operationIds','drafts'],'readwrite',async tx => {
      const cached = await request(tx.objectStore('trips').get(tripId)) as DownloadedTrip | undefined;
      if (!cached?.downloaded || cached.project !== this.project || cached.uid !== this.uid || cached.blocked || cached.trip.status !== 'active' || !cached.trip.memberBindings[this.uid]
        || events.some(event => event.actorPersonId !== cached.trip.memberBindings[this.uid] || event.entityKind === 'budget' && cached.trip.ownerId !== this.uid)) throw new LocalStorageError();
      const store = tx.objectStore('operations'), previous = await request(store.get(group.id)) as PendingGroup | undefined;
      if (previous) { if (previous.events.length !== events.length || previous.events.some((value,index) => !sameOperation(value,events[index]!))) throw new LocalStorageError(); return previous; }
      for (const event of events) {
        const ids = tx.objectStore('operationIds');
        if (await request(ids.get(event.operationId))) throw new LocalStorageError();
        const remote = cached.events.find(raw => raw && typeof raw === 'object' && 'operationId' in raw && raw.operationId === event.operationId);
        if (remote && !sameOperation(financialEventV2Schema.parse(remote),event)) throw new LocalStorageError();
        await request(ids.add({ id: event.operationId,group: group.id }));
      }
      await request(store.add(group)); if (draftId) await request(tx.objectStore('drafts').delete(draftId)); return group;
    });
  }
  async claim(id: string,owner: string,now: number): Promise<PendingGroup | null> {
    return this.transaction(['operations'],'readwrite',async tx => {
      const store = tx.objectStore('operations'), raw = await request(store.get(id)); if (!raw) return null;
      const group = pendingGroupSchema.parse(raw);
      if (group.uid !== this.uid || group.project !== this.project || ['confirmed','rejected'].includes(group.state) || group.nextAttemptAt > now || group.leaseUntil > now) return null;
      const claimed = { ...group,state: 'sending' as const,leaseOwner: owner,leaseUntil: now + 45000,attempts: group.attempts + 1 };
      await request(store.put(claimed)); return claimed;
    });
  }
  async result(group: PendingGroup,owner: string,result: { events: FinancialEventV2Dto[] } | { error: string;permanent: boolean;nextAttemptAt: number }) {
    await this.transaction(['trips','operations'],'readwrite',async tx => {
      const store = tx.objectStore('operations'), raw = await request(store.get(group.id)); if (!raw) throw new LocalStorageError();
      const current = pendingGroupSchema.parse(raw); if (current.leaseOwner !== owner || current.state === 'confirmed') return;
      if ('events' in result) {
        if (result.events.length !== group.events.length || result.events.some((event,index) => !sameOperation(event,group.events[index]!))) throw new LocalStorageError();
        const trips = tx.objectStore('trips'), trip = await request(trips.get(group.tripId)) as DownloadedTrip;
        const events = new Map(trip.events.map((event,index) => [(event as { operationId?: string }).operationId ?? `invalid-${index}`,event]));
        for (const event of result.events) events.set(event.operationId,event);
        await request(trips.put({ ...trip,events: [...events.values()] }));
        await request(store.put({ ...current,state: 'confirmed',error: null,leaseOwner: null,leaseUntil: 0,nextAttemptAt: 0 }));
      } else await request(store.put({ ...current,state: result.permanent ? 'rejected' : 'error',error: result.error,leaseOwner: null,leaseUntil: 0,nextAttemptAt: result.nextAttemptAt }));
    });
  }
  async retry(tripId?: string) {
    await this.transaction(['operations'],'readwrite',async tx => {
      const store = tx.objectStore('operations'), rows = await request(store.getAll()) as PendingGroup[];
      for (const row of rows) if ((!tripId || row.tripId === tripId) && row.state !== 'confirmed' && row.leaseUntil <= Date.now()) await request(store.put({ ...row,state: 'pending',nextAttemptAt: 0,error: null }));
    });
  }
  async retryTemporary() {
    await this.transaction(['operations'],'readwrite',async tx => {
      const store = tx.objectStore('operations'), rows = await request(store.getAll()) as PendingGroup[];
      for (const row of rows) if (row.state === 'error' && row.leaseUntil <= Date.now()) await request(store.put({ ...row,state: 'pending',nextAttemptAt: 0 }));
    });
  }
  async draft(id: string,value?: unknown): Promise<unknown> {
    return this.transaction(['drafts'],value === undefined ? 'readonly' : 'readwrite',async tx => { const store = tx.objectStore('drafts'); if (value !== undefined) await request(store.put({ id,value,project: this.project,uid: this.uid })); return (await request(store.get(id)))?.value; });
  }
  close() { this.channel?.close(); this.channel = null; const previous = this.database; this.database = null; this.generation++; void previous?.then(db => db.close()).catch(() => {}); this.listeners.clear(); }
}
