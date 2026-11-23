import { describe, expect, it } from 'vitest';
import { calculateBalances, suggestTransfers } from './balances';
import { calculateStatistics } from './statistics';
import { budget, entry, expense, settlement, state, trip, uuid } from './testing/fixtures';
import { prepareFinancialState } from './state';
import { sumMoney } from './money';

const purchase = () => expense(200_000, ['A', 'B'], { payerIds: ['A', 'B'], payerAmounts: [150_000, 50_000] });
const amounts = (value: ReturnType<typeof state>) => calculateBalances(value).rows.map(row => row.balance);

describe('FIN-01/05/06/07/10/11 · balance efectivo', () => {
  it('varios pagadores, gasto alternado y conservación global', () => {
    const initial = state([entry(1, purchase())]);
    expect(amounts(initial)).toEqual([50_000n, -50_000n]);
    expect(amounts(state([entry(1, purchase()), entry(2, expense(60_000, ['A', 'B'], { payerIds: ['B'] }))]))).toEqual([20_000n, -20_000n]);
    expect(calculateStatistics(initial).total).toBe(200_000n);
  });
  it('abono parcial, resto, borrado de abono y adelanto superior a la deuda', () => {
    const purchases = [entry(1, purchase())];
    expect(amounts(state(purchases, [entry(10, settlement())]))).toEqual([30_000n, -30_000n]);
    expect(amounts(state(purchases, [entry(10, settlement()), entry(11, settlement(30_000))]))).toEqual([0n, 0n]);
    expect(amounts(state(purchases, [entry(10, settlement(20_000, { status: 'deleted' }))]))).toEqual([50_000n, -50_000n]);
    const advance = state(purchases, [entry(10, settlement(70_000))]);
    expect(amounts(advance)).toEqual([-20_000n, 20_000n]); expect(calculateStatistics(advance).total).toBe(200_000n);
  });
  it('edición, eliminación lógica y restauración recalculan sin deriva', () => {
    const original = expense(100, ['A', 'B', 'C']);
    const initial = state([entry(1, original)], [], budget(null), trip(['A', 'B', 'C']));
    const deleted = state([entry(1, { ...original, status: 'deleted' }, 2)], [], budget(null), trip(['A', 'B', 'C']));
    const restored = state([entry(1, original, 3)], [], budget(null), trip(['A', 'B', 'C']));
    expect(amounts(initial)).toEqual([66n, -33n, -33n]); expect(amounts(deleted)).toEqual([0n, 0n, 0n]);
    expect(amounts(restored)).toEqual(amounts(initial));
    expect(amounts(state([entry(1, expense(101, ['A', 'B', 'C']), 4)], [], budget(null), trip(['A', 'B', 'C'])))).toEqual([67n, -34n, -33n]);
    expect(original.shareAmounts).toEqual([34, 33, 33]);
  });
  it('sugerencias liquidan sin modificar historial; desempate ordinal estable', () => {
    const input = state([entry(1, expense(100, ['A', 'B', 'C', 'D'], { payerIds: ['A', 'B'], payerAmounts: [50, 50] }))], [], budget(null), trip(['D', 'C', 'B', 'A']));
    const before = structuredClone(input);
    const result = suggestTransfers(input);
    expect(result.transfers).toEqual([{ fromPersonId: 'C', toPersonId: 'A', amount: 25n }, { fromPersonId: 'D', toPersonId: 'B', amount: 25n }]);
    const balances = new Map(calculateBalances(input).rows.map(row => [row.personId, row.balance]));
    for (const payment of result.transfers) { balances.set(payment.fromPersonId, balances.get(payment.fromPersonId)! + payment.amount); balances.set(payment.toPersonId, balances.get(payment.toPersonId)! - payment.amount); }
    expect([...balances.values()].every(amount => amount === 0n)).toBe(true); expect(input).toEqual(before);
  });
  it('conserva personas históricas revocadas en los saldos', () => {
    const context = trip(); context.people[1]!.status = 'revoked';
    expect(amounts(state([entry(1, purchase())], [], budget(null), context))).toEqual([50_000n, -50_000n]);
  });
  it('un pagador puede estar excluido del consumo del gasto', () => {
    const input = state([entry(1, expense(100, ['B'], { payerIds: ['A'], payerAmounts: [100] }))]);
    expect(amounts(input)).toEqual([100n, -100n]);
    expect(calculateStatistics(input).byPerson).toEqual([{ personId: 'A', paid: 100n, consumed: 0n }, { personId: 'B', paid: 0n, consumed: 100n }]);
  });
});

describe('Selección explícita de revisiones y provisionalidad', () => {
  it('no cuenta dos veces la misma revisión, incluso con listas permutadas', () => {
    const original = expense(100, ['A', 'B'], { payerIds: ['A', 'B'], payerAmounts: [40, 60] });
    const reordered = { ...original, payerIds: ['B', 'A'], payerAmounts: [60, 40], participantIds: ['B', 'A'] };
    const result = state([entry(1, original), entry(1, reordered)]);
    expect(result.provisional).toBe(false); expect(result.expenses).toHaveLength(1); expect(calculateStatistics(result).total).toBe(100n);
  });
  it('distintas revisiones excluyen la entidad sin escoger la última', () => {
    const entries = [entry(1, expense(100)), entry(1, expense(200), 2), entry(3, expense(50))];
    const result = state(entries);
    expect(result.provisional).toBe(true); expect(result.expenses.map(row => row.id)).toEqual([uuid(3)]);
    expect(state(entries.slice().reverse())).toEqual(result);
    expect(calculateStatistics(result).total).toBe(50n); expect(calculateStatistics(result).provisional).toBe(true);
    expect(suggestTransfers(result).provisional).toBe(true); expect(sumMoney(calculateBalances(result).rows.map(row => row.balance))).toBe(0n);
  });
  it.each(['conflict', 'incomplete', 'invalid'] as const)('propaga entidad %s sin usar su importe', reason => {
    const result = state([{ entityId: uuid(1), state: reason }, entry(2, expense(9))]);
    expect(result.provisional).toBe(true); expect(calculateStatistics(result).total).toBe(9n); expect(result.issues[0]!.reason).toBe(reason);
  });
  it('detecta payloads incompatibles con una misma revisión, inválidos y campos extra', () => {
    for (const entries of [[entry(1, expense()), entry(1, expense(200))], [entry(1, { ...expense(), total: 99 })], [{ ...entry(1, expense()), extra: true }]]) {
      const result = state(entries); expect(result.provisional).toBe(true); expect(result.expenses).toHaveLength(0);
    }
  });
  it('colección incompleta y presupuestos incompatibles nunca son definitivos', () => {
    expect(state([entry(1, expense())], [], budget(), trip(), false).provisional).toBe(true);
    const result = prepareFinancialState(trip(), { complete: true, expenses: [], settlements: [], budgets: [entry(10, budget()), entry(11, budget(100))] });
    expect(result.budget).toBeNull(); expect(result.provisional).toBe(true); expect(result.budgetStatus).toBe('unavailable');
  });
  it('no aplica flags merged sin el futuro proyector de pares', () => {
    const result = state([entry(1, expense(100, ['A', 'B'], { status: 'merged', mergedInto: uuid(2) })), entry(2, expense(100))]);
    expect(result.expenses).toHaveLength(0); expect(result.provisional).toBe(true); expect(result.issues.every(issue => issue.reason === 'unsupported-merge')).toBe(true);
  });
  it('rechaza colisiones de raíz entre tipos financieros', () => {
    const result = state([entry(1, expense())], [entry(1, settlement(5))]);
    expect(result.expenses).toHaveLength(0); expect(result.settlements).toHaveLength(0); expect(result.provisional).toBe(true);
  });
});
