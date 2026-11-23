import { financialEventV2Schema, validateEventParents, validateExpenseContext, validateSettlementContext, validateBudgetContext } from '../../domain';
import type { FinancialEventV2Dto, TripContext } from '../../domain';
import { AccessError } from '../access/errors';

type Actor = { uid: string;personId: string };
export function prepareResolution(context: TripContext,actor: Actor,parents: readonly FinancialEventV2Dto[],payload: unknown): FinancialEventV2Dto {
  if (parents.length !== 2 || parents[0]!.entityKind === 'duplicateDecision' || parents.some(parent => parent.entityId !== parents[0]!.entityId || parent.entityKind !== parents[0]!.entityKind)) throw new AccessError('Elige dos propuestas del mismo movimiento.');
  const event = financialEventV2Schema.parse({ ...parents[0],operationId: crypto.randomUUID(),action: 'resolve',actorUid: actor.uid,actorPersonId: actor.personId,parentIds: parents.map(parent => parent.operationId),before: parents.map(parent => parent.payload),logicalClock: 1 + Math.max(...parents.map(parent => parent.logicalClock)),payload,merge: null,authoredAt: new Date().toISOString(),receivedAt: { seconds: 0,nanoseconds: 0 } });
  validateEventParents(event,parents);
  const allowed = new Set(context.people.filter(p => p.status === 'active').map(p => p.personId));
  for (const parent of parents) {
    if (parent.entityKind === 'expense') for (const id of [...parent.payload.payerIds,...parent.payload.participantIds]) allowed.add(id);
    if (parent.entityKind === 'settlement') { allowed.add(parent.payload.fromPersonId); allowed.add(parent.payload.toPersonId); }
  }
  if (event.entityKind === 'expense') { validateExpenseContext(event.payload,context); if (![...event.payload.payerIds,...event.payload.participantIds].every(id => allowed.has(id))) throw new AccessError('Persona revocada ajena a las propuestas.'); }
  else if (event.entityKind === 'settlement') { validateSettlementContext(event.payload,context); if (!allowed.has(event.payload.fromPersonId) || !allowed.has(event.payload.toPersonId)) throw new AccessError('Persona revocada ajena a las propuestas.'); }
  else if (event.entityKind === 'budget') validateBudgetContext(event.payload,context);
  return event;
}
export function prepareDistinct(actor: Actor,parents: readonly FinancialEventV2Dto[]): FinancialEventV2Dto {
  const ordered = [...parents].sort((a,b) => a.entityId < b.entityId ? -1 : 1), id = crypto.randomUUID();
  if (ordered.length !== 2 || ordered.some(event => event.entityKind !== 'expense')) throw new AccessError('Selecciona dos gastos.');
  return financialEventV2Schema.parse({ schemaVersion: 2,operationId: id,entityId: id,entityKind: 'duplicateDecision',action: 'create',actorUid: actor.uid,actorPersonId: actor.personId,parentIds: [],before: [],logicalClock: 0,authoredAt: new Date().toISOString(),receivedAt: { seconds: 0,nanoseconds: 0 },merge: null,payload: { expenseIds: ordered.map(parent => parent.entityId),revisions: ordered.map(parent => parent.operationId),decision: 'distinct' } });
}
export function prepareMerge(actor: Actor,keep: FinancialEventV2Dto,hide: FinancialEventV2Dto): FinancialEventV2Dto[] {
  if (keep.entityKind !== 'expense' || hide.entityKind !== 'expense' || keep.entityId === hide.entityId || keep.payload.status === 'merged') throw new AccessError('Selecciona dos gastos distintos y una versión que se pueda conservar.');
  const ids = [crypto.randomUUID(),crypto.randomUUID()], mergeId = crypto.randomUUID();
  return [keep,hide].map((parent,index) => {
    const peer = index === 0 ? hide : keep, role = index === 0 ? 'keep' : 'hide';
    const event = financialEventV2Schema.parse({ ...parent,schemaVersion: 2,operationId: ids[index],action: index === 0 ? 'mergeKeep' : 'mergeHide',actorUid: actor.uid,actorPersonId: actor.personId,parentIds: [parent.operationId],before: [parent.payload],logicalClock: parent.logicalClock + 1,authoredAt: new Date().toISOString(),receivedAt: { seconds: 0,nanoseconds: 0 },merge: { mergeId,peerEntityId: peer.entityId,peerOperationId: ids[1-index],role },payload: index === 0 ? parent.payload : { ...parent.payload,status: 'merged',mergedInto: keep.entityId } });
    validateEventParents(event,[parent]); return event;
  });
}
