import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { operationIdSchema } from '../../domain';
import { Button } from '../../components/Button';
import { Notice } from '../../components/Notice';
import { PageHeader } from '../../components/PageHeader';
import type { TripRecord } from '../../repositories/access/contracts';
import { watchTrip } from '../../repositories/access/trips';
import { useNetwork } from '../../app/useNetwork';
import { useSession } from './session';
import { TripFormPage } from './TripFormPage';
import { PeoplePage } from './PeoplePage';
import { InvitationsPage } from './InvitationsPage';
import { TripFinance } from '../financial/TripFinance';

export function TripPage({ view = 'details' }: { view?: 'details' | 'people' | 'invites' | 'edit' }) {
  const { id = '' } = useParams(), { client, user } = useSession(), online = useNetwork();
  const location = useLocation();
  const [data, setData] = useState<{ id: string; uid: string; trip: TripRecord } | null>(null), [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!user || !online || !operationIdSchema.safeParse(id).success) return;
    return watchTrip(client,id,user.uid, trip => {
      setData({ id, uid: user.uid, trip }); setFailed(false);
      try { localStorage.setItem(`gastos.activeTrip.${client.app.options.projectId}.${user.uid}`,id); } catch { /* Selection is optional, never an access credential. */ }
    }, () => { setData(null); setFailed(true); });
  }, [client,id,user,online]);
  if (!user) return <Navigate to="/login" replace />;
  if (!online && (!data || data.id !== id || data.uid !== user.uid || view !== 'details')) return <Notice kind="warning" title="Sin conexión"><p>Conecta para confirmar el acceso y administrar el viaje.</p></Notice>;
  if (failed || !operationIdSchema.safeParse(id).success) return <><PageHeader title="Acceso no disponible" /><Notice kind="error" title="No se pudo confirmar tu acceso"><p>Puede haber sido retirado o el viaje no estar disponible. No se recupera una identidad por su nombre.</p></Notice><Link to="/viajes">Volver a mis viajes</Link></>;
  const trip = data?.id === id && data.uid === user.uid ? data.trip : null;
  if (!trip) return <p role="status">Confirmando acceso al viaje…</p>;
  if (view === 'people') return <PeoplePage trip={trip} />;
  if (view === 'invites') return <InvitationsPage trip={trip} />;
  if (view === 'edit') return <TripFormPage existing={trip} />;
  return <><PageHeader title={trip.title} description={`${trip.startDate} – ${trip.endDate} · ${trip.currency}`} eyebrow={trip.status === 'closed' ? 'Viaje finalizado' : 'El viaje, en orden'} />
    {location.state?.joined === true && <Notice title="Ya formas parte del viaje"><p>Tu acceso está confirmado en el servidor. Conserva los datos de este navegador para mantener tu identidad.</p></Notice>}
    {!online && <Notice kind="warning" title="Sin conexión"><p>Las operaciones no están confirmadas. El formulario permanece solo en esta pantalla; no existe guardado offline.</p></Notice>}
    <TripFinance key={trip.id} trip={trip} />
    <details open className="form-block"><summary>Información y acceso al viaje</summary><dl className="trip-facts"><div><dt>Destino</dt><dd>{trip.destination || 'Sin destino definido'}</dd></div><div><dt>Zona horaria</dt><dd>{trip.timezone}</dd></div><div><dt>Participantes activos</dt><dd>{trip.activeUids.length}/10, incluido el organizador</dd></div><div><dt>Tu acceso</dt><dd>{trip.ownerId === user.uid ? 'Organizador' : 'Participante'}</dd></div></dl>
    <div className="action-row"><Link className="button secondary" to={`/viajes/${id}/personas`}>Ver participantes</Link>{trip.ownerId === user.uid && <><Link className="button primary" to={`/viajes/${id}/invitaciones`}>Gestionar invitaciones</Link>{trip.status === 'active' && <Link to={`/viajes/${id}/editar`}>Editar viaje</Link>}</>}</div>
    <Button disabled aria-describedby="closure-help">Finalizar viaje</Button><p id="closure-help" className="field-hint">El cierre está bloqueado hasta verificar el registro financiero completo y sus conflictos. No podemos detectar cambios pendientes en otros dispositivos.</p>
    </details>
  </>;
}
