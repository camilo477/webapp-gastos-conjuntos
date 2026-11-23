import { useState } from 'react';
import { Link, Route, Routes, useParams } from 'react-router-dom';
import { Notice } from '../../components/Notice';
import type { TripRecord } from '../../repositories/access/contracts';
import { useFinance, editableHead } from './useFinance';
import type { Finance } from './useFinance';
import { ExpenseForm } from './ExpenseForm';
import { SettlementForm } from './SettlementForm';
import { ActivityView, BalanceView, BudgetView, ExpenseDetail, HomeView, StatisticsView } from './FinanceViews';

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
export function TripFinance({ trip }: { trip: TripRecord }) {
  const finance = useFinance(trip), base = `/viajes/${trip.id}`;
  if (finance.failed) return <Notice kind="error" title="No se pudo confirmar el registro financiero"><p>Comprueba el acceso y la conexión. Los importes no se presentan como definitivos. Recarga para volver a consultar el servidor.</p></Notice>;
  if (!finance.state || !finance.summary || !finance.context) return <p role="status">Cargando personas y registro financiero completo…</p>;
  return <><nav className="financial-nav" aria-label="Secciones del viaje"><Link to={base}>Inicio del viaje</Link><Link to={`${base}/balance`}>Balance</Link><Link to={`${base}/presupuesto`}>Presupuesto</Link><Link to={`${base}/estadisticas`}>Estadísticas</Link><Link to={`${base}/actividad`}>Actividad financiera</Link></nav>
    <p className="small muted" role="status">{finance.complete ? 'Registro confirmado por el servidor' : 'Datos sin confirmar · esperando conexión al servidor'}</p>
    {finance.state.provisional && <Notice kind="warning" title="Balances provisionales"><p>Hay datos incompletos, inválidos o revisiones en conflicto. Las entidades afectadas se excluyen del subtotal validado. No se ha elegido una propuesta automáticamente.</p><ul>{finance.state.issues.map((issue,index) => <li key={index}>{issue.kind === 'budget' ? 'Presupuesto' : issue.kind === 'expense' ? 'Gasto' : issue.kind === 'settlement' ? 'Abono' : 'Registro'}: {issue.reason === 'conflict' ? 'revisiones incompatibles' : issue.reason === 'invalid' ? 'datos inválidos' : 'datos incompletos'}{issue.entityId && <Link to={`${base}/actividad`}> · Ver historial</Link>}</li>)}</ul></Notice>}
    {finance.invalidCount > 0 && <p role="alert">{finance.invalidCount} eventos recibidos no cumplen el contrato v2. Se conserva la incidencia y no se usan como datos válidos.</p>}
    <Routes><Route index element={<HomeView trip={trip} finance={finance} />} /><Route path="gastos/nuevo" element={<ExpenseForm trip={trip} finance={finance} />} /><Route path="gastos/:entityId" element={<DetailRoute trip={trip} finance={finance} />} /><Route path="gastos/:entityId/editar" element={<EditorRoute trip={trip} finance={finance} kind="expense" />} /><Route path="abonos/nuevo" element={<SettlementForm trip={trip} finance={finance} />} /><Route path="abonos/:entityId/editar" element={<EditorRoute trip={trip} finance={finance} kind="settlement" />} /><Route path="balance" element={<BalanceView trip={trip} finance={finance} />} /><Route path="presupuesto" element={<BudgetView trip={trip} finance={finance} />} /><Route path="estadisticas" element={<StatisticsView trip={trip} finance={finance} />} /><Route path="actividad" element={<ActivityView trip={trip} finance={finance} />} /><Route path="*" element={<p>Esta sección no existe.</p>} /></Routes>
  </>;
}
