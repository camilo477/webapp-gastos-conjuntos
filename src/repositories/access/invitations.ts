import { collection, doc, getDocFromServer, getDocsFromServer, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { FirebaseClient } from '../firebase/client';
import { displayNameSchema, inviteDocumentSchema, memberDocumentSchema, tripDocumentSchema } from './contracts';
import type { InviteRecord } from './contracts';
import { currentUser, requireOnline } from './trips';
import { ensureGuest } from './auth';
import { AccessError } from './errors';
import { generateInvitationToken } from './inviteCode';
import type { InvitationCode } from './inviteCode';

export async function createInvitation(client: FirebaseClient, tripId: string): Promise<InvitationCode> {
  requireOnline(); const user = currentUser(client), token = generateInvitationToken();
  await runTransaction(client.firestore, async transaction => {
    const trip = tripDocumentSchema.parse((await transaction.get(doc(client.firestore,'trips',tripId))).data());
    if (trip.ownerId !== user.uid || trip.status !== 'active' || client.auth.currentUser?.uid !== user.uid) throw new AccessError('Solo el organizador de un viaje activo puede invitar.');
    transaction.set(doc(client.firestore,'trips',tripId,'invites',token), { schemaVersion: 1, createdBy: user.uid, createdAt: serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 7 * 86400000), revoked: false });
  });
  return { tripId, token };
}
export async function listInvitations(client: FirebaseClient, tripId: string): Promise<InviteRecord[]> {
  const snapshot = await getDocsFromServer(collection(client.firestore,'trips',tripId,'invites'));
  return snapshot.docs.map(row => ({ ...inviteDocumentSchema.parse(row.data()), token: row.id })).sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}
export async function revokeInvitation(client: FirebaseClient, code: InvitationCode) {
  requireOnline(); currentUser(client);
  await runTransaction(client.firestore, async transaction => {
    const ref = doc(client.firestore,'trips',code.tripId,'invites',code.token), snapshot = await transaction.get(ref);
    const invite = inviteDocumentSchema.parse(snapshot.data());
    if (!invite.revoked) transaction.update(ref, { revoked: true });
  });
}
export async function validateInvitation(client: FirebaseClient, code: InvitationCode) {
  requireOnline(); await ensureGuest(client);
  const snapshot = await getDocFromServer(doc(client.firestore,'trips',code.tripId,'invites',code.token));
  if (!snapshot.exists()) throw new AccessError('La invitación no está disponible.');
  const invite = inviteDocumentSchema.parse(snapshot.data());
  if (invite.revoked || invite.expiresAt.toMillis() <= Date.now()) throw new AccessError('La invitación no está vigente.');
  return invite;
}

const stringValue = (value: string) => ({ stringValue: value });
const quotedField = (value: string) => '`' + value.replace(/\\/g,'\\\\').replace(/`/g,'\\`') + '`';

export function blindJoinWrites(projectId: string, code: InvitationCode, uid: string, displayName: string) {
  const base = `projects/${projectId}/databases/(default)/documents/trips/${code.tripId}`;
  const personId = stringValue(uid), name = stringValue(displayName);
  return [
    { update: { name: base, fields: { memberBindings: { mapValue: { fields: { [uid]: personId } } } } }, updateMask: { fieldPaths: [`memberBindings.${quotedField(uid)}`] }, currentDocument: { exists: true },
      updateTransforms: [
        { fieldPath: 'activeUids', appendMissingElements: { values: [personId] } }, { fieldPath: 'participantIds', appendMissingElements: { values: [personId] } },
        { fieldPath: 'membershipVersion', increment: { integerValue: '1' } }, { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
      ] },
    { update: { name: `${base}/members/${uid}`, fields: { schemaVersion: { integerValue: '1' }, personId, displayName: name, role: stringValue('member'), status: stringValue('active'), inviteId: stringValue(code.token), revokedAt: { nullValue: null } } },
      currentDocument: { exists: false }, updateTransforms: [{ fieldPath: 'joinedAt', setToServerValue: 'REQUEST_TIME' }] },
    { update: { name: `${base}/people/${uid}`, fields: { displayName: name, createdBy: personId, schemaVersion: { integerValue: '1' } } },
      currentDocument: { exists: false }, updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }] },
  ];
}

export async function joinTrip(client: FirebaseClient, code: InvitationCode, rawName: string): Promise<string> {
  requireOnline(); const displayName = displayNameSchema.parse(rawName), user = await ensureGuest(client);
  // Reading one's own access record reveals no private trip metadata.
  const own = await getDocFromServer(doc(client.firestore,'trips',code.tripId,'members',user.uid));
  if (own.exists()) {
    const existing = memberDocumentSchema.parse(own.data());
    if (existing.status === 'revoked') throw new AccessError('Tu acceso fue retirado. El mismo UID no puede reincorporarse automáticamente.');
    return code.tripId;
  }
  await validateInvitation(client, code);
  const idToken = await user.getIdToken(true), cfg = client.configuration;
  if (client.auth.currentUser?.uid !== user.uid) throw new AccessError('La sesión cambió.');
  const response = await fetch(`http://${cfg.host}:${cfg.firestorePort}/v1/projects/${cfg.options.projectId}/databases/(default)/documents:commit`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ writes: blindJoinWrites(cfg.options.projectId, code, user.uid, displayName) }),
    credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new AccessError(response.status === 403 || response.status === 409
      ? 'No se pudo ingresar: invitación no vigente, grupo completo o acceso retirado. No se creó una membresía parcial.'
      : 'No se pudo confirmar el ingreso. Revisa la conexión y vuelve a intentarlo; se comprobará tu membresía antes de reenviar.');
  }
  return code.tripId;
}
