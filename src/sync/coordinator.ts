import type { FirebaseClient } from '../repositories/firebase/client';
import { DeliveryError, persistOperations } from '../repositories/financial/events';
import { OfflineStore } from './storage';
import type { PendingGroup } from './storage';

export function retryDelay(attempts: number,random = Math.random()): number { return Math.min(60000,1000 * 2 ** Math.min(attempts,6) * (0.8 + random * 0.4)); }
export class SyncCoordinator {
  private owner = crypto.randomUUID();
  private stopped = true;
  private running = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private unsubscribe = () => {};
  private wake = () => { void this.run(); };
  private online = () => { void this.store.retryTemporary().then(this.wake).catch(this.onError); };
  private visible = () => { if (document.visibilityState === 'visible') this.online(); };
  constructor(readonly store: OfflineStore,private client: FirebaseClient,private onError: (error: unknown) => void = () => {},private send = persistOperations) {}
  start() {
    this.stopped = false; this.unsubscribe = this.store.subscribe(this.wake);
    window.addEventListener('online',this.online); window.addEventListener('pageshow',this.online); document.addEventListener('visibilitychange',this.visible);
    this.timer = setInterval(this.wake,1000); this.wake();
  }
  stop() { this.stopped = true; this.unsubscribe(); if (this.timer) clearInterval(this.timer); window.removeEventListener('online',this.online); window.removeEventListener('pageshow',this.online); document.removeEventListener('visibilitychange',this.visible); }
  async retry(tripId?: string) { await this.store.retry(tripId); await this.run(); }
  async run() {
    if (this.running || this.stopped || this.client.auth.currentUser?.uid !== this.store.uid) return;
    this.running = true;
    try {
      const groups = await this.store.groups(undefined,false);
      const byOperation = new Map(groups.flatMap(group => group.events.map(event => [event.operationId,group] as const)));
      for (const candidate of groups.sort((a,b) => Math.min(...a.events.map(event => event.logicalClock)) - Math.min(...b.events.map(event => event.logicalClock)) || a.createdAt - b.createdAt)) {
        if (this.stopped || this.client.auth.currentUser?.uid !== this.store.uid) break;
        if (['confirmed','rejected'].includes(candidate.state) || candidate.nextAttemptAt > Date.now() || candidate.leaseUntil > Date.now()) continue;
        const dependencies = candidate.events.flatMap(event => event.parentIds).map(id => byOperation.get(id)).filter((group): group is PendingGroup => !!group && group.id !== candidate.id);
        if (dependencies.some(group => group.state !== 'confirmed' && group.state !== 'rejected')) continue;
        const group = await this.store.claim(candidate.id,this.owner,Date.now()); if (!group) continue;
        try {
          if (dependencies.some(group => group.state === 'rejected')) throw new DeliveryError('Una revisión anterior fue rechazada. La propuesta se conserva para revisión.',true);
          const events = await this.send(this.client,group.tripId,group.events);
          await this.store.result(group,this.owner,{ events }); candidate.state = 'confirmed';
        } catch (reason) {
          const code = reason && typeof reason === 'object' && 'code' in reason ? String(reason.code) : '';
          const permanent = reason instanceof DeliveryError ? reason.permanent : code === 'permission-denied';
          const error = permanent ? reason instanceof DeliveryError ? reason.message : 'El servidor rechazó el movimiento. El acceso o el viaje cambió; la propuesta local se conserva.' : 'No pudimos confirmar un movimiento. Tus datos locales siguen conservados; volveremos a intentarlo.';
          await this.store.result(group,this.owner,{ error,permanent,nextAttemptAt: Date.now() + retryDelay(group.attempts) }); candidate.state = permanent ? 'rejected' : 'error';
        }
      }
    } catch (error) { this.onError(error); }
    finally { this.running = false; }
  }
}
