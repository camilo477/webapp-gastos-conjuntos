import { Button } from '../../components/Button';
import { Notice } from '../../components/Notice';
import { PageHeader } from '../../components/PageHeader';
import { demoTrip } from './fixtures';

export function BalancePage() {
  return <><PageHeader title="Balance" description="Vista de ejemplo del prototipo. No se calculan saldos en esta fase." />
    <section aria-label="Saldos ficticios"><ul className="plain-list">{demoTrip.people.map(person => <li className="member-row" key={person.name}><span className="avatar" aria-hidden="true">{person.initials}</span><strong className="person-label">{person.name}</strong><span className="money">{person.balance}</span></li>)}</ul></section>
    <Notice title="Abonos pendientes de implementación"><p>El motor financiero y el registro de pagos pertenecen a fases posteriores.</p></Notice>
    <Button disabled aria-describedby="payment-help">Registrar abono</Button><p id="payment-help" className="field-hint">No disponible en la demostración.</p>
  </>;
}
