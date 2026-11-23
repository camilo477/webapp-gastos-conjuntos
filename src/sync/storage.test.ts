import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocalStorageError, OfflineStore } from './storage';

function factory(throwFirst = false) {
  const requests: IDBOpenDBRequest[] = [];
  const open = vi.fn(() => {
    if (throwFirst && open.mock.calls.length === 1) throw new DOMException('Temporary failure', 'SecurityError');
    const result = { close: vi.fn(), onversionchange: null } as unknown as IDBDatabase;
    const request = { result, onerror: null, onblocked: null, onsuccess: null } as unknown as IDBOpenDBRequest;
    requests.push(request); return request;
  });
  vi.stubGlobal('indexedDB', { open });
  const dispatch = (index: number, type: 'error' | 'blocked' | 'success') => {
    const request = requests[index]!;
    const handler = request[`on${type}`] as ((this: IDBOpenDBRequest, event: Event) => void) | null;
    handler?.call(request, new Event(type));
  };
  return { requests, open, dispatch };
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('IndexedDB connection recovery', () => {
  for (const failure of ['error', 'blocked'] as const) it(`retries after an asynchronous ${failure} without a reload`, async () => {
    const f = factory(), store = new OfflineStore('demo-recovery', 'A');
    const first = store.open(); f.dispatch(0, failure);
    await expect(first).rejects.toBeInstanceOf(LocalStorageError);
    const second = store.open();
    expect(f.open).toHaveBeenCalledTimes(2);
    f.dispatch(1, 'success'); await expect(second).resolves.toBe(f.requests[1]!.result);
    // A blocked request may succeed after we have already opened another one.
    f.dispatch(0, 'success'); expect(f.requests[0]!.result.close).toHaveBeenCalledOnce();
    await expect(store.open()).resolves.toBe(f.requests[1]!.result); store.close();
  });
  it('normalizes a synchronous opening error and allows a retry', async () => {
    const f = factory(true), store = new OfflineStore('demo-recovery', 'A');
    await expect(store.open()).rejects.toBeInstanceOf(LocalStorageError);
    const next = store.open(); expect(f.open).toHaveBeenCalledTimes(2);
    f.dispatch(0, 'success'); await expect(next).resolves.toBe(f.requests[0]!.result); store.close();
  });
  it('closes a late successful connection after timeout and retains the newer connection', async () => {
    vi.useFakeTimers(); const f = factory(), store = new OfflineStore('demo-recovery', 'A');
    const first = expect(store.open()).rejects.toBeInstanceOf(LocalStorageError);
    await vi.advanceTimersByTimeAsync(5000); await first;
    const next = store.open(); expect(f.open).toHaveBeenCalledTimes(2);
    f.dispatch(1, 'success'); await next; f.dispatch(0, 'success');
    expect(f.requests[0]!.result.close).toHaveBeenCalledOnce();
    await expect(store.open()).resolves.toBe(f.requests[1]!.result); store.close();
  });
  it('does not return a connection from a stopped session when opening completes late', async () => {
    const f = factory(), store = new OfflineStore('demo-recovery', 'A');
    const first = expect(store.open()).rejects.toBeInstanceOf(LocalStorageError);
    store.close(); const next = store.open();
    f.dispatch(0, 'success'); await first; f.dispatch(1, 'success');
    await expect(next).resolves.toBe(f.requests[1]!.result);
    expect(f.requests[0]!.result.close).toHaveBeenCalled(); store.close();
  });
});
