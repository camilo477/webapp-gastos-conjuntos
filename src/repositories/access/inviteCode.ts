import { operationIdSchema } from '../../domain';
import { AccessError } from './errors';

export interface InvitationCode { tripId: string; token: string }
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateInvitationToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let buffer = 0, bits = 0, token = '';
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte; bits += 8;
    while (bits >= 5) { bits -= 5; token += alphabet[(buffer >>> bits) & 31]; }
  }
  return token;
}

export function parseInvitationCode(raw: string): InvitationCode {
  let code = raw.trim();
  if (/^https?:\/\//i.test(code)) {
    const url = new URL(code);
    if (url.pathname !== '/join' || url.search) throw new AccessError('Código de invitación inválido.');
    code = url.hash.slice(1);
  }
  const parts = code.split('.');
  if (parts.length !== 2) throw new AccessError('Introduce el código completo de la invitación.');
  const parsedId = operationIdSchema.safeParse(parts[0]);
  if (!parsedId.success) throw new AccessError('Introduce el código completo de la invitación.');
  const tripId = parsedId.data;
  const token = parts[1]!.replace(/[\s-]/g, '').toUpperCase();
  if (!/^[A-Z2-7]{32}$/.test(token)) throw new AccessError('Código de invitación inválido.');
  return { tripId, token };
}

export const invitationLink = (origin: string, code: InvitationCode) => `${origin}/join#${code.tripId}.${code.token}`;
export const manualInvitationCode = (code: InvitationCode) => `${code.tripId}.${code.token.match(/.{4}/g)!.join('-')}`;
