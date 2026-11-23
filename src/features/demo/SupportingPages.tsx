import { Button } from '../../components/Button';
import { Notice } from '../../components/Notice';
import { PageHeader } from '../../components/PageHeader';
import { demoTrip } from './fixtures';

export function BudgetPage() {
  return <><PageHeader title="Presupuesto" description="Valores de demostración; no hay redistribución implementada." />
    <p className="balance-label">Total del viaje · ejemplo</p><div className="big-money">{demoTrip.budget}</div>
    <div className="section"><div className="metric-pair"><div className="metric"><p>Disponible</p><strong className="money">{demoTrip.available}</strong></div><div className="metric"><p>Gastado hoy</p><strong className="money">{demoTrip.today}</strong><small>{demoTrip.dailyContext}</small></div></div></div>
    <Notice title="Para los próximos días"><p>El prototipo ilustra $50.000 por día después del exceso inicial. Las reglas se mantienen documentadas para la Fase 3.</p></Notice>
    <Button disabled aria-describedby="budget-help">Ajustar presupuesto</Button><p id="budget-help" className="field-hint">La edición de presupuestos no está disponible.</p>
  </>;
}

export function PeoplePage() {
  return <><PageHeader title="Personas" description="Tres participantes ficticios del prototipo." /><ul className="plain-list">{demoTrip.people.map((person, index) => <li className="member-row" key={person.name}><span className="avatar" aria-hidden="true">{person.initials}</span><div className="person-label"><strong>{person.name}</strong><p className="small muted">{index === 0 ? 'Organizadora de ejemplo' : 'Participante de ejemplo'}</p></div></li>)}</ul><Notice title="Sin invitaciones reales"><p>El acceso, QR y límite de participantes se implementarán en la Fase 4.</p></Notice><Button disabled aria-describedby="invite-help">Invitar personas</Button><p id="invite-help" className="field-hint">La demostración no genera enlaces de acceso.</p></>;
}
