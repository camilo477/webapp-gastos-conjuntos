import { describe, expect, it } from 'vitest';
import { readFirebaseConfiguration } from './config';

const emulator = {
  VITE_FIREBASE_MODE: 'emulators', VITE_FIREBASE_PROJECT_ID: 'demo-gastos-compartidos',
  VITE_FIREBASE_API_KEY: 'demo-not-real', VITE_FIREBASE_APP_ID: 'demo-not-real',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo-gastos-compartidos.firebaseapp.com',
  VITE_FIREBASE_EMULATOR_HOST: '127.0.0.1', VITE_FIREBASE_AUTH_EMULATOR_PORT: '9199',
  VITE_FIREBASE_FIRESTORE_EMULATOR_PORT: '8180',
};

describe('Firebase environment boundary', () => {
  it('keeps a missing configuration in demo mode', () => {
    expect(readFirebaseConfiguration({}, false).status).toBe('demo');
  });
  it('accepts only explicit local demo-project emulator settings', () => {
    expect(readFirebaseConfiguration(emulator, true)).toMatchObject({ status: 'emulators', host: '127.0.0.1', authPort: 9199, firestorePort: 8180 });
  });
  it('keeps a conventional production build disconnected', () => {
    expect(readFirebaseConfiguration(emulator, false).status).toBe('invalid');
  });
  it('permits the explicit local PWA build for offline emulator testing', () => {
    expect(readFirebaseConfiguration({ ...emulator,MODE: 'emulator-pwa' },false).status).toBe('emulators');
  });
  it.each([{ VITE_FIREBASE_PROJECT_ID: 'real-project' },{ VITE_FIREBASE_EMULATOR_HOST: 'remote.example.invalid' },{ VITE_FIREBASE_MODE: 'production' }])('the PWA build still blocks production or remote endpoints: %j',patch => {
    expect(readFirebaseConfiguration({ ...emulator,...patch,MODE: 'emulator-pwa' },false).status).toBe('invalid');
  });
  it.each([
    { VITE_FIREBASE_MODE: 'production' }, { VITE_FIREBASE_PROJECT_ID: 'real-project' },
    { VITE_FIREBASE_EMULATOR_HOST: 'remote.example.invalid' }, { VITE_FIREBASE_EMULATOR_HOST: '127.0.0.1.example.invalid' },
    { VITE_FIREBASE_AUTH_EMULATOR_PORT: '0' }, { VITE_FIREBASE_AUTH_EMULATOR_PORT: '65536' },
    { VITE_FIREBASE_AUTH_EMULATOR_PORT: '9199x' }, { VITE_FIREBASE_AUTH_EMULATOR_PORT: '8180' },
    { VITE_FIREBASE_API_KEY: '' }, { VITE_FIREBASE_APP_ID: '' }, { VITE_FIREBASE_AUTH_DOMAIN: '' },
  ])('blocks incomplete or unsafe settings: %j', patch => {
    expect(readFirebaseConfiguration({ ...emulator, ...patch }, true).status).toBe('invalid');
  });
});
