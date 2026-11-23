import { Link, Navigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { refreshVerification, sendVerification } from '../../repositories/access/auth';
import { useSession } from './session';
import { useAction } from './useAction';
import { ActionFeedback } from './ActionFeedback';

export function VerificationPage() {
  const { client, user } = useSession(), action = useAction();
  if (!user) return <Navigate to="/login" replace />;
  return <><PageHeader title="Verificar correo" description={user.email ?? 'Esta identidad no tiene correo.'} />
    <p>{user.emailVerified ? 'Tu correo está verificado.' : 'Abre el enlace de verificación entregado por Firebase Auth Emulator y actualiza el estado. La creación de viajes requiere correo verificado.'}</p>
    <ActionFeedback error={action.error} message={action.message} />
    <div className="action-row"><Button disabled={action.pending || user.isAnonymous} onClick={() => { void action.run(async () => { await refreshVerification(client); action.setMessage('Estado de verificación actualizado.'); }); }}>Actualizar verificación</Button><Button variant="secondary" disabled={action.pending || user.isAnonymous} onClick={() => { void action.run(async () => { await sendVerification(client); action.setMessage('Enlace solicitado al emulador local.'); }); }}>Reenviar verificación</Button><Link to="/viajes">Mis viajes</Link></div>
  </>;
}
