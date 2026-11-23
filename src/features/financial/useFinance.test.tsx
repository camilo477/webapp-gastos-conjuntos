import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { prepareOperation } from '../../repositories/financial/events';
import { budget, trip, uuid } from '../../domain/testing/fixtures';
import type { FirebaseClient } from '../../repositories/firebase/client';
import type { TripRecord } from '../../repositories/access/contracts';
import { sessionContext } from '../access/session';
import { useFinance } from './useFinance';
const mocks = vi.hoisted(() => ({ events: vi.fn(),people: vi.fn(),stopEvents: vi.fn(),stopPeople: vi.fn() }));
vi.mock('../../repositories/financial/events',async original => ({ ...await original<typeof import('../../repositories/financial/events')>(),watchEvents: mocks.events,watchPeople: mocks.people }));
const context = { ...trip(),id: uuid(1) }, root = prepareOperation(context,{ uid: 'A',personId: 'A' },'budget',budget());
const record = { ...context,budgetEntityId: root.operationId,membershipVersion: 0,memberBindings: { A: 'A',B: 'B' } } as unknown as TripRecord;
const wrapper = ({ children }: { children: ReactNode }) => <sessionContext.Provider value={{ client: {} as FirebaseClient,user: { uid: 'A',email: null,displayName: null,emailVerified: true,isAnonymous: false } }}>{children}</sessionContext.Provider>;
beforeEach(() => { vi.resetAllMocks(); mocks.events.mockReturnValue(mocks.stopEvents); mocks.people.mockReturnValue(mocks.stopPeople); });
describe('financial subscription completeness', () => {
  it('does not call an empty collection complete when the declared budget root is missing', () => {
    const { result } = renderHook(() => useFinance(record),{ wrapper });
    act(() => { mocks.people.mock.calls[0]![3](context); mocks.events.mock.calls[0]![3]({ events: [],complete: true,invalidCount: 0 }); });
    expect(result.current.state?.provisional).toBe(true); expect(result.current.complete).toBe(false);
    act(() => { mocks.events.mock.calls[0]![3]({ events: [root],complete: true,invalidCount: 0 }); });
    expect(result.current.state?.provisional).toBe(false); expect(result.current.complete).toBe(true);
  });
  it('retains the current context during cache transitions and releases both listeners on unmount', () => {
    const { result,unmount } = renderHook(() => useFinance(record),{ wrapper });
    act(() => { mocks.people.mock.calls[0]![3](context); mocks.events.mock.calls[0]![3]({ events: [root],complete: true,invalidCount: 0 }); });
    act(() => mocks.people.mock.calls[0]![3](null));
    expect(result.current.context).toEqual(context); expect(result.current.complete).toBe(false); expect(result.current.state?.provisional).toBe(true);
    unmount(); expect(mocks.stopEvents).toHaveBeenCalledTimes(1); expect(mocks.stopPeople).toHaveBeenCalledTimes(1);
  });
});
