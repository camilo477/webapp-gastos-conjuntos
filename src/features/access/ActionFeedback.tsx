import { Notice } from '../../components/Notice';

export function ActionFeedback({ error, message }: { error: string; message?: string }) {
  return <>{error && <Notice kind="error" title="No se pudo completar"><p>{error}</p></Notice>}{message && <p role="status" className="note">{message}</p>}</>;
}
