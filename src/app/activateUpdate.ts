// Workbox-window can classify a second worker installed within a minute as
// external. A confirmed native controllerchange is the reload boundary instead.
export function activateUpdate(update: (reload?: boolean) => Promise<void>, serviceWorker = navigator.serviceWorker): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => { serviceWorker.removeEventListener('controllerchange', changed); window.clearTimeout(timer); };
    const changed = () => { cleanup(); resolve(); };
    const timer = window.setTimeout(() => { cleanup(); reject(new Error('Service worker activation timed out.')); }, 15_000);
    serviceWorker.addEventListener('controllerchange', changed, { once: true });
    void update(true).catch(error => { cleanup(); reject(error); });
  });
}
