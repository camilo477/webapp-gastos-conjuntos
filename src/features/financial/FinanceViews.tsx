import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { Field } from '../../components/Field';
import { Notice } from '../../components/Notice';
import { PageHeader } from '../../components/PageHeader';
import { formatMoney, inclusiveDays, moneyToDto, parseMoney, projectFinancialEvents, validateBudgetEdit } from '../../domain';
import { prepareResolution } from '../../repositories/financial/revisions';
import type { FinancialEventV2Dto } from '../../domain';
import type { TripRecord } from '../../repositories/access/contracts';
import { prepareOperation } from '../../repositories/financial/events';
import { useSession } from '../access/session';
import { categories, moneyInput } from './formValues';
import type { Finance } from './useFinance';
import { editableHead } from './useFinance';
import { ExpenseImage,AttributionView } from '../../attachments/ExpenseImage';
import { useFinancialWrite } from './useFinancialWrite';
import { WriteFeedback } from './WriteFeedback';

export type ViewProps = { trip: TripRecord; finance: Finance };
const fieldLabels: Record<string,string> = { title: 'Concepto',total: 'Importe',note: 'Nota',category: 'Categoría',occurredAt: 'Fecha y hora',day: 'Día',payerIds: 'Pagadores',payerAmounts: 'Aportes',participantIds: 'Incluidos',shareAmounts: 'Cuotas',splitMode: 'División',weights: 'Pesos',status: 'Estado',fromPersonId: 'Quién entrega',toPersonId: 'Quién recibe',amount: 'Importe',lockedDays: 'Cupos manuales' };
function personName(finance: Finance, id: string) { return finance.context?.people.find(person => person.personId === id)?.displayName ?? 'Persona no disponible'; }
function eventLabel(event: FinancialEventV2Dto) {
  if (event.entityKind === 'duplicateDecision') return 'Gastos mantenidos separados';
  if (event.action === 'mergeKeep') return 'Unificación: gasto conservado';
  if (event.action === 'mergeHide') return 'Unificación: duplicado oculto';
  if (event.action === 'resolve') return 'Conflicto resuelto';
  if (event.entityKind === 'budget') return event.action === 'create' ? 'Presupuesto inicial' : 'Presupuesto modificado';
  const kind = event.entityKind === 'settlement' ? 'Abono' : 'Gasto';
  if (event.action === 'delete') return `${kind} eliminado`;
  if (event.action === 'create') return `${kind} creado`;
  if ('status' in event.before[0]! && event.before[0]!.status === 'deleted' && 'status' in event.payload && event.payload.status === 'active') return `${kind} restaurado`;
  return `${kind} modificado`;
}
function valueText(value: unknown, key: string, props: ViewProps): string {
  if (value === null) return key === 'total' ? 'Sin presupuesto' : 'Sin valor';
  if (typeof value === 'number' && ['total','amount'].includes(key)) return formatMoney(BigInt(value),props.trip.currency);
  if (Array.isArray(value)) return value.map(item => key === 'payerAmounts' || key === 'shareAmounts' ? formatMoney(BigInt(item as number),props.trip.currency) : typeof item === 'object' && item && 'day' in item && 'amount' in item ? `${item.day}: ${formatMoney(BigInt(item.amount as number),props.trip.currency)}` : key.endsWith('Ids') ? personName(props.finance,String(item)) : String(item)).join(', ') || 'Ninguno';
  if (key.endsWith('PersonId')) return personName(props.finance,String(value));
  if (key === 'category') return categories[value as keyof typeof categories];
  const terms: Record<string,string> = { active: 'Activo',deleted: 'Eliminado',equal: 'Partes iguales',percentage: 'Porcentajes',fixed: 'Importes fijos' };
  return terms[String(value)] ?? String(value);
}
export function ActivityView(props: ViewProps & { entityId?: string }) {
  const { trip,finance,entityId } = props;
  const [visible,setVisible] = useState(50);
  const rows = finance.events.filter(event => !entityId || event.entityId === entityId).slice().sort((a,b) => b.receivedAt.seconds - a.receivedAt.seconds || b.receivedAt.nanoseconds - a.receivedAt.nanoseconds || a.operationId.localeCompare(b.operationId));
  return <section aria-label="Historial financiero"><PageHeader title={entityId ? 'Historial del movimiento' : 'Actividad financiera'} description="Todas las revisiones se conservan. El orden de recepción no decide qué propuesta prevalece." />
    {!rows.length && <p>No hay movimientos registrados.</p>}
    <ol className="financial-list">{rows.slice(0,visible).map(event => <li key={event.operationId}><article><h3>{eventLabel(event)}{'title' in event.payload ? ` · ${event.payload.title}` : ''}</h3><p className="small muted">{personName(finance,event.actorPersonId)} · <time dateTime={event.receivedAt.seconds ? new Date(event.receivedAt.seconds * 1000).toISOString() : event.authoredAt}>{new Date(event.receivedAt.seconds ? event.receivedAt.seconds * 1000 : event.authoredAt).toLocaleString('es-CO',{ timeZone: trip.timezone })}</time> · {finance.state!.issues.some(issue => issue.entityId === event.entityId) ? 'Provisional' : finance.heads.some(head => head.operationId === event.operationId) ? 'Revisión vigente' : 'Histórica'}</p>
      <details><summary>Ver cambios</summary><p>Revisión lógica {event.logicalClock} · {event.receivedAt.seconds ? 'Recibida por el servidor' : 'Hora declarada · pendiente de confirmación'}</p>{event.before.length > 1 && <p>Propuestas de dos revisiones anteriores.</p>}{(event.before.length ? event.before : [null]).map((before,index) => <dl className="audit-fields" key={index}>{Object.entries(event.payload).filter(([key,value]) => (key in fieldLabels) && (!before || JSON.stringify(value) !== JSON.stringify((before as Record<string,unknown>)[key]))).map(([key,value]) => <div key={key}><dt>{fieldLabels[key]}</dt><dd>{before ? `${valueText((before as Record<string,unknown>)[key],key,props)} → ` : ''}{valueText(value,key,props)}</dd></div>)}</dl>)}</details>
    {event.entityKind === 'expense' && <Link to={`/viajes/${trip.id}/gastos/${event.entityId}`}>Ver gasto</Link>}</article></li>)}</ol>{rows.length > visible && <Button variant="secondary" onClick={() => setVisible(visible + 50)}>Mostrar más actividad</Button>}
  </section>;
}

export function HomeView({ trip,finance }: ViewProps) {
  const { user } = useSession(), summary = finance.summary!, budget = summary.budget;
  const own = summary.balances.rows.find(row => row.personId === trip.memberBindings[user!.uid]);
  const images = new Map(finance.heads.filter(event => event.entityKind === 'expense').map(event => [event.entityId,event.payload]));
  const recent = finance.state!.expenses.slice().sort((a,b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0,8);
  return <><section className="hero-section" aria-label="Resumen del viaje"><p className="eyebrow">Tu balance{summary.provisional ? ' provisional' : ''}</p><p className="hero-amount" data-testid="own-balance">{formatMoney(own?.balance ?? 0n,trip.currency)}</p><p className="muted">{(own?.balance ?? 0n) > 0n ? 'Debes recibir' : (own?.balance ?? 0n) < 0n ? 'Debes aportar' : 'Al día'}</p><Link to={`/viajes/${trip.id}/balance`}>Ver balances y deudas</Link></section>
    <section className="section" aria-label="Presupuesto del viaje"><h2>Presupuesto</h2><dl className="trip-facts"><div><dt>Presupuesto total</dt><dd>{budget.total === null ? 'Sin presupuesto' : formatMoney(budget.total,trip.currency)}</dd></div><div><dt>Disponible</dt><dd>Disponible: {budget.available === null ? 'Sin presupuesto' : formatMoney(budget.available,trip.currency)}</dd></div><div><dt>Gasto del día</dt><dd>Hoy: {formatMoney(budget.current?.spent ?? 0n,trip.currency)}</dd></div><div><dt>Gasto acumulado</dt><dd data-testid="trip-total">{formatMoney(summary.statistics.total,trip.currency)}</dd></div></dl><Link to={`/viajes/${trip.id}/presupuesto`}>Ver presupuesto diario</Link></section>
    <section className="section" aria-label="Movimientos recientes"><div className="section-heading"><h2>Movimientos recientes</h2><Link to={`/viajes/${trip.id}/actividad`}>Ver historial</Link></div>
      {!recent.length && <p>Todavía no hay gastos activos.</p>}<ul className="financial-list">{recent.map(expense => <li key={expense.id}><Link className="financial-movement" to={`/viajes/${trip.id}/gastos/${expense.id}`}><ExpenseImage tripId={trip.id} expenseId={expense.id} attachmentId={images.get(expense.id)?.attachmentId ?? null} visual={images.get(expense.id)?.visual ?? null} /><span><strong>{expense.title}</strong><span className="small muted">{expense.day} · {categories[expense.category]}</span></span><strong>{formatMoney(expense.total,trip.currency)}</strong></Link></li>)}</ul>
      {finance.state!.expenses.length > recent.length && <Link to={`/viajes/${trip.id}/actividad`}>Consultar todos los movimientos</Link>}
    </section><div className="form-footer"><Link className="button primary" to={`/viajes/${trip.id}/gastos/nuevo`}>Agregar gasto</Link><Link to={`/viajes/${trip.id}/estadisticas`}>Estadísticas</Link></div>
  </>;
}
export function BalanceView({ trip,finance }: ViewProps) {
  const summary = finance.summary!, money = (amount: bigint) => formatMoney(amount,trip.currency);
  return <><PageHeader title="Balances y deudas" description="Pagado − consumido + abonos enviados − recibidos. Los abonos no aumentan el costo del viaje." />
    <section aria-label="Balances por participante"><ul className="financial-list">{summary.balances.rows.map(row => <li key={row.personId}><h2>{personName(finance,row.personId)}</h2><dl className="trip-facts"><div><dt>Pagó</dt><dd>{money(row.paid)}</dd></div><div><dt>Consumió</dt><dd>{money(row.consumed)}</dd></div><div><dt>Abonos enviados / recibidos</dt><dd>{money(row.sent)} / {money(row.received)}</dd></div><div><dt>Saldo neto</dt><dd data-testid={`balance-${row.personId}`}>{money(row.balance)} · {row.balance > 0n ? 'Debe recibir' : row.balance < 0n ? 'Debe aportar' : 'Al día'}</dd></div></dl></li>)}</ul></section>
    <section className="section" aria-label="Transferencias sugeridas"><h2>Transferencias sugeridas{summary.provisional ? ' · provisionales' : ''}</h2>{summary.suggestions.transfers.length ? <ul className="financial-list">{summary.suggestions.transfers.map((row,index) => <li key={index}>{personName(finance,row.fromPersonId)} → {personName(finance,row.toPersonId)}: <strong>{money(row.amount)}</strong></li>)}</ul> : <p>No hay transferencias en el subtotal validado.</p>}<Link className="button primary" to={`/viajes/${trip.id}/abonos/nuevo`}>Registrar abono</Link></section>
    <section className="section" aria-label="Abonos registrados"><h2>Abonos anteriores</h2><ul className="financial-list">{finance.heads.filter(event => event.entityKind === 'settlement').map(event => event.entityKind === 'settlement' && <li key={event.operationId}><p>{personName(finance,event.payload.fromPersonId)} → {personName(finance,event.payload.toPersonId)} · {money(BigInt(event.payload.amount))} · {event.payload.day} · {event.payload.status === 'deleted' ? 'Eliminado' : 'Declarado'}</p>{editableHead(finance,event.entityId,'settlement') && <><Link to={`/viajes/${trip.id}/abonos/${event.entityId}/editar`}>Corregir abono</Link><RevisionAction key={event.operationId} trip={trip} finance={finance} parent={event} /></>}</li>)}</ul></section>
  </>;
}
export function RevisionAction({ trip,finance,parent }: ViewProps & { parent: FinancialEventV2Dto }) {
  const { user } = useSession(), navigate = useNavigate(), [open,setOpen] = useState(false);
  const writer = useFinancialWrite(trip.id,() => { setOpen(false); navigate(`/viajes/${trip.id}${parent.entityKind === 'settlement' ? '/balance' : ''}`); });
  if (parent.entityKind !== 'expense' && parent.entityKind !== 'settlement' || parent.payload.status === 'merged') return null;
  const deleted = parent.payload.status === 'deleted', label = deleted ? 'Restaurar' : 'Eliminar';
  return <><Button variant="quiet" onClick={() => setOpen(true)}>{label} {parent.entityKind === 'settlement' ? 'abono' : 'gasto'}</Button><Dialog open={open} title={`${label} movimiento`} onClose={() => { if (!writer.locked) setOpen(false); }}><p>{deleted ? 'Se creará una revisión activa con los valores conservados.' : 'El movimiento dejará de contar. Su historial e importes se conservan.'}</p><WriteFeedback writer={writer} /><Button disabled={writer.pending} onClick={() => { void writer.submit(() => prepareOperation(finance.context!,{ uid: user!.uid,personId: trip.memberBindings[user!.uid]! },parent.entityKind as 'expense' | 'settlement',{ ...parent.payload,status: deleted ? 'active' : 'deleted' },parent,deleted ? 'replace' : 'delete')); }}>{writer.operation ? 'Reintentar misma operación' : `Confirmar ${deleted ? 'restauración' : 'eliminación'}`}</Button></Dialog></>;
}
export function ExpenseDetail(props: ViewProps & { entityId: string }) {
  const { trip,finance,entityId } = props, head = editableHead(finance,entityId,'expense');
  return <>{head?.entityKind === 'expense' ? <><PageHeader title={head.payload.title} description={head.payload.status === 'deleted' ? 'Gasto eliminado · importes conservados en el historial' : finance.pending.some(g => g.events.some(e => e.entityId === entityId)) ? 'Gasto local · pendiente de confirmación' : 'Gasto confirmado'} /><ExpenseImage tripId={trip.id} expenseId={entityId} attachmentId={head.payload.attachmentId} visual={head.payload.visual} detail /><AttributionView visual={head.payload.visual} /><dl className="trip-facts">{Object.entries(head.payload).filter(([key]) => key in fieldLabels).map(([key,value]) => <div key={key}><dt>{fieldLabels[key]}</dt><dd>{valueText(value,key,props)}</dd></div>)}</dl><div className="action-row">{head.payload.status === 'active' && <Link className="button secondary" to={`/viajes/${trip.id}/gastos/${entityId}/editar`}>Editar gasto</Link>}<RevisionAction key={head.operationId} trip={trip} finance={finance} parent={head} /></div></> : <Notice kind="warning" title="Movimiento no disponible o en conflicto"><p>No se elige una revisión automáticamente. Consulta las propuestas en el historial; los balances son provisionales si hay incidencias.</p></Notice>}<ActivityView {...props} /></>;
}

export function BudgetView(props: ViewProps) {
  const { trip,finance } = props, budget = finance.summary!.budget, { user } = useSession();
  const money = (amount: bigint | null) => amount === null ? 'Sin presupuesto' : formatMoney(amount,trip.currency);
  const parent = editableHead(finance,trip.budgetEntityId,'budget');
  return <><PageHeader title="Presupuesto" description="Cupos automáticos derivados de gastos reales. Las reservas manuales se conservan." /><dl className="trip-facts"><div><dt>Total / gasto acumulado</dt><dd>{money(budget.total)} / {money(budget.spent)}</dd></div><div><dt>Disponible</dt><dd>{money(budget.available)}</dd></div><div><dt>Gasto del día / cupo de hoy</dt><dd>{money(budget.current?.spent ?? 0n)} / {money(budget.current?.allocated ?? null)}</dd></div><div><dt>Exceso del día</dt><dd>{money(budget.current?.excess ?? null)}</dd></div><div><dt>Déficit de reservas</dt><dd>{money(budget.fundingDeficit)}</dd></div></dl>
    {user!.uid === trip.ownerId && parent?.entityKind === 'budget' && <BudgetEditor key={parent.operationId} {...props} parent={parent} />}
    <section className="section" aria-label="Evolución del presupuesto"><h2>Por día</h2><p className="small muted">Los cupos históricos son reconstrucciones con los eventos conocidos.</p><ul className="financial-list">{budget.days.map(row => <li key={row.day}><h3>{row.day}{row.manual ? ' · Manual' : ''}</h3><p>Gasto {money(row.spent)} · Cupo {money(row.allocated)} · Disponible {money(row.available)}</p><p>Acumulado {money(row.accumulated)} · Restante {money(row.remainingTotal)}</p></li>)}</ul><h2>Propuesta para días restantes</h2>{budget.future.length ? <ul className="financial-list">{budget.future.map(row => <li key={row.day}>{row.day}: {money(row.amount)}{row.manual ? ' · Reserva manual' : ''}</li>)}</ul> : <p>No quedan días por distribuir.</p>}</section>
  </>;
}
export function BudgetEditor({ trip,finance,parent,resolutionParents }: ViewProps & { parent: FinancialEventV2Dto; resolutionParents?: FinancialEventV2Dto[] }) {
  const { user } = useSession(), navigate = useNavigate();
  const previous = parent.entityKind === 'budget' ? parent.payload : null;
  const [amount,setAmount] = useState(previous?.total == null ? '' : moneyInput(previous.total,trip.currency)), [day,setDay] = useState(''), [cap,setCap] = useState(''), [remove,setRemove] = useState(false);
  const writer = useFinancialWrite(trip.id,() => navigate(`/viajes/${trip.id}/presupuesto`));
  if (!previous) return null;
  if (user!.uid !== trip.ownerId) return <Notice title="Presupuesto del organizador"><p>Solo el organizador puede preparar cambios de presupuesto.</p></Notice>;
  return <details className="form-block"><summary>Modificar presupuesto</summary><form onSubmit={event => { event.preventDefault(); void writer.submit(() => {
    const lockedDays = day ? [...previous.lockedDays.filter(row => row.day !== day),...(remove ? [] : [{ day,amount: moneyToDto(parseMoney(cap,trip.currency)) }])].sort((a,b) => a.day.localeCompare(b.day)) : previous.lockedDays;
    const raw = { total: amount.trim() ? moneyToDto(parseMoney(amount,trip.currency)) : null, lockedDays,status: 'active' };
    if (resolutionParents) {
      const result = prepareResolution(finance.context!,{ uid: user!.uid,personId: trip.memberBindings[user!.uid]! },resolutionParents,raw);
      validateBudgetEdit(projectFinancialEvents(finance.context!,[...finance.events,result],true),raw,finance.now);
      return result;
    }
    const payload = validateBudgetEdit(finance.localState!,raw,finance.now);
    return prepareOperation(finance.context!,{ uid: user!.uid,personId: trip.memberBindings[user!.uid]! },'budget',payload,parent);
  }); }}><fieldset className="financial-fields" disabled={writer.locked || !resolutionParents && finance.localState!.provisional}><legend className="sr-only">Presupuesto y cupo manual</legend><Field label="Presupuesto total" hint="Vacío significa sin presupuesto. Retira antes cada reserva manual si deseas quitarlo." inputMode={trip.currency === 'COP' ? 'numeric' : 'decimal'} value={amount} onChange={event => setAmount(event.target.value)} />
    <div className="field"><label htmlFor="cap-day">Cupo manual a modificar</label><select id="cap-day" value={day} onChange={event => { setDay(event.target.value); const row = previous.lockedDays.find(row => row.day === event.target.value); setCap(row ? moneyInput(row.amount,trip.currency) : ''); }}><option value="">Conservar todos los cupos</option>{inclusiveDays(trip.startDate,trip.endDate).map(date => <option key={date} value={date}>{date}</option>)}</select></div>
    {day && <><label className="check-label"><input type="checkbox" checked={remove} onChange={event => setRemove(event.target.checked)} />Retirar este cupo manual</label>{!remove && <Field label="Importe del cupo manual" inputMode="decimal" value={cap} onChange={event => setCap(event.target.value)} required />}</>}
    <p className="field-hint">Cada revisión modifica como máximo un cupo manual; los demás se mantienen.</p></fieldset><WriteFeedback writer={writer} /><Button type="submit" disabled={writer.pending || !finance.canWrite || !resolutionParents && !writer.operation && finance.localState!.provisional}>{writer.operation ? 'Reintentar misma operación' : 'Guardar presupuesto'}</Button></form></details>;
}
export function StatisticsView({ trip,finance }: ViewProps) {
  const stats = finance.summary!.statistics, money = (amount: bigint) => formatMoney(amount,trip.currency);
  return <><PageHeader title="Estadísticas" description="Solo gastos activos válidos; abonos excluidos del costo." /><p className="hero-amount" data-testid="statistics-total">{money(stats.total)}</p><p>{stats.expenseCount} gastos · {stats.settlementCount} abonos</p>
    <section className="section" aria-label="Gasto por categoría"><h2>Por categoría</h2><dl className="trip-facts">{stats.byCategory.map(row => <div key={row.category}><dt>{categories[row.category]}</dt><dd>{money(row.amount)}</dd></div>)}</dl></section>
    <section className="section" aria-label="Gasto por día"><h2>Por día</h2><dl className="trip-facts">{stats.byDay.map(row => <div key={row.day}><dt>{row.day}</dt><dd>{money(row.amount)}</dd></div>)}</dl></section>
    <section className="section" aria-label="Gasto por persona"><h2>Pagado y consumido</h2><dl className="trip-facts">{stats.byPerson.map(row => <div key={row.personId}><dt>{personName(finance,row.personId)}</dt><dd>Pagó {money(row.paid)} · Consumió {money(row.consumed)}</dd></div>)}</dl></section><Link to={`/viajes/${trip.id}/presupuesto`}>Ver evolución del presupuesto</Link>
  </>;
}
