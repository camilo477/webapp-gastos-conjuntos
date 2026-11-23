import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { decodeEvent, persistOperation, prepareOperation, sameOperation, watchEvents } from './events';
import { expense, trip, uuid } from '../../domain/testing/fixtures';
import { projectFinancialEvents, summarizeTrip } from '../../domain';
import type { FirebaseClient } from '../firebase/client';

const mocks = vi.hoisted(() => ({ read: vi.fn(), listen: vi.fn(), fetch: vi.fn() }));
vi.mock('firebase/firestore', async importOriginal => ({ ...await importOriginal<typeof import('firebase/firestore')>(), doc: vi.fn(() => ({})), collection: vi.fn(() => ({})), getDocFromServer: mocks.read, onSnapshot: mocks.listen }));
const make = () => prepareOperation(trip(),{ uid: 'A',personId: 'A' },'expense',expense());
const client = { auth: { currentUser: { uid: 'A',getIdToken: async () => 'synthetic-emulator-token' } },firestore: {},configuration: { host: '127.0.0.1',firestorePort: 8180,options: { projectId: 'demo-gastos-compartidos' } } } as unknown as FirebaseClient;
const stored = (event: ReturnType<typeof make>) => ({ ...event, receivedAt: new Timestamp(123,456) });
beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal('fetch',mocks.fetch); vi.stubGlobal('navigator',{ onLine: true }); });
describe('financial repository confirmation and idempotency', () => {
  it('uses v2 immutable revisions and preserves snapshots on delete and restore', () => {
    const root = make(), edit = prepareOperation(trip(),{ uid: 'B',personId: 'B' },'expense',expense(200),root);
    const deleted = prepareOperation(trip(),{ uid: 'A',personId: 'A' },'expense',{ ...edit.payload,status: 'deleted' },edit,'delete');
    const restored = prepareOperation(trip(),{ uid: 'A',personId: 'A' },'expense',{ ...deleted.payload,status: 'active' },deleted);
    const state = projectFinancialEvents(trip(),[root,edit,deleted,restored],true);
    expect(summarizeTrip(state,'2026-11-23T12:00:00.000Z').statistics.total).toBe(200n);
    expect(root.payload).toEqual(expense()); expect(new Set([root,edit,deleted,restored].map(e => e.operationId)).size).toBe(4);
  });
  it('rejects documents without server timestamp or mismatched IDs', () => {
    const event = make(); expect(() => decodeEvent(event.operationId,event)).toThrow();
    expect(() => decodeEvent(uuid(4),stored(event))).toThrow();
    expect(decodeEvent(event.operationId,stored(event)).receivedAt).toEqual({ seconds: 123,nanoseconds: 456 });
  });
  it('creates only when absent and returns success only after server read-back', async () => {
    const event = make(); mocks.read.mockResolvedValueOnce({ exists: () => false }).mockResolvedValueOnce({ exists: () => true,id: event.operationId,data: () => stored(event) }); mocks.fetch.mockResolvedValue({ ok: true });
    await expect(persistOperation(client,uuid(1),event)).resolves.toMatchObject({ operationId: event.operationId });
    const [,options] = mocks.fetch.mock.calls[0]!; const body = JSON.parse(options.body);
    expect(body.writes[0].currentDocument).toEqual({ exists: false });
    expect(body.writes[0].updateTransforms).toEqual([{ fieldPath: 'receivedAt',setToServerValue: 'REQUEST_TIME' }]);
    expect(body.writes[0].update.fields.receivedAt).toBeUndefined();
  });
  it('retries a lost response with the same ID without writing twice', async () => {
    const event = make(); mocks.read.mockResolvedValueOnce({ exists: () => false }); mocks.fetch.mockRejectedValue(new Error('response lost'));
    await expect(persistOperation(client,uuid(1),event)).rejects.toThrow('no confirmada');
    mocks.read.mockResolvedValue({ exists: () => true,id: event.operationId,data: () => stored(event) });
    await expect(persistOperation(client,uuid(1),event)).resolves.toMatchObject({ operationId: event.operationId }); expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it('rejects an existing ID with different content and never overwrites it', async () => {
    const event = make(); mocks.read.mockResolvedValue({ exists: () => true,id: event.operationId,data: () => stored({ ...event,authoredAt: '2026-11-22T12:00:00.000Z' }) });
    await expect(persistOperation(client,uuid(1),event)).rejects.toThrow('integridad'); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('does not accept permission-denied as confirmation', async () => {
    const event = make(); mocks.read.mockResolvedValue({ exists: () => false }); mocks.fetch.mockResolvedValue({ ok: false,status: 403 });
    await expect(persistOperation(client,uuid(1),event)).rejects.toThrow('rechazada');
  });
  it('refuses to submit an operation under another UID', async () => {
    await expect(persistOperation(client,uuid(1),{ ...make(),actorUid: 'B' })).rejects.toThrow('sesión cambió'); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('canonical read-back ignores map key order and server receipt only', () => {
    const event = make(), received = { ...event,receivedAt: { seconds: 100,nanoseconds: 200 } };
    expect(sameOperation(event,received)).toBe(true); expect(sameOperation(event,{ ...received,actorPersonId: 'B' })).toBe(false);
  });
  it('cache and pending snapshots never mark the collection complete; malformed entities remain visible to the projector', () => {
    const next = vi.fn(); watchEvents(client,uuid(1),'A',next,vi.fn());
    const handler = mocks.listen.mock.calls[0]![2] as (data: unknown) => void;
    handler({ metadata: { fromCache: true,hasPendingWrites: false },docs: [] }); expect(next.mock.calls.at(-1)![0].complete).toBe(false);
    const event = make(); handler({ metadata: { fromCache: false,hasPendingWrites: false },docs: [{ id: event.operationId,data: () => stored(event) }] }); expect(next.mock.calls.at(-1)![0].complete).toBe(true);
    handler({ metadata: { fromCache: false,hasPendingWrites: true },docs: [] }); expect(next.mock.calls.at(-1)![0].complete).toBe(false);
    handler({ metadata: { fromCache: false,hasPendingWrites: false },docs: [{ id: event.operationId,data: () => ({ ...stored(event),extra: true }) }] });
    const latest = next.mock.calls.at(-1)![0]; expect(latest.invalidCount).toBe(1); expect(projectFinancialEvents(trip(),latest.events,latest.complete).provisional).toBe(true);
  });
});
