import { describe,it,expect } from 'vitest';
import { financialEventV2Schema,projectFinancialEvents,calculateStatistics,findDuplicateExpenses } from './index';
import { expense,trip,uuid,now } from './testing/fixtures';
import { prepareMerge,prepareResolution,prepareDistinct } from '../repositories/financial/revisions';
const actor = { uid: 'uid-A',personId: 'A' };
const root = (id: number,total = 100) => financialEventV2Schema.parse({ schemaVersion: 2,operationId: uuid(id),entityId: uuid(id),actorUid: actor.uid,actorPersonId: actor.personId,entityKind: 'expense',action: 'create',parentIds: [],logicalClock: 0,before: [],payload: expense(total),authoredAt: now,receivedAt: { seconds: 0,nanoseconds: 0 },merge: null });
const edit = (id: number,parent: ReturnType<typeof root>,total = 200,status: 'active' | 'deleted' = 'active') => financialEventV2Schema.parse({ ...parent,operationId: uuid(id),action: status === 'deleted' ? 'delete' : 'replace',parentIds: [parent.operationId],logicalClock: parent.logicalClock + 1,before: [parent.payload],payload: status === 'deleted' ? { ...parent.payload,status } : expense(total),merge: null });
const project = (events: unknown[]) => projectFinancialEvents(trip(),events,true);
const total = (events: unknown[]) => calculateStatistics(project(events)).total;

describe('offline conflict and duplicate accounting',() => {
  it('two resolutions of the same parents remain incompatible until explicitly joined',() => {
    const a = root(1),b = edit(2,a,120),c = edit(3,a,130);
    const r1 = prepareResolution(trip(),actor,[b,c],expense(120)),r2 = prepareResolution(trip(),actor,[b,c],expense(130));
    const history = [a,b,c,r1,r2]; expect(project(history).provisional).toBe(true); expect(total(history)).toBe(0n);
    const r3 = prepareResolution(trip(),actor,[r1,r2],expense(125)); expect(total([...history,r3])).toBe(125n);
    expect(project([...history,r3]).provisional).toBe(false);
    expect(project([...history,r3,edit(4,a,110)]).provisional).toBe(true);
  });
  it('similar purchases stay separate until a durable user decision, scoped to both exact revisions',() => {
    const a = root(1),b = root(2); expect(findDuplicateExpenses([a,b],[a,b])).toHaveLength(1); expect(total([a,b])).toBe(200n);
    const distinct = prepareDistinct(actor,[a,b]); expect(findDuplicateExpenses([b,a],[a,b,distinct])).toHaveLength(0);
    const c = edit(3,a,100); expect(findDuplicateExpenses([c,b],[a,b,c,distinct])).toHaveLength(1);
    const otherPayer = financialEventV2Schema.parse({ ...b,payload: expense(100,['A','B'],{ payerIds: ['B'],payerAmounts: [100] }) }); expect(findDuplicateExpenses([a,otherPayer],[])).toHaveLength(0);
    const distant = financialEventV2Schema.parse({ ...b,payload: { ...b.payload,occurredAt: '2026-11-21T18:00:00Z' } }); expect(findDuplicateExpenses([a,distant],[])).toHaveLength(0);
  });
  it('paired merges count the kept cost once; either missing half is provisional and cannot count',() => {
    const a = root(1),b = root(2),pair = prepareMerge(actor,a,b);
    expect(total([a,b,...pair])).toBe(100n); expect(project([a,b,...pair]).provisional).toBe(false);
    for (const half of pair) { expect(project([a,b,half]).provisional).toBe(true); expect(total([a,b,half])).toBe(0n); }
    expect(project([pair[1],b,pair[0],a,pair[0]])).toEqual(project([a,b,...pair]));
  });
  it('partial edits, deletes and restores require a fresh atomic reaffirmation and preserve history',() => {
    const a = root(1),b = root(2),pair = prepareMerge(actor,a,b),history = [a,b,...pair];
    const correction = edit(3,pair[0]!,150); expect(project([...history,correction]).provisional).toBe(true);
    const repaired = [...history,correction,...prepareMerge(actor,correction,pair[1]!)]; expect(total(repaired)).toBe(150n); expect(project(repaired).provisional).toBe(false);
    const keeper = repaired.at(-2)!; const removed = edit(4,keeper,150,'deleted'); const deleted = [...repaired,removed,...prepareMerge(actor,removed,repaired.at(-1)!)]; expect(total(deleted)).toBe(0n); expect(project(deleted).provisional).toBe(false);
    const restored = edit(5,deleted.at(-2)!,150); const final = [...deleted,restored,...prepareMerge(actor,restored,deleted.at(-1)!)]; expect(total(final)).toBe(150n); expect(project(final).provisional).toBe(false);
    expect(project(final.slice().reverse())).toEqual(project(final));
  });
  it('concurrent merges and late ancient revisions never silently discard a branch',() => {
    const a = root(1),b = root(2),c = root(3),ab = prepareMerge(actor,a,b),ac = prepareMerge(actor,a,c),history = [a,b,c,...ab,...ac];
    expect(project(history).provisional).toBe(true); expect(total(history)).toBe(0n);
    expect(project([a,b,...ab,edit(4,a,120)]).provisional).toBe(true);
    const r = prepareResolution(trip(),actor,[ab[0]!,ac[0]!],expense());
    const repairedAB = prepareMerge(actor,r,ab[1]!); const repairedAC = prepareMerge(actor,repairedAB[0]!,ac[1]!);
    expect(total([...history,r,...repairedAB,...repairedAC])).toBe(100n); expect(project([...history,r,...repairedAB,...repairedAC]).provisional).toBe(false);
  });
  it('cycles, nonreciprocal metadata and altered merge money are rejected by the projection',() => {
    const a = root(1),b = root(2),pair = prepareMerge(actor,a,b);
    const bad = { ...pair[0],payload: expense(999) }; expect(project([a,b,bad,pair[1]]).provisional).toBe(true); expect(total([a,b,bad,pair[1]])).toBe(0n);
    const reversed = prepareMerge(actor,b,a); expect(project([a,b,...pair,...reversed]).provisional).toBe(true);
    const forged = { ...pair[0],merge: { ...pair[0]!.merge,mergeId: uuid(99) } }; expect(total([a,b,forged,pair[1]])).toBe(0n);
    // Impossible to commit through the rules, but a corrupt/partial import must
    // also fail safely: reciprocal historical pairs with two unique hidden heads.
    const make = (id: number,parent: ReturnType<typeof root>,peer: ReturnType<typeof root>,peerId: number,mergeId: number,hide: boolean) => financialEventV2Schema.parse({ ...parent,operationId: uuid(id),parentIds: [parent.operationId],before: [parent.payload],logicalClock: parent.logicalClock + 1,action: hide ? 'mergeHide' : 'mergeKeep',merge: { mergeId: uuid(mergeId),peerEntityId: peer.entityId,peerOperationId: uuid(peerId),role: hide ? 'hide' : 'keep' },payload: hide ? { ...parent.payload,status: 'merged',mergedInto: peer.entityId } : parent.payload });
    const ak = make(10,a,b,13,90,false),bk = make(11,b,a,12,91,false),ah = make(12,ak,b,11,91,true),bh = make(13,bk,a,10,90,true);
    const cycle = project([a,b,ak,bk,ah,bh]); expect(cycle.provisional).toBe(true); expect(cycle.issues.every(issue => issue.reason === 'invalid')).toBe(true); expect(calculateStatistics(cycle).total).toBe(0n);
  });
  it('all arrival permutations preserve the same merged state including parents arriving late',() => {
    const a = root(1),b = root(2),history = [a,b,...prepareMerge(actor,a,b)];
    const permutations = <T,>(rows: T[]): T[][] => rows.length ? rows.flatMap((row,i) => permutations([...rows.slice(0,i),...rows.slice(i+1)]).map(rest => [row,...rest])) : [[]];
    const expected = project(history); for (const order of permutations(history)) expect(project(order)).toEqual(expected);
  });
});
