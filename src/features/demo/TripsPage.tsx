import { Link } from 'react-router-dom';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';

export function TripsPage() {
  return <><PageHeader title="Mis viajes" description="No has iniciado sesión. La demostración no contiene viajes personales." />
    <EmptyState title="Tus viajes aparecerán aquí" icon="mapPin">Las cuentas y la creación de viajes se habilitarán en una fase posterior.</EmptyState>
    <div className="action-row"><Button disabled aria-describedby="trips-help">Crear viaje</Button><Link className="button secondary" to="/">Explorar viaje de ejemplo</Link></div><p id="trips-help" className="field-hint">Crear viajes todavía no está disponible.</p>
  </>;
}
