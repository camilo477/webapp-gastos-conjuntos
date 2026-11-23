import { browserLocalPersistence, createUserWithEmailAndPassword, indexedDBLocalPersistence, reload, sendEmailVerification, sendPasswordResetEmail, setPersistence, signInAnonymously, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import type { FirebaseClient } from '../firebase/client';
import { displayNameSchema } from './contracts';
import { AccessError } from './errors';

export async function prepareAuth(client: FirebaseClient) {
  await client.auth.authStateReady();
  try { await setPersistence(client.auth, indexedDBLocalPersistence); }
  catch { try { await setPersistence(client.auth, browserLocalPersistence); } catch { throw new AccessError('No se puede conservar la sesión en este navegador. Habilita almacenamiento local antes de continuar.'); } }
}
export async function registerOrganizer(client: FirebaseClient, email: string, password: string, rawName: string) {
  const displayName = displayNameSchema.parse(rawName);
  if (client.auth.currentUser) throw new AccessError('Cierra la sesión actual antes de registrar otra cuenta.');
  const credential = await createUserWithEmailAndPassword(client.auth, email.trim(), password);
  await updateProfile(credential.user, { displayName });
  await runTransaction(client.firestore, async transaction => {
    const ref = doc(client.firestore, 'users', credential.user.uid), existing = await transaction.get(ref);
    if (!existing.exists()) transaction.set(ref, { displayName, schemaVersion: 1, createdAt: serverTimestamp() });
  });
  await sendEmailVerification(credential.user);
}
export const loginOrganizer = (client: FirebaseClient, email: string, password: string) => signInWithEmailAndPassword(client.auth, email.trim(), password);
export const logout = (client: FirebaseClient) => signOut(client.auth);
export async function ensureGuest(client: FirebaseClient) {
  await client.auth.authStateReady();
  return client.auth.currentUser ?? (await signInAnonymously(client.auth)).user;
}
export async function refreshVerification(client: FirebaseClient) {
  if (!client.auth.currentUser) throw new AccessError('Inicia sesión.');
  await reload(client.auth.currentUser); await client.auth.currentUser.getIdToken(true);
}
export async function sendVerification(client: FirebaseClient) {
  if (!client.auth.currentUser || client.auth.currentUser.isAnonymous) throw new AccessError('Se requiere una cuenta con correo.');
  await sendEmailVerification(client.auth.currentUser);
}
export async function resetPassword(client: FirebaseClient, email: string) {
  try { await sendPasswordResetEmail(client.auth, email.trim()); }
  catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 'auth/user-not-found')) throw error;
  }
}
