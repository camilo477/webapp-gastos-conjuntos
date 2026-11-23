import { z } from 'zod';
import { operationIdSchema, personIdSchema } from './allocation';
import { instantSchema } from './dates';
import { budgetSnapshotSchema, expenseSnapshotSchema, settlementSnapshotSchema } from './schemas';
import { requireCondition } from './errors';

export const receivedTimestampSchema = z.strictObject({ seconds: z.number().int().min(-62_135_596_800).max(253_402_300_799), nanoseconds: z.number().int().min(0).max(999_999_999) });
const duplicateSnapshotSchema = z.strictObject({
  expenseIds: z.tuple([operationIdSchema, operationIdSchema]), revisions: z.tuple([operationIdSchema, operationIdSchema]), decision: z.literal('distinct'),
}).refine(value => value.expenseIds[0] < value.expenseIds[1], 'Los dos gastos deben ser distintos y estar ordenados.');

const base = z.strictObject({
  schemaVersion: z.union([z.literal(1), z.literal(2)]), operationId: operationIdSchema, entityId: operationIdSchema,
  actorUid: personIdSchema, actorPersonId: personIdSchema,
  action: z.enum(['create', 'replace', 'delete', 'resolve', 'mergeKeep', 'mergeHide', 'dismissDuplicate']),
  parentIds: z.array(operationIdSchema).max(2), logicalClock: z.number().int().min(0).max(1_000_000_000),
  authoredAt: instantSchema, receivedAt: receivedTimestampSchema,
  merge: z.strictObject({ mergeId: operationIdSchema, peerEntityId: operationIdSchema, peerOperationId: operationIdSchema, role: z.enum(['keep', 'hide']) }).nullable(),
});

export function serializedByteLength(value: unknown): number {
  const json = JSON.stringify(value);
  requireCondition(json !== undefined, 'SERIALIZATION', 'Se requiere un valor JSON serializable.');
  let bytes = 0;
  for (const character of json) {
    const point = character.codePointAt(0)!;
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
}

export const financialEventSchema = z.discriminatedUnion('entityKind', [
  base.extend({ entityKind: z.literal('expense'), payload: expenseSnapshotSchema, before: z.array(expenseSnapshotSchema).max(2) }),
  base.extend({ entityKind: z.literal('settlement'), payload: settlementSnapshotSchema, before: z.array(settlementSnapshotSchema).max(2) }),
  base.extend({ entityKind: z.literal('budget'), payload: budgetSnapshotSchema, before: z.array(budgetSnapshotSchema).max(2) }),
  base.extend({ entityKind: z.literal('duplicateDecision'), payload: duplicateSnapshotSchema, before: z.array(duplicateSnapshotSchema).max(2) }),
]).superRefine((event, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (serializedByteLength(event) > 32 * 1024) issue('El evento serializado supera el límite de 32 KiB.');
  const parentCount = event.action === 'create' ? 0 : event.action === 'resolve' ? 2 : 1;
  if (event.parentIds.length !== parentCount || event.before.length !== parentCount) issue('Cantidad de padres/before incompatible con la acción.');
  if (new Set(event.parentIds).size !== event.parentIds.length || event.parentIds.includes(event.operationId)) issue('Padres repetidos o autorreferencia.');
  if (event.action === 'create' && (event.entityId !== event.operationId || event.logicalClock !== 0)) issue('Raíz inválida.');
  if (event.action !== 'create' && (event.operationId === event.entityId || event.logicalClock === 0)) issue('Una revisión requiere ID nuevo y reloj positivo.');
  const mergeAction = event.action === 'mergeKeep' || event.action === 'mergeHide';
  if (mergeAction !== (event.merge !== null)) issue('Metadata de unificación incompatible con la acción.');
  if (event.entityKind === 'expense') {
    if (event.schemaVersion === 1 && [event.payload, ...event.before].some(snapshot => snapshot.splitMode === 'fixed')) issue('El modo fixed requiere contrato financiero v2.');
    if (event.action === 'dismissDuplicate') issue('Acción no válida para gasto.');
    const expectedStatus = event.action === 'delete' ? 'deleted' : event.action === 'mergeHide' ? 'merged' : 'active';
    if (event.action === 'resolve' ? event.payload.status === 'merged' : event.payload.status !== expectedStatus) issue('Estado de gasto incompatible con la acción.');
    if (event.payload.mergedInto === event.entityId) issue('Un gasto no puede unificarse consigo mismo.');
    if (event.merge && (event.merge.peerEntityId === event.entityId || event.merge.peerOperationId === event.operationId || event.merge.role !== (event.action === 'mergeKeep' ? 'keep' : 'hide'))) issue('Par de unificación inválido.');
    if (event.action === 'mergeHide' && event.payload.mergedInto !== event.merge?.peerEntityId) issue('Destino de unificación incoherente.');
  } else if (event.entityKind === 'settlement') {
    if (!['create', 'replace', 'delete', 'resolve'].includes(event.action) || event.action !== 'resolve' && event.payload.status !== (event.action === 'delete' ? 'deleted' : 'active')) issue('Acción/estado de abono inválido.');
  } else if (event.entityKind === 'budget') {
    if (!['create', 'replace', 'resolve'].includes(event.action)) issue('Acción de presupuesto inválida.');
  } else if (!['create', 'dismissDuplicate'].includes(event.action)) issue('Acción de decisión de duplicado inválida.');
});
export type FinancialEventDto = z.infer<typeof financialEventSchema>;

export const financialEventV2Schema = financialEventSchema.refine(event => event.schemaVersion === 2, 'Se requiere versión financiera 2.')
  .transform(event => ({ ...event, schemaVersion: 2 as const }));
export type FinancialEventV2Dto = z.infer<typeof financialEventV2Schema>;

export function migrateFinancialEventV1(raw: unknown): FinancialEventV2Dto {
  const event = financialEventSchema.parse(raw);
  requireCondition(event.schemaVersion === 1, 'SCHEMA_VERSION', 'La migración requiere un evento v1.');
  return financialEventV2Schema.parse({ ...event, schemaVersion: 2 });
}

export function validateEventParents(raw: unknown, rawParents: readonly unknown[]): FinancialEventDto {
  const event = financialEventSchema.parse(raw);
  const parents = z.array(financialEventSchema).max(2).parse(rawParents);
  requireCondition(parents.length === event.parentIds.length && new Set(parents.map(parent => parent.operationId)).size === parents.length,
    'MISSING_PARENT', 'Se requieren exactamente los padres directos declarados.');
  const byId = new Map(parents.map(parent => [parent.operationId, parent]));
  for (let index = 0; index < event.parentIds.length; index++) {
    const parent = byId.get(event.parentIds[index]!);
    requireCondition(parent, 'MISSING_PARENT', 'Falta un padre declarado.');
    requireCondition(parent.entityId === event.entityId && parent.entityKind === event.entityKind, 'PARENT_ENTITY', 'El padre pertenece a otra entidad o tipo.');
    requireCondition(JSON.stringify(parent.payload) === JSON.stringify(event.before[index]), 'PARENT_BEFORE', 'before no coincide con el snapshot del padre.');
  }
  const clock = parents.length ? 1 + Math.max(...parents.map(parent => parent.logicalClock)) : 0;
  requireCondition(event.logicalClock === clock, 'LOGICAL_CLOCK', 'El reloj lógico no coincide con sus padres.');
  if (event.action === 'delete' && (event.entityKind === 'expense' || event.entityKind === 'settlement')) {
    const before = event.before[0]!;
    requireCondition(JSON.stringify(event.payload) === JSON.stringify({ ...before, status: 'deleted' }), 'DELETE_SNAPSHOT', 'La eliminación debe conservar el snapshot y sus importes.');
  }
  return event;
}
