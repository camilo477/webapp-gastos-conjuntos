import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { Notice } from '../../components/Notice';
import { PageHeader } from '../../components/PageHeader';
import { moneyToDto, parseMoney } from '../../domain';
import type { FinancialEventV2Dto } from '../../domain';
import type { TripRecord } from '../../repositories/access/contracts';
import { prepareResolution } from '../../repositories/financial/revisions';
import { prepareOperation } from '../../repositories/financial/events';
import { useSession } from '../access/session';
import type { Finance } from './useFinance';
import { localDateTime, moneyInput, occurredAt } from './formValues';
import { useFinancialWrite } from './useFinancialWrite';
import { WriteFeedback } from './WriteFeedback';

export function SettlementForm({ trip,finance,parent,resolutionParents }: { trip: TripRecord; finance: Finance; parent?: FinancialEventV2Dto; resolutionParents?: FinancialEventV2Dto[] }) {
  const { user } = useSession(), navigate = useNavigate(), context = finance.context!;
  const previous = parent?.entityKind === 'settlement' ? parent.payload : undefined;
  const people = context.people.filter(person => person.status === 'active' || previous?.fromPersonId === person.personId || previous?.toPersonId === person.personId);
  const [from,setFrom] = useState(previous?.fromPersonId ?? trip.memberBindings[user!.uid]!), [to,setTo] = useState(previous?.toPersonId ?? people.find(person => person.personId !== trip.memberBindings[user!.uid])?.personId ?? '');
  const [amount,setAmount] = useState(previous ? moneyInput(previous.amount,trip.currency) : ''), [note,setNote] = useState(previous?.note ?? '');
  const initial = localDateTime(previous?.occurredAt ?? new Date().toISOString(),trip.timezone);
  const [day,setDay] = useState(initial.day), [time,setTime] = useState(initial.time), [timeChanged,setTimeChanged] = useState(false), [accepted,setAccepted] = useState(false);
  const writer = useFinancialWrite(trip.id,() => navigate(`/viajes/${trip.id}/balance`));
  const amountValue = (() => { try { return parseMoney(amount,trip.currency,true); } catch { return null; } })();
  const suggestion = finance.summary?.suggestions.transfers.find(row => row.fromPersonId === from && row.toPersonId === to)?.amount ?? 0n;
  const advance = amountValue !== null && amountValue > suggestion;
  return <><PageHeader title={previous ? 'Corregir abono' : 'Registrar abono'} description="Un pago declarado entre participantes. No se realiza ninguna transferencia bancaria." />
    <form onSubmit={event => { event.preventDefault(); void writer.submit(() => {
      if ((advance || finance.state!.provisional) && !accepted) throw new Error('Confirma que deseas registrar el abono con esta advertencia.');
      const payload = { fromPersonId: from,toPersonId: to,amount: moneyToDto(parseMoney(amount,trip.currency,true),true),note: note.trim() || null,day,occurredAt: previous && !timeChanged ? previous.occurredAt : occurredAt(day,time,trip.timezone),status: 'active' };
      return resolutionParents ? prepareResolution(context,{ uid: user!.uid,personId: trip.memberBindings[user!.uid]! },resolutionParents,payload) : prepareOperation(context,{ uid: user!.uid,personId: trip.memberBindings[user!.uid]! },'settlement',payload,parent);
    }); }}><fieldset className="financial-fields" disabled={writer.locked}><legend className="sr-only">Datos del abono</legend>
      <div className="field"><label htmlFor="settlement-from">Quién entrega</label><select id="settlement-from" value={from} onChange={event => { setFrom(event.target.value); setAccepted(false); }}>{people.map(p => <option key={p.personId} value={p.personId}>{p.displayName}</option>)}</select></div>
      <div className="field"><label htmlFor="settlement-to">Quién recibe</label><select id="settlement-to" value={to} onChange={event => { setTo(event.target.value); setAccepted(false); }} required><option value="">Selecciona una persona</option>{people.map(p => <option key={p.personId} value={p.personId}>{p.displayName}</option>)}</select></div>
      <Field label={`Importe en ${trip.currency}`} inputMode={trip.currency === 'COP' ? 'numeric' : 'decimal'} value={amount} onChange={event => { setAmount(event.target.value); setAccepted(false); }} required />
      <details className="form-block"><summary>Fecha, hora y nota</summary><div className="form-block"><Field label="Fecha del abono" type="date" min={trip.startDate} max={trip.endDate} value={day} onChange={event => { setDay(event.target.value); setTimeChanged(true); }} required /><Field label={`Hora (${trip.timezone})`} type="time" value={time} onChange={event => { setTime(event.target.value); setTimeChanged(true); }} required /><Field label="Nota (opcional)" value={note} onChange={event => setNote(event.target.value)} maxLength={2000} /></div></details>
      {(advance || finance.state!.provisional) && <Notice kind="warning" title="Comprueba el abono"><p>{finance.state!.provisional ? 'Los saldos son provisionales.' : 'Este importe supera la transferencia sugerida; puede invertir los saldos.'}</p><label className="check-label"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} />Confirmo este registro declarado</label></Notice>}
    </fieldset><WriteFeedback writer={writer} /><div className="form-footer"><Button type="submit" disabled={writer.pending || finance.canWrite === false}>{writer.pending ? 'Confirmando…' : writer.operation ? 'Reintentar misma operación' : 'Guardar abono'}</Button>{!writer.operation && <Link to={`/viajes/${trip.id}/balance`}>Cancelar</Link>}</div></form>
  </>;
}
