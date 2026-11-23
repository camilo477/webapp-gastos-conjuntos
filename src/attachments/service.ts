import { ZodError } from 'zod';
import type { OfflineStore } from '../sync/storage';
import type { FirebaseClient } from '../repositories/firebase/client';
import { retryDelay } from '../sync/coordinator';
import { DeliveryError } from '../repositories/financial/events';
import { AttachmentStore } from './local';
import type { LocalAttachment } from './local';
import { sendAttachment,watchAttachment } from './remote';
import type { ImageChoice } from './contracts';
import type { FinancialOperation } from '../repositories/financial/events';
type Watch = { callbacks: Set<(row: LocalAttachment | null,error?: string) => void>;close: () => void;refresh: () => void;row: LocalAttachment | null };
export class AttachmentService {
  readonly local: AttachmentStore;
  private owner = crypto.randomUUID(); private active = false; private running = false;
  private timer: ReturnType<typeof setInterval> | null = null; private unsubscribe = () => {};
  private watches = new Map<string,Watch>();
  constructor(readonly store: OfflineStore,private client: FirebaseClient) { this.local = new AttachmentStore(store); }
  private wake = () => { void this.run(); };
  private online = () => { void this.local.retry(undefined,false).then(this.wake).catch(() => {}); for (const watch of this.watches.values()) watch.refresh(); };
  private visible = () => { if (document.visibilityState === 'visible') this.online(); };
  start() { this.active = true; this.unsubscribe = this.store.subscribe(this.wake); this.timer = setInterval(this.wake,1500); window.addEventListener('online',this.online); window.addEventListener('pageshow',this.online); document.addEventListener('visibilitychange',this.visible); this.wake(); }
  stop() { this.active = false; this.unsubscribe(); if (this.timer) clearInterval(this.timer); window.removeEventListener('online',this.online); window.removeEventListener('pageshow',this.online); document.removeEventListener('visibilitychange',this.visible); for (const watch of this.watches.values()) watch.close(); this.watches.clear(); }
  async saveForTrip(tripId: string,choice: ImageChoice,event: FinancialOperation) {
    if (!choice.thumbnail || !choice.attachmentId || event.entityKind !== 'expense' || !choice.sourceKind) return;
    const attribution = choice.visual && !('kind' in choice.visual) ? choice.visual : null;
    await this.local.save(tripId,choice.attachmentId,{ schemaVersion: 1,expenseId: event.entityId,createdBy: this.store.uid,createdAt: { seconds: 0,nanoseconds: 0 },mimeType: 'image/webp',...choice.thumbnail,sourceKind: choice.sourceKind,attribution },event.operationId);
  }
  async retry(id?: string) { await this.local.retry(id); await this.run(); }
  async run() {
    if (!this.active || this.running || this.client.auth.currentUser?.uid !== this.store.uid) return; this.running = true;
    try {
      let sent = 0;
      for (const candidate of await this.local.pending()) {
        if (!this.active || this.client.auth.currentUser?.uid !== this.store.uid) break;
        if (candidate.state === 'rejected' || candidate.nextAttemptAt > Date.now() || candidate.leaseUntil > Date.now()) continue;
        const financial = candidate.revisionId ? await this.store.operationState(candidate.revisionId) : null;
        if (financial && financial !== 'confirmed' && financial !== 'rejected') continue;
        const row = await this.local.claim(candidate.id,this.owner); if (!row) continue;
        try { if (!financial || financial === 'rejected') throw new DeliveryError('La revisión del gasto no fue confirmada. La imagen se conserva.',true); const result = await sendAttachment(this.client,row); await this.local.result(row,this.owner,result); }
        catch (error) { const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''; const permanent = error instanceof DeliveryError ? error.permanent : error instanceof ZodError || code === 'permission-denied'; await this.local.result(row,this.owner,{ message: permanent ? 'La miniatura fue rechazada. Tu gasto sigue conservado; puedes revisar o reintentar la imagen.' : 'No se pudo confirmar la miniatura. Tu gasto sigue conservado; volveremos a intentarlo.',permanent,nextAttemptAt: Date.now() + retryDelay(row.attempts) }); }
        if (++sent >= 8) break;
      }
    } catch { /* Storage errors are reported by the local image views; money is independent. */ }
    finally { this.running = false; }
  }
  watch(tripId: string,id: string,expenseId: string,next: (row: LocalAttachment | null,error?: string) => void) {
    const key = `${tripId}/${id}/${expenseId}`; let watch = this.watches.get(key);
    if (!watch) {
      let live = true,remote: (() => void) | null = null,version = 0;
      const entry: Watch = { callbacks: new Set(),close: () => {},refresh: () => {},row: null };
      const emit = (row: LocalAttachment | null,error?: string) => { if (live && this.client.auth.currentUser?.uid === this.store.uid) { entry.row = row; for (const callback of entry.callbacks) callback(row,error); } };
      const refresh = async () => {
        const current = ++version;
        try {
          const cached = await this.local.get(tripId,id,expenseId); if (!live || current !== version) return;
          if (cached) { emit(cached); remote?.(); remote = null; return; }
          if (!remote && this.client.auth.currentUser?.uid === this.store.uid) remote = watchAttachment(this.client,tripId,id,expenseId,this.store.uid,value => {
            if (!live) return; if (!value) { emit(null); return; }
            void this.local.cache(tripId,id,value).catch(() => { emit({ id: `${tripId}/${id}`,project: this.store.project,uid: this.store.uid,tripId,attachmentId: id,revisionId: null,attachment: value,state: 'confirmed',attempts: 0,nextAttemptAt: 0,leaseOwner: null,leaseUntil: 0,error: null },'No se pudo conservar esta miniatura para usarla offline.'); });
          },() => { emit(null,'Miniatura no disponible. El gasto sigue siendo válido.'); });
        } catch { emit(null,'No se pudo abrir la miniatura local. El gasto sigue siendo válido.'); }
      };
      const unsubscribe = this.store.subscribe(() => { void refresh(); }); entry.refresh = () => { void refresh(); };
      entry.close = () => { live = false; remote?.(); unsubscribe(); }; watch = entry; this.watches.set(key,entry); entry.refresh();
    }
    watch.callbacks.add(next); if (watch.row) next(watch.row);
    return () => { watch!.callbacks.delete(next); if (!watch!.callbacks.size) { watch!.close(); this.watches.delete(key); } };
  }
}
