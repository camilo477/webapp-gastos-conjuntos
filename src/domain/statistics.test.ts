import { expect, it } from 'vitest';
import { calculateStatistics } from './statistics';
import { calculateBalances } from './balances';
import { summarizeTrip } from './summary';
import { budget, entry, expense, now, settlement, state, uuid } from './testing/fixtures';
import { sumMoney } from './money';

it('STAT-01: todas las estadísticas parten del mismo conjunto efectivo que los balances', () => {
  const input = state([
    entry(1, expense(100)), entry(2, expense(90, ['A', 'B'], { category: 'transport', payerIds: ['B'], day: '2026-11-22', occurredAt: '2026-11-22T12:00:00Z' })),
    entry(3, expense(1000, ['A', 'B'], { status: 'deleted' })), { entityId: uuid(4), state: 'conflict' },
  ], [entry(5, settlement(10))], budget());
  const stats = calculateStatistics(input), balances = calculateBalances(input).rows;
  expect(stats.total).toBe(190n); expect(stats.byDay.map(row => row.amount)).toEqual([100n, 90n, 0n, 0n]);
  expect(stats.byCategory.find(row => row.category === 'food')!.amount).toBe(100n); expect(stats.byCategory.find(row => row.category === 'transport')!.amount).toBe(90n);
  expect(stats.byPerson.map(row => row.paid)).toEqual([100n, 90n]); expect(stats.byPerson.map(row => row.consumed)).toEqual([95n, 95n]);
  expect(sumMoney(balances.map(row => row.paid))).toBe(stats.total); expect(sumMoney(balances.map(row => row.consumed))).toBe(stats.total);
  expect(stats.provisional).toBe(true); expect(stats.expenseCount).toBe(2); expect(stats.settlementCount).toBe(1);
  const summary = summarizeTrip(input, now); expect(summary.provisional).toBe(true); expect(summary.budget.spent).toBe(stats.total); expect(summary.statistics).toEqual(stats);
  expect(summary.budget.days.map(row => row.accumulated)).toEqual([100n, 190n, 190n, 190n]);
});
