import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function Dialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const origin = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (origin instanceof HTMLElement && origin.isConnected) origin.focus();
    };
  }, [open]);
  return <dialog ref={ref} aria-labelledby={id} onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <div className="sheet-header"><h2 id={id}>{title}</h2><button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar menú"><Icon name="close" /></button></div>
    {children}
  </dialog>;
}
