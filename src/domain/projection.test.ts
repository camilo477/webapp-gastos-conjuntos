import { describe, expect, it } from 'vitest';
import { projectFinancialEvents } from './projection';
import { calculateBalances } from './balances';
import { calculateBudget } from './budget';
import { calculateStatistics } from './statistics';
import { budget, expense, now, settlement, trip, uuid } from './testing/fixtures';

function root(id = 1, payload: unknown = expense(), entityKind = 'expense') {
  return { schemaVersion: 2, operationId: uuid(id), entityId: uuid(id), actorUid: 'synthetic-uid', actorPersonId: 'A',
    action: 'create', entityKind, parentIds: [] as string[], before: [] as unknown[], logicalClock: 0, payload, authoredAt: now, receivedAt: { seconds: 0, nanoseconds: 0 }, merge: null };
}
function edit(id: number, payload: unknown, parent: ReturnType<typeof root>) {
  return { ...parent, operationId: uuid(id), action: 'replace', parentIds: [parent.operationId], before: [parent.payload], logicalClock: parent.logicalClock + 1, payload };
}

describe('Proyección contable local de eventos', () => {
  it('edita, elimina y restaura con historia intacta, independiente del orden', () => {
    const a = root(), b = edit(2, expense(200), a), c = { ...edit(3, { ...expense(200), status: 'deleted' }, b), action: 'delete' };
    const d = edit(4, expense(200), c);
    const history = [a, b, c, d], before = structuredClone(history);
    expect(calculateStatistics(projectFinancialEvents(trip(), [a, b, c], true)).total).toBe(0n);
    const result = projectFinancialEvents(trip(), history, true);
    expect(result.provisional).toBe(false); expect(calculateStatistics(result).total).toBe(200n);
    expect(projectFinancialEvents(trip(), history.slice().reverse(), true)).toEqual(result); expect(history).toEqual(before);
  });
  it('ediciones simultáneas no eligen la última fecha y los totales quedan provisionales', () => {
    const a = root(), b = edit(2, expense(120), a), c = { ...edit(3, expense(90), a), authoredAt: '2026-11-22T17:00:00Z' };
    const result = projectFinancialEvents(trip(), [c, root(10, expense(10)), a, b], true);
    expect(result.provisional).toBe(true); expect(calculateStatistics(result).total).toBe(10n); expect(result.issues.some(issue => issue.reason === 'conflict')).toBe(true);
    expect(calculateBalances(result).provisional).toBe(true);
  });
  it('padres faltantes excluyen toda la entidad hasta completar el conjunto', () => {
    const a = root(), b = edit(2, expense(200), a);
    const incomplete = projectFinancialEvents(trip(), [b], true);
    expect(incomplete.provisional).toBe(true); expect(incomplete.expenses).toHaveLength(0); expect(incomplete.issues[0]!.reason).toBe('incomplete');
    expect(projectFinancialEvents(trip(), [b, a], true).provisional).toBe(false);
    expect(projectFinancialEvents(trip(), [a], false).provisional).toBe(true);
  });
  it('padre inválido no se convierte en una raíz nueva ni se oculta usando el último válido', () => {
    const a = root(), b = { ...edit(2, expense(200), a), logicalClock: 7 }, c = edit(3, expense(300), b);
    const result = projectFinancialEvents(trip(), [a, b, c], true);
    expect(result.provisional).toBe(true); expect(result.expenses).toHaveLength(0);
  });
  it('valida también personas y fechas de ancestros, sin promover descendientes de snapshots inválidos', () => {
    const invalid = root(1, expense(100, ['A', 'C'])), corrected = edit(2, expense(200), invalid);
    const result = projectFinancialEvents(trip(), [invalid, corrected], true);
    expect(result.provisional).toBe(true); expect(result.expenses).toHaveLength(0);
  });
  it('resolución explícita cubre dos cabezas; una rama tardía vuelve provisional el resultado', () => {
    const a = root(), b = edit(2, expense(120), a), c = edit(3, expense(90), a);
    const resolution = { ...edit(4, expense(110), b), action: 'resolve', parentIds: [b.operationId, c.operationId], before: [b.payload, c.payload] };
    const resolved = projectFinancialEvents(trip(), [resolution, c, a, b], true);
    expect(resolved.provisional).toBe(false); expect(calculateStatistics(resolved).total).toBe(110n);
    const late = edit(5, expense(130), a);
    expect(projectFinancialEvents(trip(), [a, b, c, resolution, late], true).provisional).toBe(true);
  });
  it('repetir un ID con contenido igual no duplica; contenido distinto es una incidencia', () => {
    const a = root();
    expect(calculateStatistics(projectFinancialEvents(trip(), [a, a], true)).total).toBe(100n);
    expect(projectFinancialEvents(trip(), [a, { ...a, payload: expense(200) }], true).provisional).toBe(true);
  });
  it('abonos y presupuesto conflictivo usan las mismas reglas de provisionalidad', () => {
    const purchase = root(), payment = root(10, settlement(20), 'settlement'), plan = root(20, budget(), 'budget');
    const changedA = edit(21, budget(100), plan), changedB = edit(22, budget(200), plan);
    const result = projectFinancialEvents(trip(), [purchase, payment, plan, changedA, changedB], true);
    expect(calculateStatistics(result).total).toBe(100n); expect(calculateBalances(result).rows.map(row => row.balance)).toEqual([30n, -30n]);
    expect(calculateBudget(result, now)).toMatchObject({ provisional: true, status: 'unavailable', total: null });
  });
  it('datos malformados y pares merge fuera de alcance no se presentan como definitivos', () => {
    expect(projectFinancialEvents(trip(), [root(), { arbitrary: true }], true).provisional).toBe(true);
    const a = root(), b = root(10);
    const merged = { ...edit(2, expense(), a), action: 'mergeKeep', merge: { mergeId: uuid(50), peerEntityId: b.entityId, peerOperationId: uuid(11), role: 'keep' } };
    const result = projectFinancialEvents(trip(), [a, b, merged], true);
    expect(result.provisional).toBe(true); expect(result.expenses).toHaveLength(0);
  });
});

it('1.000 conjuntos de eventos permutados reproducen edición/borrado/restauración/conflicto/incompletitud', () => {
  for (let index = 0; index < 1000; index++) {
    const people = Array.from({ length: 2 + index % 9 }, (_, offset) => String.fromCharCode(65 + offset));
    const a = root(1, expense(index + 1, people)), b = edit(2, expense(index + 3, people), a);
    const c = { ...edit(3, { ...expense(index + 3, people), status: 'deleted' }, b), action: 'delete' };
    const d = edit(4, expense(index + 5, people), c);
    const history = index % 3 === 0 ? [a, b, c, d, edit(5, expense(index + 7, people), a)] : index % 3 === 1 ? [b, c, d] : [a, b, c, d];
    const pivot = index % history.length;
    const reordered = [...history.slice(pivot), ...history.slice(0, pivot)].reverse();
    const context = trip(people);
    const expected = projectFinancialEvents(context, history, true);
    expect(projectFinancialEvents(context, reordered, true)).toEqual(expected);
    expect(expected.provisional).toBe(index % 3 !== 2);
    expect(calculateStatistics(expected).total).toBe(index % 3 === 2 ? BigInt(index + 5) : 0n);
  }
}, 60_000);
