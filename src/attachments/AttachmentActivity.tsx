import { useEffect,useState } from 'react';
import { useSyncServices } from '../sync/context';
import { Button } from '../components/Button';
import { ExpenseImage,AttributionView,CopyableThumbnail } from './ExpenseImage';
import type { LocalAttachment } from './local';
function PendingImage({ row }: { row: LocalAttachment }) {
  const services = useSyncServices(),[open,setOpen] = useState(false),[error,setError] = useState('');
  const states = { pending: 'Guardada localmente · imagen pendiente',sending: 'Sincronizando imagen',error: 'Imagen sin confirmar',rejected: 'Imagen rechazada · propuesta conservada',confirmed: 'Imagen confirmada' };
  return <li><p>{row.attachment.sourceKind === 'photo' ? 'Fotografía de un gasto' : 'Imagen de Openverse'} · {states[row.state]}</p>{row.error && <p>{row.error}</p>}{error && <p role="alert">{error}</p>}<details onToggle={event => setOpen(event.currentTarget.open)}><summary>Revisar imagen local</summary>{open && <><ExpenseImage tripId={row.tripId} expenseId={row.attachment.expenseId} attachmentId={row.attachmentId} visual={row.attachment.attribution} detail /><AttributionView visual={row.attachment.attribution} /><CopyableThumbnail bytes={row.attachment.bytes} label="Copiar miniatura local" /></>}</details><Button variant="secondary" onClick={() => { void services?.attachments.retry(row.id).catch(() => setError('No se pudo reintentar. La imagen local se conserva.')); }}>Reintentar solo la imagen</Button></li>;
}
export function AttachmentActivity() {
  const services = useSyncServices(),[rows,setRows] = useState<LocalAttachment[]>([]),[error,setError] = useState(''),[visible,setVisible] = useState(50);
  useEffect(() => { if (!services?.attachments) return; let active = true; const load = () => { void services.attachments.local.pending().then(value => { if (active) setRows(value); }).catch(() => { if (active) setError('No se pudo consultar el almacenamiento de imágenes. El registro financiero es independiente.'); }); }; const stop = services.store.subscribe(load); load(); return () => { active = false; stop(); }; },[services]);
  return <section aria-label="Imágenes en este dispositivo"><h2>Imágenes en este dispositivo</h2><p className="small muted">La entrega de las miniaturas es independiente del gasto. Las propuestas rechazadas permanecen en esta identidad.</p>{error && <p role="alert">{error}</p>}<ul className="financial-list">{rows.slice(0,visible).map(row => <PendingImage key={row.id} row={row} />)}</ul>{!rows.length && <p>No hay miniaturas pendientes.</p>}{rows.length > visible && <Button variant="secondary" onClick={() => setVisible(visible + 50)}>Mostrar más imágenes pendientes</Button>}</section>;
}
