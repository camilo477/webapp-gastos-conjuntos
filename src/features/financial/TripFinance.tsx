import { useState } from 'react';
import { Link, Route, Routes, useParams } from 'react-router-dom';
import { Notice } from '../../components/Notice';
import type { TripRecord } from '../../repositories/access/contracts';
import { useFinance, editableHead } from './useFinance';
import type { Finance } from './useFinance';
import { ExpenseForm } from './ExpenseForm';
import { SettlementForm } from './SettlementForm';
import { findDuplicateExpenses } from '../../domain';
import { SyncIndicator, LocalOperations } from './SyncActivity';
import { ConflictReview, DuplicateReview, MergeRepairs } from './ConflictReview';
import { useLocation } from 'react-router-dom';
import { ActivityView, BalanceView, BudgetView, BudgetEditor, ExpenseDetail, HomeView, StatisticsView } from './FinanceViews';

function DetailRoute({ trip,finance }: { trip: TripRecord; finance: Finance }) {
  const { entityId = '' } = useParams();
  return <ExpenseDetail trip={trip} finance={finance} entityId={entityId} />;
}
function EditorRoute({ trip,finance,kind }: { trip: TripRecord; finance: Finance; kind: 'expense' | 'settlement' }) {
  const { entityId = '' } = useParams();
  return <RevisionEditor key={`${kind}/${entityId}`} trip={trip} finance={finance} kind={kind} entityId={entityId} />;
}
function RevisionEditor({ trip,finance,kind,entityId }: { trip: TripRecord; finance: Finance; kind: 'expense' | 'settlement'; entityId: string }) {
  // Freeze the reviewed base, even when another member publishes a new head.
  const [parent] = useState(() => editableHead(finance,entityId,kind));
  if (!parent) return <Notice kind="warning" title="Revisión no disponible"><p>El movimiento falta o tiene propuestas incompatibles. Consulta el historial.</p></Notice>;
  return kind === 'expense' ? <ExpenseForm trip={trip} finance={finance} parent={parent} /> : <SettlementForm trip={trip} finance={finance} parent={parent} />;
}
function ResolutionEditor({ trip,finance }: { trip: TripRecord;finance: Finance }) {
  const { entityId = '',kind = '' } = useParams(), location = useLocation();
  const [parents] = useState(() => {
    const requested = (location.state as { parents?: string[] } | null)?.parents;
    return requested ? requested.flatMap(id => finance.events.find(event => event.operationId === id) ?? []) : finance.heads.filter(event => event.entityId === entityId).slice(0,2);
  });
  if (parents.length !== 2) return <Notice title="Propuestas incompletas"><p>Descarga ambas revisiones antes de resolver.</p></Notice>;
  return kind === 'expense' ? <ExpenseForm trip={trip} finance={finance} parent={parents[0]!} resolutionParents={parents} /> : kind === 'settlement' ? <SettlementForm trip={trip} finance={finance} parent={parents[0]!} resolutionParents={parents} /> : <BudgetEditor trip={trip} finance={finance} parent={parents[0]!} resolutionParents={parents} />;
}
function MergeCorrection({ trip,finance }: { trip: TripRecord;finance: Finance }) {
  const { entityId } = useParams();
  const [parent] = useState(() => finance.heads.find(event => event.entityId === entityId));
  return parent ? <ExpenseForm trip={trip} finance={finance} parent={parent} /> : <p>Revisión no disponible.</p>;
}
export function TripFinance({ trip }: { trip: TripRecord }) {
  const finance = useFinance(trip), base = `/viajes/${trip.id}`;
  if (finance.failed) return <Notice kind="error" title="No se pudo confirmar el registro financiero"><p>Comprueba el acceso y la conexión. Los importes no se presentan como definitivos. Recarga para volver a consultar el servidor.</p></Notice>;
  if (!finance.state || !finance.summary || !finance.context || finance.services && !finance.offlineReady && !finance.storageError) return <p role="status">Cargando personas y registro financiero completo…</p>;
  return <><SyncIndicator finance={finance} /><nav className="financial-nav" aria-label="Secciones del viaje"><Link to={base}>Inicio del viaje</Link><Link to={`${base}/balance`}>Balance</Link><Link to={`${base}/presupuesto`}>Presupuesto</Link><Link to={`${base}/estadisticas`}>Estadísticas</Link><Link to={`${base}/actividad`}>Actividad financiera</Link></nav>
    <p className="small muted" role="status">{finance.complete ? 'Registro confirmado por el servidor' : 'Datos sin confirmar · esperando conexión al servidor'}</p>
    {finance.state.provisional && <Notice kind="warning" title="Balances provisionales"><p>Hay datos incompletos, inválidos o revisiones en conflicto. Las entidades afectadas se excluyen del subtotal validado. No se ha elegido una propuesta automáticamente.</p><ul>{finance.state.issues.map((issue,index) => <li key={index}>{issue.kind === 'budget' ? 'Presupuesto' : issue.kind === 'expense' ? 'Gasto' : issue.kind === 'settlement' ? 'Abono' : 'Registro'}: {issue.reason === 'conflict' ? 'revisiones incompatibles' : issue.reason === 'invalid' ? 'datos inválidos' : 'datos incompletos'}{issue.entityId && <Link to={`${base}/actividad`}> · Ver historial</Link>}</li>)}</ul></Notice>}
    {finance.invalidCount > 0 && <p role="alert">{finance.invalidCount} eventos recibidos no cumplen el contrato v2. Se conserva la incidencia y no se usan como datos válidos.</p>}
    {finance.offlineReady && !finance.canWrite && <Notice kind="warning" title="Edición no disponible"><p>El viaje está cerrado, el acceso fue retirado o faltan metadatos. Las propuestas locales siguen conservadas.</p></Notice>}
    <Routes><Route index element={<HomeView trip={trip} finance={finance} />} /><Route path="gastos/nuevo" element={<ExpenseForm trip={trip} finance={finance} />} /><Route path="gastos/:entityId" element={<DetailRoute trip={trip} finance={finance} />} /><Route path="gastos/:entityId/editar" element={<EditorRoute trip={trip} finance={finance} kind="expense" />} /><Route path="abonos/nuevo" element={<SettlementForm trip={trip} finance={finance} />} /><Route path="abonos/:entityId/editar" element={<EditorRoute trip={trip} finance={finance} kind="settlement" />} /><Route path="balance" element={<BalanceView trip={trip} finance={finance} />} /><Route path="presupuesto" element={<BudgetView trip={trip} finance={finance} />} /><Route path="estadisticas" element={<StatisticsView trip={trip} finance={finance} />} /><Route path="actividad" element={<><LocalOperations groups={finance.pending} currency={trip.currency} /><ConflictReview trip={trip} finance={finance} /><MergeRepairs trip={trip} finance={finance} /><DuplicateReview trip={trip} finance={finance} pairs={findDuplicateExpenses(finance.heads.filter(event => !finance.localState!.issues.some(issue => issue.entityId === event.entityId)),finance.events)} /><ActivityView trip={trip} finance={finance} /></>} />
      <Route path="resolver/:kind/:entityId" element={<ResolutionEditor trip={trip} finance={finance} />} /><Route path="revisar-unificacion/:entityId" element={<MergeCorrection trip={trip} finance={finance} />} /><Route path="*" element={<p>Esta sección no existe.</p>} /></Routes>
  </>;
}
