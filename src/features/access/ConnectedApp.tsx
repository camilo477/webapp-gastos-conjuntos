import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Container } from '../../components/Container';
import { Dialog } from '../../components/Dialog';
import { Icon } from '../../components/Icon';
import { Notice } from '../../components/Notice';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { RouteFocus } from '../../app/RouteFocus';
import { useTheme } from '../../app/useTheme';
import type { ThemePreference } from '../../app/theme';
import { useNetwork } from '../../app/useNetwork';
import { logout } from '../../repositories/access/auth';
import { SessionProvider } from './SessionProvider';
import { useSession } from './session';
import { useAction } from './useAction';
import { ActionFeedback } from './ActionFeedback';
import { AuthPage } from './AuthPage';
import { VerificationPage } from './VerificationPage';
import { TripsListPage } from './TripsListPage';
import { TripFormPage } from './TripFormPage';
import { TripPage } from './TripPage';
import { JoinPage } from './JoinPage';
import { SyncProvider } from '../../sync/SyncProvider';
import { SessionActivity } from '../financial/SyncActivity';
import { PwaStatus } from '../../app/PwaStatus';

function ConnectedShell({ initialCode }: { initialCode: string }) {
  const { client, user } = useSession(), { pathname } = useLocation(), theme = useTheme(), online = useNetwork(), action = useAction();
  const [menu, setMenu] = useState(false), [confirmLogout, setConfirmLogout] = useState(false);
  const showBottom = !!user && !['/registro','/login','/recuperar','/join','/viajes/nuevo'].includes(pathname) && !pathname.endsWith('/editar');
  const bottom = useRef<HTMLElement>(null);
  const activeTrip = pathname.match(/^\/viajes\/([0-9a-f-]{36})(?:\/|$)/i)?.[1];
  useEffect(() => {
    const element = bottom.current;
    if (!showBottom || !element) return;
    const measure = () => document.documentElement.style.setProperty('--nav-height', `${element.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure); observer.observe(element);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty('--nav-height'); };
  }, [showBottom]);
  return <><a className="skip-link" href="#main">Saltar al contenido</a><div className="demo-bar"><span><strong>Entorno local</strong> · Firebase Emulator</span><label className="theme-control">Tema<select value={theme.preference} onChange={event => theme.changeTheme(event.target.value as ThemePreference)}><option value="system">Sistema</option><option value="light">Claro</option><option value="dark">Oscuro</option></select></label></div>
    {!theme.saved && <p role="status" className="preference-warning">El tema se aplica, pero no se pudo conservar.</p>}
    <div className="app-shell"><aside className="sidebar"><Link className="brand" to="/viajes"><span className="brand-symbol"><Icon name="mountain" /></span><span>Gastos<br />compartidos</span></Link><nav className="navigation" aria-label="Navegación principal"><NavLink className="nav-link" to="/viajes">Mis viajes</NavLink><NavLink className="nav-link" to="/join">Unirme a un viaje</NavLink><NavLink className="nav-link" to="/estado">Actividad</NavLink></nav><p className="sidebar-bottom small muted">Datos del emulador local.<br />Sin conexión a producción.</p></aside>
      <div className="workspace"><header className="topbar"><Link to="/viajes">Mis viajes</Link><div className="top-actions"><span className="status">{online ? 'Entorno local' : 'Sin conexión'}</span><button type="button" className="icon-button" aria-label="Más opciones" onClick={() => setMenu(true)}><Icon name="more" /></button></div></header>
        <PwaStatus connected /><Container form={/registro|login|recuperar|join|nuevo|editar/.test(pathname)}><div key={pathname === '/join' ? 'public-join' : user?.uid ?? 'signed-out'}><Routes>
          <Route path="/" element={<Navigate to="/viajes" replace />} /><Route path="/login" element={<AuthPage mode="login" />} /><Route path="/registro" element={<AuthPage mode="register" />} /><Route path="/recuperar" element={<AuthPage mode="reset" />} /><Route path="/verificar" element={<VerificationPage />} />
          <Route path="/viajes" element={<TripsListPage />} /><Route path="/viajes/nuevo" element={<TripFormPage />} /><Route path="/viajes/:id/*" element={<TripPage />} /><Route path="/viajes/:id/personas" element={<TripPage view="people" />} /><Route path="/viajes/:id/invitaciones" element={<TripPage view="invites" />} /><Route path="/viajes/:id/editar" element={<TripPage view="edit" />} />
          <Route path="/join" element={<JoinPage initialCode={initialCode} />} /><Route path="/estado" element={<><PageHeader title="Actividad" /><SessionActivity /><Notice title="Registro financiero del viaje"><p>Abre un viaje para consultar gastos, abonos e historial confirmados. Las operaciones guardadas en este dispositivo se intentan sincronizar al volver a conectar.</p></Notice><Link to="/viajes">Volver a mis viajes</Link></>} />
          <Route path="*" element={<><PageHeader title="Página no encontrada" /><Link to="/viajes">Volver a mis viajes</Link></>} />
        </Routes></div><RouteFocus /></Container>
      </div>{showBottom && <nav ref={bottom} className="bottom-nav" aria-label="Navegación principal móvil"><NavLink className="nav-link" to={activeTrip ? `/viajes/${activeTrip}` : '/viajes'} end><Icon name="house" />Inicio</NavLink>{activeTrip ? <NavLink className="nav-link" to={`/viajes/${activeTrip}/balance`}><Icon name="scale" />Balance</NavLink> : <span className="nav-link muted"><Icon name="scale" />Balance</span>}<NavLink className="nav-link" to={activeTrip ? `/viajes/${activeTrip}/actividad` : '/estado'}><Icon name="activity" />Actividad</NavLink></nav>}
    </div><Dialog open={menu} title="Más opciones" onClose={() => setMenu(false)}><nav className="navigation" aria-label="Opciones de sesión"><Link className="nav-link" to="/viajes" onClick={() => setMenu(false)}>Mis viajes</Link><Link className="nav-link" to="/join" onClick={() => setMenu(false)}>Unirme a un viaje</Link>{user && !user.isAnonymous && <Link className="nav-link" to="/verificar" onClick={() => setMenu(false)}>Verificación de correo</Link>}</nav><p className="small muted">{user?.isAnonymous ? 'Sesión anónima en este navegador' : user?.email ?? 'Sin sesión'}</p>{user && <Button variant="secondary" onClick={() => { setMenu(false); setConfirmLogout(true); }}>Cerrar sesión</Button>}</Dialog>
    <Dialog open={confirmLogout} title="Cerrar sesión" onClose={() => setConfirmLogout(false)}><p>{user?.isAnonymous ? 'Al salir puedes perder el acceso a esta identidad anónima. El nombre no permite recuperarla automáticamente. El organizador podrá invitarte como una identidad nueva. Las propuestas locales se conservan ligadas a esta identidad y no se enviarán desde otra cuenta.' : 'Se retirará la vista de tus viajes de esta sesión. Las operaciones guardadas localmente se conservan separadas por identidad y no se enviarán con otra cuenta. Vuelve a esta cuenta para revisarlas.'}</p><ActionFeedback error={action.error} /><div className="action-row"><Button disabled={action.pending} onClick={() => { void action.run(async () => { await logout(client); setConfirmLogout(false); }); }}>Confirmar cierre de sesión</Button><Button variant="secondary" onClick={() => setConfirmLogout(false)}>Cancelar</Button></div></Dialog>
  </>;
}

export default function ConnectedApp() {
  const [initialCode] = useState(() => {
    const value = window.location.pathname === '/join' ? window.location.hash.slice(1) : '';
    if (value) window.history.replaceState(window.history.state,'',window.location.pathname + window.location.search);
    return value;
  });
  return <SessionProvider><SyncProvider><ConnectedShell initialCode={initialCode} /></SyncProvider></SessionProvider>;
}
