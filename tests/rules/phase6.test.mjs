import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { before,after,it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeTestEnvironment,assertFails,assertSucceeds } from '@firebase/rules-unit-testing';
import { doc,setDoc,getDoc,writeBatch,Timestamp,serverTimestamp } from 'firebase/firestore';
let env;
const tripId = randomUUID(),ids = Array.from({ length: 10 },(_,i) => `sync-person-${i}`);
const db = (uid = ids[0]) => env.authenticatedContext(uid).firestore();
const ref = (client,id,trip = tripId) => doc(client,`trips/${trip}/events/${id}`);
const payload = () => ({ title: 'Café sintético',total: 100,note: 'x'.repeat(2000),category: 'food',occurredAt: '2026-11-23T15:00:00.000Z',day: '2026-11-23',payerIds: ids,payerAmounts: ids.map(() => 10),participantIds: ids,shareAmounts: ids.map(() => 10),splitMode: 'percentage',weights: ids.map(() => 1000),status: 'active',mergedInto: null,attachmentId: null,visual: null });
function root() { const id = randomUUID(); return { schemaVersion: 2,operationId: id,entityId: id,entityKind: 'expense',action: 'create',actorUid: ids[0],actorPersonId: ids[0],parentIds: [],before: [],logicalClock: 0,authoredAt: '2026-11-21T15:00:00.000Z',receivedAt: serverTimestamp(),merge: null,payload: payload() }; }
function pair(a,b) { const operations = [randomUUID(),randomUUID()],mergeId = randomUUID(); return [a,b].map((p,i) => ({ ...p,operationId: operations[i],parentIds: [p.operationId],before: [p.payload],logicalClock: p.logicalClock + 1,action: i ? 'mergeHide' : 'mergeKeep',receivedAt: serverTimestamp(),merge: { mergeId,peerEntityId: [b,a][i].entityId,peerOperationId: operations[1-i],role: i ? 'hide' : 'keep' },payload: i ? { ...p.payload,status: 'merged',mergedInto: a.entityId } : p.payload })); }
async function roots() { const a = root(),b = root(); await setDoc(ref(db(),a.operationId),a); await setDoc(ref(db(),b.operationId),b); return [a,b]; }
async function commit(events,client = db(),trip = tripId) { const batch = writeBatch(client); for (const e of events) batch.set(ref(client,e.operationId,trip),e); return batch.commit(); }
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw Error('Emulator required');
  env = await initializeTestEnvironment({ projectId: 'demo-gastos-compartidos',firestore: { host: '127.0.0.1',port: 8180,rules: await readFile('firestore.rules','utf8') } });
  await env.withSecurityRulesDisabled(async admin => { await setDoc(doc(admin.firestore(),`trips/${tripId}`),{ ownerId: ids[0],status: 'active',memberBindings: Object.fromEntries(ids.map(id => [id,id])),activeUids: ids,participantIds: [...ids,'revoked'],budgetEntityId: randomUUID(),startDate: '2026-11-21',endDate: '2026-11-24' }); });
});
after(async () => { await mkdir('.cache/phase6',{ recursive: true }); const response = await fetch('http://127.0.0.1:8180/emulator/v1/projects/demo-gastos-compartidos:ruleCoverage'); await writeFile('.cache/phase6/rule-coverage.json',await response.text()); await env.cleanup(); });
it('ten-person merges with maximal notes fit real evaluation limits and share receipt time',async () => {
  const [a,b] = await roots(),merged = pair(a,b); await assertSucceeds(commit(merged));
  const confirmed = await Promise.all(merged.map(e => getDoc(ref(db(),e.operationId)))); assert.ok(confirmed[0].data().receivedAt.isEqual(confirmed[1].data().receivedAt));
});
it('either merge half alone is rejected and no partial document reaches the server',async () => {
  const [a,b] = await roots(); for (const e of pair(a,b)) { await assertFails(commit([e])); assert.equal((await getDoc(ref(db(),e.operationId))).exists(),false); }
});
for (const kind of ['author','identity','money','extra','reciprocal','role','mergeId','before','parent','receipt','peerKind']) it(`atomic merge rejects forged ${kind}`,async () => {
  const [a,b] = await roots(),events = pair(a,b);
  const bad = events[1];
  if (kind === 'author') bad.actorUid = ids[1];
  if (kind === 'identity') bad.actorPersonId = ids[1];
  if (kind === 'money') bad.payload = { ...bad.payload,total: 999 };
  if (kind === 'extra') bad.extra = true;
  if (kind === 'reciprocal') bad.merge.peerOperationId = randomUUID();
  if (kind === 'role') bad.merge.role = 'keep';
  if (kind === 'mergeId') bad.merge.mergeId = randomUUID();
  if (kind === 'before') bad.before = [payload()]; if (kind === 'before') bad.before[0].title = 'Falso';
  if (kind === 'parent') bad.parentIds = [a.operationId];
  if (kind === 'receipt') bad.receivedAt = Timestamp.fromMillis(0);
  if (kind === 'peerKind') bad.entityKind = 'budget';
  await assertFails(commit(events)); for (const e of events) assert.equal((await getDoc(ref(db(),e.operationId))).exists(),false);
});
it('revoked and foreign identities cannot publish paired merges',async () => {
  const [a,b] = await roots(); for (const actor of ['outsider','revoked']) { const events = pair(a,b).map(e => ({ ...e,actorUid: actor,actorPersonId: actor })); await assertFails(commit(events,db(actor))); }
});
it('an old counterpart cannot be reused in a new half merge',async () => {
  const [a,b] = await roots(),events = pair(a,b); await commit(events);
  const fake = { ...events[0],operationId: randomUUID(),receivedAt: serverTimestamp() }; await assertFails(commit([fake]));
});
it('a deleted keeper can be reaffirmed atomically without resurrecting a cost',async () => {
  const [a,b] = await roots(),deleted = { ...a,operationId: randomUUID(),action: 'delete',parentIds: [a.operationId],before: [a.payload],logicalClock: 1,payload: { ...a.payload,status: 'deleted' },receivedAt: serverTimestamp() };
  await assertSucceeds(commit([deleted])); await assertSucceeds(commit(pair(deleted,b)));
});
it('distinct decisions reference two exact same-trip expense revisions and cannot contain arbitrary fields',async () => {
  const rows = (await roots()).sort((a,b) => a.entityId.localeCompare(b.entityId)); const make = () => ({ ...root(),entityKind: 'duplicateDecision',payload: { expenseIds: rows.map(e => e.entityId),revisions: rows.map(e => e.operationId),decision: 'distinct' } });
  await assertSucceeds(commit([make()]));
  for (const mutate of [e => { e.payload.revisions[0] = randomUUID(); },e => { e.payload.expenseIds.reverse(); },e => { e.payload.extra = true; },e => { e.actorUid = ids[1]; },e => { e.entityId = randomUUID(); }]) { const e = make(); mutate(e); await assertFails(commit([e])); }
});
it('pending writes are rejected after closure and denied documents remain absent',async () => {
  const closed = randomUUID(); const e = root(); await env.withSecurityRulesDisabled(async admin => { await setDoc(doc(admin.firestore(),`trips/${closed}`),{ ownerId: ids[0],status: 'closed',memberBindings: { [ids[0]]: ids[0] },participantIds: [ids[0]],activeUids: [ids[0]],startDate: '2026-11-21',endDate: '2026-11-24' }); });
  await assertFails(commit([e],db(),closed)); assert.equal((await getDoc(ref(db(),e.operationId,closed))).exists(),false);
});
