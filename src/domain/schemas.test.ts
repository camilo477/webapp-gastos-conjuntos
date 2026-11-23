import { describe, expect, it } from 'vitest';
import { budgetSnapshotSchema, expenseSnapshotSchema, settlementSnapshotSchema, tripContextSchema, validateExpenseChange, validateSettlementChange } from './schemas';
import { entry, expense, settlement, state, trip, uuid } from './testing/fixtures';

describe('VAL-01 · contratos compartidos estrictos', () => {
  it.each([
    { total: 0 }, { total: -1 }, { total: 1.1 }, { total: NaN }, { total: Infinity }, { total: 1_000_000_000_001 },
    { payerIds: ['A', 'A'], payerAmounts: [50, 50] }, { payerAmounts: [99] }, { payerAmounts: [0] },
    { participantIds: ['A', 'A'] }, { shareAmounts: [50] }, { shareAmounts: [49, 50] },
    { weights: [1] }, { weights: [0, 1] }, { splitMode: 'percentage', weights: [5000, 4999] },
    { splitMode: 'percentage', weights: [-1, 10001] }, { splitMode: 'fixed', weights: [1, 1] },
    { status: 'merged', mergedInto: null }, { extraField: true }, { title: ' ' }, { note: 'x'.repeat(2001) },
  ])('rechaza gasto hostil %j', patch => expect(expenseSnapshotSchema.safeParse({ ...expense(), ...patch }).success).toBe(false));
  it('detecta reparto que conserva suma pero entrega sobrante a persona equivocada', () => {
    expect(expenseSnapshotSchema.safeParse(expense(1, ['A', 'B'], { shareAmounts: [0, 1] })).success).toBe(false);
  });
  it('fixed acepta cuotas exactas y cero para excluir; no cambia importes al validar', () => {
    const raw = expense(100, ['A', 'B', 'C'], { splitMode: 'fixed', weights: [], shareAmounts: [17, 83, 0] });
    expect(expenseSnapshotSchema.parse(raw).shareAmounts).toEqual([17, 83, 0]);
    expect(expenseSnapshotSchema.safeParse({ ...raw, total: 101, payerAmounts: [101] }).success).toBe(false);
  });
  it('rechaza desconocidos, fechas fuera del viaje y día incompatible con zona', () => {
    for (const raw of [expense(100, ['A', 'C']), expense(100, ['A', 'B'], { day: '2026-11-25', occurredAt: '2026-11-25T12:00:00Z' }), expense(100, ['A', 'B'], { occurredAt: '2026-11-21T01:00:00Z' })]) {
      const result = state([entry(1, raw)]); expect(result.expenses).toHaveLength(0); expect(result.provisional).toBe(true);
    }
  });
  it('no añade revocados nuevos; una edición conserva personas históricas previas', () => {
    const context = trip(['A', 'B', 'C']); context.people[1]!.status = 'revoked';
    expect(() => validateExpenseChange(expense(), context)).toThrow();
    expect(validateExpenseChange(expense(), context, expense()).participantIds).toEqual(['A', 'B']);
    const other = expense(100, ['A', 'C']); expect(() => validateExpenseChange(expense(), context, other)).toThrow();
    expect(() => validateSettlementChange(settlement(), context)).toThrow();
    expect(validateSettlementChange(settlement(), context, settlement()).fromPersonId).toBe('B');
  });
  it('abonos validan origen distinto, positividad, IDs y campos permitidos', () => {
    for (const patch of [{ amount: 0 }, { amount: -1 }, { amount: 1.5 }, { fromPersonId: 'A', toPersonId: 'A' }, { fromPersonId: 'bad/id' }, { unknown: true }]) expect(settlementSnapshotSchema.safeParse({ ...settlement(), ...patch }).success).toBe(false);
  });
  it('presupuestos sin total no admiten reservas; cantidades y fechas inválidas fallan', () => {
    for (const raw of [{ total: null, lockedDays: [{ day: '2026-11-21', amount: 1 }], status: 'active' }, { total: -1, lockedDays: [], status: 'active' }, { total: 100, lockedDays: [{ day: '2026-02-30', amount: 1 }], status: 'active' }]) expect(budgetSnapshotSchema.safeParse(raw).success).toBe(false);
  });
  it('contexto distingue moneda/exponente y valida identidades, máximo activo y rango', () => {
    for (const raw of [{ ...trip(), currency: 'USD' }, { ...trip(), endDate: '2026-11-20' }, { ...trip(), timezone: '+05:00' }, { ...trip(), people: [trip().people[0], trip().people[0]] }, { ...trip(), people: Array.from({ length: 11 }, (_, index) => ({ personId: `P${index}`, displayName: `P${index}`, status: 'active' })) }]) {
      expect(tripContextSchema.safeParse(raw).success).toBe(false);
    }
  });
  it('una raíz merge no puede señalarse a sí misma ni volver definitiva una entidad', () => {
    const result = state([entry(1, expense(100, ['A', 'B'], { status: 'merged', mergedInto: uuid(1) }))]);
    expect(result.provisional).toBe(true); expect(result.expenses).toHaveLength(0);
  });
});
