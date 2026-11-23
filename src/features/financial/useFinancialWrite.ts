import { useEffect, useRef, useState } from 'react';
import { ZodError } from 'zod';
import { DomainError } from '../../domain';
import { AccessError } from '../../repositories/access/errors';
import { useSyncServices } from '../../sync/context';
import { LocalStorageError } from '../../sync/storage';
import type { FinancialOperation } from '../../repositories/financial/events';
import { useSession } from '../access/session';

export function useFinancialWrite(tripId: string,done: () => void,draftId?: string) {
  const { client,user } = useSession(), services = useSyncServices();
  const [operations,setOperations] = useState<FinancialOperation[]>([]), [pending,setPending] = useState(false), [error,setError] = useState('');
  const [savedLocal,setSavedLocal] = useState(false), [imageError,setImageError] = useState('');
  const sending = useRef(false);
  useEffect(() => {
    if (!operations.length) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload',warn); return () => window.removeEventListener('beforeunload',warn);
  },[operations]);
  const submitGroup = async (build: () => FinancialOperation[],afterSave?: (event: FinancialOperation) => Promise<void>) => {
    if (sending.current) return;
    sending.current = true; setPending(true); setError('');
    try {
      const values = operations.length ? operations : build(); setOperations(values);
      if (!services || services.store.uid !== user?.uid || client.auth.currentUser?.uid !== user.uid) throw new LocalStorageError();
      if (!savedLocal) await services.store.enqueue(tripId,values,draftId);
      if (afterSave) {
        setSavedLocal(true); setImageError('');
        try { await afterSave(values[0]!); }
        catch { setImageError('El gasto está guardado en este dispositivo. No se pudo conservar la miniatura; puedes reintentar la imagen o continuar sin ella.'); return; }
      }
      setOperations([]); setSavedLocal(false);
      if (client.auth.currentUser?.uid === user.uid) done();
    } catch (reason) {
      setError(reason instanceof ZodError ? reason.issues.map(issue => issue.message).join(' ') : reason instanceof DomainError || reason instanceof AccessError || reason instanceof LocalStorageError || reason instanceof Error && !('code' in reason) ? reason.message : 'No se pudo guardar en este dispositivo. Conserva los datos y vuelve a intentarlo.');
    } finally { sending.current = false; setPending(false); }
  };
  return { operation: operations[0] ?? null,operations,pending,error,savedLocal,imageError,
    continueWithoutImage: () => { setOperations([]); setImageError(''); setSavedLocal(false); if (client.auth.currentUser?.uid === user?.uid) done(); },
    submit: (build: () => FinancialOperation,afterSave?: (event: FinancialOperation) => Promise<void>) => submitGroup(() => [build()],afterSave),submitGroup,locked: pending || operations.length > 0 };
}
