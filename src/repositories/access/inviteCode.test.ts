import { describe, expect, it, vi } from 'vitest';
import { blindJoinWrites } from './invitations';
import { generateInvitationToken, invitationLink, manualInvitationCode, parseInvitationCode } from './inviteCode';
import { tripInputSchema } from './contracts';

const tripId = '00000000-0000-4000-8000-000000000001', token = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
describe('Invitations and metadata boundaries', () => {
  it('uses 20 cryptographic bytes and Base32 without short-code truncation', () => {
    const spy = vi.spyOn(crypto,'getRandomValues').mockImplementation(array => { new Uint8Array(array!.buffer, array!.byteOffset, array!.byteLength).fill(255); return array; });
    expect(generateInvitationToken()).toBe('7'.repeat(32)); expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]![0]!.byteLength).toBe(20);
  });
  it('roundtrips full grouped code and fragment link; no token in query/path', () => {
    const code = { tripId, token }, link = invitationLink('http://127.0.0.1:4184',code);
    expect(parseInvitationCode(link)).toEqual(code); expect(parseInvitationCode(manualInvitationCode(code))).toEqual(code);
    const url = new URL(link); expect(url.search).toBe(''); expect(url.pathname).toBe('/join'); expect(url.hash).toContain(token);
  });
  it.each(['123456',`${tripId}.ABC`, `${tripId}.${'0'.repeat(32)}`, `http://example.invalid/other#${tripId}.${token}`])('rejects malformed or shortened invitation: %s', raw => expect(() => parseInvitationCode(raw)).toThrow());
  it('blind commit changes only the joining UID and atomic transforms; no client role escalation', () => {
    const writes = blindJoinWrites('demo-gastos-compartidos',{ tripId, token },'guest.with.dot','Nombre');
    expect(writes).toHaveLength(3); expect(writes[0]!.updateMask!.fieldPaths).toEqual(['memberBindings.`guest.with.dot`']);
    expect(writes[0]!.updateTransforms).toHaveLength(4); expect(writes[1]!.currentDocument.exists).toBe(false);
    expect(writes[1]!.update.fields).toMatchObject({ role: { stringValue: 'member' }, personId: { stringValue: 'guest.with.dot' } });
  });
  it('validates travel dates, currency and optional icon cover using domain conventions', () => {
    const valid = { title: 'Viaje', destination: null, startDate: '2026-11-21', endDate: '2026-11-24', timezone: 'America/Bogota', currency: 'COP', budget: 0, cover: { kind: 'icon', key: 'mountain' } };
    expect(tripInputSchema.safeParse(valid).success).toBe(true);
    for (const patch of [{ endDate: '2026-11-20' }, { timezone: 'Invalid/Zone' }, { currency: 'JPY' }, { budget: 0.5 }, { cover: { kind: 'photo', url: 'https://example.invalid/' } }]) expect(tripInputSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
});
