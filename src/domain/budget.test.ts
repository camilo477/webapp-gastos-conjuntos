import { describe, expect, it } from 'vitest';
import { calculateBudget, validateBudgetEdit } from './budget';
import { budget, entry, expense, firstDay, now, state } from './testing/fixtures';

describe('BUD-01–05 · presupuesto y redistribución', () => {
  it('BUD-01: 400.000/4, gasto inicial 250.000 y siguientes a 50.000', () => {
    const input = state([entry(1, expense(250_000))], [], budget());
    const result = calculateBudget(input, now);
    expect(result.total).toBe(400_000n); expect(result.available).toBe(150_000n);
    expect(result.current).toMatchObject({ allocated: 100_000n, spent: 250_000n, excess: 150_000n, available: -150_000n });
    expect(result.future.map(row => row.amount)).toEqual([50_000n, 50_000n, 50_000n]);
    expect(calculateBudget(input, '2026-11-22T17:00:00Z').current!.allocated).toBe(50_000n);
  });
  it('BUD-02: reserva del cuarto día 80.000; 35.000 en cada automático', () => {
    const result = calculateBudget(state([entry(1, expense(250_000))], [], budget(400_000, [{ day: '2026-11-24', amount: 80_000 }])), now);
    expect(result.future.map(row => row.amount)).toEqual([35_000n, 35_000n, 80_000n]); expect(result.fundingDeficit).toBe(0n);
  });
  it('BUD-03: reserva conservada con déficit 30.000 y disponible real 50.000', () => {
    const result = calculateBudget(state([entry(1, expense(350_000))], [], budget(400_000, [{ day: '2026-11-24', amount: 80_000 }])), now);
    expect(result.future.map(row => row.amount)).toEqual([0n, 0n, 80_000n]); expect(result.fundingDeficit).toBe(30_000n); expect(result.available).toBe(50_000n);
  });
  it('BUD-04: diferencia sin presupuesto, cero y sobregasto', () => {
    const expenses = [entry(1, expense(100))];
    expect(calculateBudget(state(expenses), now)).toMatchObject({ total: null, available: null, fundingDeficit: null });
    const zero = calculateBudget(state(expenses, [], budget(0)), now);
    expect(zero.total).toBe(0n); expect(zero.available).toBe(-100n); expect(zero.future.every(row => row.amount === 0n)).toBe(true);
    expect(calculateBudget(state(expenses, [], budget(50)), now).available).toBe(-50n);
  });
  it('antes, último día, después y sobrante sin asignar; no división por cero', () => {
    const input = state([], [], budget(101));
    const before = calculateBudget(input, '2026-11-20T12:00:00Z');
    expect(before.phase).toBe('before'); expect(before.current).toBeNull(); expect(before.future.map(row => row.amount)).toEqual([26n, 25n, 25n, 25n]);
    const last = calculateBudget(input, '2026-11-24T12:00:00Z'); expect(last.future).toEqual([]); expect(last.unallocatedSurplus).toBe(101n);
    const after = calculateBudget(input, '2026-11-25T12:00:00Z'); expect(after.phase).toBe('after'); expect(after.current).toBeNull(); expect(after.future).toEqual([]); expect(after.unallocatedSurplus).toBe(101n);
  });
  it('cupo de hoy no baja con cada compra; reserva de hoy no aumenta con el exceso', () => {
    const a = calculateBudget(state([], [], budget()), now);
    const b = calculateBudget(state([entry(1, expense(50_000))], [], budget()), now);
    expect(a.current!.allocated).toBe(b.current!.allocated);
    const manual = calculateBudget(state([entry(1, expense(70_000))], [], budget(400_000, [{ day: firstDay, amount: 50_000 }])), now);
    expect(manual.current).toMatchObject({ allocated: 50_000n, available: -20_000n, excess: 20_000n, manual: true });
  });
  it('BUD-05: rechaza repetidos, fuera de viaje y reserva excesiva durante una edición', () => {
    const input = state([entry(1, expense(350_000))], [], budget());
    const asOf = '2026-11-22T17:00:00Z';
    expect(() => validateBudgetEdit(input, budget(400_000, [{ day: '2026-11-24', amount: 80_000 }]), asOf)).toThrow();
    expect(() => validateBudgetEdit(input, budget(400_000, [{ day: '2026-11-24', amount: 1 }, { day: '2026-11-24', amount: 1 }]), asOf)).toThrow();
    expect(() => validateBudgetEdit(input, budget(400_000, [{ day: '2026-11-25', amount: 1 }]), asOf)).toThrow();
    expect(validateBudgetEdit(input, budget(400_000, [{ day: '2026-11-24', amount: 50_000 }]), asOf).lockedDays).toHaveLength(1);
  });
  it('gasto retroactivo reconstruye días siguientes y respeta asignaciones históricas como estimaciones', () => {
    const without = calculateBudget(state([], [], budget()), '2026-11-23T17:00:00Z');
    const withRetroactive = calculateBudget(state([entry(1, expense(250_000))], [], budget()), '2026-11-23T17:00:00Z');
    expect(without.current!.allocated).toBe(200_000n); expect(withRetroactive.current!.allocated).toBe(75_000n);
    expect(withRetroactive.days[0]!.allocated).toBe(100_000n); expect(withRetroactive.future[0]!.amount).toBe(150_000n);
  });
  it('provisionalidad de presupuesto impide validar reservas como definitivas', () => {
    const input = state([], [], budget(), undefined, false);
    expect(calculateBudget(input, now).provisional).toBe(true); expect(() => validateBudgetEdit(input, budget(), now)).toThrow();
  });
  it('un presupuesto en conflicto se identifica como no disponible, distinto de uno conocido sin total', () => {
    const input = state([], [], budget());
    const unavailable = { ...input, budget: null, budgetStatus: 'unavailable' as const, provisional: true };
    expect(calculateBudget(unavailable, now)).toMatchObject({ status: 'unavailable', total: null, provisional: true });
    expect(calculateBudget(state(), now)).toMatchObject({ status: 'ready', total: null, provisional: false });
  });
  it('gastos conocidos de días futuros se descuentan una vez y preservan reserva manual', () => {
    const input = state([entry(1, expense(100_000, ['A', 'B'], { day: '2026-11-24', occurredAt: '2026-11-24T17:00:00Z' }))], [], budget(400_000, [{ day: '2026-11-24', amount: 120_000 }]));
    const result = calculateBudget(input, now);
    expect(result.available).toBe(300_000n); expect(result.future.map(row => row.amount)).toEqual([140_000n, 140_000n, 120_000n]);
  });
});
