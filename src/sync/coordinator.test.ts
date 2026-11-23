// @vitest-environment jsdom
import { describe,it,expect,vi } from 'vitest';
import { SyncCoordinator,retryDelay } from './coordinator';
import { DeliveryError } from '../repositories/financial/events';
import { financialEventV2Schema } from '../domain';
import { expense,now,uuid } from '../domain/testing/fixtures';
import { prepareDistinct } from '../repositories/financial/revisions';
import type { PendingGroup,OfflineStore } from './storage';
import type { FirebaseClient } from '../repositories/firebase/client';
const event = financialEventV2Schema.parse({ schemaVersion: 2,operationId: uuid(1),entityId: uuid(1),actorUid: 'A',actorPersonId: 'A',entityKind: 'expense',action: 'create',parentIds: [],logicalClock: 0,before: [],payload: expense(),authoredAt: now,receivedAt: { seconds: 0,nanoseconds: 0 },merge: null });
type Send = typeof import('../repositories/financial/events').persistOperations;
function setup(send = vi.fn<Send>(async () => [event])) {
  const group: PendingGroup = { id: event.operationId,uid: 'A',project: 'demo',tripId: uuid(9),version: 1,events: [event],state: 'pending',attempts: 0,leaseOwner: null,leaseUntil: 0,nextAttemptAt: 0,error: null,createdAt: 0 };
  const store = { uid: 'A',subscribe: vi.fn(() => () => {}),groups: vi.fn(async () => [group]),claim: vi.fn(async (_id: string,owner: string) => { group.state = 'sending'; group.attempts++; group.leaseOwner = owner; return group; }),result: vi.fn(async (_g: PendingGroup,_owner: string,result: { events?: unknown[];permanent?: boolean;nextAttemptAt?: number }) => { group.state = result.events ? 'confirmed' : result.permanent ? 'rejected' : 'error'; group.nextAttemptAt = result.nextAttemptAt ?? 0; }),retry: vi.fn(async () => {}),retryTemporary: vi.fn(async () => {}) };
  const client = { auth: { currentUser: { uid: 'A' } } } as FirebaseClient;
  return { store,client,group,coordinator: new SyncCoordinator(store as unknown as OfflineStore,client,undefined,send),send };
}
async function settled(store: ReturnType<typeof setup>['store']) { await vi.waitFor(() => expect(store.result).toHaveBeenCalled()); }
describe('coordinator delivery guarantees',() => {
  it('preserves the exact immutable IDs and confirms only after the delivery receipt',async () => {
    const s = setup(); s.coordinator.start(); await settled(s.store); s.coordinator.stop(); expect(s.send.mock.calls[0]?.[2]).toEqual([event]); expect(s.group.state).toBe('confirmed');
  });
  it('temporary errors preserve a proposal with a future retry rather than an aggressive loop',async () => {
    const s = setup(vi.fn<Send>(async () => { throw new DeliveryError('network',false); })); s.coordinator.start(); await settled(s.store); await s.coordinator.run(); s.coordinator.stop(); expect(s.group.state).toBe('error'); expect(s.group.nextAttemptAt).toBeGreaterThan(Date.now()); expect(s.send).toHaveBeenCalledTimes(1);
  });
  it('a permission rejection stays available and does not mean published',async () => {
    const s = setup(vi.fn<Send>(async () => { throw { code: 'permission-denied' }; })); s.coordinator.start(); await settled(s.store); await s.coordinator.run(); s.coordinator.stop(); expect(s.group.state).toBe('rejected'); expect(s.send).toHaveBeenCalledTimes(1); expect(s.group.events).toEqual([event]);
  });
  it('does not transmit an old account queue with a new identity',async () => {
    const s = setup(); Object.defineProperty(s.client.auth,'currentUser',{ value: { uid: 'B' } }); s.coordinator.start(); await s.coordinator.run(); s.coordinator.stop(); expect(s.store.claim).not.toHaveBeenCalled(); expect(s.send).not.toHaveBeenCalled();
  });
  it('waits for an unconfirmed local parent and preserves a child of a rejected parent',async () => {
    const s = setup(); const child = { ...s.group,id: uuid(2),events: [financialEventV2Schema.parse({ ...event,operationId: uuid(2),parentIds: [event.operationId],logicalClock: 1,action: 'replace',before: [event.payload] })],state: 'pending' as const };
    s.store.groups.mockResolvedValue([child,{ ...s.group,state: 'error',nextAttemptAt: Date.now() + 60000 }]); s.coordinator.start(); await vi.waitFor(() => expect(s.store.groups).toHaveBeenCalled()); await s.coordinator.run(); s.coordinator.stop(); expect(s.send).not.toHaveBeenCalled();
  });
  for (const state of ['error','sending','rejected'] as const) it(`a distinct decision waits for referenced expenses instead of publishing before a ${state} dependency`,async () => {
    const s = setup(),other = financialEventV2Schema.parse({ ...event,operationId: uuid(2),entityId: uuid(2) });
    const decision = prepareDistinct({ uid: 'A',personId: 'A' },[event,other]);
    const pending = { ...s.group,id: decision.operationId,events: [decision] };
    const parent = { ...s.group,state,nextAttemptAt: state === 'error' ? Date.now() + 60000 : 0,leaseUntil: state === 'sending' ? Date.now() + 45000 : 0 };
    s.store.groups.mockResolvedValue([pending,parent]); s.store.claim.mockImplementation(async (_id,owner) => ({ ...pending,state: 'sending',leaseOwner: owner }));
    s.coordinator.start(); await vi.waitFor(() => expect(s.store.groups).toHaveBeenCalled());
    await s.coordinator.run(); s.coordinator.stop(); expect(s.send).not.toHaveBeenCalled();
    if (state === 'rejected') { expect(s.store.result).toHaveBeenCalledWith(expect.objectContaining({ id: decision.operationId }),expect.any(String),expect.objectContaining({ permanent: true })); }
    else expect(s.store.claim).not.toHaveBeenCalled();
  });
  it('backoff grows and is capped even after many attempts',() => { expect(retryDelay(1,0.5)).toBe(2000); expect(retryDelay(5,0.5)).toBe(32000); expect(retryDelay(500,0.5)).toBe(60000); expect(retryDelay(500,1)).toBeLessThanOrEqual(72000); });
});
