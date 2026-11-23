import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { Notice } from '../../components/Notice';
import { PageHeader } from '../../components/PageHeader';
import { parseInvitationCode } from '../../repositories/access/inviteCode';
import type { InvitationCode } from '../../repositories/access/inviteCode';
import { joinTrip, validateInvitation } from '../../repositories/access/invitations';
import { useSession } from './session';
import { useAction } from './useAction';
import { ActionFeedback } from './ActionFeedback';
import { QrReader } from './QrReader';

export function JoinPage({ initialCode }: { initialCode: string }) {
  const { client } = useSession(), action = useAction(), navigate = useNavigate();
  const [raw, setRaw] = useState(initialCode), [name, setName] = useState(''), [code, setCode] = useState<InvitationCode | null>(null);
  return <><PageHeader title="Unirse a un viaje" description="Escanea el QR, pega el enlace o introduce el código completo." />
    <Notice title="Conserva tu acceso"><p>Si eliminas los datos de la aplicación o cambias de dispositivo, puedes perder el acceso a esta identidad anónima. No hay recuperación automática por nombre.</p></Notice>
    <ActionFeedback error={action.error} message={action.message} />
    {!code ? <><form onSubmit={event => { event.preventDefault(); void action.run(async () => { const parsed = parseInvitationCode(raw); await validateInvitation(client,parsed); setCode(parsed); action.setMessage('Invitación disponible. El cupo se confirmará al ingresar.'); }); }}>
      <Field label="Código completo o enlace" value={raw} onChange={event => setRaw(event.target.value)} required autoComplete="off" spellCheck={false} />
      <Button type="submit" disabled={action.pending}>{action.pending ? 'Validando…' : 'Validar invitación'}</Button></form><QrReader onCode={value => { setRaw(value); action.setMessage('QR leído. Valida la invitación para continuar.'); }} /></>
      : <form onSubmit={event => { event.preventDefault(); void action.run(async () => { const id = await joinTrip(client,code,name); setRaw(''); setCode(null); navigate(`/viajes/${id}`,{ replace: true, state: { joined: true } }); }); }}><Field label="Tu nombre en el viaje" value={name} onChange={event => setName(event.target.value)} maxLength={60} required autoComplete="nickname" /><Button type="submit" disabled={action.pending}>{action.pending ? 'Confirmando ingreso…' : 'Unirme al viaje'}</Button><Button variant="quiet" disabled={action.pending} onClick={() => setCode(null)}>Cambiar código</Button></form>}
    <p className="section-note"><Link to="/viajes">Volver a mis viajes</Link></p>
  </>;
}
