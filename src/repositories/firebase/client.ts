import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, connectAuthEmulator, indexedDBLocalPersistence, initializeAuth } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import type { FirebaseConfiguration } from './config';

type EmulatorConfiguration = Extract<FirebaseConfiguration, { status: 'emulators' }>;

function createClient(configuration: EmulatorConfiguration) {
  const app = initializeApp(configuration.options, 'gastos-emulators');
  // Configure emulator endpoints before exposing services to any caller.
  const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
  connectAuthEmulator(auth, `http://${configuration.host}:${configuration.authPort}`, { disableWarnings: true });
  const firestore = initializeFirestore(app, { localCache: memoryLocalCache() });
  connectFirestoreEmulator(firestore, configuration.host, configuration.firestorePort);
  return { app, auth, firestore, configuration };
}

let client: ReturnType<typeof createClient> | undefined;

export function getFirebaseClient(configuration: FirebaseConfiguration) {
  if (configuration.status !== 'emulators') return null;
  client ??= createClient(configuration);
  return client;
}

export type FirebaseClient = NonNullable<ReturnType<typeof getFirebaseClient>>;
