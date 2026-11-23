import { useEffect,useMemo,useRef,useState } from 'react';
import { Icon } from '../components/Icon';
import type { IconName } from '../components/Icon';
import { useSyncServices } from '../sync/context';
import { Button } from '../components/Button';
import { imageIcons } from './contracts';
import type { ImageChoice } from './contracts';
import type { LocalAttachment } from './local';
export function ExpenseImage({ tripId,expenseId,attachmentId,visual,detail = false }: { tripId: string;expenseId: string;attachmentId: string | null;visual: ImageChoice['visual'];detail?: boolean }) {
  const services = useSyncServices(),ref = useRef<HTMLDivElement>(null),[visible,setVisible] = useState(false),[data,setData] = useState<{ row: LocalAttachment | null;error: string;key: string } | null>(null),[preview,setPreview] = useState<{ url: string;key: string } | null>(null),[broken,setBroken] = useState(false);
  const key = `${services?.store.name}/${tripId}/${expenseId}/${attachmentId}`;
  useEffect(() => { const node = ref.current; if (!node) return; if (typeof IntersectionObserver === 'undefined') { void Promise.resolve().then(() => setVisible(true)); return; } const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); } },{ rootMargin: '100px' }); observer.observe(node); return () => observer.disconnect(); },[]);
  useEffect(() => { if (!visible || !attachmentId || !services?.attachments) return; return services.attachments.watch(tripId,attachmentId,expenseId,(row,error = '') => setData(previous => previous?.key === key && previous.row?.state === row?.state && previous.row?.attachment.createdAt.seconds === row?.attachment.createdAt.seconds && previous.error === error ? previous : { row,error,key })); },[services,tripId,expenseId,attachmentId,visible,key]);
  const row = data?.key === key ? data.row : null;
  useEffect(() => { if (!row) return; let active = true; const object = URL.createObjectURL(new Blob([Uint8Array.from(row.attachment.bytes).buffer],{ type: 'image/webp' })); void Promise.resolve().then(() => { if (active) { setPreview({ url: object,key }); setBroken(false); } }); return () => { active = false; URL.revokeObjectURL(object); }; },[row,key]);
  const icon = visual && 'kind' in visual && imageIcons.includes(visual.key as typeof imageIcons[number]) ? visual.key as IconName : 'receipt';
  return <div ref={ref} className={detail ? 'expense-image detail-image' : 'expense-image'}>{row && preview?.key === key && !broken ? <img src={preview.url} alt={detail ? 'Miniatura del gasto' : ''} loading="lazy" onError={() => setBroken(true)} /> : <Icon name={icon} />}{detail && attachmentId && <><p className="small muted" role="status">{broken ? 'La miniatura no se puede mostrar.' : row?.state === 'confirmed' ? 'Imagen confirmada por el servidor' : row ? row.state === 'rejected' ? 'Imagen rechazada · gasto conservado' : row.state === 'error' ? 'Imagen sin confirmar · gasto conservado' : 'Imagen guardada localmente · pendiente' : 'Miniatura no disponible todavía. El gasto sigue siendo válido.'}</p>{data?.key === key && data.error && <p role="status">{data.error}</p>}{row && row.state !== 'confirmed' && <Button variant="secondary" onClick={() => { void services?.attachments.retry(row.id).catch(() => setData({ row,error: 'No se pudo reintentar la imagen. La miniatura local se conserva.',key })); }}>Reintentar imagen</Button>}{row?.attachment.attribution && (!visual || 'kind' in visual) && <AttributionView visual={row.attachment.attribution} />}</>}</div>;
}
export function AttributionView({ visual }: { visual: ImageChoice['visual'] }) {
  if (!visual || 'kind' in visual) return null;
  // Domain accepts historical metadata; display only validated safe attribution.
  return <SafeAttribution visual={visual} />;
}
import { attributionSchema } from './contracts';
function SafeAttribution({ visual }: { visual: unknown }) {
  const parsed = attributionSchema.safeParse(visual); if (!parsed.success) return <p>La atribución no cumple el contrato admitido; se utiliza un icono local.</p>; const m = parsed.data;
  return <details className="form-block"><summary>Atribución de la imagen</summary><p><a href={m.foreignLandingUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{m.title || 'Imagen sin título'}</a> · {m.creatorUrl ? <a href={m.creatorUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{m.creator}</a> : m.creator}</p><p>Fuente: {m.source}. <a href={m.licenseUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{m.license.toUpperCase()} {m.licenseVersion}</a>. {m.modified ? 'Miniatura modificada: reducida y recodificada.' : 'Sin miniatura modificada conservada.'}</p></details>;
}

export function CopyableThumbnail({ bytes,label }: { bytes: Uint8Array;label: string }) {
  const value = useMemo(() => `data:image/webp;base64,${btoa(String.fromCharCode(...bytes))}`,[bytes]);
  return <details className="form-block"><summary>{label}</summary><p className="small muted">Selecciona y copia el contenido para conservar esta miniatura comprimida fuera de la aplicación.</p><textarea aria-label="Miniatura recuperable" readOnly rows={3} value={value} onFocus={event => event.currentTarget.select()} /></details>;
}
