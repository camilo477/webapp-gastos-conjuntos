import { useState } from 'react';
import { accessError } from '../../repositories/access/errors';

export function useAction() {
  const [pending, setPending] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  async function run<T>(operation: () => Promise<T>): Promise<T | undefined> {
    setPending(true); setError(''); setMessage('');
    try { return await operation(); } catch (reason) { setError(accessError(reason)); return undefined; }
    finally { setPending(false); }
  }
  return { pending, error, message, setMessage, run };
}
