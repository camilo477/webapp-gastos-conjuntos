import { Notice } from '../../components/Notice';
import type { useFinancialWrite } from './useFinancialWrite';

export function WriteFeedback({ writer }: { writer: ReturnType<typeof useFinancialWrite> }) {
  return <>{writer.error && <Notice kind="error" title="No se ha confirmado la operación"><p>{writer.error}</p></Notice>}
    {writer.operation && <div role="status" className="form-block"><p>{writer.pending ? 'Esperando confirmación del servidor…' : 'Propuesta sin confirmar. Reintenta esta misma operación.'}</p><p className="small muted">ID: {writer.operation.operationId}. Se conserva solo en esta pantalla. Salir o recargar puede perder la propuesta; comprueba el historial antes de volver a registrarla.</p><details><summary>Copiar propuesta</summary><textarea aria-label="Propuesta sin confirmar" readOnly rows={8} value={JSON.stringify(writer.operation, null, 2)} /></details></div>}</>;
}
