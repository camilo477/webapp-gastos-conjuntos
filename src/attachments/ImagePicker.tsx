import { useEffect,useId,useRef,useState } from 'react';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { Field } from '../components/Field';
import { Icon } from '../components/Icon';
import { Camera } from './Camera';
import { AttributionView,ExpenseImage } from './ExpenseImage';
import { imageIcons } from './contracts';
import type { ImageChoice,Attribution } from './contracts';
import { compressImage } from './process';
import { OpenverseClient,downloadStock,stockThumbnail } from './openverse';
const names = { receipt: 'Recibo',utensils: 'Comida',car: 'Transporte',mountain: 'Actividad',wallet: 'Compras',mapPin: 'Lugar' };
function Preview({ choice }: { choice: ImageChoice }) {
  const [preview,setPreview] = useState<{ url: string;choice: ImageChoice } | null>(null);
  useEffect(() => { if (!choice.thumbnail) return; let active = true; const object = URL.createObjectURL(new Blob([Uint8Array.from(choice.thumbnail.bytes).buffer],{ type: 'image/webp' })); void Promise.resolve().then(() => { if (active) setPreview({ url: object,choice }); }); return () => { active = false; URL.revokeObjectURL(object); }; },[choice]);
  return <>{preview?.choice === choice && <img className="image-preview" src={preview.url} alt="Vista previa de la miniatura" />}<p className="small muted">{choice.thumbnail ? `${choice.thumbnail.width} × ${choice.thumbnail.height} · ${choice.thumbnail.byteLength} bytes · WebP` : 'Icono local; sin miniatura offline.'}</p></>;
}
export function ImagePicker({ value,onChange,disabled,tripId,expenseId }: { value: ImageChoice;onChange: (choice: ImageChoice) => void;disabled: boolean;tripId: string;expenseId?: string | undefined }) {
  const id = useId(),[open,setOpen] = useState(false),[view,setView] = useState<'options' | 'camera' | 'search'>('options'),[busy,setBusy] = useState(false),[error,setError] = useState(''),[preview,setPreview] = useState<ImageChoice | null>(null),[failedStock,setFailedStock] = useState<Attribution | null>(null);
  const [query,setQuery] = useState(''),[results,setResults] = useState<Attribution[] | null>(null),[page,setPage] = useState(1),[more,setMore] = useState(false);
  const [api] = useState(() => new OpenverseClient()),controller = useRef<AbortController | null>(null),searchSerial = useRef(0);
  useEffect(() => () => { controller.current?.abort(); api.cancel(); },[api]);
  const close = () => { searchSerial.current++; controller.current?.abort(); api.cancel(); setOpen(false); setView('options'); setBusy(false); setPreview(null); setFailedStock(null); };
  const process = async (file: Blob) => {
    searchSerial.current++; api.cancel(); controller.current?.abort(); const next = new AbortController(); controller.current = next; setView('options'); setBusy(true); setError(''); setPreview(null); setFailedStock(null);
    try { const thumbnail = await compressImage(file,next.signal); if (!next.signal.aborted) setPreview({ visual: null,attachmentId: crypto.randomUUID(),thumbnail,sourceKind: 'photo' }); }
    catch (reason) { if (!next.signal.aborted) setError(reason instanceof Error ? reason.message : 'No se pudo preparar la imagen. Puedes continuar sin foto.'); }
    finally { if (controller.current === next && !next.signal.aborted) setBusy(false); }
  };
  const search = async (nextPage = 1) => {
    const serial = ++searchSerial.current; setBusy(true); setError(''); setPreview(null); setFailedStock(null);
    try { const result = await api.search(query,nextPage); if (serial === searchSerial.current) { setResults(result.values); setPage(nextPage); setMore(result.more); } }
    catch (reason) { if (serial === searchSerial.current) setError(reason instanceof Error ? reason.message : 'No se pudo buscar. Puedes elegir un icono.'); }
    finally { if (serial === searchSerial.current) setBusy(false); }
  };
  const chooseStock = async (metadata: Attribution) => {
    searchSerial.current++; api.cancel(); controller.current?.abort(); const next = new AbortController(); controller.current = next; setBusy(true); setError(''); setFailedStock(null); setPreview(null);
    try { const thumbnail = await downloadStock(metadata,next.signal); if (!next.signal.aborted) setPreview({ visual: metadata,attachmentId: crypto.randomUUID(),thumbnail,sourceKind: 'openverse' }); }
    catch (reason) { if (!next.signal.aborted) { setFailedStock(metadata); setError(reason instanceof Error ? reason.message : 'No se pudo descargar. Puedes usar un icono.'); } }
    finally { if (controller.current === next && !next.signal.aborted) setBusy(false); }
  };
  return <div className="form-block image-selection"><p className="small muted">Imagen opcional</p>{value.thumbnail ? <Preview choice={value} /> : value.attachmentId && expenseId ? <ExpenseImage tripId={tripId} expenseId={expenseId} attachmentId={value.attachmentId} visual={value.visual} /> : <Icon name={value.visual && 'kind' in value.visual && imageIcons.includes(value.visual.key as typeof imageIcons[number]) ? value.visual.key as typeof imageIcons[number] : 'receipt'} />}
    <Button variant="quiet" disabled={disabled} onClick={() => { setOpen(true); setError(''); }}>Elegir imagen</Button>{(value.attachmentId || value.visual) && <Button variant="quiet" disabled={disabled} onClick={() => onChange({ visual: null,attachmentId: null })}>Quitar imagen</Button>}
    <Dialog open={open} title="Imagen del gasto" onClose={close}>{open && <><p className="small muted">La imagen es opcional. Revisa la miniatura; solo se enviará cuando guardes el gasto. Si falla, el gasto sigue conservado.</p><div className="action-row"><Button variant="secondary" onClick={() => { searchSerial.current++; controller.current?.abort(); api.cancel(); setBusy(false); setView('camera'); setPreview(null); }}>Tomar foto</Button><label className="button secondary" htmlFor={`${id}-gallery`}>Elegir de galería</label><input className="sr-only" id={`${id}-gallery`} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void process(file); }} />
      <Button variant="secondary" onClick={() => { searchSerial.current++; controller.current?.abort(); api.cancel(); setBusy(false); setView('search'); setPreview(null); }}>Buscar imagen</Button><Button variant="quiet" onClick={() => { searchSerial.current++; controller.current?.abort(); api.cancel(); setBusy(false); setView('options'); setPreview(null); }}>Utilizar icono</Button></div>
      {view === 'camera' && <><Camera capture={file => { void process(file); }} close={() => setView('options')} /><label className="button secondary" htmlFor={`${id}-capture`}>Usar cámara del sistema o archivos</label><input id={`${id}-capture`} className="sr-only" type="file" accept="image/*" capture="environment" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void process(file); }} /></>}
      {view === 'options' && !preview && <div className="image-icons" aria-label="Iconos locales">{imageIcons.map(key => <Button variant="quiet" key={key} onClick={() => { onChange({ visual: { kind: 'icon',key },attachmentId: null }); close(); }}><Icon name={key} />{names[key]}</Button>)}</div>}
      {view === 'search' && <section aria-label="Buscar en Openverse"><p className="field-hint">Búsqueda online opcional en Openverse. Solo CC0 y CC BY con atribución disponible. Hasta tres páginas de ocho resultados.</p><Field label="Buscar imágenes" value={query} maxLength={80} onChange={event => { searchSerial.current++; api.cancel(); setBusy(false); setQuery(event.target.value); setMore(false); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void search(); } }} /><Button disabled={busy || query.trim().length < 2} onClick={() => { void search(); }}>Buscar en Openverse</Button>{results && !results.length && <p role="status">No hay resultados con atribución suficiente. Prueba otro término o utiliza un icono.</p>}<ul className="stock-results">{results?.map(item => <li key={item.id}><button type="button" disabled={busy} onClick={() => { void chooseStock(item); }}><img src={stockThumbnail(item.id)} alt={item.title || 'Imagen de Openverse'} loading="lazy" crossOrigin="anonymous" referrerPolicy="no-referrer" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} /><span>{item.title || 'Sin título'} · {item.creator} · {item.license.toUpperCase()} {item.licenseVersion}</span></button></li>)}</ul>{more && <Button variant="secondary" disabled={busy} onClick={() => { void search(page + 1); }}>Más resultados</Button>}</section>}
      {busy && <p role="status">Preparando imagen…</p>}{error && <p role="alert">{error}</p>}{failedStock && <><AttributionView visual={{ ...failedStock,modified: false }} /><Button variant="secondary" onClick={() => { onChange({ visual: { kind: 'icon',key: 'receipt' },attachmentId: null }); close(); }}>Continuar con icono local</Button></>}
      {preview && <><Preview choice={preview} /><AttributionView visual={preview.visual} /><Button onClick={() => { onChange(preview); close(); }}>Usar esta imagen</Button></>}<Button variant="quiet" onClick={close}>Cancelar selección</Button>
    </>}</Dialog>
  </div>;
}
