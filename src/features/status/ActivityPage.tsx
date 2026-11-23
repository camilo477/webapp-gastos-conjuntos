import { useNetwork } from '../../app/useNetwork';
import { EmptyState } from '../../components/EmptyState';
import { Notice } from '../../components/Notice';
import { PageHeader } from '../../components/PageHeader';
import { FirebaseStatus } from './FirebaseStatus';

export function ActivityPage() {
  const online = useNetwork();
  return <><PageHeader title="Actividad" description="Estado de esta base técnica, sin operaciones financieras." />
    <Notice title={online ? 'Demostración sin sincronización' : 'Sin conexión'} kind={online ? 'info' : 'warning'}><p>{online ? 'El navegador informa conectividad; no confirma acceso a Firebase ni sincronización de datos.' : 'Puedes recorrer la interfaz si se descargó antes. No se registran ni sincronizan gastos en esta fase.'}</p></Notice>
    <FirebaseStatus /><EmptyState title="Sin operaciones que enviar" icon="activity">Todavía no existe una cola de operaciones. Los cambios de tema se guardan solo en este navegador.</EmptyState>
  </>;
}
