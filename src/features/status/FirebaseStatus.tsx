import { useEffect, useState } from 'react';
import { firebaseConfiguration } from '../../repositories/firebase/config';
import { Notice } from '../../components/Notice';

export function FirebaseStatus() {
  const [status, setStatus] = useState('Preparando SDK local…');
  useEffect(() => {
    if (firebaseConfiguration.status !== 'emulators') return;
    let active = true;
    void import('../../repositories/firebase/client').then(({ getFirebaseClient }) => {
      getFirebaseClient(firebaseConfiguration);
      if (active) setStatus('SDK local inicializado. Auth sin usuarios y Firestore con acceso denegado; disponibilidad del emulador sin comprobar.');
    }).catch(() => {
      if (active) setStatus('No se pudo inicializar el SDK local. La demostración sigue disponible.');
    });
    return () => { active = false; };
  }, []);
  if (firebaseConfiguration.status !== 'emulators') return <Notice title={firebaseConfiguration.status === 'demo' ? 'Firebase sin configurar' : 'Configuración Firebase no válida'} kind={firebaseConfiguration.status === 'invalid' ? 'error' : 'info'}><p>{firebaseConfiguration.message}</p></Notice>;
  return <Notice title="Firebase · emuladores locales"><p>{status}</p></Notice>;
}
