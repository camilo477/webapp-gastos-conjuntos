import { Link } from 'react-router-dom';
import { useNetwork } from '../app/useNetwork';
import { Icon } from './Icon';

export function SyncStatus() {
  const online = useNetwork();
  return <Link to="/actividad" className={`status ${online ? '' : 'warn'}`}><Icon name={online ? 'help' : 'offline'} />{online ? 'Sin sincronización' : 'Sin conexión'}</Link>;
}
