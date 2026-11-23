import { readFile } from 'node:fs/promises';
import { before, after, it } from 'node:test';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, writeBatch, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

let env;
const owner = 'audit-owner', guest = 'audit-original', replacement = 'audit-new';
const client = uid => env.authenticatedContext(uid).firestore();
const ref = (db,id,suffix = '') => doc(db,`trips/${id}${suffix}`);
const payload = () => ({ title: 'Referencia conservada',total: 20000,note: null,category: 'food',occurredAt: '2026-11-23T15:00:00.000Z',day: '2026-11-23',payerIds: [guest],payerAmounts: [20000],participantIds: [owner,guest],shareAmounts: [10000,10000],splitMode: 'equal',weights: [1,1],visual: null,attachmentId: null,status: 'active',mergedInto: null });
function event(kind = 'expense',data = payload(),parent) {
  const id = randomUUID(); return { schemaVersion: 2,operationId: id,entityId: parent?.entityId ?? id,entityKind: kind,action: parent ? 'replace' : 'create',actorUid: guest,actorPersonId: guest,parentIds: parent ? [parent.operationId] : [],logicalClock: parent ? parent.logicalClock+1 : 0,before: parent ? [parent.payload] : [],payload: data,authoredAt: '2026-11-23T15:00:00.000Z',receivedAt: serverTimestamp(),merge: null };
}
async function fixture() {
  const id = randomUUID(),budgetId = randomUUID(),stamp = Timestamp.now();
  const trip = { schemaVersion: 1,ownerId: owner,title: 'Auditoría sintética',destination: null,startDate: '2026-11-21',endDate: '2026-11-24',timezone: 'America/Bogota',currency: 'COP',currencyExponent: 0,status: 'active',memberBindings: { [owner]: owner,[guest]: guest },activeUids: [owner,guest],participantIds: [owner,guest],budgetEntityId: budgetId,cover: null,metadataVersion: 0,membershipVersion: 1,createdAt: stamp,updatedAt: stamp,closedAt: null };
  const budget = { ...event('budget',{ total: 400000,lockedDays: [],status: 'active' }),operationId: budgetId,entityId: budgetId,actorUid: owner,actorPersonId: owner,receivedAt: stamp };
  await env.withSecurityRulesDisabled(async admin => {
    const db = admin.firestore(); await setDoc(ref(db,id),trip);
    for (const uid of [owner,guest]) {
      await setDoc(ref(db,id,`/members/${uid}`),{ schemaVersion: 1,personId: uid,displayName: 'Mismo nombre',role: uid === owner ? 'owner' : 'member',status: 'active',inviteId: null,joinedAt: stamp,revokedAt: null });
      await setDoc(ref(db,id,`/people/${uid}`),{ schemaVersion: 1,displayName: 'Mismo nombre',createdBy: uid,createdAt: stamp });
    }
    await setDoc(ref(db,id,`/events/${budgetId}`),budget);
  });
  const purchase = event(); await assertSucceeds(setDoc(ref(client(guest),id,`/events/${purchase.operationId}`),purchase));
  return { id,trip,budget,purchase };
}
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw Error('Emulator required');
  env = await initializeTestEnvironment({ projectId: 'demo-gastos-compartidos',firestore: { host: '127.0.0.1',port: 8180,rules: await readFile('firestore.rules','utf8') } });
});
after(async () => { await env?.cleanup(); });

it('a closed trip preserves ordinary reads but rejects new expenses, revisions, settlements, owner budgets and reopen attempts',async () => {
  const f = await fixture(),db = client(guest),saved = (await getDoc(ref(db,f.id,`/events/${f.purchase.operationId}`))).data();
  await env.withSecurityRulesDisabled(async admin => updateDoc(ref(admin.firestore(),f.id),{ status: 'closed',closedAt: Timestamp.now() }));
  const proposals = [event(),event('expense',payload(),f.purchase),event('settlement',{ fromPersonId: guest,toPersonId: owner,amount: 5000,occurredAt: '2026-11-23T15:00:00.000Z',day: '2026-11-23',note: null,status: 'active' })];
  for (const proposal of proposals) { await assertFails(setDoc(ref(db,f.id,`/events/${proposal.operationId}`),proposal)); assert.equal((await getDoc(ref(db,f.id,`/events/${proposal.operationId}`))).exists(),false); }
  const budget = { ...event('budget',{ total: 500000,lockedDays: [],status: 'active' },f.budget),actorUid: owner,actorPersonId: owner };
  await assertFails(setDoc(ref(client(owner),f.id,`/events/${budget.operationId}`),budget));
  await assertFails(updateDoc(ref(client(owner),f.id),{ status: 'active',closedAt: null,updatedAt: serverTimestamp() }));
  assert.deepEqual((await getDoc(ref(db,f.id,`/events/${f.purchase.operationId}`))).data(),saved);
});

for (const actor of [owner,replacement]) it(`no owner or matching-name newcomer can atomically steal an existing accounting identity: ${actor}`,async () => {
  const f = await fixture(),db = client(actor),batch = writeBatch(db);
  batch.update(ref(db,f.id),{ memberBindings: { [owner]: owner,[replacement]: guest },activeUids: [owner,replacement],membershipVersion: 2,updatedAt: serverTimestamp() });
  batch.update(ref(db,f.id,`/members/${guest}`),{ status: 'revoked',revokedAt: serverTimestamp() });
  batch.set(ref(db,f.id,`/members/${replacement}`),{ schemaVersion: 1,personId: guest,displayName: 'Mismo nombre',role: 'member',status: 'active',inviteId: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',joinedAt: serverTimestamp(),revokedAt: null });
  await assertFails(batch.commit());
  const current = await getDoc(ref(client(owner),f.id)); assert.deepEqual(current.data().memberBindings,f.trip.memberBindings);
  assert.equal((await getDoc(ref(client(owner),f.id,`/members/${guest}`))).data().status,'active');
  assert.equal((await getDoc(ref(client(owner),f.id,`/members/${replacement}`))).exists(),false);
  await assertFails(getDoc(ref(client(replacement),f.id,`/events/${f.purchase.operationId}`)));
});

it('closing remains denied even to the owner with a complete view and acknowledged expenses',async () => {
  const f = await fixture(); await assertSucceeds(getDoc(ref(client(owner),f.id,`/events/${f.purchase.operationId}`)));
  await assertFails(updateDoc(ref(client(owner),f.id),{ status: 'closed',closedAt: serverTimestamp(),updatedAt: serverTimestamp() }));
  assert.equal((await getDoc(ref(client(owner),f.id))).data().status,'active');
});
