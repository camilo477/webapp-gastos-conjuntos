import { useEffect,useRef,useState } from 'react';
import { Button } from '../components/Button';
export function Camera({ capture,close }: { capture: (file: Blob) => void;close: () => void }) {
  const video = useRef<HTMLVideoElement>(null),alive = useRef(true);
  const [facing,setFacing] = useState<'environment' | 'user'>('environment'),[error,setError] = useState(''),[ready,setReady] = useState(false);
  useEffect(() => {
    let active = true,expired = false,acquired: MediaStream | null = null; alive.current = true; const element = video.current;
    // Each acquisition owns its tracks: a late rejection from the old camera
    // must never stop the replacement selected by a newer effect.
    const stop = () => { const owned = acquired; acquired = null; owned?.getTracks().forEach(track => track.stop()); if (element && element.srcObject === owned) element.srcObject = null; };
    const isHidden = () => document.visibilityState === 'hidden';
    const hidden = () => { if (isHidden()) { expired = true; clearTimeout(startup); stop(); setReady(false); setError('La cámara se detuvo al salir de la aplicación. Ciérrala y vuelve a abrirla.'); } };
    if (!navigator.mediaDevices?.getUserMedia) { void Promise.resolve().then(() => { if (active) setError('La cámara no está disponible aquí. Puedes elegir una fotografía desde archivos.'); }); return; }
    const startup = setTimeout(() => { if (!active) return; expired = true; stop(); setReady(false); setError('La cámara no respondió a tiempo. Ciérrala y vuelve a intentarlo o elige una foto desde archivos.'); },15000);
    void navigator.mediaDevices.getUserMedia({ audio: false,video: { facingMode: { ideal: facing },width: { ideal: 1280 },height: { ideal: 720 } } }).then(async value => {
      if (!active || expired || isHidden()) { clearTimeout(startup); value.getTracks().forEach(track => track.stop()); return; } acquired = value;
      try { if (!element) throw Error(); element.srcObject = value; await element.play(); clearTimeout(startup); if (active && !expired && !isHidden()) setReady(true); }
      catch { clearTimeout(startup); stop(); if (active && !expired) setError('No se pudo iniciar la vista de cámara. Usa la selección de archivos.'); }
    }).catch(() => { clearTimeout(startup); if (active && !expired) setError('No se pudo abrir la cámara. Comprueba el permiso o elige una foto desde archivos.'); });
    document.addEventListener('visibilitychange',hidden);
    return () => { active = false; alive.current = false; clearTimeout(startup); stop(); document.removeEventListener('visibilitychange',hidden); };
  },[facing]);
  return <section aria-label="Cámara"><video ref={video} playsInline muted autoPlay aria-label="Vista de cámara" className="camera-preview" />{error && <p role="alert">{error}</p>}<div className="action-row"><Button disabled={!ready} onClick={() => {
    const source = video.current; if (!source?.videoWidth || !source.videoHeight) { setError('La cámara aún no tiene una imagen.'); return; }
    const canvas = document.createElement('canvas'); canvas.width = source.videoWidth; canvas.height = source.videoHeight;
    try { const ctx = canvas.getContext('2d'); if (!ctx) throw Error(); ctx.drawImage(source,0,0); canvas.toBlob(blob => { canvas.width = canvas.height = 0; if (!alive.current) return; if (blob) capture(blob); else setError('No se pudo tomar la fotografía.'); },'image/png'); } catch { canvas.width = canvas.height = 0; setError('No se pudo tomar la fotografía. Puedes elegir un archivo.'); }
  }}>Tomar fotografía</Button><Button variant="secondary" onClick={() => { setReady(false); setError(''); setFacing(facing === 'environment' ? 'user' : 'environment'); }}>Cambiar cámara</Button><Button variant="quiet" onClick={close}>Cancelar cámara</Button></div></section>;
}
