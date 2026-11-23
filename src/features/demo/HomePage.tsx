import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { MovementRow } from '../../components/MovementRow';
import { Button } from '../../components/Button';
import { demoMovements, demoTrip } from './fixtures';

export function HomePage() {
  return <>
    <PageHeader title={demoTrip.title} description={demoTrip.description} eyebrow="El viaje, en orden" action={<Button className="desktop-add" disabled aria-describedby="expense-help">Agregar gasto</Button>} />
    <p id="expense-help" className="section-note">El registro de gastos está pendiente. <Link to="/gasto">Ver formulario de ejemplo</Link></p>
    <div className="home-grid"><div className="home-main">
      <section className="hero-balance" aria-label="Balance de demostración"><p className="balance-label">Te deben · ejemplo de Ana</p><div className="big-money accent">{demoTrip.balance}</div><p className="context">Cifra ilustrativa del prototipo, sin cálculos reales.</p><Link className="text-button" to="/balance">Ver balance</Link></section>
      <div className="metric-pair"><div className="metric"><p>Disponible del viaje</p><strong className="money">{demoTrip.available}</strong><small>de {demoTrip.budget} · ejemplo</small></div><div className="metric"><p>Gastado hoy</p><strong className="money">{demoTrip.today}</strong><small>{demoTrip.dailyContext}</small></div></div>
      <section className="section"><div className="section-heading"><h2>Movimientos de ejemplo</h2><span className="small muted">3 compras</span></div><ul className="plain-list">{demoMovements.map(movement => <MovementRow key={movement.id} movement={movement} />)}</ul></section>
    </div><aside className="home-aside" aria-label="Presupuesto y personas de ejemplo">
      <section className="aside-section"><h2>Un poco de perspectiva</h2><p>El ejemplo muestra $250.000 de $400.000.</p><div className="progress-track" role="progressbar" aria-label="Presupuesto de ejemplo usado" aria-valuemin={0} aria-valuemax={100} aria-valuenow={62.5}><div className="progress-fill" style={{ width: '62.5%' }} /></div><div className="budget-labels"><span>62,5% utilizado</span><span>$150.000 disponibles</span></div><Link className="text-button" to="/presupuesto">Ver presupuesto</Link></section>
      <section className="aside-section"><h2>Viajar en buena compañía</h2><div className="avatars" aria-hidden="true">{demoTrip.people.map(person => <span className="avatar" key={person.name}>{person.initials}</span>)}</div><p>3 personas ficticias</p><Link className="text-button" to="/personas">Ver personas</Link></section>
    </aside></div>
  </>;
}
