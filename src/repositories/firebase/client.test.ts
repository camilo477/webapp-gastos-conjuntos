import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFirebaseConfiguration } from './config';

const mocks = vi.hoisted(() => ({ app: {}, auth: {}, firestore: {}, initializeApp: vi.fn(), initializeAuth: vi.fn(), initializeFirestore: vi.fn(), connectAuthEmulator: vi.fn(), connectFirestoreEmulator: vi.fn() }));
vi.mock('firebase/app', () => ({ initializeApp: mocks.initializeApp }));
vi.mock('firebase/auth', () => ({ initializeAuth: mocks.initializeAuth, connectAuthEmulator: mocks.connectAuthEmulator, indexedDBLocalPersistence: 'indexeddb', browserLocalPersistence: 'local' }));
vi.mock('firebase/firestore', () => ({ initializeFirestore: mocks.initializeFirestore, connectFirestoreEmulator: mocks.connectFirestoreEmulator, memoryLocalCache: () => 'memory' }));

beforeEach(() => {
  vi.clearAllMocks(); vi.resetModules();
  mocks.initializeApp.mockReturnValue(mocks.app); mocks.initializeAuth.mockReturnValue(mocks.auth); mocks.initializeFirestore.mockReturnValue(mocks.firestore);
});

describe('modular SDK initialization', () => {
  it('does not initialize any service for demo or invalid settings', async () => {
    const { getFirebaseClient } = await import('./client');
    expect(getFirebaseClient(readFirebaseConfiguration({}, false))).toBeNull();
    expect(getFirebaseClient({ status: 'invalid', message: 'invalid' })).toBeNull();
    expect(mocks.initializeApp).not.toHaveBeenCalled();
  });
  it('connects once to local emulators before returning Auth/Firestore', async () => {
    const configuration = readFirebaseConfiguration({
      VITE_FIREBASE_MODE: 'emulators', VITE_FIREBASE_PROJECT_ID: 'demo-gastos-compartidos',
      VITE_FIREBASE_API_KEY: 'demo-key', VITE_FIREBASE_APP_ID: 'demo-id', VITE_FIREBASE_AUTH_DOMAIN: 'localhost',
      VITE_FIREBASE_EMULATOR_HOST: '127.0.0.1', VITE_FIREBASE_AUTH_EMULATOR_PORT: '9199', VITE_FIREBASE_FIRESTORE_EMULATOR_PORT: '8180',
    }, true);
    const { getFirebaseClient } = await import('./client');
    const first = getFirebaseClient(configuration);
    expect(first?.auth).toBe(mocks.auth);
    expect(mocks.connectAuthEmulator).toHaveBeenCalledWith(mocks.auth, 'http://127.0.0.1:9199', { disableWarnings: true });
    expect(mocks.connectFirestoreEmulator).toHaveBeenCalledWith(mocks.firestore, '127.0.0.1', 8180);
    expect(mocks.initializeAuth).toHaveBeenCalledWith(mocks.app, { persistence: ['indexeddb','local'] });
    expect(getFirebaseClient(configuration)).toBe(first);
    expect(mocks.initializeApp).toHaveBeenCalledTimes(1);
  });
});
