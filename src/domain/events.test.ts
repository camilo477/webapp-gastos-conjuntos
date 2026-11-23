import { describe, expect, it } from 'vitest';
import { financialEventSchema, financialEventV2Schema, migrateFinancialEventV1, serializedByteLength, validateEventParents } from './events';
import { budget, expense, now, settlement, uuid } from './testing/fixtures';

function event() {
  return {
    schemaVersion: 1, operationId: uuid(1), entityId: uuid(1), actorUid: 'synthetic-uid', actorPersonId: 'A',
    action: 'create', entityKind: 'expense', parentIds: [], before: [], logicalClock: 0, payload: expense(),
    authoredAt: now, receivedAt: { seconds: 1_795_280_400, nanoseconds: 0 }, merge: null,
  };
}

describe('Modelos de eventos y migración explícita v1→v2', () => {
  it('migra conservando payload, IDs, autoría y revisión; v2 no acepta v1 implícitamente', () => {
    const input = event(); const output = migrateFinancialEventV1(input);
    expect(output).toEqual({ ...input, schemaVersion: 2 }); expect(input.schemaVersion).toBe(1);
    expect(financialEventV2Schema.safeParse(input).success).toBe(false); expect(financialEventV2Schema.safeParse(output).success).toBe(true);
  });
  it('fixed solo en v2, también en snapshots before; no se migra un falso v1', () => {
    const raw = { ...event(), payload: expense(100, ['A', 'B'], { splitMode: 'fixed', weights: [], shareAmounts: [99, 1] }) };
    expect(financialEventSchema.safeParse(raw).success).toBe(false); expect(() => migrateFinancialEventV1(raw)).toThrow();
    expect(financialEventV2Schema.safeParse({ ...raw, schemaVersion: 2 }).success).toBe(true);
    expect(() => migrateFinancialEventV1({ ...event(), schemaVersion: 2 })).toThrow();
  });
  it.each([{ schemaVersion: 3 }, { operationId: 'not-uuid' }, { parentIds: [uuid(2)] }, { before: [expense()] }, { logicalClock: 1 }, { receivedAt: { seconds: 0, nanoseconds: 1_000_000_000 } }, { extraField: true }, { action: 'delete' }])('rechaza evento inválido %j', patch => expect(financialEventSchema.safeParse({ ...event(), ...patch }).success).toBe(false));
  it('edición y borrado requieren padres/before; los eventos de presupuesto y abonos comparten envoltura', () => {
    const revision = { ...event(), operationId: uuid(2), parentIds: [uuid(1)], before: [expense()], logicalClock: 1, action: 'replace' };
    expect(financialEventSchema.safeParse(revision).success).toBe(true);
    expect(financialEventSchema.safeParse({ ...revision, action: 'delete', payload: { ...expense(), status: 'deleted' } }).success).toBe(true);
    expect(financialEventSchema.safeParse({ ...event(), entityKind: 'settlement', payload: settlement() }).success).toBe(true);
    expect(financialEventSchema.safeParse({ ...event(), entityKind: 'budget', payload: budget() }).success).toBe(true);
    expect(financialEventSchema.safeParse({ ...revision, parentIds: [uuid(2)] }).success).toBe(false);
  });
  it('valida padres directos, antes/después y reloj sin consultar servidor ni resolver ramas', () => {
    const parent = event();
    const edit = { ...parent, schemaVersion: 2, operationId: uuid(2), parentIds: [uuid(1)], before: [expense()], logicalClock: 1, action: 'replace', payload: expense(200) };
    expect(validateEventParents(edit, [parent]).logicalClock).toBe(1);
    expect(() => validateEventParents(edit, [])).toThrow();
    expect(() => validateEventParents({ ...edit, before: [expense(99)] }, [parent])).toThrow();
    expect(() => validateEventParents({ ...edit, logicalClock: 2 }, [parent])).toThrow();
    expect(() => validateEventParents(edit, [{ ...parent, operationId: uuid(3), entityId: uuid(3) }])).toThrow();
  });
  it('una eliminación conserva el snapshot; una resolución puede conservar la decisión de borrarlo', () => {
    const root = event();
    const deleted = { ...root, operationId: uuid(2), parentIds: [uuid(1)], before: [root.payload], logicalClock: 1, action: 'delete', payload: { ...root.payload, status: 'deleted' } };
    expect(validateEventParents(deleted, [root]).action).toBe('delete');
    expect(() => validateEventParents({ ...deleted, payload: { ...expense(200), status: 'deleted' } }, [root])).toThrow();
    const edited = { ...root, operationId: uuid(3), parentIds: [uuid(1)], before: [root.payload], logicalClock: 1, action: 'replace', payload: expense(200) };
    const resolved = { ...deleted, schemaVersion: 2, operationId: uuid(4), parentIds: [uuid(2), uuid(3)], before: [deleted.payload, edited.payload], logicalClock: 2, action: 'resolve' };
    expect(validateEventParents(resolved, [edited, deleted]).payload).toEqual(deleted.payload);
  });
  it('mide UTF-8 sin APIs del navegador y limita el evento completo con sus before', () => {
    expect(serializedByteLength({ note: 'á🙂' })).toBe(Buffer.byteLength(JSON.stringify({ note: 'á🙂' }), 'utf8'));
    const url = `https://example.invalid/${'a'.repeat(2000)}`;
    const payload = { ...expense(), title: 'a'.repeat(100), note: 'b'.repeat(1900), visual: {
      id: 'x'.repeat(200), title: 'x'.repeat(500), source: 'x'.repeat(200), foreignLandingUrl: url, creator: 'x'.repeat(500), creatorUrl: url,
      license: 'x'.repeat(100), licenseVersion: 'x'.repeat(100), licenseUrl: url, thumbnailUrl: url, modified: false,
    } };
    const raw = { ...event(), schemaVersion: 2, action: 'resolve', operationId: uuid(4), parentIds: [uuid(2), uuid(3)], before: [payload, payload], logicalClock: 2, payload };
    expect(serializedByteLength(raw)).toBeGreaterThan(32768);
    expect(financialEventSchema.safeParse(raw).success).toBe(false);
  });
});
