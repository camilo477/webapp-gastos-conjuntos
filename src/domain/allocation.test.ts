import { describe, expect, it } from 'vitest';
import { allocateByWeight, splitExpense } from './allocation';
import { MAX_MONEY, sumMoney } from './money';

describe('FIN-02/03/04/09/10 · restos mayores y fixed', () => {
  it('100 entre tres por identificador ordinal, independientemente del orden', () => {
    const expected = [{ personId: 'A', amount: 34n }, { personId: 'B', amount: 33n }, { personId: 'C', amount: 33n }];
    for (const ids of [['A', 'B', 'C'], ['A', 'C', 'B'], ['B', 'A', 'C'], ['B', 'C', 'A'], ['C', 'A', 'B'], ['C', 'B', 'A']]) expect(splitExpense(100n, { mode: 'equal', personIds: ids })).toEqual(expected);
  });
  it('un peso entre dos conserva 1/0 en sucesivas reconstrucciones', () => {
    for (let iteration = 0; iteration < 50; iteration++) expect(splitExpense(1n, { mode: 'percentage', weights: [{ personId: 'B', weight: 5000 }, { personId: 'A', weight: 5000 }] })).toEqual([{ personId: 'A', amount: 1n }, { personId: 'B', amount: 0n }]);
  });
  it('diez personas al 10% y participantes con 0% excluidos', () => {
    const people = Array.from({ length: 10 }, (_, index) => String.fromCharCode(65 + index));
    expect(splitExpense(100n, { mode: 'percentage', weights: people.map(personId => ({ personId, weight: 1000 })) }).every(row => row.amount === 10n)).toBe(true);
    expect(splitExpense(1n, { mode: 'percentage', weights: [{ personId: 'A', weight: 0 }, { personId: 'B', weight: 10_000 }] })).toEqual([{ personId: 'A', amount: 0n }, { personId: 'B', amount: 1n }]);
    expect(splitExpense(7n, { mode: 'equal', personIds: ['B'] })).toEqual([{ personId: 'B', amount: 7n }]);
  });
  it.each([[3333, 3333, 3333], [3333, 3333, 3335], [-1, 5000, 5001], [0.5, 4999.5, 5000]])('rechaza pesos no enteros o suma distinta de 100%%: %j', (...weights) => expect(() => splitExpense(100n, { mode: 'percentage', weights: weights.map((weight, index) => ({ personId: String(index), weight })) })).toThrow());
  it('FIN-09: límite máximo con producto intermedio fuera de Number seguro', () => {
    expect(splitExpense(MAX_MONEY, { mode: 'percentage', weights: [{ personId: 'A', weight: 3333 }, { personId: 'B', weight: 3333 }, { personId: 'C', weight: 3334 }] })).toEqual([{ personId: 'A', amount: 333_300_000_000n }, { personId: 'B', amount: 333_300_000_000n }, { personId: 'C', amount: 333_400_000_000n }]);
  });
  it('fixed conserva importes, incluidos ceros, y rechaza cambios de total incoherentes', () => {
    const shares = [{ personId: 'B', amount: 1n }, { personId: 'A', amount: 99n }, { personId: 'C', amount: 0n }];
    expect(splitExpense(100n, { mode: 'fixed', shares }).map(row => row.amount)).toEqual([99n, 1n, 0n]);
    expect(() => splitExpense(101n, { mode: 'fixed', shares })).toThrow(); expect(() => splitExpense(1n, { mode: 'fixed', shares: [{ personId: 'A', amount: -1n }] })).toThrow();
  });
  it('rechaza lista vacía, repetidos, más de diez, peso cero y total cero', () => {
    for (const ids of [[], ['A', 'A'], Array.from({ length: 11 }, (_, index) => String(index))]) expect(() => splitExpense(100n, { mode: 'equal', personIds: ids })).toThrow();
    expect(() => splitExpense(0n, { mode: 'equal', personIds: ['A', 'B'] })).toThrow();
    expect(() => allocateByWeight(1n, [{ id: 'A', weight: 0n }])).toThrow();
  });
  it('no muta entradas congeladas ni entrega sobrante a pesos cero', () => {
    const entries = Object.freeze([Object.freeze({ id: 'A', weight: 0n }), Object.freeze({ id: 'B', weight: 1n }), Object.freeze({ id: 'C', weight: 1n })]);
    const result = allocateByWeight(3n, entries); expect(sumMoney(result.map(row => row.amount))).toBe(3n); expect(result[0]!.amount).toBe(0n); expect(entries[1]!.weight).toBe(1n);
  });
});
