import { afterEach, describe, expect, it, vi } from 'vitest';
import { activateUpdate } from './activateUpdate';

afterEach(() => vi.useRealTimers());
describe('confirmed service worker activation', () => {
  it('waits for native controllerchange, including workers classified as external', async () => {
    const events = new EventTarget() as ServiceWorkerContainer;
    const update = vi.fn().mockResolvedValue(undefined);
    let activated = false;
    const promise = activateUpdate(update, events).then(() => { activated = true; });
    await Promise.resolve(); expect(update).toHaveBeenCalledWith(true); expect(activated).toBe(false);
    events.dispatchEvent(new Event('controllerchange')); await promise;
    expect(activated).toBe(true);
  });
  it('rejects and removes the listener if sending the update fails', async () => {
    const events = new EventTarget() as ServiceWorkerContainer;
    const remove = vi.spyOn(events, 'removeEventListener');
    await expect(activateUpdate(vi.fn().mockRejectedValue(new Error('failed')), events)).rejects.toThrow('failed');
    expect(remove).toHaveBeenCalledOnce();
  });
  it('times out without reloading when activation is not confirmed', async () => {
    vi.useFakeTimers();
    const promise = activateUpdate(vi.fn().mockResolvedValue(undefined), new EventTarget() as ServiceWorkerContainer);
    const assertion = expect(promise).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(15_000); await assertion;
  });
});
