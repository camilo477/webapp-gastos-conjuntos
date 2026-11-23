import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ExpenseForm } from './ExpenseForm';
import { sessionContext } from '../access/session';
import { expense, trip, uuid } from '../../domain/testing/fixtures';
import { projectFinancialEvents, summarizeTrip } from '../../domain';
import { prepareOperation } from '../../repositories/financial/events';
import type { TripRecord } from '../../repositories/access/contracts';
import type { FirebaseClient } from '../../repositories/firebase/client';
import { syncContext } from '../../sync/context';
import type { SyncServices } from '../../sync/context';
import type { Finance } from './useFinance';
const enqueue = vi.fn();
const services = { store: { uid: 'A',enqueue,draft: vi.fn(async () => undefined) },coordinator: {} } as unknown as SyncServices;
const context = trip(), state = projectFinancialEvents(context,[],true);
const finance = { context,state,summary: summarizeTrip(state,'2026-11-23T12:00:00.000Z'),events: [],heads: [],complete: true,failed: false,now: '2026-11-23T12:00:00.000Z' } as unknown as Finance;
const record = { ...context,id: uuid(1),memberBindings: { A: 'A',B: 'B' } } as unknown as TripRecord;
function form(value: Finance = finance,parent?: ReturnType<typeof prepareOperation>) {
  return (<MemoryRouter><sessionContext.Provider value={{ client: { auth: { currentUser: { uid: 'A' } } } as FirebaseClient,user: { uid: 'A',email: null,displayName: 'A',emailVerified: true,isAnonymous: false } }}><syncContext.Provider value={services}><ExpenseForm trip={record} finance={value} {...(parent ? { parent } : {})} /></syncContext.Provider></sessionContext.Provider></MemoryRouter>);
}
function show(parent?: ReturnType<typeof prepareOperation>) { return render(form(finance,parent));
}
beforeEach(() => vi.resetAllMocks());
describe('real expense form', () => {
  it('quick entry uses exact domain shares, one payer and all active participants', async () => {
    vi.mocked(enqueue).mockResolvedValue({} as never); show(); const user = userEvent.setup();
    expect(screen.getByLabelText('Importe en COP')).toHaveAttribute('inputmode','numeric');
    await user.type(screen.getByLabelText('Concepto'),'Café'); await user.type(screen.getByLabelText('Importe en COP'),'101');
    await user.click(screen.getByRole('button',{ name: 'Guardar gasto' }));
    await waitFor(() => expect(enqueue).toHaveBeenCalledTimes(1));
    expect(vi.mocked(enqueue).mock.calls[0]![1][0]).toMatchObject({ schemaVersion: 2,payload: { title: 'Café',payerIds: ['A'],payerAmounts: [101],participantIds: ['A','B'],shareAmounts: [51,50] } });
  });
  it('preserves the base revision when editing and retries the exact operation after uncertainty', async () => {
    vi.mocked(enqueue).mockRejectedValue(new Error('response lost'));
    const parent = prepareOperation(context,{ uid: 'A',personId: 'A' },'expense',expense()); show(parent); const user = userEvent.setup();
    await user.clear(screen.getByLabelText('Concepto')); await user.type(screen.getByLabelText('Concepto'),'Café editado');
    await user.click(screen.getByRole('button',{ name: 'Guardar gasto' })); await screen.findByRole('button',{ name: 'Reintentar misma operación' });
    const first = vi.mocked(enqueue).mock.calls[0]![1][0]; expect(first.parentIds).toEqual([parent.operationId]); expect(screen.getByLabelText('Concepto')).toBeDisabled();
    await user.click(screen.getByRole('button',{ name: 'Reintentar misma operación' })); await waitFor(() => expect(enqueue).toHaveBeenCalledTimes(2));
    expect(vi.mocked(enqueue).mock.calls[1]![1][0]).toEqual(first);
  });
  it('refreshes untouched participant defaults when downloaded membership is confirmed, preserving explicit exclusions',async () => {
    enqueue.mockResolvedValue({}); const view = render(form({ ...finance,context: trip(['A']) })); const user = userEvent.setup();
    await user.type(screen.getByLabelText('Concepto'),'Cambio de participantes'); await user.type(screen.getByLabelText('Importe en COP'),'100');
    view.rerender(form(finance)); expect(screen.getByText(/2 incluidos/)).toBeVisible();
    await user.click(screen.getByText('Pagadores y división')); await user.click(screen.getAllByRole('checkbox',{ name: 'B' })[1]!);
    view.rerender(form({ ...finance,context: trip(['A','B','C']) })); expect(screen.getByText(/1 incluidos/)).toBeVisible();
    await user.click(screen.getByRole('button',{ name: 'Guardar gasto' })); await waitFor(() => expect(enqueue).toHaveBeenCalledTimes(1)); expect(enqueue.mock.calls[0]![1][0].payload.participantIds).toEqual(['A']);
  });
  it('invalid payer sums are announced and the form remains editable', async () => {
    show(); const user = userEvent.setup(); await user.type(screen.getByLabelText('Concepto'),'Hotel'); await user.type(screen.getByLabelText('Importe en COP'),'200');
    await user.click(screen.getByText('Pagadores y división')); await user.click(screen.getAllByRole('checkbox',{ name: 'B' })[0]!);
    await user.type(screen.getByLabelText('Aporte de A'),'150'); await user.type(screen.getByLabelText('Aporte de B'),'40');
    await user.click(screen.getByRole('button',{ name: 'Guardar gasto' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Los aportes no suman el total');
    expect(enqueue).not.toHaveBeenCalled(); expect(screen.getByLabelText('Concepto')).not.toBeDisabled();
  });
});
