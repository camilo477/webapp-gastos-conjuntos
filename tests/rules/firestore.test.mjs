import { readFile } from 'node:fs/promises';
import { after, before, describe, it } from 'node:test';
import { assertFails, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

let environment;
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Run npm run test:rules; real services are forbidden.');
  environment = await initializeTestEnvironment({ projectId: 'demo-gastos-compartidos', firestore: { host: '127.0.0.1', port: 8180, rules: await readFile('firestore.rules', 'utf8') } });
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'trips/synthetic-trip'), { title: 'Synthetic fixture' });
  });
});
after(async () => { await environment?.cleanup(); });

describe('Phase 2 deny-all baseline', () => {
  for (const actor of ['unauthenticated', 'synthetic-owner', 'synthetic-guest']) {
    for (const operation of ['read', 'list', 'create', 'update', 'delete']) {
      it(`${actor}: rejects ${operation}`, async () => {
        const context = actor === 'unauthenticated' ? environment.unauthenticatedContext() : environment.authenticatedContext(actor);
        const db = context.firestore();
        const ref = doc(db, 'trips/synthetic-trip');
        const actions = {
          read: () => getDoc(ref), list: () => getDocs(collection(db, 'trips')),
          create: () => setDoc(doc(db, 'trips/synthetic-new/events/synthetic-event'), { schemaVersion: 1 }),
          update: () => updateDoc(ref, { title: 'Changed' }), delete: () => deleteDoc(ref),
        };
        await assertFails(actions[operation]());
      });
    }
  }
});
