import { lazy, Suspense, useEffect, useState } from 'react';
import { firebaseConfiguration } from '../repositories/firebase/config';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { Container } from '../components/Container';
import { Dialog } from '../components/Dialog';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { SyncStatus } from '../components/SyncStatus';
import { Button } from '../components/Button';
import { HomePage } from '../features/demo/HomePage';
import { BalancePage } from '../features/demo/BalancePage';
import { ExpensePage } from '../features/demo/ExpensePage';
import { TripsPage } from '../features/demo/TripsPage';
import { BudgetPage, PeoplePage } from '../features/demo/SupportingPages';
import { ActivityPage } from '../features/status/ActivityPage';
import { Navigation } from './Navigation';
import { PwaStatus } from './PwaStatus';
import { RouteFocus } from './RouteFocus';
import { useTheme } from './useTheme';
import type { ThemePreference } from './theme';

const ConnectedApp = lazy(() => import('../features/access/ConnectedApp'));

export function App({ initialCode = '' }: { initialCode?: string }) {
  return firebaseConfiguration.status === 'emulators' ? <Suspense fallback={<main><h1>Abriendo entorno local…</h1></main>}><ConnectedApp initialCode={initialCode} /></Suspense> : <DemoApp />;
}

function DemoApp() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { preference, changeTheme, saved } = useTheme();
  const form = pathname === '/gasto';
  useEffect(() => {
    const dock = document.querySelector('.add-dock');
    if (!dock) return;
    const observer = new ResizeObserver(() => document.documentElement.style.setProperty('--dock-height', `${dock.getBoundingClientRect().height}px`));
    observer.observe(dock);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty('--dock-height'); };
  }, [pathname]);
  return <>
    <a className="skip-link" href="#main">Saltar al contenido</a>
    <div className="demo-bar"><span><strong>Demostración</strong> · Fase 2 · datos ficticios</span><label className="theme-control">Tema<select value={preference} onChange={event => changeTheme(event.target.value as ThemePreference)}><option value="system">Sistema</option><option value="light">Claro</option><option value="dark">Oscuro</option></select></label></div>
    {!saved && <p className="preference-warning" role="status">El tema se aplica, pero no se pudo guardar en este navegador.</p>}
    <div className={`app-shell ${form ? 'no-bottom' : ''} ${pathname === '/' ? 'has-add-dock' : ''}`}>
      <aside className="sidebar"><Link className="brand" to="/viajes"><span className="brand-symbol"><Icon name="mountain" /></span><span>Gastos<br />compartidos</span></Link><Navigation /><p className="sidebar-bottom small muted">Ejemplo local.<br />Sin cuenta ni datos personales.</p></aside>
      <div className="workspace"><header className="topbar"><div className="breadcrumb"><Link to="/viajes">Mis viajes</Link><span aria-hidden="true">/</span><span>Viaje de ejemplo</span></div><div className="top-actions"><SyncStatus /><button className="icon-button" type="button" aria-label="Más opciones" aria-haspopup="dialog" onClick={() => setMenuOpen(true)}><Icon name="more" /></button></div></header>
        <PwaStatus />
        <Container form={form}><Routes>
          <Route path="/" element={<HomePage />} /><Route path="/balance" element={<BalancePage />} /><Route path="/actividad" element={<ActivityPage />} /><Route path="/viajes" element={<TripsPage />} /><Route path="/gasto" element={<ExpensePage />} /><Route path="/presupuesto" element={<BudgetPage />} /><Route path="/personas" element={<PeoplePage />} />
          <Route path="*" element={<><h1>Página no encontrada</h1><EmptyState title="Esta dirección no existe">Puedes volver al inicio de la demostración.</EmptyState><Link className="button primary" to="/">Volver a Inicio</Link></>} />
        </Routes><RouteFocus /></Container>
      </div>
      {!form && <Navigation mobile />}
      {pathname === '/' && <div className="add-dock"><Button disabled aria-label="Agregar gasto, pendiente de implementación">Agregar gasto · pendiente</Button></div>}
    </div>
    <Dialog open={menuOpen} title="Más opciones" onClose={() => setMenuOpen(false)}><Navigation secondaryOnly onNavigate={() => setMenuOpen(false)} /><p className="small muted">Estadísticas y resumen estarán disponibles en fases posteriores.</p></Dialog>
  </>;
}
