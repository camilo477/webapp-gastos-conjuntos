import { z } from 'zod';
import { operationIdSchema } from './allocation';
import { DomainError, ordinal } from './errors';
import { financialEventSchema, checkParsedEventParents } from './events';
import type { FinancialEventDto } from './events';
import { prepareFinancialState } from './state';
import type { EntityInput, FinancialState } from './state';
import { tripContextSchema, validateBudgetContext, validateExpenseContext, validateSettlementContext } from './schemas';

const headerSchema = z.object({ entityId: operationIdSchema, entityKind: z.enum(['expense', 'settlement', 'budget', 'duplicateDecision']) });
type Kind = FinancialEventDto['entityKind'];
type Blocked = 'invalid' | 'incomplete';

// Deterministic local accounting. Delivery and remote authorization are separate;
// incomplete or incompatible merge components remain provisional.
export function projectFinancialEvents(context: unknown, rawEvents: readonly unknown[], complete: boolean): FinancialState {
  z.boolean().parse(complete);
  const trip = tripContextSchema.parse(context);
  const events = new Map<string, FinancialEventDto>();
  const blocked = new Map<string, { kind: Kind; entityId: string; state: Blocked }>();
  const key = (kind: Kind, entityId: string) => `${kind}/${entityId}`;
  const block = (kind: Kind, entityId: string, state: Blocked) => {
    const id = key(kind, entityId), previous = blocked.get(id);
    blocked.set(id, { kind, entityId, state: previous?.state === 'invalid' ? 'invalid' : state });
  };
  let malformed = false;
  for (const raw of rawEvents) {
    const parsed = financialEventSchema.safeParse(raw);
    if (!parsed.success) {
      const header = headerSchema.safeParse(raw);
      if (header.success && header.data.entityKind !== 'duplicateDecision') block(header.data.entityKind, header.data.entityId, 'invalid');
      else malformed = true;
      continue;
    }
    const event = parsed.data, previous = events.get(event.operationId);
    if (previous && JSON.stringify(previous) !== JSON.stringify(event)) {
      block(previous.entityKind, previous.entityId, 'invalid'); block(event.entityKind, event.entityId, 'invalid');
    } else events.set(event.operationId, event);
  }
  for (const event of events.values()) {
    if (event.entityKind === 'duplicateDecision') {
      for (let index = 0; index < 2; index++) {
        const reference = events.get(event.payload.revisions[index]!);
        if (!reference || reference.entityKind !== 'expense' || reference.entityId !== event.payload.expenseIds[index]) malformed = true;
      }
    }
    try {
      if (event.entityKind === 'expense') for (const snapshot of [event.payload, ...event.before]) validateExpenseContext(snapshot, trip);
      else if (event.entityKind === 'settlement') for (const snapshot of [event.payload, ...event.before]) validateSettlementContext(snapshot, trip);
      else if (event.entityKind === 'budget') for (const snapshot of [event.payload, ...event.before]) validateBudgetContext(snapshot, trip);
    } catch { block(event.entityKind, event.entityId, 'invalid'); }
    const parents = event.parentIds.map(id => events.get(id));
    if (parents.some(parent => !parent)) { block(event.entityKind, event.entityId, 'incomplete'); continue; }
    try { checkParsedEventParents(event, parents as FinancialEventDto[]); }
    catch (error) { block(event.entityKind, event.entityId, error instanceof DomainError && error.code === 'MISSING_PARENT' ? 'incomplete' : 'invalid'); }
  }
  const groups = new Map<string, FinancialEventDto[]>();
  for (const event of events.values()) {
    if (event.entityKind === 'duplicateDecision') continue;
    const id = key(event.entityKind, event.entityId), group = groups.get(id) ?? [];
    group.push(event); groups.set(id, group);
  }
  // Every historical merge edge belongs to the same conservative component.
  const links = new Map<string,Set<string>>();
  const connect = (a: string,b: string) => { if (!links.has(a)) links.set(a,new Set()); if (!links.has(b)) links.set(b,new Set()); links.get(a)!.add(b); links.get(b)!.add(a); };
  for (const event of events.values()) {
    if (event.merge) connect(event.entityId,event.merge.peerEntityId);
    if (event.entityKind === 'expense' && event.payload.mergedInto) connect(event.entityId,event.payload.mergedInto);
    if (!event.merge) continue;
    const peer = events.get(event.merge.peerOperationId), previous = events.get(event.parentIds[0]!);
    if (!peer?.merge || !previous) { block('expense',event.entityId,'incomplete'); continue; }
    const reciprocal = peer.entityId === event.merge.peerEntityId && peer.merge.peerEntityId === event.entityId && peer.merge.peerOperationId === event.operationId
      && peer.merge.mergeId === event.merge.mergeId && peer.merge.role !== event.merge.role && peer.actorUid === event.actorUid && peer.actorPersonId === event.actorPersonId
      && peer.receivedAt.seconds === event.receivedAt.seconds && peer.receivedAt.nanoseconds === event.receivedAt.nanoseconds;
    const conserved = event.action === 'mergeKeep' ? JSON.stringify(event.payload) === JSON.stringify(previous.payload)
      : JSON.stringify(event.payload) === JSON.stringify({ ...previous.payload,status: 'merged',mergedInto: event.merge.peerEntityId });
    if (!reciprocal || !conserved) block('expense',event.entityId,'invalid');
  }
  const headByEntity = new Map<string,FinancialEventDto[]>();
  for (const group of groups.values()) { const references = new Set(group.flatMap(event => event.parentIds)); headByEntity.set(key(group[0]!.entityKind,group[0]!.entityId),group.filter(event => !references.has(event.operationId))); }
  const hidden = new Set<string>(), visited = new Set<string>();
  for (const first of links.keys()) {
    if (visited.has(first)) continue;
    const component: string[] = [], queue = [first];
    while (queue.length) { const id = queue.pop()!; if (visited.has(id)) continue; visited.add(id); component.push(id); for (const peer of links.get(id) ?? []) queue.push(peer); }
    const reasons = new Set<'conflict' | 'incomplete' | 'invalid'>();
    const selected = new Map<string,FinancialEventDto>();
    for (const id of component) {
      const heads = headByEntity.get(key('expense',id)) ?? [];
      if (blocked.has(key('expense',id))) reasons.add(blocked.get(key('expense',id))!.state);
      else if (heads.length !== 1) reasons.add(heads.length > 1 ? 'conflict' : 'incomplete');
      else selected.set(id,heads[0]!);
    }
    if (!reasons.size) {
      const kept = [...selected.values()].filter(event => event.entityKind === 'expense' && event.payload.status !== 'merged');
      if (kept.length !== 1 || kept[0]!.action !== 'mergeKeep') reasons.add('incomplete');
      for (const [id,head] of selected) {
        if (head.entityKind !== 'expense' || !head.merge) { reasons.add('incomplete'); continue; }
        if (head.payload.status !== 'merged') continue;
        if (head.action !== 'mergeHide' || head.payload.status !== 'merged') { reasons.add('incomplete'); continue; }
        const seen = new Set<string>([id]); let target = head.merge.peerEntityId;
        while (true) {
          if (seen.has(target)) { reasons.add('invalid'); break; } seen.add(target);
          const next = selected.get(target); if (!next || next.entityKind !== 'expense') { reasons.add('incomplete'); break; }
          if (next.payload.status !== 'merged') break;
          if (!next.merge) { reasons.add('incomplete'); break; } target = next.merge.peerEntityId;
        }
        // Only uninterrupted merge revisions can supersede a reciprocal partner.
        let cursor = selected.get(head.merge.peerEntityId); const ancestors = new Set<string>();
        while (cursor && cursor.operationId !== head.merge.peerOperationId) {
          if (!cursor.merge || ancestors.has(cursor.operationId)) { reasons.add('incomplete'); break; }
          ancestors.add(cursor.operationId); cursor = events.get(cursor.parentIds[0]!);
        }
        if (!cursor) reasons.add('incomplete');
      }
    }
    if (reasons.size) for (const id of component) block('expense',id,reasons.has('invalid') ? 'invalid' : 'incomplete');
    else for (const [id,head] of selected) if (head.entityKind === 'expense' && head.payload.status === 'merged') hidden.add(id);
  }
  const input: { complete: boolean; expenses: unknown[]; settlements: unknown[]; budgets: unknown[] } = { complete: complete && !malformed, expenses: [], settlements: [], budgets: [] };
  const append = (kind: Kind, value: EntityInput) => {
    if (kind === 'expense') input.expenses.push(value);
    else if (kind === 'settlement') input.settlements.push(value);
    else if (kind === 'budget') input.budgets.push(value);
    else input.complete = false;
  };
  for (const blockedEntity of [...blocked.values()].sort((a, b) => ordinal(key(a.kind, a.entityId), key(b.kind, b.entityId)))) {
    append(blockedEntity.kind, { entityId: blockedEntity.entityId, state: blockedEntity.state });
  }
  for (const [id, group] of [...groups].sort(([a], [b]) => ordinal(a, b))) {
    if (blocked.has(id) || hidden.has(group[0]!.entityId)) continue;
    const heads = headByEntity.get(id)!;
    const first = group[0]!;
    if (heads.length !== 1) append(first.entityKind, { entityId: first.entityId, state: heads.length > 1 ? 'conflict' : 'invalid' });
    else {
      const head = heads[0]!;
      append(head.entityKind, { entityId: head.entityId, revision: head.operationId, state: 'ready', snapshot: head.payload });
    }
  }
  return prepareFinancialState(trip, input);
}
