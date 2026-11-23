import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

// This is a browser connectivity hint, never a Firebase sync confirmation.
export function useNetwork() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}
