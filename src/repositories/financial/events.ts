import { collection, doc, getDocFromServer, onSnapshot, Timestamp } from 'firebase/firestore';
import { z } from 'zod';
import {
  financialEventV2Schema, operationIdSchema, personSchema, tripContextSchema,
  validateEventParents, validateExpenseChange, validateSettlementChange, validateBudgetContext,
} from '../../domain';
import type { FinancialEventV2Dto, TripContext } from '../../domain';
import type { TripRecord } from '../access/contracts';
import { currentUser, requireOnline } from '../access/trips';
import { AccessError } from '../access/errors';
import type { FirebaseClient } from '../firebase/client';

export interface EventCollection { events: unknown[]; complete: boolean; invalidCount: number }
export type FinancialOperation = FinancialEventV2Dto;

export function decodeEvent(id: string, raw: unknown): FinancialEventV2Dto {
  if (!raw || typeof raw !== 'object' || !('receivedAt' in raw) || !(raw.receivedAt instanceof Timestamp)) throw new AccessError('Evento sin confirmación de servidor.');
  const event = financialEventV2Schema.parse({ ...raw, receivedAt: { seconds: raw.receivedAt.seconds, nanoseconds: raw.receivedAt.nanoseconds } });
  if (event.operationId !== id) throw new AccessError('El ID del evento no coincide con el documento.');
  return event;
}

export function watchEvents(client: FirebaseClient, tripId: string, uid: string, next: (value: EventCollection) => void, fail: () => void) {
  let confirmed: EventCollection = { events: [], complete: false, invalidCount: 0 };
  return onSnapshot(collection(client.firestore, 'trips', tripId, 'events'), { includeMetadataChanges: true }, snapshot => {
    if (client.auth.currentUser?.uid !== uid) return;
    if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) { next({ ...confirmed, complete: false }); return; }
    let invalidCount = 0;
    const events = snapshot.docs.map(row => {
      try { return decodeEvent(row.id, row.data()); }
      catch {
        invalidCount++;
        // Preserve an invalid entity header for the conservative domain projector.
        return { ...row.data(), invalidDocument: true };
      }
    });
    confirmed = { events, complete: true, invalidCount }; next(confirmed);
  }, fail);
}

const personDocument = z.strictObject({ displayName: personSchema.shape.displayName, schemaVersion: z.literal(1), createdBy: z.string().min(1).max(128), createdAt: z.instanceof(Timestamp) });
export function watchPeople(client: FirebaseClient, trip: TripRecord, uid: string, next: (context: TripContext | null) => void, fail: () => void) {
  return onSnapshot(collection(client.firestore, 'trips', trip.id, 'people'), { includeMetadataChanges: true }, snapshot => {
    if (client.auth.currentUser?.uid !== uid) return;
    if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) { next(null); return; }
    try {
      const active = new Set(Object.values(trip.memberBindings));
      const people = snapshot.docs.map(row => ({ personId: row.id, displayName: personDocument.parse(row.data()).displayName, status: active.has(row.id) ? 'active' : 'revoked' }));
      if (people.length !== trip.participantIds.length || people.some(person => !trip.participantIds.includes(person.personId))) { next(null); return; }
      next(tripContextSchema.parse({ id: trip.id, startDate: trip.startDate, endDate: trip.endDate, timezone: trip.timezone, currency: trip.currency, currencyExponent: trip.currencyExponent, people }));
    } catch { fail(); }
  }, fail);
}

export function prepareOperation(context: TripContext, actor: { uid: string; personId: string }, kind: 'expense' | 'settlement' | 'budget', payload: unknown, parent?: FinancialEventV2Dto, action: 'create' | 'replace' | 'delete' = parent ? 'replace' : 'create'): FinancialOperation {
  const id = crypto.randomUUID();
  if (parent && parent.entityKind !== kind) throw new AccessError('Tipo de revisión incompatible.');
  const event = financialEventV2Schema.parse({ schemaVersion: 2, operationId: id, entityId: parent?.entityId ?? id, entityKind: kind, action,
    actorUid: actor.uid, actorPersonId: actor.personId, parentIds: parent ? [parent.operationId] : [], logicalClock: parent ? parent.logicalClock + 1 : 0,
    before: parent ? [parent.payload] : [], payload, merge: null, authoredAt: new Date().toISOString(), receivedAt: { seconds: 0, nanoseconds: 0 } });
  validateEventParents(event, parent ? [parent] : []);
  if (event.entityKind === 'expense') validateExpenseChange(event.payload, context, parent?.entityKind === 'expense' ? parent.payload : undefined);
  if (event.entityKind === 'settlement') validateSettlementChange(event.payload, context, parent?.entityKind === 'settlement' ? parent.payload : undefined);
  if (event.entityKind === 'budget') validateBudgetContext(event.payload, context);
  return event;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'undefined';
}
export function sameOperation(a: FinancialOperation, b: FinancialOperation): boolean {
  const withoutReceipt = (event: FinancialOperation) => ({ ...event, receivedAt: null });
  return canonical(withoutReceipt(a)) === canonical(withoutReceipt(b));
}

export function firestoreValue(value: unknown): object {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number' && Number.isSafeInteger(value)) return { integerValue: String(value) };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  if (value && typeof value === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, firestoreValue(item)])) } };
  throw new AccessError('Valor financiero no serializable.');
}

export async function persistOperation(client: FirebaseClient, tripId: string, raw: FinancialOperation): Promise<FinancialEventV2Dto> {
  requireOnline(); operationIdSchema.parse(tripId);
  const user = currentUser(client), operation = financialEventV2Schema.parse(raw);
  if (operation.actorUid !== user.uid) throw new AccessError('La sesión cambió. No se enviará una operación de otro usuario.');
  const ref = doc(client.firestore, 'trips', tripId, 'events', operation.operationId);
  const readBack = async () => {
    const snapshot = await getDocFromServer(ref);
    if (client.auth.currentUser?.uid !== user.uid) throw new AccessError('La sesión cambió.');
    if (!snapshot.exists()) return null;
    const stored = decodeEvent(snapshot.id, snapshot.data());
    if (!sameOperation(operation, stored)) throw new AccessError('Conflicto de integridad: el ID ya existe con otro contenido.');
    return stored;
  };
  const existing = await readBack(); if (existing) return existing;
  const token = await user.getIdToken();
  if (client.auth.currentUser?.uid !== user.uid) throw new AccessError('La sesión cambió.');
  const cfg = client.configuration;
  const fields = Object.fromEntries(Object.entries(operation).filter(([key]) => key !== 'receivedAt').map(([key, value]) => [key, firestoreValue(value)]));
  try {
    const response = await fetch(`http://${cfg.host}:${cfg.firestorePort}/v1/projects/${cfg.options.projectId}/databases/(default)/documents:commit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ writes: [{ update: { name: `projects/${cfg.options.projectId}/databases/(default)/documents/trips/${tripId}/events/${operation.operationId}`, fields },
        currentDocument: { exists: false }, updateTransforms: [{ fieldPath: 'receivedAt', setToServerValue: 'REQUEST_TIME' }] }] }),
      signal: AbortSignal.timeout(15000), cache: 'no-store', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer',
    });
    if (!response.ok) {
      const confirmed = await readBack(); if (confirmed) return confirmed;
      throw new AccessError(response.status === 403 ? 'Operación rechazada por el servidor. Revisa tu acceso y los datos.' : 'Operación no confirmada. Reintenta con el mismo ID.');
    }
  } catch (error) {
    if (error instanceof AccessError) throw error;
    throw new AccessError('Operación no confirmada. Conservamos esta propuesta en pantalla; reintenta con el mismo ID. No cierres esta página.');
  }
  const confirmed = await readBack();
  if (!confirmed) throw new AccessError('Operación no confirmada. Reintenta con el mismo ID.');
  return confirmed;
}
