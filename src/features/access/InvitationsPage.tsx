import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { Notice } from '../../components/Notice';
import { PageHeader } from '../../components/PageHeader';
import { createInvitation, listInvitations, revokeInvitation } from '../../repositories/access/invitations';
import { invitationLink, manualInvitationCode } from '../../repositories/access/inviteCode';
import type { InvitationCode } from '../../repositories/access/inviteCode';
import type { InviteRecord, TripRecord } from '../../repositories/access/contracts';
import { useSession } from './session';
import { useAction } from './useAction';
import { ActionFeedback } from './ActionFeedback';

export function InvitationsPage({ trip }: { trip: TripRecord }) {
  const { client, user } = useSession(), action = useAction();
  const [rows, setRows] = useState<InviteRecord[] | null>(null), [selected, setSelected] = useState<InvitationCode | null>(null), [qr, setQr] = useState('');
  const [now, setNow] = useState(Date.now);
  const [loadFailed, setLoadFailed] = useState(false), [qrFailed, setQrFailed] = useState(false);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()),30000); return () => window.clearInterval(timer); }, []);
  const isOwner = trip.ownerId === user?.uid;
  useEffect(() => {
    if (!isOwner) return;
    let active = true;
    void listInvitations(client,trip.id).then(value => { if (active) setRows(value); }).catch(() => { if (active) { setRows(null); setLoadFailed(true); } });
    return () => { active = false; };
  }, [client,trip.id,isOwner]);
  const link = selected ? invitationLink(window.location.origin,selected) : '';
  useEffect(() => {
    let active = true;
    if (link) void import('qrcode').then(module => module.toDataURL(link,{ width: 512, margin: 4, errorCorrectionLevel: 'M' })).then(value => { if (active) { setQr(value); setQrFailed(false); } }).catch(() => { if (active) { setQr(''); setQrFailed(true); } });
    return () => { active = false; };
  }, [link]);
  if (!isOwner) return <Notice title="Solo el organizador"><p>Las invitaciones privadas se administran desde la cuenta del organizador.</p></Notice>;
  return <><Link className="text-button" to={`/viajes/${trip.id}`}>Volver al viaje</Link><PageHeader title="Invitaciones" description={`${trip.activeUids.length}/10 participantes · validez máxima de siete días`} />
    <ActionFeedback error={action.error} message={action.message} />
    <Button disabled={action.pending || trip.status !== 'active' || trip.activeUids.length >= 10} onClick={() => { void action.run(async () => { const code = await createInvitation(client,trip.id); setQr(''); setSelected(code); setRows(await listInvitations(client,trip.id)); }); }}>Generar invitación</Button>
    {trip.activeUids.length >= 10 && <p className="field-hint">El grupo está completo. Las reglas también protegen la décima plaza.</p>}
    {selected && <section className="section" aria-label="Invitación seleccionada">{qr ? <img className="invite-qr" src={qr} alt="QR local de la invitación" /> : <p role="status">{qrFailed ? 'No se pudo generar el QR. Puedes compartir el enlace o código completo.' : 'Preparando QR local…'}</p>}
      <Field label="Enlace de invitación" value={link} readOnly onFocus={event => event.target.select()} /><Field label="Código completo" value={manualInvitationCode(selected)} readOnly onFocus={event => event.target.select()} />
      <div className="action-row"><Button variant="secondary" onClick={() => { void action.run(async () => { await navigator.clipboard.writeText(link); action.setMessage('Enlace copiado.'); }); }}>Copiar enlace</Button>{typeof navigator.share === 'function' && <Button variant="secondary" onClick={() => { void action.run(async () => { await navigator.share({ title: 'Invitación a un viaje', url: link }); action.setMessage('Invitación compartida mediante el dispositivo.'); }); }}>Compartir invitación</Button>}</div><p className="field-hint">Si el navegador no permite copiar, selecciona el código completo. El QR se genera aquí y no envía el token a terceros.</p>
    </section>}
    <section className="section"><h2>Administrar invitaciones</h2>{rows === null ? <p role={loadFailed ? 'alert' : 'status'}>{loadFailed ? 'No se pudieron consultar las invitaciones. Comprueba la conexión y vuelve a abrir esta pantalla.' : 'Consultando invitaciones…'}</p> : rows.length === 0 ? <p className="section-note">Todavía no hay invitaciones.</p> : <ul className="plain-list">{rows.map((invite,index) => <li className="trip-row" key={invite.token}><div><strong>Invitación {index + 1}</strong><p className="small muted">{invite.revoked ? 'Revocada' : invite.expiresAt.toMillis() <= now ? 'Caducada' : 'Vigente'} · vence {invite.expiresAt.toDate().toLocaleString('es-CO')}</p></div><div className="action-row"><Button variant="secondary" disabled={invite.revoked} onClick={() => { setQr(''); setSelected({ tripId: trip.id, token: invite.token }); }}>Mostrar QR y código</Button><Button variant="quiet" disabled={action.pending || invite.revoked} onClick={() => { void action.run(async () => { await revokeInvitation(client,{ tripId: trip.id, token: invite.token }); setSelected(null); setRows(await listInvitations(client,trip.id)); }); }}>Revocar invitación</Button></div></li>)}</ul>}</section>
  </>;
}
