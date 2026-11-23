import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { Notice } from '../../components/Notice';
import { useSyncServices } from '../../sync/context';

export function DraftPanel<T>({ id,value,parse,restore,disabled }: { id: string;value: T;parse: (raw: unknown) => T;restore: (value: T) => void;disabled: boolean }) {
  const services = useSyncServices();
  const [saved,setSaved] = useState<unknown>(), [message,setMessage] = useState(''), [error,setError] = useState(false), [busy,setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void services?.store.draft(id).then(value => { if (active) setSaved(value); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  },[services,id]);
  return <section aria-label="Borrador del gasto" className="form-block">{saved !== undefined && <Notice title="Hay un borrador guardado en este dispositivo"><Button variant="secondary" disabled={disabled} onClick={() => { try { restore(parse(saved)); setSaved(undefined); setMessage('Borrador recuperado. Revisa sus valores antes de registrar el gasto.'); } catch { setError(true); } }}>Recuperar borrador</Button></Notice>}<Button variant="quiet" disabled={disabled || busy || !services} onClick={() => {
    setBusy(true); setError(false); setMessage('');
    void services!.store.draft(id,value).then(() => { setSaved(undefined); setMessage('Borrador guardado en este dispositivo. Todavía no es un gasto registrado.'); }).catch(() => setError(true)).finally(() => setBusy(false));
  }}>Guardar borrador</Button>{message && <p role="status">{message}</p>}{error && <p role="alert">No se pudo guardar o recuperar el borrador. Conserva el formulario abierto o copia sus datos.</p>}<p className="small muted">Los borradores no se sincronizan ni forman parte del balance. Este almacenamiento puede borrarse; no es una copia de seguridad.</p></section>;
}
