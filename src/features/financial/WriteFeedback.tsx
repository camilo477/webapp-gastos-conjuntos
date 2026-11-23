import { Notice } from '../../components/Notice';
import { Button } from '../../components/Button';
import type { useFinancialWrite } from './useFinancialWrite';

export function WriteFeedback({ writer }: { writer: ReturnType<typeof useFinancialWrite> }) {
  return <>{writer.error && <Notice kind="error" title="No se ha guardado la operación"><p>{writer.error}</p></Notice>}
    {writer.savedLocal && writer.imageError && <Notice kind="warning" title="Gasto guardado; imagen pendiente de recuperar"><p>{writer.imageError}</p><Button variant="secondary" onClick={writer.continueWithoutImage}>Continuar sin miniatura</Button></Notice>}
    {writer.operation && !writer.savedLocal && <div role="status" className="form-block"><p>{writer.pending ? 'Guardando en este dispositivo…' : 'Propuesta aún no guardada. Reintenta esta misma operación.'}</p><p className="small muted">Se conserva solo en esta pantalla hasta que IndexedDB confirme el guardado. Salir o recargar puede perder la propuesta; comprueba el historial antes de volver a registrarla.</p><details><summary>Copiar propuesta</summary><textarea aria-label="Propuesta recuperable" readOnly rows={8} value={JSON.stringify(writer.operations, null, 2)} /></details></div>}</>;
}
