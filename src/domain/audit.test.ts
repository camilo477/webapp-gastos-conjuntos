import { describe, expect, it } from 'vitest';
import { calculateBalances, calculateBudget, calculateStatistics, financialEventV2Schema, projectFinancialEvents, suggestTransfers } from './index';
import { expense, now, settlement, trip, uuid } from './testing/fixtures';

describe('Phase 8A independent mixed-ledger reference', () => {
  for (const currency of ['COP', 'USD', 'EUR'] as const) it(`preserves a hand-calculated ledger across revisions, conflicts and pictures in ${currency}`, () => {
    const context = { ...trip(), currency, currencyExponent: currency === 'COP' ? 0 as const : 2 as const };
    const root = (id: number, entityKind: 'expense' | 'settlement' | 'budget', payload: unknown) => financialEventV2Schema.parse({ schemaVersion: 2,operationId: uuid(id),entityId: uuid(id),actorUid: 'A',actorPersonId: 'A',entityKind,action: 'create',parentIds: [],logicalClock: 0,before: [],payload,authoredAt: now,receivedAt: { seconds: 1,nanoseconds: 0 },merge: null });
    const hotel = root(1,'expense',expense(200000,['A','B'],{ category: 'lodging',payerIds: ['A','B'],payerAmounts: [150000,50000] }));
    const coffee = root(2,'expense',expense(100,['A','B'],{ payerIds: ['B'],payerAmounts: [100] }));
    const payment = root(3,'settlement',settlement(30000,{ fromPersonId: 'B',toPersonId: 'A' }));
    const budget = root(4,'budget',{ total: 400000,lockedDays: [],status: 'active' });
    const history = [hotel,coffee,payment,budget];
    const project = (events: unknown[]) => projectFinancialEvents(context,events,true);
    const check = (events: unknown[]) => {
      const state = project(events), stats = calculateStatistics(state);
      expect(state.provisional).toBe(false);
      expect(stats.total).toBe(200100n); expect(stats.settlementCount).toBe(1);
      expect(stats.byCategory.find(row => row.category === 'lodging')!.amount).toBe(200000n);
      expect(stats.byPerson).toEqual([{ personId: 'A',paid: 150000n,consumed: 100050n },{ personId: 'B',paid: 50100n,consumed: 100050n }]);
      expect(calculateBalances(state).rows.map(row => row.balance)).toEqual([19950n,-19950n]);
      expect(suggestTransfers(state).transfers).toEqual([{ fromPersonId: 'B',toPersonId: 'A',amount: 19950n }]);
      expect(calculateBudget(state,now)).toMatchObject({ available: 199900n,future: [{ amount: 66634n },{ amount: 66633n },{ amount: 66633n }] });
      return state;
    };
    check(history);
    const picture = financialEventV2Schema.parse({ ...hotel,operationId: uuid(5),action: 'replace',parentIds: [hotel.operationId],before: [hotel.payload],logicalClock: 1,payload: { ...hotel.payload,attachmentId: uuid(99) } });
    const full = [...history,picture]; check(full);
    const deleted = financialEventV2Schema.parse({ ...picture,operationId: uuid(6),action: 'delete',parentIds: [picture.operationId],before: [picture.payload],logicalClock: 2,payload: { ...picture.payload,status: 'deleted' } });
    expect(calculateStatistics(project([...full,deleted])).total).toBe(100n);
    const restored = financialEventV2Schema.parse({ ...picture,operationId: uuid(7),parentIds: [deleted.operationId],before: [deleted.payload],logicalClock: 3 });
    const restoredHistory = [...full,deleted,restored];
    expect(check(restoredHistory)).toEqual(check(restoredHistory.slice().reverse()));
    const parallel = financialEventV2Schema.parse({ ...picture,operationId: uuid(8),payload: { ...picture.payload,note: 'Another proposal' } });
    const conflicted = project([...restoredHistory,parallel]);
    expect(conflicted.provisional).toBe(true); expect(calculateStatistics(conflicted).total).toBe(100n);
    expect(calculateBalances(conflicted).provisional).toBe(true);
    expect(project([parallel,...restoredHistory.slice().reverse()])).toEqual(conflicted);
    expect(calculateStatistics(project([...restoredHistory,restored,coffee,payment])).total).toBe(200100n);
  });
});
