import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function RouteFocus() {
  const { pathname } = useLocation();
  useEffect(() => {
    const heading = document.querySelector('main h1');
    document.title = `${heading?.textContent ?? 'Página no encontrada'} · Gastos compartidos · Demostración`;
    document.getElementById('main')?.focus();
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
