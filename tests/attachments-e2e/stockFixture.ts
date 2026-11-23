import type { Page } from '@playwright/test';
interface Fixture { results: unknown[];image: number[];failure?: 403 | 429 | 'timeout' | 'cors' | 'thumbnail' }
// Controlled fetch responses for UI tests, including browsers whose SW owns the
// network request. These are not evidence of public Openverse availability/CORS.
export async function installStockFixture(page: Page,fixture: Fixture) {
  // The fixture verifies selection/attribution/compression; do not download list
  // previews for synthetic IDs from the real provider. Live CORS is probed separately.
  await page.addStyleTag({ content: '.stock-results img { display: none; }' });
  await page.evaluate(options => {
    const scope = window as Window & { gastosStockSearches?: number }; scope.gastosStockSearches = 0;
    const original = window.fetch.bind(window);
    window.fetch = async (input,init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (!url.startsWith('https://api.openverse.org/v1/images/')) return original(input,init);
      const thumbnail = url.includes('/thumb/'); if (!thumbnail) scope.gastosStockSearches!++;
      if (options.failure === 'cors' || thumbnail && options.failure === 'thumbnail') throw new TypeError('Synthetic cross-origin network failure');
      if (options.failure === 'timeout') return new Promise<Response>((_resolve,reject) => {
        const abort = () => reject(new DOMException('Synthetic timeout','AbortError'));
        if (init?.signal?.aborted) abort(); else init?.signal?.addEventListener('abort',abort,{ once: true });
      });
      if (typeof options.failure === 'number') return new Response('{}',{ status: options.failure,headers: { 'Retry-After': '60' } });
      return thumbnail ? new Response(new Uint8Array(options.image),{ headers: { 'Content-Type': 'image/png' } })
        : new Response(JSON.stringify({ results: options.results,next: null }),{ headers: { 'Content-Type': 'application/json' } });
    };
  },fixture);
  return { searches: () => page.evaluate(() => (window as Window & { gastosStockSearches?: number }).gastosStockSearches ?? 0) };
}
