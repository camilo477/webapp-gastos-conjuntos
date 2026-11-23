import { useEffect, useRef, useState } from 'react';
import { ZodError } from 'zod';
import { DomainError } from '../../domain';
import { AccessError } from '../../repositories/access/errors';
import { persistOperation } from '../../repositories/financial/events';
import type { FinancialOperation } from '../../repositories/financial/events';
import { useSession } from '../access/session';

export function useFinancialWrite(tripId: string, done: () => void) {
  const { client } = useSession();
  const [operation, setOperation] = useState<FinancialOperation | null>(null), [pending, setPending] = useState(false), [error, setError] = useState('');
  const sending = useRef(false);
  useEffect(() => {
    if (!operation) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [operation]);
  const submit = async (build: () => FinancialOperation) => {
    if (sending.current) return;
    sending.current = true;
    setPending(true); setError('');
    try {
      const value = operation ?? build(); setOperation(value);
      await persistOperation(client, tripId, value); setOperation(null); done();
    } catch (reason) {
      setError(reason instanceof ZodError ? reason.issues.map(issue => issue.message).join(' ') : reason instanceof DomainError || reason instanceof AccessError || reason instanceof Error && !('code' in reason) ? reason.message : 'Operación no confirmada. Comprueba conexión y acceso; reintenta con el mismo ID.');
    } finally { sending.current = false; setPending(false); }
  };
  return { operation, pending, error, submit, locked: pending || operation !== null };
}
