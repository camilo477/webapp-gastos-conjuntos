import { Bytes,Timestamp,doc,getDocFromServer,onSnapshot } from 'firebase/firestore';
import type { FirebaseClient } from '../repositories/firebase/client';
import { firestoreValue,DeliveryError } from '../repositories/financial/events';
import { attachmentSchema,sameAttachment } from './contracts';
import type { Attachment } from './contracts';
import type { LocalAttachment } from './local';
export async function boundedImage<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try { return await Promise.race([promise,new Promise<never>((_,reject) => { timer = setTimeout(() => reject(new DeliveryError('La imagen todavía no se ha confirmado.',false)),5000); })]); } finally { clearTimeout(timer!); }
}
export function decodeAttachment(raw: unknown,expenseId: string): Attachment {
  const r = raw as Record<string,unknown>;
  if (!r || !(r.bytes instanceof Bytes) || !(r.createdAt instanceof Timestamp) || r.expenseId !== expenseId) throw new DeliveryError('Miniatura inválida o de otro gasto.',true);
  return attachmentSchema.parse({ ...r,bytes: r.bytes.toUint8Array(),createdAt: { seconds: r.createdAt.seconds,nanoseconds: r.createdAt.nanoseconds } });
}
export async function sendAttachment(client: FirebaseClient,row: LocalAttachment): Promise<Attachment> {
  const user = client.auth.currentUser; if (!user || user.uid !== row.uid || row.attachment.createdBy !== row.uid) throw new DeliveryError('La sesión cambió. La imagen local se conserva.',true);
  const reference = doc(client.firestore,'trips',row.tripId,'attachments',row.attachmentId);
  const read = async () => { const snapshot = await boundedImage(getDocFromServer(reference)); if (client.auth.currentUser?.uid !== row.uid) throw new DeliveryError('La sesión cambió.',false); if (!snapshot.exists()) return null; const value = decodeAttachment(snapshot.data(),row.attachment.expenseId); if (!sameAttachment(value,row.attachment)) throw new DeliveryError('El ID de miniatura ya existe con otro contenido.',true); return value; };
  const existing = await read(); if (existing) return existing;
  const token = await boundedImage(user.getIdToken()); if (client.auth.currentUser?.uid !== row.uid) throw new DeliveryError('La sesión cambió.',false);
  const cfg = client.configuration,fields = Object.fromEntries(Object.entries(row.attachment).filter(([key]) => key !== 'createdAt').map(([key,value]) => [key,key === 'bytes' ? { bytesValue: Bytes.fromUint8Array(row.attachment.bytes).toBase64() } : firestoreValue(value)]));
  let response: Response;
  try { response = await fetch(`http://${cfg.host}:${cfg.firestorePort}/v1/projects/${cfg.options.projectId}/databases/(default)/documents:commit`,{ method: 'POST',headers: { 'Content-Type': 'application/json',Authorization: `Bearer ${token}` },body: JSON.stringify({ writes: [{ update: { name: `projects/${cfg.options.projectId}/databases/(default)/documents/trips/${row.tripId}/attachments/${row.attachmentId}`,fields },currentDocument: { exists: false },updateTransforms: [{ fieldPath: 'createdAt',setToServerValue: 'REQUEST_TIME' }] }] }),signal: AbortSignal.timeout(15000),credentials: 'omit',cache: 'no-store',redirect: 'error',referrerPolicy: 'no-referrer' }); }
  catch { throw new DeliveryError('No se confirmó la miniatura. El gasto sigue conservado.',false); }
  if (!response.ok) { const recovered = await read(); if (recovered) return recovered; throw new DeliveryError('El servidor no aceptó la miniatura. El gasto sigue conservado.',[400,401,403].includes(response.status)); }
  const confirmed = await read(); if (!confirmed) throw new DeliveryError('Miniatura sin confirmar. Se conserva el mismo ID.',false); return confirmed;
}
export function watchAttachment(client: FirebaseClient,tripId: string,id: string,expenseId: string,uid: string,next: (a: Attachment | null) => void,fail: () => void) {
  return onSnapshot(doc(client.firestore,'trips',tripId,'attachments',id),{ includeMetadataChanges: true },s => { if (client.auth.currentUser?.uid !== uid || s.metadata.fromCache || s.metadata.hasPendingWrites) return; try { next(s.exists() ? decodeAttachment(s.data(),expenseId) : null); } catch { fail(); } },fail);
}
