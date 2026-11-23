import { useRegisterSW } from 'virtual:pwa-register/react';
import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { activateUpdate } from './activateUpdate';

export function PwaStatus() {
  const [error, setError] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const { offlineReady: [offlineReady], needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    // Reload only after the native activation confirmation below.
    onNeedReload() {},
    onRegisteredSW(_url, value) { setRegistration(value); },
    onRegisterError() { setError(true); },
  });
  async function applyUpdate() {
    setError(false);
    try {
      await activateUpdate(updateServiceWorker);
      window.location.reload();
    } catch { setError(true); }
  }
  useEffect(() => {
    if (!registration) return;
    const check = () => {
      if (navigator.onLine) void registration.update().catch(() => { /* Keep the current shell if checking fails. */ });
    };
    const visible = () => { if (document.visibilityState === 'visible') check(); };
    window.addEventListener('online', check);
    document.addEventListener('visibilitychange', visible);
    const timer = window.setInterval(check, 60 * 60 * 1000);
    return () => {
      window.removeEventListener('online', check);
      document.removeEventListener('visibilitychange', visible);
      window.clearInterval(timer);
    };
  }, [registration]);
  if (needRefresh) return <aside className="pwa-message" aria-label="Actualización de la aplicación"><Notice title="Hay una nueva versión"><p>Actualiza para cargar la nueva interfaz.</p><div className="action-row"><Button onClick={() => { void applyUpdate(); }}>Actualizar ahora</Button><Button variant="secondary" onClick={() => setNeedRefresh(false)}>Más tarde</Button></div>{error && <p role="alert">No se pudo actualizar. Puedes volver a intentarlo.</p>}</Notice></aside>;
  return <p className="shell-status" role="status">{error ? 'No se pudo preparar el modo offline. Reintenta al recargar con conexión.' : offlineReady ? 'Interfaz disponible sin conexión · sin sincronización de datos' : 'La interfaz offline se prepara después de la primera carga.'}</p>;
}
