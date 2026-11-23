// Capture once at document bootstrap, before React/Router can retry a render.
// The token stays only in memory and is removed before Auth or external requests.
export function captureInvitationLanding(location: Pick<Location,'pathname' | 'hash' | 'search'>,history: Pick<History,'state' | 'replaceState'>): string {
  const value = location.pathname === '/join' ? location.hash.slice(1) : '';
  if (value) history.replaceState(history.state,'',location.pathname + location.search);
  return value;
}
