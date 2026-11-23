import { arrayRemove, collection, deleteField, doc, FieldPath, getDocFromServer, onSnapshot, query, runTransaction, serverTimestamp, Timestamp, where } from 'firebase/firestore';
import { currencyExponent, financialEventV2Schema } from '../../domain';
import type { FirebaseClient } from '../firebase/client';
import { displayNameSchema, memberDocumentSchema, metadataSchema, tripDocumentSchema, tripInputSchema } from './contracts';
import type { MemberRecord, TripRecord } from './contracts';
import { AccessError } from './errors';

export function currentUser(client: FirebaseClient) {
  const user = client.auth.currentUser;
  if (!user) throw new AccessError('Inicia sesión para continuar.');
  return user;
}
export function requireOnline() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw new AccessError('Esta operación requiere conexión.');
}
export async function createTrip(client: FirebaseClient, raw: unknown): Promise<string> {
  requireOnline(); const user = currentUser(client); await user.reload(); await user.getIdToken(true);
  if (user.isAnonymous || !user.emailVerified) throw new AccessError('Verifica el correo de tu cuenta antes de crear un viaje.');
  const input = tripInputSchema.parse(raw), id = crypto.randomUUID(), budgetId = crypto.randomUUID();
  const displayName = displayNameSchema.parse(user.displayName || user.email?.split('@')[0] || 'Organizador');
  const stamp = Timestamp.now();
  const budget = financialEventV2Schema.parse({ schemaVersion: 2, operationId: budgetId, entityId: budgetId, entityKind: 'budget', action: 'create', actorUid: user.uid, actorPersonId: user.uid,
    parentIds: [], logicalClock: 0, before: [], payload: { total: input.budget, lockedDays: [], status: 'active' }, authoredAt: stamp.toDate().toISOString(), receivedAt: { seconds: stamp.seconds, nanoseconds: stamp.nanoseconds }, merge: null });
  await runTransaction(client.firestore, async transaction => {
    await transaction.get(doc(client.firestore, 'users', user.uid));
    if (client.auth.currentUser?.uid !== user.uid) throw new AccessError('La sesión cambió.');
    transaction.set(doc(client.firestore, 'trips', id), { schemaVersion: 1, ownerId: user.uid, title: input.title, destination: input.destination,
      startDate: input.startDate, endDate: input.endDate, timezone: input.timezone, currency: input.currency, currencyExponent: currencyExponent(input.currency), status: 'active',
      memberBindings: { [user.uid]: user.uid }, activeUids: [user.uid], participantIds: [user.uid], budgetEntityId: budgetId, cover: input.cover,
      metadataVersion: 0, membershipVersion: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), closedAt: null });
    transaction.set(doc(client.firestore, 'trips', id, 'members', user.uid), { schemaVersion: 1, personId: user.uid, displayName, role: 'owner', status: 'active', inviteId: null, joinedAt: serverTimestamp(), revokedAt: null });
    transaction.set(doc(client.firestore, 'trips', id, 'people', user.uid), { displayName, schemaVersion: 1, createdBy: user.uid, createdAt: serverTimestamp() });
    transaction.set(doc(client.firestore, 'trips', id, 'events', budgetId), { ...budget, receivedAt: serverTimestamp() });
  });
  return id;
}
export function watchTrips(client: FirebaseClient, uid: string, next: (trips: TripRecord[]) => void, fail: () => void) {
  return onSnapshot(query(collection(client.firestore, 'trips'), where('activeUids','array-contains',uid)), { includeMetadataChanges: true }, snapshot => {
    if (client.auth.currentUser?.uid !== uid || snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
    try { next(snapshot.docs.map(row => ({ ...tripDocumentSchema.parse(row.data()), id: row.id })).sort((a,b) => b.startDate.localeCompare(a.startDate) || a.id.localeCompare(b.id))); }
    catch { fail(); }
  }, fail);
}
export function watchTrip(client: FirebaseClient, id: string, uid: string, next: (trip: TripRecord) => void, fail: () => void) {
  return onSnapshot(doc(client.firestore,'trips',id), { includeMetadataChanges: true }, snapshot => {
    if (client.auth.currentUser?.uid !== uid || snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
    try { if (!snapshot.exists()) { fail(); return; } next({ ...tripDocumentSchema.parse(snapshot.data()), id }); } catch { fail(); }
  }, fail);
}
export async function listMembers(client: FirebaseClient, id: string): Promise<MemberRecord[]> {
  const { getDocsFromServer } = await import('firebase/firestore');
  const snapshot = await getDocsFromServer(collection(client.firestore,'trips',id,'members'));
  return snapshot.docs.map(row => ({ ...memberDocumentSchema.parse(row.data()), uid: row.id })).sort((a,b) => a.displayName.localeCompare(b.displayName));
}
export async function editTripMetadata(client: FirebaseClient, id: string, expectedVersion: number, raw: unknown) {
  requireOnline(); const user = currentUser(client), metadata = metadataSchema.parse(raw);
  await runTransaction(client.firestore, async transaction => {
    const ref = doc(client.firestore,'trips',id), snapshot = await transaction.get(ref);
    const trip = tripDocumentSchema.parse(snapshot.data());
    if (trip.ownerId !== user.uid || client.auth.currentUser?.uid !== user.uid) throw new AccessError('Solo el organizador puede editar.');
    if (trip.metadataVersion !== expectedVersion) throw new AccessError('El viaje cambió. Recarga antes de editar.');
    transaction.update(ref, { ...metadata, metadataVersion: expectedVersion + 1, updatedAt: serverTimestamp() });
  });
}
export async function revokeMember(client: FirebaseClient, id: string, targetUid: string) {
  requireOnline(); const user = currentUser(client);
  await runTransaction(client.firestore, async transaction => {
    const tripRef = doc(client.firestore,'trips',id), memberRef = doc(client.firestore,'trips',id,'members',targetUid);
    const [tripDoc, memberDoc] = await Promise.all([transaction.get(tripRef), transaction.get(memberRef)]);
    const trip = tripDocumentSchema.parse(tripDoc.data()), target = memberDocumentSchema.parse(memberDoc.data());
    if (trip.ownerId !== user.uid || user.uid === targetUid || client.auth.currentUser?.uid !== user.uid) throw new AccessError('Revocación no autorizada.');
    if (target.status === 'revoked') return;
    transaction.update(tripRef, new FieldPath('memberBindings',targetUid), deleteField(), 'activeUids', arrayRemove(targetUid), 'membershipVersion', trip.membershipVersion + 1, 'updatedAt', serverTimestamp());
    transaction.update(memberRef, { status: 'revoked', revokedAt: serverTimestamp() });
  });
}
export const getTripFromServer = async (client: FirebaseClient, id: string): Promise<TripRecord> => {
  const snapshot = await getDocFromServer(doc(client.firestore,'trips',id));
  return { ...tripDocumentSchema.parse(snapshot.data()), id };
};

export async function getInitialBudget(client: FirebaseClient, trip: TripRecord): Promise<number | null> {
  const snapshot = await getDocFromServer(doc(client.firestore,'trips',trip.id,'events',trip.budgetEntityId));
  const raw = snapshot.data();
  if (!raw || !(raw.receivedAt instanceof Timestamp)) throw new AccessError('Presupuesto no disponible.');
  const event = financialEventV2Schema.parse({ ...raw, receivedAt: { seconds: raw.receivedAt.seconds, nanoseconds: raw.receivedAt.nanoseconds } });
  if (event.entityKind !== 'budget' || event.entityId !== trip.budgetEntityId || event.action !== 'create' || event.payload === null || !('total' in event.payload)) throw new AccessError('Presupuesto incompatible.');
  return event.payload.total;
}
