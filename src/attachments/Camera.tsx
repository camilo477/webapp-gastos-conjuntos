import { useEffect,useRef,useState } from 'react';
import { Button } from '../components/Button';
export function Camera({ capture,close }: { capture: (file: Blob) => void;close: () => void }) {
  const video = useRef<HTMLVideoElement>(null),stream = useRef<MediaStream | null>(null),alive = useRef(true);
  const [facing,setFacing] = useState<'environment' | 'user'>('environment'),[error,setError] = useState(''),[ready,setReady] = useState(false);
  useEffect(() => {
    let active = true; alive.current = true; const element = video.current; const stop = () => { stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; };
    const hidden = () => { if (document.visibilityState === 'hidden') { stop(); setReady(false); setError('La cámara se detuvo al salir de la aplicación. Ciérrala y vuelve a abrirla.'); } };
    if (!navigator.mediaDevices?.getUserMedia) { void Promise.resolve().then(() => { if (active) setError('La cámara no está disponible aquí. Puedes elegir una fotografía desde archivos.'); }); return; }
    void navigator.mediaDevices.getUserMedia({ audio: false,video: { facingMode: { ideal: facing },width: { ideal: 1280 },height: { ideal: 720 } } }).then(async value => {
      if (!active || document.visibilityState === 'hidden') { value.getTracks().forEach(track => track.stop()); return; } stream.current = value;
      try { if (!element) throw Error(); element.srcObject = value; await element.play(); if (active) setReady(true); }
      catch { stop(); if (active) setError('No se pudo iniciar la vista de cámara. Usa la selección de archivos.'); }
    }).catch(() => { if (active) setError('No se pudo abrir la cámara. Comprueba el permiso o elige una foto desde archivos.'); });
    document.addEventListener('visibilitychange',hidden);
    return () => { active = false; alive.current = false; stop(); if (element) element.srcObject = null; document.removeEventListener('visibilitychange',hidden); };
  },[facing]);
  return <section aria-label="Cámara"><video ref={video} playsInline muted autoPlay aria-label="Vista de cámara" className="camera-preview" />{error && <p role="alert">{error}</p>}<div className="action-row"><Button disabled={!ready} onClick={() => {
    const source = video.current; if (!source?.videoWidth || !source.videoHeight) { setError('La cámara aún no tiene una imagen.'); return; }
    const canvas = document.createElement('canvas'); canvas.width = source.videoWidth; canvas.height = source.videoHeight;
    try { const ctx = canvas.getContext('2d'); if (!ctx) throw Error(); ctx.drawImage(source,0,0); canvas.toBlob(blob => { canvas.width = canvas.height = 0; if (!alive.current) return; if (blob) capture(blob); else setError('No se pudo tomar la fotografía.'); },'image/png'); } catch { canvas.width = canvas.height = 0; setError('No se pudo tomar la fotografía. Puedes elegir un archivo.'); }
  }}>Tomar fotografía</Button><Button variant="secondary" onClick={() => { setReady(false); setError(''); setFacing(facing === 'environment' ? 'user' : 'environment'); }}>Cambiar cámara</Button><Button variant="quiet" onClick={close}>Cancelar cámara</Button></div></section>;
}
