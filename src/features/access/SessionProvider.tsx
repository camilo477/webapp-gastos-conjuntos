import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { firebaseConfiguration } from '../../repositories/firebase/config';
import type { FirebaseClient } from '../../repositories/firebase/client';
import { prepareAuth } from '../../repositories/access/auth';
import { accessError } from '../../repositories/access/errors';
import { Notice } from '../../components/Notice';
import { sessionContext } from './session';
import type { SessionUser } from './session';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<FirebaseClient | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    let active = true, unsubscribe = () => {};
    void import('../../repositories/firebase/client').then(async ({ getFirebaseClient }) => {
      const value = getFirebaseClient(firebaseConfiguration);
      if (!value) throw new Error('Emulators required.');
      await prepareAuth(value);
      if (!active) return;
      setClient(value);
      unsubscribe = onIdTokenChanged(value.auth, current => {
        if (!active) return;
        setUser(current ? { uid: current.uid, email: current.email, displayName: current.displayName, emailVerified: current.emailVerified, isAnonymous: current.isAnonymous } : null);
        setReady(true);
      }, reason => { if (active) setError(accessError(reason)); });
    }).catch(reason => { if (active) setError(accessError(reason)); });
    return () => { active = false; unsubscribe(); };
  }, []);
  if (error) return <main id="main"><Notice kind="error" title="No se pudo preparar la sesión"><p>{error}</p></Notice></main>;
  if (!ready || !client) return <main id="main" aria-busy="true"><h1>Preparando sesión local…</h1></main>;
  return <sessionContext.Provider value={{ client, user }}>{children}</sessionContext.Provider>;
}
