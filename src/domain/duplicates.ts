import type { FinancialEventV2Dto } from './events';
export interface DuplicatePair { left: FinancialEventV2Dto;right: FinancialEventV2Dto }
export function findDuplicateExpenses(heads: readonly FinancialEventV2Dto[],history: readonly FinancialEventV2Dto[]): DuplicatePair[] {
  const normalize = (value: string) => value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
  const decisions = history.filter(event => event.entityKind === 'duplicateDecision').map(event => event.payload);
  const roots = heads.filter(event => event.entityKind === 'expense' && event.payload.status === 'active');
  const buckets = new Map<string,FinancialEventV2Dto[]>(), result: DuplicatePair[] = [];
  const merged = new Set(history.filter(event => event.merge).flatMap(event => [event.entityId,event.merge!.peerEntityId]));
  for (const event of roots.slice().sort((a,b) => a.entityId < b.entityId ? -1 : 1)) {
    if (event.entityKind !== 'expense' || merged.has(event.entityId)) continue;
    const p = event.payload, signature = JSON.stringify([normalize(p.title),p.total,p.day,p.payerIds,p.payerAmounts]);
    const previous = buckets.get(signature) ?? [];
    for (const peer of previous) {
      if (peer.entityId === event.entityId || peer.entityKind !== 'expense' || Math.abs(Date.parse(peer.payload.occurredAt) - Date.parse(p.occurredAt)) > 300000) continue;
      if (decisions.some(decision => decision.expenseIds[0] === peer.entityId && decision.expenseIds[1] === event.entityId && decision.revisions[0] === peer.operationId && decision.revisions[1] === event.operationId)) continue;
      result.push({ left: peer,right: event });
    }
    previous.push(event); buckets.set(signature,previous);
  }
  return result;
}
