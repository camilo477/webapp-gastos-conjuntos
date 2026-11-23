import type { BrowserContext, Page } from '@playwright/test';
type Mode = 'lose-ack' | 'hold-ack' | 'reject' | 'unavailable';
type Target = 'financial' | 'image' | 'all';
interface State { mode: Mode;target: Target;enabled: boolean;once: boolean;financialWrites: number;imageWrites: number;arrived: boolean;status: number | null }

// Test-only transport faults, before the service worker. Playwright's network
// routing does not consistently see SW-controlled requests across browser engines.
// Successful requests still reach the real emulator with the ordinary user's token.
export async function installCommitFault(context: BrowserContext,mode: Mode,target: Target = 'all',once = true) {
  const instrument = (initial: State) => {
    if (location.origin === 'null') return;
    const key = 'gastos.test.commit-fault';
    const scope = window as Window & { gastosCommitFault?: boolean };
    if (scope.gastosCommitFault) return; scope.gastosCommitFault = true;
    if (!localStorage.getItem(key)) localStorage.setItem(key,JSON.stringify(initial));
    const original = window.fetch.bind(window);
    const read = () => JSON.parse(localStorage.getItem(key)!) as State;
    window.fetch = async (input,options) => {
      const url = input instanceof Request ? input.url : String(input);
      if (!url.endsWith('/documents:commit')) return original(input,options);
      const writes = (JSON.parse(String(options?.body)) as { writes: { update?: { name?: string } }[] }).writes;
      const images = writes.filter(write => write.update?.name?.includes('/attachments/')).length;
      const financial = writes.filter(write => write.update?.name?.includes('/events/')).length;
      const state = read(); state.financialWrites += financial; state.imageWrites += images;
      const applies = state.enabled && (state.target === 'all' || state.target === 'image' && images > 0 || state.target === 'financial' && financial > 0);
      if (applies && state.once) state.enabled = false;
      localStorage.setItem(key,JSON.stringify(state));
      if (!applies) return original(input,options);
      if (state.mode === 'reject' || state.mode === 'unavailable') return new Response('{}',{ status: state.mode === 'reject' ? 403 : 503,headers: { 'Content-Type': 'application/json' } });
      const response = await original(input,options);
      localStorage.setItem(key,JSON.stringify({ ...read(),arrived: response.ok,status: response.status }));
      if (!response.ok) return response;
      if (state.mode === 'hold-ack') return new Promise<Response>(() => { /* Simulate a frozen document before local receipt persistence. */ });
      throw new TypeError('Synthetic acknowledgement loss after real server commit');
    };
  };
  const initial: State = { mode,target,once,enabled: true,financialWrites: 0,imageWrites: 0,arrived: false,status: null };
  await context.addInitScript(instrument,initial);
  await Promise.all(context.pages().map(page => page.evaluate(instrument,initial)));
}
export async function commitFaultState(page: Page): Promise<State> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('gastos.test.commit-fault')!));
}
export async function clearCommitFault(context: BrowserContext) {
  await Promise.all(context.pages().map(page => page.evaluate(() => {
    const key = 'gastos.test.commit-fault',state = JSON.parse(localStorage.getItem(key)!);
    if (state) localStorage.setItem(key,JSON.stringify({ ...state,enabled: false }));
  })));
}
