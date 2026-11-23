import { readFile } from 'node:fs/promises';
import { before,after,it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeTestEnvironment,assertFails,assertSucceeds } from '@firebase/rules-unit-testing';
import { Bytes,doc,setDoc,getDoc,getDocs,collection,updateDoc,deleteDoc,serverTimestamp,Timestamp } from 'firebase/firestore';
let env; const trip = randomUUID(),expenseId = randomUUID(),uid = 'image-owner',guest = 'image-member';
const db = (actor = uid) => env.authenticatedContext(actor).firestore();
const path = (client,id,tripId = trip) => doc(client,`trips/${tripId}/attachments/${id}`);
const stockId = '8a3d9afc-1111-4111-8111-111111111111';
const attribution = () => ({ id: stockId,title: 'Imagen sintética',source: 'synthetic-fixture',foreignLandingUrl: 'https://commons.wikimedia.org/wiki/Synthetic_fixture',creator: 'Synthetic author',creatorUrl: 'https://commons.wikimedia.org/wiki/User:Synthetic',license: 'by',licenseVersion: '4.0',licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',thumbnailUrl: `https://api.openverse.org/v1/images/${stockId}/thumb/?compressed=true`,modified: true });
const image = (patch = {}) => ({ schemaVersion: 1,expenseId,createdBy: uid,createdAt: serverTimestamp(),mimeType: 'image/webp',bytes: Bytes.fromUint8Array(new Uint8Array(40960)),byteLength: 40960,width: 640,height: 640,sourceKind: 'photo',attribution: null,...patch });
const save = (data,client = db(),id = randomUUID(),tripId = trip) => setDoc(path(client,id,tripId),data);
function event(id = randomUUID(),parents = [],visual = null) {
  const people = [uid,guest,...Array.from({ length: 8 },(_,i) => `image-person-${i}`)];
  return { schemaVersion: 2,operationId: id,entityId: parents[0]?.entityId ?? id,entityKind: 'expense',action: parents.length === 2 ? 'resolve' : parents.length ? 'replace' : 'create',actorUid: uid,actorPersonId: uid,parentIds: parents.map(p => p.operationId),before: parents.map(p => p.payload),logicalClock: parents.length ? Math.max(...parents.map(p => p.logicalClock))+1 : 0,authoredAt: '2026-11-23T15:00:00.000Z',receivedAt: serverTimestamp(),merge: null,payload: { title: 'Gasto sintético',note: 'x'.repeat(2000),total: 100,category: 'other',occurredAt: '2026-11-23T15:00:00.000Z',day: '2026-11-23',payerIds: people,payerAmounts: people.map(() => 10),participantIds: people,shareAmounts: people.map(() => 10),splitMode: 'percentage',weights: people.map(() => 1000),visual,attachmentId: randomUUID(),status: 'active',mergedInto: null } };
}
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw Error('Emulators required');
  env = await initializeTestEnvironment({ projectId: 'demo-gastos-compartidos',firestore: { host: '127.0.0.1',port: 8180,rules: await readFile('firestore.rules','utf8') } });
  await env.withSecurityRulesDisabled(async admin => {
    await setDoc(doc(admin.firestore(),`trips/${trip}`),{ ownerId: uid,status: 'active',memberBindings: Object.fromEntries([uid,guest,...Array.from({ length: 8 },(_,i) => `image-person-${i}`)].map(id => [id,id])),participantIds: [uid,guest,...Array.from({ length: 8 },(_,i) => `image-person-${i}`)],startDate: '2026-11-21',endDate: '2026-11-24' });
    await setDoc(doc(admin.firestore(),`trips/${trip}/events/${expenseId}`),{ schemaVersion: 2,operationId: expenseId,entityId: expenseId,entityKind: 'expense',action: 'create' });
  });
});
after(async () => env?.cleanup());
it('accepts real Bytes exactly at 40960 and immutable same-trip attachments',async () => { const id = randomUUID(); await assertSucceeds(save(image(),db(),id)); assert.equal((await getDoc(path(db(guest),id))).data().bytes.toUint8Array().length,40960); await assertFails(updateDoc(path(db(),id),{ width: 1 })); await assertFails(deleteDoc(path(db(),id))); });
it('accepts Openverse attribution and rejects list downloads even for members',async () => { await assertSucceeds(save(image({ sourceKind: 'openverse',attribution: attribution() }))); await assertSucceeds(save(image({ sourceKind: 'openverse',attribution: { ...attribution(),creatorUrl: 'https://500px.com/creator' } }))); await assertFails(save(image({ sourceKind: 'openverse',attribution: { ...attribution(),creatorUrl: 'https://127.0.0.1/private' } }))); await assertFails(getDocs(collection(db(),`trips/${trip}/attachments`))); });
for (const [label,patch] of Object.entries({ actualExcess: { bytes: Bytes.fromUint8Array(new Uint8Array(40961)) },declaredExcess: { byteLength: 40961 },lie: { byteLength: 1 },empty: { bytes: Bytes.fromUint8Array(new Uint8Array(0)),byteLength: 0 },stringBytes: { bytes: 'not-bytes' },arrayBytes: { bytes: [0,1] },wrongMime: { mimeType: 'image/jpeg' },fraction: { width: 1.5 },dimensions: { height: 641 },negative: { width: 0 },author: { createdBy: guest },receipt: { createdAt: Timestamp.fromMillis(0) },extra: { original: 'private-original' },version: { schemaVersion: 2 },root: { expenseId: randomUUID() },source: { sourceKind: 'arbitrary' },photoWithCredit: { attribution: attribution() },stockNoCredit: { sourceKind: 'openverse' } })) it(`rejects hostile attachment: ${label}`,async () => assertFails(save(image(patch))));
for (const [label,patch] of Object.entries({ author: { creator: '' },unsafe: { foreignLandingUrl: 'http://localhost/private' },credentials: { creatorUrl: 'https://user:password@site.example.org/' },license: { license: 'unknown' },falseLicenseURL: { licenseUrl: 'https://malicious.example.org/license' },falseVersion: { licenseVersion: '9.0' },preview: { thumbnailUrl: 'https://malicious.example.org/image' },extra: { originalBytes: 'not-allowed' } })) it(`rejects hostile attribution: ${label}`,async () => assertFails(save(image({ sourceKind: 'openverse',attribution: { ...attribution(),...patch } }))));
it('foreign users and revoked users cannot write or read thumbnails',async () => {
  const id = randomUUID(); await save(image(),db(),id);
  for (const actor of ['outsider','revoked']) { await assertFails(getDoc(path(db(actor),id))); await assertFails(save(image({ createdBy: actor }),db(actor))); }
  await assertFails(save(image(),db(),randomUUID(),randomUUID()));
});
it('a foreign expense root and closed trip cannot receive a thumbnail',async () => {
  const other = randomUUID(),root = randomUUID(); await env.withSecurityRulesDisabled(async admin => { await setDoc(doc(admin.firestore(),`trips/${other}`),{ ownerId: uid,status: 'closed',memberBindings: { [uid]:uid } }); await setDoc(doc(admin.firestore(),`trips/${other}/events/${root}`),{ schemaVersion: 2,operationId: root,entityId: root,entityKind: 'expense',action: 'create' }); });
  await assertFails(save(image({ expenseId: root }))); await assertFails(save(image({ expenseId: root }),db(),randomUUID(),other));
});
it('ten-person two-parent image references fit expression limits with maximum historical notes',async () => {
  const write = e => setDoc(doc(db(),`trips/${trip}/events/${e.operationId}`),e);
  for (const visual of [null,{ kind: 'icon',key: 'car' }]) { const root = event(randomUUID(),[],visual); await assertSucceeds(write(root)); const a = event(randomUUID(),[root],visual),b = event(randomUUID(),[root],visual); await assertSucceeds(write(a)); await assertSucceeds(write(b)); await assertSucceeds(write(event(randomUUID(),[a,b],visual))); }
});
it('financial references reject malformed IDs, unsafe metadata and extra icon fields',async () => {
  for (const visual of [{ kind: 'icon',key: 'arbitrary' },{ kind: 'icon',key: 'car',html: '<script>' },{ ...attribution(),creatorUrl: 'javascript:alert(1)' }]) { const e = event(randomUUID(),[],visual); await assertFails(setDoc(doc(db(),`trips/${trip}/events/${e.operationId}`),e)); }
});

it('financial documents reject full stock metadata; attribution belongs to the attachment',async () => { const e = event(randomUUID(),[],attribution()); await assertFails(setDoc(doc(db(),`trips/${trip}/events/${e.operationId}`),e)); });
it('two-parent image revision with short parent notes',async () => {
 const root=event(randomUUID(),[],{kind:'icon',key:'car'}); root.payload.note=null;
 const a=event(randomUUID(),[root],root.payload.visual),b=event(randomUUID(),[root],root.payload.visual); a.payload.note=null;b.payload.note=null;
 const write=e=>setDoc(doc(db(),`trips/${trip}/events/${e.operationId}`),e);
 await write(root);await write(a);await write(b);await assertSucceeds(write(event(randomUUID(),[a,b],root.payload.visual)));
});

it('ten-person unequal payers, shares and weights with image references and a two-parent monetary change',async () => {
 const root=event(randomUUID(),[],{ kind:'icon',key:'receipt' }); root.payload.total=10000;root.payload.weights=[100,200,300,400,500,600,700,800,900,5500];root.payload.shareAmounts=[...root.payload.weights];root.payload.payerAmounts=[...root.payload.weights].reverse();
 const write=e=>setDoc(doc(db(),`trips/${trip}/events/${e.operationId}`),e);await assertSucceeds(write(root));
 const a=event(randomUUID(),[root],root.payload.visual),b=event(randomUUID(),[root],root.payload.visual);a.payload={...root.payload,title:'A'};b.payload={...root.payload,title:'B'};await write(a);await write(b);
 const resolved=event(randomUUID(),[a,b],root.payload.visual);resolved.payload={...root.payload,total:20000,payerAmounts:root.payload.payerAmounts.map(v=>v*2),shareAmounts:root.payload.shareAmounts.map(v=>v*2)};await assertSucceeds(write(resolved));
});

it('ten unequal lists without images',async()=>{const e=event();e.payload.total=10000;e.payload.visual=null;e.payload.attachmentId=null;e.payload.weights=[100,200,300,400,500,600,700,800,900,5500];e.payload.shareAmounts=[...e.payload.weights];e.payload.payerAmounts=[...e.payload.weights].reverse();await assertSucceeds(setDoc(doc(db(),`trips/${trip}/events/${e.operationId}`),e));});

for(const field of Object.keys(image())) it(`rejects missing attachment field: ${field}`,async()=>{const a=image();delete a[field];await assertFails(save(a));});
for(const [field,value] of Object.entries({creator:99,source:[],foreignLandingUrl:{},creatorUrl:[],licenseVersion:4,title:[],modified:'yes',id:123})) it(`rejects attribution type: ${field}`,async()=>{await assertFails(save(image({sourceKind:'openverse',attribution:{...attribution(),[field]:value}})));});
for(let n=2;n<=9;n++) it(`nonuniform financial lists with ${n} people retain exact conservation with images`,async()=>{const e=event(randomUUID(),[],{kind:'icon',key:'receipt'}),ids=e.payload.payerIds.slice(0,n),amounts=ids.map((_,i)=>i+1),total=amounts.reduce((a,b)=>a+b,0);Object.assign(e.payload,{total,payerIds:ids,participantIds:ids,payerAmounts:amounts,shareAmounts:[...amounts].reverse(),splitMode:'fixed',weights:[]});await assertSucceeds(setDoc(doc(db(),`trips/${trip}/events/${e.operationId}`),e));});
it('parent inheritance cannot bypass altered amounts, identities, modes or fractional weights',async()=>{
 const root=event(randomUUID(),[],{kind:'icon',key:'receipt'}),write=e=>setDoc(doc(db(),`trips/${trip}/events/${e.operationId}`),e);await write(root);
 for(const patch of [{total:99},{weights:root.payload.weights.map(()=>999)},{weights:[999.5,1000.5,...root.payload.weights.slice(2)]},{participantIds:['outsider',...root.payload.participantIds.slice(1)]},{payerIds:[uid,uid,...root.payload.payerIds.slice(2)]},{splitMode:'arbitrary'}]){const e=event(randomUUID(),[root],root.payload.visual);Object.assign(e.payload,patch);await assertFails(write(e));}
});
it('a maximum two-parent resolution can change nonuniform weights while retaining image references',async()=>{
 const root=event(randomUUID(),[],{kind:'icon',key:'receipt'}),write=e=>setDoc(doc(db(),`trips/${trip}/events/${e.operationId}`),e);await write(root);const a=event(randomUUID(),[root],root.payload.visual),b=event(randomUUID(),[root],root.payload.visual);await write(a);await write(b);
 const e=event(randomUUID(),[a,b],root.payload.visual);e.payload.total=20000;e.payload.weights=[100,200,300,400,500,600,700,800,900,5500];e.payload.shareAmounts=e.payload.weights.map(v=>v*2);e.payload.payerAmounts=[...e.payload.shareAmounts].reverse();await assertSucceeds(write(e));
});
