import { inclusiveDays } from './dates';
import { calculateBalances } from './balances';
import type { FinancialState } from './state';
import { categorySchema } from './schemas';
import { sumMoney } from './money';

export function calculateStatistics(state: FinancialState) {
  const days = inclusiveDays(state.trip.startDate, state.trip.endDate);
  const byDay = new Map(days.map(day => [day, 0n]));
  const byCategory = new Map(categorySchema.options.map(category => [category, 0n]));
  for (const expense of state.expenses) {
    byDay.set(expense.day, byDay.get(expense.day)! + expense.total);
    byCategory.set(expense.category, byCategory.get(expense.category)! + expense.total);
  }
  const people = calculateBalances(state).rows;
  return {
    total: sumMoney(state.expenses.map(expense => expense.total)),
    byDay: [...byDay].map(([day, amount]) => ({ day, amount })),
    byCategory: [...byCategory].map(([category, amount]) => ({ category, amount })),
    byPerson: people.map(({ personId, paid, consumed }) => ({ personId, paid, consumed })),
    expenseCount: state.expenses.length, settlementCount: state.settlements.length, provisional: state.provisional,
  };
}
