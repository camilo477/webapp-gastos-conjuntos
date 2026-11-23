import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { Notice } from '../../components/Notice';
import { PageHeader } from '../../components/PageHeader';
import type { MemberRecord, TripRecord } from '../../repositories/access/contracts';
import { listMembers, revokeMember } from '../../repositories/access/trips';
import { useSession } from './session';
import { useAction } from './useAction';
import { ActionFeedback } from './ActionFeedback';

export function PeoplePage({ trip }: { trip: TripRecord }) {
  const { client, user } = useSession(), action = useAction();
  const [rows, setRows] = useState<MemberRecord[] | null>(null), [target, setTarget] = useState<MemberRecord | null>(null);
  const [loadFailed, setLoadFailed] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void listMembers(client,trip.id).then(value => { if (active) { setRows(value); setLoadFailed(false); } }).catch(() => { if (active) { setRows(null); setLoadFailed(true); } });
    return () => { active = false; };
  }, [client,trip.id,trip.membershipVersion,attempt]);
  return <><Link className="text-button" to={`/viajes/${trip.id}`}>Volver al viaje</Link><PageHeader title="Participantes" description={`${trip.activeUids.length}/10 activos · el historial se conserva`} />
    <ActionFeedback error={action.error} message={action.message} />
    {loadFailed ? <Notice kind="error" title="No se pudieron consultar los participantes"><p>Comprueba la conexión con los emuladores.</p><Button variant="secondary" onClick={() => setAttempt(value => value + 1)}>Reintentar consulta</Button></Notice> : !rows ? <p role="status">Consultando participantes…</p> : <ul className="plain-list">{rows.map(person => <li className="member-row" key={person.uid}><span className="avatar" aria-hidden="true">{person.displayName.slice(0,2).toUpperCase()}</span><div className="person-label"><strong>{person.displayName}</strong><p className="small muted">{trip.ownerId === person.uid ? 'Organizador' : 'Participante'} · {person.status === 'active' ? 'Acceso activo' : 'Acceso retirado'}</p></div>{trip.ownerId === user?.uid && person.uid !== user.uid && person.status === 'active' && <Button variant="secondary" onClick={() => setTarget(person)}>Revocar acceso de {person.displayName}</Button>}</li>)}</ul>}
    <Notice title="Identidad histórica protegida"><p>Revocar impide nuevos accesos al servidor y conserva persona e historial. No borra copias descargadas anteriormente.</p></Notice>
    <Button disabled aria-describedby="rebind-help">Reasignar identidad histórica</Button><p id="rebind-help" className="field-hint">No disponible hasta definir y verificar un procedimiento seguro para el nuevo titular. Coincidir en nombre no concede acceso.</p>
    <Dialog open={target !== null} title="Revocar acceso" onClose={() => setTarget(null)}><p>Se retirará el acceso de {target?.displayName}. Su identidad contable y sus movimientos históricos se conservan.</p><ActionFeedback error={action.error} /><div className="action-row"><Button disabled={action.pending} onClick={() => { if (target) void action.run(async () => { await revokeMember(client,trip.id,target.uid); setTarget(null); action.setMessage('Acceso retirado; historial conservado.'); }); }}>Confirmar revocación</Button><Button variant="secondary" onClick={() => setTarget(null)}>Cancelar</Button></div></Dialog>
  </>;
}
