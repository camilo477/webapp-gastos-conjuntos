import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, writeBatch, setDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, increment, arrayUnion, arrayRemove, FieldPath, deleteField, query, where } from 'firebase/firestore';

let env;
const ownerClaims = { email_verified: true, firebase: { sign_in_provider: 'password' } };
const context = (uid, claims = {}) => env.authenticatedContext(uid, claims).firestore();
const inviteToken = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function initial(uid, id = randomUUID(), patch = {}) {
  const budgetId = randomUUID();
  const trip = { schemaVersion: 1, ownerId: uid, title: 'Viaje sintético', destination: null, startDate: '2026-11-21', endDate: '2026-11-24', timezone: 'America/Bogota', currency: 'COP', currencyExponent: 0, status: 'active', memberBindings: { [uid]: uid }, activeUids: [uid], participantIds: [uid], budgetEntityId: budgetId, cover: null, metadataVersion: 0, membershipVersion: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), closedAt: null, ...patch };
  const member = { schemaVersion: 1, personId: uid, displayName: 'Organizador', role: 'owner', status: 'active', inviteId: null, joinedAt: serverTimestamp(), revokedAt: null };
  const person = { displayName: 'Organizador', createdAt: serverTimestamp(), createdBy: uid, schemaVersion: 1 };
  const event = { schemaVersion: 2, operationId: budgetId, entityId: budgetId, entityKind: 'budget', action: 'create', actorUid: uid, actorPersonId: uid, parentIds: [], logicalClock: 0, before: [], payload: { total: 400000, lockedDays: [], status: 'active' }, authoredAt: new Date().toISOString(), receivedAt: serverTimestamp(), merge: null };
  return { id, budgetId, trip, member, person, event };
}
function create(db, data, omit = '') {
  const batch = writeBatch(db), base = `trips/${data.id}`;
  if (omit !== 'trip') batch.set(doc(db, base), data.trip);
  if (omit !== 'member') batch.set(doc(db, `${base}/members/${data.trip.ownerId}`), data.member);
  if (omit !== 'person') batch.set(doc(db, `${base}/people/${data.trip.ownerId}`), data.person);
  if (omit !== 'event') batch.set(doc(db, `${base}/events/${data.budgetId}`), data.event);
  return batch.commit();
}
async function createOwned() {
  const uid = `owner-${randomUUID()}`, db = context(uid, ownerClaims), data = initial(uid);
  await assertSucceeds(create(db, data)); return { uid, db, ...data };
}
async function invite(owned, token = inviteToken, patch = {}) {
  await setDoc(doc(owned.db, `trips/${owned.id}/invites/${token}`), { schemaVersion: 1, createdBy: owned.uid, createdAt: serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 86400000), revoked: false, ...patch });
  return token;
}
function join(db, id, uid, token = inviteToken, options = {}) {
  const batch = writeBatch(db), base = `trips/${id}`;
  if (options.omit !== 'trip') batch.update(doc(db, base), new FieldPath('memberBindings', uid), uid, 'activeUids', arrayUnion(uid), 'participantIds', arrayUnion(uid), 'membershipVersion', increment(1), 'updatedAt', serverTimestamp());
  if (options.omit !== 'member') batch.set(doc(db, `${base}/members/${uid}`), { schemaVersion: 1, personId: uid, displayName: 'Invitado', role: 'member', status: 'active', inviteId: token, joinedAt: serverTimestamp(), revokedAt: null, ...options.member });
  if (options.omit !== 'person') batch.set(doc(db, `${base}/people/${uid}`), { displayName: 'Invitado', createdAt: serverTimestamp(), createdBy: uid, schemaVersion: 1, ...options.person });
  return batch.commit();
}
async function revoke(owned, uid) {
  const batch = writeBatch(owned.db);
  batch.update(doc(owned.db, `trips/${owned.id}`), new FieldPath('memberBindings', uid), deleteField(), 'activeUids', arrayRemove(uid), 'membershipVersion', increment(1), 'updatedAt', serverTimestamp());
  batch.update(doc(owned.db, `trips/${owned.id}/members/${uid}`), { status: 'revoked', revokedAt: serverTimestamp() });
  await batch.commit();
}
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Emulators required.');
  env = await initializeTestEnvironment({ projectId: 'demo-gastos-compartidos', firestore: { host: '127.0.0.1', port: 8180, rules: await readFile('firestore.rules', 'utf8') } });
});
after(async () => {
  const response = await fetch('http://127.0.0.1:8180/emulator/v1/projects/demo-gastos-compartidos:ruleCoverage');
  await mkdir('.cache/phase4', { recursive: true });
  await writeFile('.cache/phase4/rule-coverage.json', await response.text());
  await env?.cleanup();
});

describe('Phase 4 ordinary-client security', () => {
  it('creates trip, owner, historical person and v2 budget atomically', async () => {
    const owned = await createOwned();
    for (const path of [`trips/${owned.id}`, `trips/${owned.id}/members/${owned.uid}`, `trips/${owned.id}/people/${owned.uid}`, `trips/${owned.id}/events/${owned.budgetId}`]) assert.equal((await getDoc(doc(owned.db, path))).exists(), true);
  });
  for (const omit of ['trip', 'member', 'person', 'event']) it(`rejects partial creation without ${omit}`, async () => {
    const uid = `owner-${randomUUID()}`, db = context(uid, ownerClaims), data = initial(uid);
    await assertFails(create(db, data, omit));
  });
  for (const claims of [{ firebase: { sign_in_provider: 'anonymous' } }, { email_verified: false, firebase: { sign_in_provider: 'password' } }]) it(`rejects nonpermanent/unverified owner ${JSON.stringify(claims)}`, async () => {
    const uid = `guest-${randomUUID()}`; await assertFails(create(context(uid, claims), initial(uid)));
  });
  it('denies private reads before blind join; grants only member data afterwards', async () => {
    const owned = await createOwned(); await invite(owned);
    const uid = `guest-${randomUUID()}`, db = context(uid);
    await assertFails(getDoc(doc(db, `trips/${owned.id}`)));
    await assertSucceeds(getDoc(doc(db, `trips/${owned.id}/invites/${inviteToken}`)));
    await assertFails(getDocs(collection(db, `trips/${owned.id}/invites`)));
    await assertSucceeds(join(db, owned.id, uid));
    await assertSucceeds(getDoc(doc(db, `trips/${owned.id}`)));
    await assertSucceeds(getDocs(query(collection(db, 'trips'), where('activeUids', 'array-contains', uid))));
    await assertFails(getDocs(collection(db, 'trips')));
  });
  for (const omit of ['trip','member','person']) it(`rejects partial join without ${omit}`, async () => {
    const owned = await createOwned(); await invite(owned); const uid = `guest-${randomUUID()}`;
    await assertFails(join(context(uid), owned.id, uid, inviteToken, { omit }));
    assert.equal((await getDoc(doc(owned.db, `trips/${owned.id}`))).data().activeUids.length, 1);
  });
  it('rejects invalid, revoked and expired tokens', async () => {
    const owned = await createOwned(); await invite(owned); const uid = `guest-${randomUUID()}`, db = context(uid);
    await assertFails(join(db, owned.id, uid, 'A'.repeat(32)));
    await updateDoc(doc(owned.db, `trips/${owned.id}/invites/${inviteToken}`), { revoked: true });
    const user = `guest-${randomUUID()}`; await assertFails(join(context(user), owned.id, user));
    await assertFails(updateDoc(doc(owned.db, `trips/${owned.id}/invites/${inviteToken}`), { revoked: false }));
    await env.withSecurityRulesDisabled(async admin => setDoc(doc(admin.firestore(), `trips/${owned.id}/invites/${'B'.repeat(32)}`), { schemaVersion: 1, createdBy: owned.uid, createdAt: Timestamp.fromMillis(0), expiresAt: Timestamp.fromMillis(1), revoked: false }));
    await assertFails(join(context(user), owned.id, user, 'B'.repeat(32)));
  });
  for (const change of [{ member: { role: 'owner' } }, { member: { personId: 'someone-else' } }, { member: { extra: true } }, { person: { displayName: 'Another identity' } }]) it(`rejects privilege/identity manipulation ${JSON.stringify(change)}`, async () => {
    const owned = await createOwned(); await invite(owned); const uid = `guest-${randomUUID()}`;
    await assertFails(join(context(uid), owned.id, uid, inviteToken, change));
  });
  it('two simultaneous admissions with nine active identities never create an eleventh', async () => {
    const owned = await createOwned(); await invite(owned);
    for (let index = 0; index < 8; index++) { const uid = `guest-${randomUUID()}`; await assertSucceeds(join(context(uid), owned.id, uid)); }
    const candidates = [0,1].map(() => `guest-${randomUUID()}`);
    const results = await Promise.allSettled(candidates.map(uid => join(context(uid), owned.id, uid)));
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    const stored = (await getDoc(doc(owned.db, `trips/${owned.id}`))).data();
    assert.equal(stored.activeUids.length, 10); assert.equal(Object.keys(stored.memberBindings).length, 10);
    for (let index = 0; index < candidates.length; index++) for (const name of ['members','people']) assert.equal((await getDoc(doc(owned.db, `trips/${owned.id}/${name}/${candidates[index]}`))).exists(), results[index].status === 'fulfilled');
    const uid = `eleventh-${randomUUID()}`; await assertFails(join(context(uid), owned.id, uid));
  });
  it('revocation preserves history and prevents same-UID reentry, duplicate join and partial revocation', async () => {
    const owned = await createOwned(); await invite(owned); const uid = `guest-${randomUUID()}`, db = context(uid);
    await join(db, owned.id, uid); await assertFails(join(db, owned.id, uid));
    await assertFails(updateDoc(doc(owned.db, `trips/${owned.id}/members/${uid}`), { status: 'revoked', revokedAt: serverTimestamp() }));
    await revoke(owned, uid); await assertFails(getDoc(doc(db, `trips/${owned.id}`)));
    await assertSucceeds(getDoc(doc(db, `trips/${owned.id}/members/${uid}`))); await assertFails(join(db, owned.id, uid));
    assert.equal((await getDoc(doc(owned.db, `trips/${owned.id}/people/${uid}`))).exists(), true);
    assert.equal((await getDoc(doc(owned.db, `trips/${owned.id}`))).data().participantIds.includes(uid), true);
  });
  it('future financial writes, owner changes, deletion and closure remain denied', async () => {
    const owned = await createOwned();
    for (const patch of [{ ownerId: 'attacker' }, { status: 'closed', closedAt: serverTimestamp() }, { currency: 'USD', currencyExponent: 2 }, { membershipVersion: 999 }]) await assertFails(updateDoc(doc(owned.db, `trips/${owned.id}`), patch));
    await assertFails(deleteDoc(doc(owned.db, `trips/${owned.id}`)));
    await assertFails(setDoc(doc(owned.db, `trips/${owned.id}/events/${randomUUID()}`), { ...owned.event, operationId: randomUUID() }));
    await assertFails(updateDoc(doc(owned.db, `trips/${owned.id}/events/${owned.budgetId}`), { logicalClock: 9 }));
    await assertFails(deleteDoc(doc(owned.db, `trips/${owned.id}/events/${owned.budgetId}`)));
  });
  it('only owner edits allowed metadata; unknown users cannot read members or people', async () => {
    const owned = await createOwned(); const db = context('outsider');
    await assertSucceeds(updateDoc(doc(owned.db, `trips/${owned.id}`), { title: 'Título actualizado', metadataVersion: increment(1), updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, `trips/${owned.id}`), { title: 'Ataque', metadataVersion: increment(1), updatedAt: serverTimestamp() }));
    for (const path of ['members','people','events','attachments']) await assertFails(getDocs(collection(db, `trips/${owned.id}/${path}`)));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), `trips/${owned.id}`)));
  });
  it('rejects obsolete financial envelopes, inexact money and invalid calendar roots', async () => {
    for (const patch of [{ schemaVersion: 1 }, { payload: { total: 1.5, lockedDays: [], status: 'active' } }, { payload: { total: 1000000000001, lockedDays: [], status: 'active' } }, { authoredAt: '2026-02-30T12:00:00.000Z' }]) {
      const uid = `owner-${randomUUID()}`, data = initial(uid); Object.assign(data.event, patch);
      await assertFails(create(context(uid,ownerClaims),data));
    }
    for (const patch of [{ startDate: '2026-02-30' }, { endDate: '2028-11-21' }, { currency: 'JPY' }]) {
      const uid = `owner-${randomUUID()}`; await assertFails(create(context(uid,ownerClaims),initial(uid,undefined,patch)));
    }
  });
  it('rejects user-profile escalation, passwords and reads of other profiles', async () => {
    const uid = `profile-${randomUUID()}`, db = context(uid), ref = doc(db,'users',uid);
    await assertSucceeds(setDoc(ref,{ schemaVersion: 1, displayName: 'Nombre', createdAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(ref,{ displayName: 'Nuevo nombre' }));
    for (const patch of [{ password: 'synthetic-not-stored' }, { owner: true }, { schemaVersion: 2 }, { createdAt: serverTimestamp() }]) await assertFails(updateDoc(ref,patch));
    await assertFails(getDoc(doc(context('outsider'),'users',uid)));
    await assertFails(getDocs(collection(db,'users'))); await assertFails(deleteDoc(ref));
  });
  it('invites cannot be extended, shortened, read anonymously or managed by guests', async () => {
    const owned = await createOwned(); await invite(owned); const uid = `guest-${randomUUID()}`, db = context(uid), path = `trips/${owned.id}/invites/${inviteToken}`;
    await join(db,owned.id,uid);
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),path)));
    await assertFails(getDocs(collection(db,`trips/${owned.id}/invites`)));
    await assertFails(updateDoc(doc(db,path),{ revoked: true }));
    await assertFails(invite({ ...owned, db },'C'.repeat(32)));
    await assertFails(invite(owned,'123456'));
    await assertFails(invite(owned,'C'.repeat(32),{ expiresAt: Timestamp.fromMillis(Date.now()+8*86400000) }));
    await assertFails(updateDoc(doc(owned.db,path),{ expiresAt: Timestamp.fromMillis(Date.now()+2*86400000) }));
    await assertFails(deleteDoc(doc(owned.db,path)));
    await updateDoc(doc(owned.db,path),{ revoked: true }); await assertFails(getDoc(doc(db,path)));
  });
  it('a guest cannot edit metadata, revoke a peer or change owner/member privileges', async () => {
    const owned = await createOwned(); await invite(owned); const uid = `guest-${randomUUID()}`, db = context(uid);
    await join(db,owned.id,uid);
    await assertFails(updateDoc(doc(db,`trips/${owned.id}`),{ title: 'Ataque', metadataVersion: increment(1), updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db,`trips/${owned.id}/members/${uid}`),{ role: 'owner' }));
    await assertFails(revoke({ ...owned, db },owned.uid));
    await assertFails(updateDoc(doc(owned.db,`trips/${owned.id}/people/${uid}`),{ displayName: 'Identidad reutilizada' }));
  });
  it('revocation at capacity stays atomic and allows a distinct UID without reusing the historical person', async () => {
    const owned = await createOwned(); await invite(owned); const guests = [];
    for (let index=0; index<9; index++) { const uid = `guest-${randomUUID()}`; guests.push(uid); await join(context(uid),owned.id,uid); }
    await revoke(owned,guests[0]);
    await assertFails(join(context(guests[0]),owned.id,guests[0]));
    const uid = `new-${randomUUID()}`; await assertSucceeds(join(context(uid),owned.id,uid));
    const stored = (await getDoc(doc(owned.db,`trips/${owned.id}`))).data();
    assert.equal(stored.activeUids.length,10); assert.equal(stored.participantIds.length,11);
    assert.notEqual(stored.memberBindings[uid],guests[0]);
    assert.equal((await getDoc(doc(owned.db,`trips/${owned.id}/people/${guests[0]}`))).exists(),true);
  });
  it('rejects a map-only revocation and editing another binding during join', async () => {
    const owned = await createOwned(); await invite(owned); const uid = `guest-${randomUUID()}`;
    await join(context(uid),owned.id,uid);
    await assertFails(updateDoc(doc(owned.db,`trips/${owned.id}`),new FieldPath('memberBindings',uid),deleteField(),'activeUids',arrayRemove(uid),'membershipVersion',increment(1),'updatedAt',serverTimestamp()));
    const attacker = `guest-${randomUUID()}`, db = context(attacker), batch = writeBatch(db), base = `trips/${owned.id}`;
    batch.update(doc(db,base),{ memberBindings: { [owned.uid]: attacker, [uid]: uid, [attacker]: attacker }, activeUids: [owned.uid,uid,attacker], participantIds: [owned.uid,uid,attacker], membershipVersion: increment(1), updatedAt: serverTimestamp() });
    batch.set(doc(db,`${base}/members/${attacker}`),{ schemaVersion: 1, personId: attacker, displayName: 'Invitado', role: 'member', status: 'active', inviteId: inviteToken, joinedAt: serverTimestamp(), revokedAt: null });
    batch.set(doc(db,`${base}/people/${attacker}`),{ schemaVersion: 1, displayName: 'Invitado', createdBy: attacker, createdAt: serverTimestamp() });
    await assertFails(batch.commit());
  });
  it('supports literal UIDs with dots in a blind atomic admission', async () => {
    const owned = await createOwned(); await invite(owned); const uid = `guest.with.dot-${randomUUID()}`;
    await assertSucceeds(join(context(uid),owned.id,uid));
    assert.equal((await getDoc(doc(owned.db,`trips/${owned.id}`))).data().memberBindings[uid],uid);
  });
  it('closed history is readable by members but cannot admit guests or accept metadata/financial writes', async () => {
    const owned = await createOwned(); await invite(owned);
    await env.withSecurityRulesDisabled(async admin => updateDoc(doc(admin.firestore(),`trips/${owned.id}`),{ status: 'closed', closedAt: Timestamp.now() }));
    await assertSucceeds(getDoc(doc(owned.db,`trips/${owned.id}`)));
    const uid = `guest-${randomUUID()}`; await assertFails(join(context(uid),owned.id,uid));
    await assertFails(updateDoc(doc(owned.db,`trips/${owned.id}`),{ title: 'Cambio tardío', metadataVersion: increment(1), updatedAt: serverTimestamp() }));
    await assertFails(invite(owned,'C'.repeat(32)));
  });
  it('a previously read invitation does not authorize a commit after server revocation', async () => {
    const owned = await createOwned(); await invite(owned); const uid = `guest-${randomUUID()}`, db = context(uid);
    assert.equal((await getDoc(doc(db,`trips/${owned.id}/invites/${inviteToken}`))).exists(),true);
    await updateDoc(doc(owned.db,`trips/${owned.id}/invites/${inviteToken}`),{ revoked: true });
    await assertFails(join(db,owned.id,uid));
    assert.equal((await getDoc(doc(owned.db,`trips/${owned.id}/members/${uid}`))).exists(),false);
  });
  it('owner revocation racing admission preserves both transitions without exceeding capacity', async () => {
    const owned = await createOwned(); await invite(owned); const guests=[];
    for(let index=0;index<8;index++){const uid=`guest-${randomUUID()}`;guests.push(uid);await join(context(uid),owned.id,uid);}
    const uid=`incoming-${randomUUID()}`;
    await Promise.all([assertSucceeds(join(context(uid),owned.id,uid)),assertSucceeds(revoke(owned,guests[0]))]);
    const stored=(await getDoc(doc(owned.db,`trips/${owned.id}`))).data();
    assert.equal(stored.activeUids.length,9); assert.equal(stored.activeUids.includes(uid),true); assert.equal(stored.activeUids.includes(guests[0]),false);
    assert.equal(stored.participantIds.length,10); assert.equal(stored.membershipVersion,10);
  });
});
