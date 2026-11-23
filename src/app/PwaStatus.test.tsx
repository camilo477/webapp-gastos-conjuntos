import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PwaStatus } from './PwaStatus';

vi.mock('./activateUpdate', () => ({ activateUpdate: async (update: (reload: boolean) => Promise<void>) => {
  await update(true);
  // Browser E2E verifies actual reload; the unit test stops at the request.
  return new Promise<void>(() => {});
} }));

const state = vi.hoisted(() => ({ ready: false, refresh: false, update: vi.fn(), dismiss: vi.fn(), error: false }));
vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW: (options: { onRegisterError: () => void }) => {
  if (state.error) queueMicrotask(options.onRegisterError);
  return { offlineReady: [state.ready, vi.fn()], needRefresh: [state.refresh, state.dismiss], updateServiceWorker: state.update };
} }));
beforeEach(() => { state.ready = false; state.refresh = false; state.error = false; state.update.mockReset().mockResolvedValue(undefined); state.dismiss.mockReset(); });

describe('update notification', () => {
  it('labels static offline readiness without claiming data sync', () => {
    state.ready = true; render(<PwaStatus />);
    expect(screen.getByRole('status')).toHaveTextContent('sin sincronización de datos');
  });
  it('waits for explicit confirmation before activating an update', async () => {
    state.refresh = true; render(<PwaStatus />); expect(state.update).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar ahora' }));
    expect(state.update).toHaveBeenCalledWith(true);
  });
  it('allows postponing without reloading', async () => {
    state.refresh = true; render(<PwaStatus />);
    await userEvent.click(screen.getByRole('button', { name: 'Más tarde' }));
    expect(state.dismiss).toHaveBeenCalledWith(false); expect(state.update).not.toHaveBeenCalled();
  });
  it('keeps an actionable error if activation fails', async () => {
    state.refresh = true; state.update.mockRejectedValue(new Error('update failed')); render(<PwaStatus />);
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar ahora' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo actualizar');
  });
});
