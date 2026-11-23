import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { Notice } from '../../components/Notice';
import { watchTrips } from '../../repositories/access/trips';
import type { TripRecord } from '../../repositories/access/contracts';
import { useSession } from './session';
import { useSyncServices } from '../../sync/context';
import { deserializeTrip } from '../../sync/storage';
import { useNetwork } from '../../app/useNetwork';

export function TripsListPage() {
  const { client, user } = useSession(), online = useNetwork();
  const [data, setData] = useState<{ uid: string; rows: TripRecord[] } | null>(null), [error, setError] = useState(false);
  const services = useSyncServices();
  useEffect(() => {
    if (!services || !user) return;
    let active = true;
    void services.store.trips().then(rows => { if (active) setData(previous => previous?.uid === user.uid && online ? previous : { uid: user.uid,rows: rows.filter(row => !row.blocked).map(row => deserializeTrip(row.trip)) }); }).catch(() => {});
    return () => { active = false; };
  },[services,user,online]);
  const [selectedId] = useState(() => {
    try { return user ? localStorage.getItem(`gastos.activeTrip.${client.app.options.projectId}.${user.uid}`) : null; }
    catch { return null; }
  });
  useEffect(() => {
    if (!user || !online) return;
    return watchTrips(client,user.uid, rows => { setData({ uid: user.uid, rows }); setError(false); }, () => { setData(null); setError(true); });
  }, [client,user?.uid,online,user]);
  if (!user) return <><PageHeader title="Gastos compartidos" description="Accede como organizador o entra con una invitación." /><div className="action-row"><Link className="button primary" to="/login">Iniciar sesión</Link><Link className="button secondary" to="/registro">Crear cuenta</Link><Link to="/join">Unirme con invitación</Link></div></>;

  const rows = data?.uid === user.uid ? data.rows : null;
  return <><PageHeader title="Mis viajes" description={user.isAnonymous ? 'Sesión de invitado conservada en este navegador.' : user.email ?? ''}
    action={!user.isAnonymous && user.emailVerified ? <Link className="button primary" to="/viajes/nuevo">Crear viaje</Link> : undefined} />
    {!online && <Notice title="Sin conexión" kind="warning"><p>Solo se muestran viajes descargados por esta identidad. Los permisos se volverán a confirmar al conectar.</p></Notice>}
    {!user.isAnonymous && !user.emailVerified && <Notice title="Verifica tu correo"><p><Link to="/verificar">Completar verificación</Link> antes de crear un viaje.</p></Notice>}
    {user.isAnonymous && <Notice title="Conserva tu identidad"><p>Si eliminas los datos de la aplicación o cambias de dispositivo, puedes perder el acceso a esta identidad anónima. Tu nombre no permite recuperarla automáticamente.</p></Notice>}
    {rows?.some(trip => trip.id === selectedId) && <p className="section-note">Viaje seleccionado: {rows.find(trip => trip.id === selectedId)!.title}. Abre otro viaje para cambiar la selección.</p>}
    {error ? <Notice title="No se pudo confirmar el acceso" kind="error"><p>Comprueba los emuladores y vuelve a abrir esta pantalla.</p></Notice> : !rows ? <p role="status">Consultando viajes…</p> : rows.length === 0 ? <EmptyState title="Todavía no hay viajes" icon="mapPin">Crea un viaje como organizador o entra con una invitación.</EmptyState> : <>{(['active','closed'] as const).map(status => <section className="section" key={status}><h2>{status === 'active' ? 'Viajes activos' : 'Historial finalizado'}</h2><ul className="plain-list">{rows.filter(trip => trip.status === status).map(trip => <li className="trip-row" key={trip.id}><div><h3>{trip.title}</h3><p className="small muted">{trip.startDate} – {trip.endDate} · {trip.currency} · {trip.activeUids.length}/10 personas</p></div><Link className="button secondary" to={`/viajes/${trip.id}`}>Abrir viaje</Link></li>)}</ul></section>)}</>}
    <p className="section-note"><Link to="/join">Introducir otra invitación</Link></p>
  </>;
}
