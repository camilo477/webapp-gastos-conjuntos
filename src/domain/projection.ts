import { z } from 'zod';
import { operationIdSchema } from './allocation';
import { DomainError, ordinal } from './errors';
import { financialEventSchema, validateEventParents } from './events';
import type { FinancialEventDto } from './events';
import { prepareFinancialState } from './state';
import type { EntityInput, FinancialState } from './state';
import { tripContextSchema, validateBudgetContext, validateExpenseContext, validateSettlementContext } from './schemas';

const headerSchema = z.object({ entityId: operationIdSchema, entityKind: z.enum(['expense', 'settlement', 'budget', 'duplicateDecision']) });
type Kind = FinancialEventDto['entityKind'];
type Blocked = 'invalid' | 'incomplete';

// Local accounting only. Delivery, remote authorization and paired merges are
// deliberately absent; unsupported financial histories remain provisional.
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
    try {
      if (event.entityKind === 'expense') for (const snapshot of [event.payload, ...event.before]) validateExpenseContext(snapshot, trip);
      else if (event.entityKind === 'settlement') for (const snapshot of [event.payload, ...event.before]) validateSettlementContext(snapshot, trip);
      else if (event.entityKind === 'budget') for (const snapshot of [event.payload, ...event.before]) validateBudgetContext(snapshot, trip);
    } catch { block(event.entityKind, event.entityId, 'invalid'); }
    if (event.merge || event.entityKind === 'expense' && event.payload.status === 'merged') {
      block(event.entityKind, event.entityId, 'incomplete');
      if (event.merge) block('expense', event.merge.peerEntityId, 'incomplete');
    }
    const parents = event.parentIds.map(id => events.get(id));
    if (parents.some(parent => !parent)) { block(event.entityKind, event.entityId, 'incomplete'); continue; }
    try { validateEventParents(event, parents); }
    catch (error) { block(event.entityKind, event.entityId, error instanceof DomainError && error.code === 'MISSING_PARENT' ? 'incomplete' : 'invalid'); }
  }
  const groups = new Map<string, FinancialEventDto[]>();
  for (const event of events.values()) {
    if (event.entityKind === 'duplicateDecision') continue;
    const id = key(event.entityKind, event.entityId), group = groups.get(id) ?? [];
    group.push(event); groups.set(id, group);
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
    if (blocked.has(id)) continue;
    const referenced = new Set(group.flatMap(event => event.parentIds));
    const heads = group.filter(event => !referenced.has(event.operationId));
    const first = group[0]!;
    if (heads.length !== 1) append(first.entityKind, { entityId: first.entityId, state: heads.length > 1 ? 'conflict' : 'invalid' });
    else {
      const head = heads[0]!;
      append(head.entityKind, { entityId: head.entityId, revision: head.operationId, state: 'ready', snapshot: head.payload });
    }
  }
  return prepareFinancialState(trip, input);
}
