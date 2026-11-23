import { useEffect, useState } from 'react';
import type { Finance } from './useFinance';
import { Button } from '../../components/Button';
import { Notice } from '../../components/Notice';
import { useSyncServices } from '../../sync/context';
import type { PendingGroup } from '../../sync/storage';
import { AttachmentActivity } from '../../attachments/AttachmentActivity';
import { formatMoney } from '../../domain';
import type { Currency } from '../../domain';

function label(group: PendingGroup) {
  const event = group.events[0]!;
  return event.entityKind === 'expense' ? event.payload.title : event.entityKind === 'settlement' ? 'Abono declarado' : event.entityKind === 'budget' ? 'Cambio de presupuesto' : 'Mantener gastos separados';
}
export function LocalOperations({ groups,currency }: { groups: PendingGroup[];currency?: Currency }) {
  const services = useSyncServices(), [error,setError] = useState(''), [visible,setVisible] = useState(50);
  const states = { pending: 'Guardado localmente · Pendiente',sending: 'Sincronizando',error: 'Sin confirmar · Reintento pendiente',rejected: 'Rechazado · Requiere revisión',confirmed: 'Confirmado en servidor' };
  return <section aria-label="Operaciones en este dispositivo"><h2>Operaciones en este dispositivo</h2>{error && <p role="alert">{error}</p>}<ul className="financial-list">{groups.slice(0,visible).map(group => <li key={group.id}><h3>{label(group)}</h3><p>{states[group.state]}</p>{group.error && <p>{group.error}</p>}<details><summary>Revisar movimiento</summary>{group.events.map(event => <div key={event.operationId}><p>{event.entityKind === 'expense' ? event.payload.title : label(group)} · {currency && ('total' in event.payload && event.payload.total !== null || 'amount' in event.payload) ? formatMoney(BigInt('amount' in event.payload ? event.payload.amount : 'total' in event.payload ? event.payload.total! : 0),currency) : ''}</p><p>{event.action === 'delete' ? 'Eliminación' : event.action === 'resolve' ? 'Resolución' : event.action === 'mergeKeep' || event.action === 'mergeHide' ? 'Unificación' : 'Revisión financiera'}</p></div>)}<p className="field-hint">Puedes copiar esta propuesta para conservarla fuera de la aplicación. No contiene credenciales.</p><textarea aria-label={`Propuesta recuperable de ${label(group)}`} readOnly rows={8} value={JSON.stringify({ tripId: group.tripId,events: group.events },null,2)} /></details>{group.state !== 'confirmed' && <Button variant="secondary" onClick={() => { void services?.coordinator.retry(group.tripId).catch(() => setError('No se pudo iniciar el reintento. La propuesta sigue conservada.')); }}>Reintentar operación</Button>}</li>)}</ul>{groups.length > visible && <Button variant="secondary" onClick={() => setVisible(visible + 50)}>Mostrar más operaciones locales</Button>}{!groups.length && <p>No hay operaciones locales en esta sesión.</p>}</section>;
}
export function SyncIndicator({ finance }: { finance: Finance }) {
  const pending = finance.pending, sending = pending.filter(group => group.state === 'sending').length;
  const issue = finance.localState?.issues.some(row => row.reason === 'conflict') ? 'Conflicto · requiere revisión' : finance.localState?.provisional ? 'Datos incompletos · revisar actividad' : null;
  return <section aria-label="Estado de sincronización"><p role="status">{!finance.offlineReady ? 'Preparando descarga del viaje…' : sending ? `Sincronizando ${sending} operaciones` : pending.some(group => group.state === 'rejected') ? 'Error · hay propuestas rechazadas para revisar' : pending.length ? `${pending.length} cambios guardados en este dispositivo` : issue ? issue : finance.cachePending ? 'Actualizando la copia local del viaje…' : finance.complete && !finance.state?.provisional ? 'Sincronizado' : 'Datos locales provisionales · esperando confirmación'}</p><p className="small muted">Estado del registro financiero. Las imágenes se confirman por separado en el detalle del gasto.</p>{finance.offlineReady && !finance.cachePending && <p className="small muted">Viaje descargado para este usuario. El almacenamiento local puede perderse si borras datos o el navegador libera espacio.</p>}{finance.storageError && <Notice title="Almacenamiento no disponible" kind="error"><p>{finance.storageError}</p></Notice>}<Button variant="quiet" onClick={() => { void finance.services?.coordinator.retry().catch(() => {}); }}>Sincronizar ahora</Button></section>;
}
export function SessionActivity() {
  const services = useSyncServices(), [groups,setGroups] = useState<PendingGroup[]>([]), [error,setError] = useState('');
  useEffect(() => { if (!services) return; let active = true; const load = () => { void services.store.groups().then(rows => { if (active) setGroups(rows); }).catch(() => { if (active) setError('No se pudo leer la información local de esta identidad.'); }); }; load(); const stop = services.store.subscribe(load); return () => { active = false; stop(); }; },[services]);
  return <>{error && <p role="alert">{error}</p>}<LocalOperations groups={groups} /><AttachmentActivity /><p className="field-hint">Solo esta identidad puede revisar sus propuestas. Cerrar la PWA no garantiza sincronización; vuelve a abrirla con conexión.</p></>;
}
