import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc, Timestamp, serverTimestamp } from 'firebase/firestore';

let env;
const ids = Array.from({ length: 10 }, (_, i) => `person-${i}`);
const tripId = randomUUID(), budgetId = randomUUID();
const db = (uid = ids[0]) => env.authenticatedContext(uid).firestore();
const ref = (client, id, trip = tripId) => doc(client, `trips/${trip}/events/${id}`);
const expense = (patch = {}) => ({ title: 'Café', note: null, total: 100, category: 'food', occurredAt: '2026-11-23T15:00:00.000Z', day: '2026-11-23', payerIds: ids, payerAmounts: ids.map(() => 10), participantIds: ids, shareAmounts: ids.map(() => 10), splitMode: 'percentage', weights: ids.map(() => 1000), visual: null, attachmentId: null, status: 'active', mergedInto: null, ...patch });
function event(kind = 'expense', payload = expense(), parents = [], patch = {}) {
  const id = randomUUID();
  return { schemaVersion: 2, operationId: id, entityId: parents[0]?.entityId ?? id, entityKind: kind, action: parents.length === 2 ? 'resolve' : parents.length ? 'replace' : 'create', actorUid: ids[0], actorPersonId: ids[0], parentIds: parents.map(p => p.operationId), logicalClock: parents.length ? 1 + Math.max(...parents.map(p => p.logicalClock)) : 0, before: parents.map(p => p.payload), payload, authoredAt: '2026-11-23T15:00:00.000Z', receivedAt: serverTimestamp(), merge: null, ...patch };
}
const save = (e, client = db(), trip = tripId) => setDoc(ref(client, e.operationId, trip), e);
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Emulators required.');
  env = await initializeTestEnvironment({ projectId: 'demo-gastos-compartidos', firestore: { host: '127.0.0.1', port: 8180, rules: await readFile('firestore.rules', 'utf8') } });
  await env.withSecurityRulesDisabled(async admin => {
    const client = admin.firestore();
    await setDoc(doc(client, `trips/${tripId}`), { ownerId: ids[0], status: 'active', memberBindings: Object.fromEntries(ids.map(id => [id,id])), participantIds: [...ids,'revoked'], activeUids: ids, budgetEntityId: budgetId, startDate: '2026-11-21', endDate: '2026-11-24' });
    await save(event('budget', { total: 400000, lockedDays: [], status: 'active' }, [], { operationId: budgetId, entityId: budgetId, receivedAt: Timestamp.now() }), client);
  });
});
after(async () => {
  await mkdir('.cache/phase5', { recursive: true });
  const response = await fetch('http://127.0.0.1:8180/emulator/v1/projects/demo-gastos-compartidos:ruleCoverage');
  await writeFile('.cache/phase5/rule-coverage.json', await response.text());
  await env?.cleanup();
});
it('ten participants, ten payers, percentages and two-parent revision fit evaluation limits', async () => {
  const root = event(); await assertSucceeds(save(root));
  const a = event('expense', expense({ title: 'A' }), [root]); const b = event('expense', expense({ title: 'B' }), [root]);
  await assertSucceeds(save(a)); await assertSucceeds(save(b));
  const resolution = event('expense', expense({ total: 200, payerAmounts: ids.map(() => 20), shareAmounts: ids.map(() => 20), note: 'x'.repeat(2000) }), [a,b]); await assertSucceeds(save(resolution));
  assert.equal((await getDoc(ref(db(), resolution.operationId))).data().logicalClock, 2);
});
for (const mode of ['equal','fixed']) it(`accepts ${mode}, exclusions and multiple payers`, async () => {
  await assertSucceeds(save(event('expense', expense({ splitMode: mode, weights: mode === 'fixed' ? [] : ids.map(() => 1) }))));
  await assertSucceeds(save(event('expense', expense({ payerIds: [ids[0]], payerAmounts: [100], participantIds: [ids[1]], shareAmounts: [100], weights: [10000] }))));
});
it('all active members can revise, logically delete and restore without altering old events', async () => {
  const root = event(); await save(root);
  const edit = event('expense', expense({ title: 'Editado' }), [root], { actorUid: ids[1], actorPersonId: ids[1] }); await assertSucceeds(save(edit, db(ids[1])));
  const deleted = event('expense', { ...edit.payload, status: 'deleted' }, [edit], { action: 'delete' }); await assertSucceeds(save(deleted));
  await assertSucceeds(save(event('expense', { ...deleted.payload, status: 'active' }, [deleted])));
  await assertFails(updateDoc(ref(db(), root.operationId), { payload: expense({ title: 'Sobrescrito' }) }));
  await assertFails(deleteDoc(ref(db(), root.operationId)));
});
for (const [label,patch] of Object.entries({ author: { actorUid: 'forged' }, identity: { actorPersonId: ids[1] }, v1: { schemaVersion: 1 }, extra: { extra: true }, timestamp: { receivedAt: Timestamp.fromMillis(0) }, merge: { action: 'mergeHide' }, clock: { logicalClock: 2 }, root: { entityId: randomUUID() }, parents: { parentIds: [randomUUID()], before: [expense()], action: 'replace', logicalClock: 1, entityId: randomUUID() } })) it(`rejects forged envelope: ${label}`, async () => assertFails(save(event('expense',expense(),[],patch))));
for (const [label,patch] of Object.entries({ total: { total: 99 }, negative: { total: -1 }, fraction: { total: 100.5 }, huge: { total: 1000000000001 }, payer: { payerAmounts: [100] }, share: { shareAmounts: ids.map(() => 9) }, unknown: { payerIds: ['unknown'], payerAmounts: [100] }, revoked: { payerIds: ['revoked'], payerAmounts: [100] }, repeated: { payerIds: [ids[0],ids[0]], payerAmounts: [50,50] }, extra: { arbitrary: 1 }, note: { note: 'x'.repeat(2001) }, weights: { weights: ids.map(() => 999) }, offsettingFractions: { payerAmounts: [9.5,10.5,...ids.slice(2).map(() => 10)] }, overflow: { payerAmounts: ids.map(() => Number.MAX_SAFE_INTEGER) }, floatWeights: { weights: [999.5,1000.5,...ids.slice(2).map(() => 1000)] }, stringAmounts: { payerAmounts: ids.map(() => '10') }, mixedAmounts: { shareAmounts: [10,'10',...ids.slice(2).map(() => 10)] }, booleanAmounts: { shareAmounts: [true,19,...ids.slice(2).map(() => 10)] }, negativeOffset: { shareAmounts: [-10,30,...ids.slice(2).map(() => 10)] }, weightType: { weights: ['1000',...ids.slice(1).map(() => 1000)] }, wrongStatus: { status: 'deleted' }, attachment: { attachmentId: '../invalid' } })) it(`rejects hostile expense: ${label}`, async () => assertFails(save(event('expense',expense(patch)))));
it('rejects missing, foreign, duplicate and altered parents, clock and destructive deletion', async () => {
  const root = event(); await save(root); const another = event(); await save(another);
  for (const patch of [{ before: [expense({ title: 'Fake before' })] }, { logicalClock: 9 }, { parentIds: [another.operationId] }, { parentIds: [root.operationId,root.operationId], before: [root.payload,root.payload], action: 'resolve' }, { parentIds: [randomUUID()] }]) await assertFails(save(event('expense',expense(),[root],patch)));
  await assertFails(save(event('expense',expense({ total: 200, payerAmounts: ids.map(() => 20), shareAmounts: ids.map(() => 20), status: 'deleted' }),[root],{ action: 'delete' })));
});
it('outsiders and revoked actors cannot read or create in this trip', async () => {
  for (const actor of ['outsider','revoked']) {
    await assertFails(getDocs(collection(db(actor), `trips/${tripId}/events`)));
    await assertFails(save(event('expense',expense(),[],{ actorUid: actor, actorPersonId: actor }), db(actor)));
  }
  await assertFails(save(event(),db(),randomUUID()));
});
it('allows historical revoked people only when carried by a parent', async () => {
  const root = event('expense',expense({ payerIds: ['revoked'], payerAmounts: [100] }));
  await env.withSecurityRulesDisabled(async admin => save({ ...root, receivedAt: Timestamp.now() },admin.firestore()));
  await assertSucceeds(save(event('expense',expense({ payerIds: ['revoked'], payerAmounts: [100] }),[root])));
});
it('settlements support immutable corrections, deletions and reject invalid participants/amounts', async () => {
  const payload = { fromPersonId: ids[1], toPersonId: ids[0], amount: 30, occurredAt: '2026-11-23T15:00:00.000Z', day: '2026-11-23', note: null, status: 'active' };
  const root = event('settlement',payload); await assertSucceeds(save(root));
  const edit = event('settlement',{ ...payload,amount: 20 },[root]); await assertSucceeds(save(edit));
  await assertSucceeds(save(event('settlement',{ ...edit.payload,status: 'deleted' },[edit],{ action: 'delete' })));
  for (const patch of [{ fromPersonId: ids[0] },{ toPersonId: 'revoked' },{ amount: 0 },{ amount: 0.5 },{ extra: true }]) await assertFails(save(event('settlement',{ ...payload,...patch })));
});
it('budget owner only; validates a changed reservation and immutable financial revision', async () => {
  const parent = (await getDoc(ref(db(),budgetId))).data();
  const payload = { total: 500000, lockedDays: [{ day: '2026-11-24', amount: 80000 }], status: 'active' };
  const revised = event('budget',payload,[parent]); await assertSucceeds(save(revised));
  await assertFails(save(event('budget',payload,[parent],{ actorUid: ids[1], actorPersonId: ids[1] }),db(ids[1])));
  for (const bad of [{ ...payload, total: -1 },{ ...payload,lockedDays: [{ day: '2026-11-25',amount: 1 }] },{ ...payload,lockedDays: [{ day: '2026-11-24',amount: 1,extra: true }] },{ ...payload, total: null },{ ...payload, extra: true }]) await assertFails(save(event('budget',bad,[parent])));
  await assertFails(save(event('budget',payload)));
});
it('budget with 366 existing reservations and two parents stays within evaluation limits', async () => {
  const largeTrip = randomUUID(), rootId = randomUUID();
  const days = Array.from({ length: 366 },(_,i) => ({ day: new Date(Date.UTC(2024,0,1+i)).toISOString().slice(0,10), amount: 1 }));
  const a = event('budget',{ total: 1000,lockedDays: days,status: 'active' },[],{ operationId: rootId, entityId: rootId, receivedAt: Timestamp.now() });
  const b = event('budget',a.payload,[a],{ receivedAt: Timestamp.now() });
  await env.withSecurityRulesDisabled(async admin => {
    await setDoc(doc(admin.firestore(),`trips/${largeTrip}`),{ ownerId: ids[0], memberBindings: { [ids[0]]: ids[0] }, status: 'active', budgetEntityId: rootId, startDate: '2024-01-01',endDate: '2024-12-31' });
    await save(a,admin.firestore(),largeTrip); await save(b,admin.firestore(),largeTrip);
  });
  await assertSucceeds(save(event('budget',{ ...a.payload,total: 2000 },[a,b]),db(),largeTrip));
});

for (const field of ['schemaVersion','operationId','entityKind','entityId','action','actorUid','actorPersonId','parentIds','logicalClock','before','payload','authoredAt','receivedAt','merge']) it(`rejects missing required envelope field: ${field}`, async () => {
  const e = event(), id = e.operationId; delete e[field]; await assertFails(setDoc(ref(db(),id),e));
});
for (const field of Object.keys(expense())) it(`rejects missing required expense field: ${field}`, async () => {
  const p = expense(); delete p[field]; await assertFails(save(event('expense',p)));
});
it('rejects self-parent cycles, negative clocks, unknown actions and cross-trip parents', async () => {
  const root = event(); await save(root);
  const revision = event('expense',expense(),[root]);
  for (const patch of [{ parentIds: [revision.operationId] },{ logicalClock: -1 },{ action: 'dismissDuplicate' }]) await assertFails(save({ ...revision,...patch }));
  const otherTrip = randomUUID();
  await env.withSecurityRulesDisabled(async admin => { await setDoc(doc(admin.firestore(),`trips/${otherTrip}`),{ ownerId: ids[0],status: 'active',memberBindings: { [ids[0]]: ids[0] },startDate: '2026-11-21',endDate: '2026-11-24' }); });
  await assertFails(save(revision,db(),otherTrip));
});
