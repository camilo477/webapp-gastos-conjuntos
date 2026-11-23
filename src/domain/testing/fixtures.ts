import { splitExpense } from '../allocation';
import { tripContextSchema } from '../schemas';
import type { BudgetSnapshot, ExpenseSnapshot, SettlementSnapshot } from '../schemas';
import { prepareFinancialState } from '../state';

export const firstDay = '2026-11-21';
export const now = '2026-11-21T17:00:00.000Z';
export const uuid = (value: number) => `00000000-0000-4000-8000-${value.toString(16).padStart(12, '0')}`;
export const trip = (ids: readonly string[] = ['A', 'B']) => tripContextSchema.parse({
  id: 'synthetic-trip', startDate: firstDay, endDate: '2026-11-24', timezone: 'America/Bogota', currency: 'COP', currencyExponent: 0,
  people: ids.map(personId => ({ personId, displayName: personId, status: 'active' })),
});
export function expense(total = 100, ids: readonly string[] = ['A', 'B'], patch: Partial<ExpenseSnapshot> = {}): ExpenseSnapshot {
  const shares = splitExpense(BigInt(total), { mode: 'equal', personIds: ids });
  return {
    title: 'Compra sintética', note: null, total, category: 'food', occurredAt: now, day: firstDay,
    payerIds: [ids[0]!], payerAmounts: [total], participantIds: shares.map(share => share.personId), shareAmounts: shares.map(share => Number(share.amount)),
    splitMode: 'equal', weights: ids.map(() => 1), visual: null, attachmentId: null, status: 'active', mergedInto: null, ...patch,
  };
}
export function settlement(amount = 20_000, patch: Partial<SettlementSnapshot> = {}): SettlementSnapshot {
  return { fromPersonId: 'B', toPersonId: 'A', amount, occurredAt: now, day: firstDay, note: null, status: 'active', ...patch };
}
export const budget = (total: number | null = 400_000, lockedDays: BudgetSnapshot['lockedDays'] = []): BudgetSnapshot => ({ total, lockedDays, status: 'active' });
export const entry = (id: number, snapshot: unknown, revision = id) => ({ entityId: uuid(id), revision: uuid(revision), state: 'ready' as const, snapshot });
export function state(expenses: readonly unknown[] = [], payments: readonly unknown[] = [], plan: BudgetSnapshot = budget(null), context: unknown = trip(), complete = true) {
  return prepareFinancialState(context, { complete, expenses, settlements: payments, budgets: [entry(999_999, plan)] });
}
