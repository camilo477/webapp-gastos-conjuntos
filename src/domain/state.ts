import { z } from 'zod';
import { operationIdSchema } from './allocation';
import type { Allocation } from './allocation';
import { ordinal } from './errors';
import {
  budgetSnapshotSchema, expenseSnapshotSchema, settlementSnapshotSchema, tripContextSchema,
  validateBudgetContext, validateExpenseContext, validateSettlementContext,
} from './schemas';
import type { BudgetSnapshot, ExpenseSnapshot, TripContext } from './schemas';

const entitySchema = z.discriminatedUnion('state', [
  z.strictObject({ entityId: operationIdSchema, revision: operationIdSchema, state: z.literal('ready'), snapshot: z.unknown() }),
  z.strictObject({ entityId: operationIdSchema, state: z.enum(['conflict', 'incomplete', 'invalid']) }),
]);
const inputSchema = z.strictObject({ complete: z.boolean(), expenses: z.array(z.unknown()), settlements: z.array(z.unknown()), budgets: z.array(z.unknown()) });
export type EntityInput = z.infer<typeof entitySchema>;
export type FinancialInput = z.infer<typeof inputSchema>;
export interface FinancialIssue { readonly kind: 'expense' | 'settlement' | 'budget' | 'collection'; readonly entityId: string | null; readonly reason: 'conflict' | 'incomplete' | 'invalid' | 'unsupported-merge' }
export interface Expense {
  readonly id: string; readonly revision: string; readonly title: string; readonly total: bigint;
  readonly category: ExpenseSnapshot['category']; readonly day: string; readonly occurredAt: string;
  readonly payers: readonly Allocation[]; readonly shares: readonly Allocation[];
}
export interface Settlement {
  readonly id: string; readonly revision: string; readonly fromPersonId: string; readonly toPersonId: string;
  readonly amount: bigint; readonly day: string; readonly occurredAt: string;
}
export interface FinancialState {
  readonly trip: TripContext; readonly expenses: readonly Expense[]; readonly settlements: readonly Settlement[];
  readonly budget: BudgetSnapshot | null; readonly issues: readonly FinancialIssue[]; readonly provisional: boolean;
  readonly budgetStatus: 'none' | 'ready' | 'unavailable';
}
interface Selected<T> { id: string; revision: string; snapshot: T }

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => ordinal(a, b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'undefined';
}

function select<T>(raw: readonly unknown[], kind: FinancialIssue['kind'], decode: (snapshot: unknown) => T,
  validate: (snapshot: T) => void, issues: FinancialIssue[]): Selected<T>[] {
  const groups = new Map<string, EntityInput[]>();
  for (const value of raw) {
    const parsed = entitySchema.safeParse(value);
    if (!parsed.success) { issues.push({ kind, entityId: null, reason: 'invalid' }); continue; }
    const group = groups.get(parsed.data.entityId) ?? [];
    group.push(parsed.data); groups.set(parsed.data.entityId, group);
  }
  const selected: Selected<T>[] = [];
  for (const [id, rows] of [...groups].sort(([a], [b]) => ordinal(a, b))) {
    const blocked = rows.filter(row => row.state !== 'ready');
    if (blocked.length) {
      for (const row of blocked) issues.push({ kind, entityId: id, reason: row.state as 'conflict' | 'incomplete' | 'invalid' });
      continue;
    }
    const decoded: Selected<T>[] = [];
    try {
      for (const row of rows) if (row.state === 'ready') { const snapshot = decode(row.snapshot); validate(snapshot); decoded.push({ id, revision: row.revision, snapshot }); }
    } catch { issues.push({ kind, entityId: id, reason: 'invalid' }); continue; }
    const first = decoded[0]!;
    if (decoded.some(row => row.revision !== first.revision)) { issues.push({ kind, entityId: id, reason: 'conflict' }); continue; }
    if (decoded.some(row => canonical(row.snapshot) !== canonical(first.snapshot))) { issues.push({ kind, entityId: id, reason: 'invalid' }); continue; }
    selected.push(first);
  }
  return selected;
}

export function prepareFinancialState(context: unknown, raw: unknown): FinancialState {
  const trip = tripContextSchema.parse(context);
  const input = inputSchema.parse(raw);
  const issues: FinancialIssue[] = input.complete ? [] : [{ kind: 'collection', entityId: null, reason: 'incomplete' }];
  let expenses = select(input.expenses, 'expense', value => expenseSnapshotSchema.parse(value), snapshot => validateExpenseContext(snapshot, trip), issues);
  let settlements = select(input.settlements, 'settlement', value => settlementSnapshotSchema.parse(value), snapshot => validateSettlementContext(snapshot, trip), issues);
  const budgets = select(input.budgets, 'budget', value => budgetSnapshotSchema.parse(value), snapshot => validateBudgetContext(snapshot, trip), issues);
  // Merges require the paired-event projector of Phase 6, never a lone flag.
  const mergeGroup = new Set(expenses.filter(row => row.snapshot.status === 'merged').flatMap(row => [row.id, row.snapshot.mergedInto!]));
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const row of expenses) if (row.snapshot.mergedInto && (mergeGroup.has(row.id) || mergeGroup.has(row.snapshot.mergedInto))) {
      const before = mergeGroup.size; mergeGroup.add(row.id); mergeGroup.add(row.snapshot.mergedInto); expanded ||= mergeGroup.size !== before;
    }
  }
  for (const id of [...mergeGroup].sort(ordinal)) issues.push({ kind: 'expense', entityId: id, reason: 'unsupported-merge' });
  const kindsById = new Map<string, Set<string>>();
  for (const [kind, rows] of [['expense', expenses], ['settlement', settlements], ['budget', budgets]] as const) {
    for (const row of rows) { const kinds = kindsById.get(row.id) ?? new Set<string>(); kinds.add(kind); kindsById.set(row.id, kinds); }
  }
  const collisions = new Set([...kindsById].filter(([, kinds]) => kinds.size > 1).map(([id]) => id));
  for (const id of collisions) issues.push({ kind: 'collection', entityId: id, reason: 'invalid' });
  expenses = expenses.filter(row => !mergeGroup.has(row.id) && !collisions.has(row.id));
  settlements = settlements.filter(row => !collisions.has(row.id));
  if (budgets.length > 1) for (const row of budgets) issues.push({ kind: 'budget', entityId: row.id, reason: 'conflict' });
  const budget = budgets.length === 1 && !collisions.has(budgets[0]!.id) ? budgets[0]!.snapshot : null;
  const sortedIssues = [...new Map(issues.map(issue => [canonical(issue), issue])).values()]
    .sort((a, b) => ordinal(`${a.kind}/${a.entityId ?? ''}/${a.reason}`, `${b.kind}/${b.entityId ?? ''}/${b.reason}`));
  return {
    trip, budget, issues: sortedIssues, provisional: sortedIssues.length > 0,
    budgetStatus: sortedIssues.some(issue => issue.kind === 'budget' || issue.kind === 'collection' && issue.reason === 'invalid') || (!input.complete && !budget)
      ? 'unavailable' : budget ? 'ready' : 'none',
    expenses: expenses.filter(row => row.snapshot.status === 'active').map(({ id, revision, snapshot }) => ({
      id, revision, title: snapshot.title, total: BigInt(snapshot.total), category: snapshot.category, day: snapshot.day, occurredAt: snapshot.occurredAt,
      payers: snapshot.payerIds.map((personId, index) => ({ personId, amount: BigInt(snapshot.payerAmounts[index]!) })),
      shares: snapshot.participantIds.map((personId, index) => ({ personId, amount: BigInt(snapshot.shareAmounts[index]!) })),
    })),
    settlements: settlements.filter(row => row.snapshot.status === 'active').map(({ id, revision, snapshot }) => ({
      id, revision, fromPersonId: snapshot.fromPersonId, toPersonId: snapshot.toPersonId,
      amount: BigInt(snapshot.amount), day: snapshot.day, occurredAt: snapshot.occurredAt,
    })),
  };
}
