import { useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';
import { Button } from '../../components/Button';

export function QrReader({ onCode }: { onCode: (value: string) => void }) {
  const video = useRef<HTMLVideoElement>(null), controls = useRef<IScannerControls | null>(null), mounted = useRef(true);
  const generation = useRef<symbol>(Symbol());
  const [running, setRunning] = useState(false), [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current = Symbol(); controls.current?.stop(); }; }, []);
  function stop() { generation.current = Symbol(); controls.current?.stop(); controls.current = null; setRunning(false); }
  async function start() {
    setError(''); setRunning(true);
    const current = Symbol(); generation.current = current;
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      if (!mounted.current || !video.current) return;
      const scanner = await new BrowserQRCodeReader().decodeFromVideoDevice(undefined,video.current,(result, _error, handle) => {
        if (result && mounted.current && generation.current === current) { handle.stop(); setRunning(false); onCode(result.getText()); }
      });
      if (!mounted.current || generation.current !== current) scanner.stop(); else controls.current = scanner;
    } catch { if (mounted.current) { setRunning(false); setError('No se pudo abrir la cámara. Introduce el código o selecciona una imagen del QR.'); } }
  }
  async function readFile(input: HTMLInputElement) {
    const file = input.files?.[0]; if (!file) return; stop(); setError('');
    if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) { input.value = ''; setError('Selecciona una imagen PNG, JPEG o WebP de hasta 10 MB.'); return; }
    setReading(true);
    let url: string | undefined;
    try {
      const bytes = await file.arrayBuffer();
      const imageUrl = URL.createObjectURL(new Blob([bytes],{ type: file.type })); url = imageUrl;
      const [{ BrowserQRCodeReader }, { DecodeHintType }] = await Promise.all([import('@zxing/browser'),import('@zxing/library')]);
      const result = await new BrowserQRCodeReader().decodeFromImageUrl(imageUrl).catch(() =>
        new BrowserQRCodeReader(new Map([[DecodeHintType.PURE_BARCODE,true]])).decodeFromImageUrl(imageUrl));
      if (mounted.current) onCode(result.getText());
    } catch { if (mounted.current) setError('No se reconoció un QR. Puedes introducir el código completo.'); }
    finally { if (url) URL.revokeObjectURL(url); input.value = ''; if (mounted.current) setReading(false); }
  }
  return <section className="section" aria-label="Lector local de QR"><div className="action-row"><Button variant="secondary" disabled={running || reading} onClick={() => { void start(); }}>Escanear QR con cámara</Button>{running && <Button variant="secondary" onClick={stop}>Detener cámara</Button>}</div><video ref={video} className="qr-video" hidden={!running} muted playsInline aria-label="Vista de la cámara" />
    <div className="field"><label htmlFor="qr-file">Leer QR desde una imagen</label><input id="qr-file" type="file" disabled={reading} accept="image/png,image/jpeg,image/webp" onChange={event => { void readFile(event.currentTarget); }} /><p className="field-hint">Se procesa en este navegador; la imagen no se almacena ni se envía.</p>{reading && <p role="status">Leyendo QR…</p>}</div>{error && <p role="alert">{error}</p>}</section>;
}
