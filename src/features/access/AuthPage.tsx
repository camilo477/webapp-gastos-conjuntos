import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { Notice } from '../../components/Notice';
import { PageHeader } from '../../components/PageHeader';
import { loginOrganizer, registerOrganizer, resetPassword } from '../../repositories/access/auth';
import { useSession } from './session';
import { useAction } from './useAction';
import { ActionFeedback } from './ActionFeedback';

export function AuthPage({ mode }: { mode: 'login' | 'register' | 'reset' }) {
  const { client, user } = useSession(), action = useAction(), navigate = useNavigate();
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const title = mode === 'register' ? 'Crear cuenta' : mode === 'reset' ? 'Recuperar acceso' : 'Iniciar sesión';
  if (user && mode !== 'reset') return <><PageHeader title="Ya tienes una sesión" /><Notice title={user.isAnonymous ? 'Sesión de invitado' : 'Cuenta activa'}><p>Para acceder con otra identidad, cierra esta sesión desde el menú. El nombre no recupera una identidad anterior.</p></Notice><Link className="button primary" to="/viajes">Ver mis viajes</Link></>;
  return <><PageHeader title={title} description="Cuenta del organizador · entorno local de emuladores" />
    <form onSubmit={event => { event.preventDefault(); void action.run(async () => {
      if (mode === 'reset') { await resetPassword(client,email); action.setMessage('Si la cuenta existe, recibirás instrucciones. En este entorno, el enlace se entrega en el emulador local.'); }
      else if (mode === 'register') { await registerOrganizer(client,email,password,name); navigate('/verificar'); }
      else { await loginOrganizer(client,email,password); navigate('/viajes'); }
    }); }}>
      {mode === 'register' && <Field label="Tu nombre" value={name} onChange={event => setName(event.target.value)} autoComplete="name" required maxLength={60} />}
      <Field label="Correo electrónico" value={email} onChange={event => setEmail(event.target.value)} type="email" autoComplete="email" required />
      {mode !== 'reset' && <Field label="Contraseña" value={password} onChange={event => setPassword(event.target.value)} type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={6} required />}
      <ActionFeedback error={action.error} message={action.message} /><Button type="submit" disabled={action.pending}>{action.pending ? 'Espera…' : title}</Button>
    </form>
    <div className="action-row"><Link to="/login">Iniciar sesión</Link><Link to="/registro">Crear cuenta</Link><Link to="/recuperar">Olvidé mi contraseña</Link></div>
    <p className="section-note"><Link to="/join">Tengo una invitación</Link> · No necesitas correo para entrar como invitado.</p>
  </>;
}
