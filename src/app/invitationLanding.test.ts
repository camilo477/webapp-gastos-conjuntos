import { afterEach, expect, it, vi } from 'vitest';
import { captureInvitationLanding } from './invitationLanding';
afterEach(() => { window.history.replaceState(null,'','/'); });

it('captures a cold invitation once, removes its fragment and preserves history state/query', () => {
  const state = { usr: { origin: 'fixture' },key: 'landing' };
  window.history.replaceState(state,'','/join?view=code#synthetic-trip.synthetic-token');
  const initialCode = captureInvitationLanding(window.location,window.history);
  expect(initialCode).toBe('synthetic-trip.synthetic-token');
  expect(window.location.hash).toBe(''); expect(window.location.search).toBe('?view=code');
  expect(window.history.state).toEqual(state);
  // Retried renders consume the stable bootstrap value, rather than the URL again.
  expect(captureInvitationLanding(window.location,window.history)).toBe('');
  expect(initialCode).toBe('synthetic-trip.synthetic-token');
});
it('leaves non-invitation anchors and empty invitations intact', () => {
  const replaceState = vi.fn();
  expect(captureInvitationLanding({ pathname: '/viajes',hash: '#main',search: '' },{ state: null,replaceState })).toBe('');
  expect(captureInvitationLanding({ pathname: '/join',hash: '',search: '' },{ state: null,replaceState })).toBe('');
  expect(replaceState).not.toHaveBeenCalled();
});
