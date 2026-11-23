import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ExpenseForm } from './ExpenseForm';
import { sessionContext } from '../access/session';
import { expense, trip, uuid } from '../../domain/testing/fixtures';
import { projectFinancialEvents, summarizeTrip } from '../../domain';
import { persistOperation, prepareOperation } from '../../repositories/financial/events';
import type { TripRecord } from '../../repositories/access/contracts';
import type { FirebaseClient } from '../../repositories/firebase/client';
import type { Finance } from './useFinance';
vi.mock('../../repositories/financial/events', async original => ({ ...await original<typeof import('../../repositories/financial/events')>(), persistOperation: vi.fn() }));
const context = trip(), state = projectFinancialEvents(context,[],true);
const finance = { context,state,summary: summarizeTrip(state,'2026-11-23T12:00:00.000Z'),events: [],heads: [],complete: true,failed: false,now: '2026-11-23T12:00:00.000Z' } as unknown as Finance;
const record = { ...context,id: uuid(1),memberBindings: { A: 'A',B: 'B' } } as unknown as TripRecord;
function show(parent?: ReturnType<typeof prepareOperation>) {
  return render(<MemoryRouter><sessionContext.Provider value={{ client: {} as FirebaseClient,user: { uid: 'A',email: null,displayName: 'A',emailVerified: true,isAnonymous: false } }}><ExpenseForm trip={record} finance={finance} {...(parent ? { parent } : {})} /></sessionContext.Provider></MemoryRouter>);
}
beforeEach(() => vi.resetAllMocks());
describe('real expense form', () => {
  it('quick entry uses exact domain shares, one payer and all active participants', async () => {
    vi.mocked(persistOperation).mockResolvedValue({} as never); show(); const user = userEvent.setup();
    expect(screen.getByLabelText('Importe en COP')).toHaveAttribute('inputmode','numeric');
    await user.type(screen.getByLabelText('Concepto'),'Café'); await user.type(screen.getByLabelText('Importe en COP'),'101');
    await user.click(screen.getByRole('button',{ name: 'Guardar gasto' }));
    await waitFor(() => expect(persistOperation).toHaveBeenCalledTimes(1));
    expect(vi.mocked(persistOperation).mock.calls[0]![2]).toMatchObject({ schemaVersion: 2,payload: { title: 'Café',payerIds: ['A'],payerAmounts: [101],participantIds: ['A','B'],shareAmounts: [51,50] } });
  });
  it('preserves the base revision when editing and retries the exact operation after uncertainty', async () => {
    vi.mocked(persistOperation).mockRejectedValue(new Error('response lost'));
    const parent = prepareOperation(context,{ uid: 'A',personId: 'A' },'expense',expense()); show(parent); const user = userEvent.setup();
    await user.clear(screen.getByLabelText('Concepto')); await user.type(screen.getByLabelText('Concepto'),'Café editado');
    await user.click(screen.getByRole('button',{ name: 'Guardar gasto' })); await screen.findByRole('button',{ name: 'Reintentar misma operación' });
    const first = vi.mocked(persistOperation).mock.calls[0]![2]; expect(first.parentIds).toEqual([parent.operationId]); expect(screen.getByLabelText('Concepto')).toBeDisabled();
    await user.click(screen.getByRole('button',{ name: 'Reintentar misma operación' })); await waitFor(() => expect(persistOperation).toHaveBeenCalledTimes(2));
    expect(vi.mocked(persistOperation).mock.calls[1]![2]).toEqual(first);
  });
  it('invalid payer sums are announced and the form remains editable', async () => {
    show(); const user = userEvent.setup(); await user.type(screen.getByLabelText('Concepto'),'Hotel'); await user.type(screen.getByLabelText('Importe en COP'),'200');
    await user.click(screen.getByText('Pagadores y división')); await user.click(screen.getAllByRole('checkbox',{ name: 'B' })[0]!);
    await user.type(screen.getByLabelText('Aporte de A'),'150'); await user.type(screen.getByLabelText('Aporte de B'),'40');
    await user.click(screen.getByRole('button',{ name: 'Guardar gasto' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Los aportes no suman el total');
    expect(persistOperation).not.toHaveBeenCalled(); expect(screen.getByLabelText('Concepto')).not.toBeDisabled();
  });
});
