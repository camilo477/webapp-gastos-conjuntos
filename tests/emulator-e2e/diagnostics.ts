import type { Page } from '@playwright/test';

// Failure-only diagnostics. Report counts/flags, never users, tokens or payloads.
export async function financialReadiness(page: Page) {
  return page.evaluate(() => {
    type Hook = { memoizedState: unknown;next: Hook | null };
    type Fiber = { type?: { name?: string };return?: Fiber | null;memoizedState?: Hook | null;alternate?: Fiber | null;memoizedProps?: { trip?: { membershipVersion: number;budgetEntityId: string } } };
    const element = document.querySelector('[aria-label="Estado de sincronización"]');
    const entry = element && Object.entries(element).find(([key]) => key.startsWith('__reactFiber$'));
    let fiber = entry?.[1] as Fiber | undefined;
    while (fiber && fiber.type?.name !== 'TripFinance') fiber = fiber.return ?? undefined;
    const inspect = (node: Fiber | null | undefined) => {
      if (!node) return null;
      const trip = node.memoizedProps?.trip;
      let hook = node.memoizedState, eventKey: unknown, peopleKey: unknown;
      const flags: Record<string,unknown> = { online: navigator.onLine };
      for (let count = 0;hook && count < 50;count++,hook = hook.next) {
        const value = hook.memoizedState;
        if (!value || typeof value !== 'object') continue;
        if ('groups' in value && Array.isArray(value.groups)) {
          flags.pending = value.groups.filter(group => group.state !== 'confirmed').length;
          const saved = 'trip' in value ? value.trip as { blocked?: boolean;events?: unknown[] } | null : null;
          flags.blocked = saved?.blocked; flags.localEvents = saved?.events?.length;
        }
        if ('key' in value && 'value' in value && value.value && typeof value.value === 'object') {
          const data = value.value;
          if ('events' in data && Array.isArray(data.events)) {
            eventKey = value.key; flags.events = data.events.length; flags.collectionComplete = 'complete' in data && data.complete;
            flags.rootPresent = data.events.some(event => event.operationId === trip?.budgetEntityId);
          }
          if ('confirmed' in value) { peopleKey = value.key; flags.peopleConfirmed = value.confirmed; }
        }
      }
      flags.peopleKeyMatches = typeof eventKey === 'string' && peopleKey === `${eventKey}/${trip?.membershipVersion}`;
      return flags;
    };
    return { current: inspect(fiber),alternate: inspect(fiber?.alternate) };
  });
}
export async function horizontalOverflow(page: Page) {
  return page.evaluate(() => ({ width: innerWidth,scroll: document.documentElement.scrollWidth,elements: [...document.querySelectorAll<HTMLElement>('body *')].map(element => {
    const box = element.getBoundingClientRect(); return { tag: element.tagName,css: typeof element.className === 'string' ? element.className : '',x: box.x,right: box.right,width: box.width };
  }).filter(box => box.right > innerWidth + 0.5 || box.x < -0.5).slice(0,20) }));
}
