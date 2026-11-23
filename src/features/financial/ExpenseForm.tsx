import { useState } from 'react';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { PageHeader } from '../../components/PageHeader';
import { Notice } from '../../components/Notice';
import { moneyToDto, parseMoney, splitExpense } from '../../domain';
import type { ExpenseSnapshot, FinancialEventV2Dto } from '../../domain';
import type { TripRecord } from '../../repositories/access/contracts';
import { prepareResolution } from '../../repositories/financial/revisions';
import { prepareOperation } from '../../repositories/financial/events';
import { useSession } from '../access/session';
import type { Finance } from './useFinance';
import { categories, localDateTime, moneyInput, occurredAt, percentageInput, percentageWeight } from './formValues';
import { useFinancialWrite } from './useFinancialWrite';
import { WriteFeedback } from './WriteFeedback';
import { DraftPanel } from './DraftPanel';

const draftSchema = z.strictObject({ title: z.string(),amount: z.string(),payerIds: z.array(z.string()),payments: z.record(z.string(),z.string()),included: z.array(z.string()),mode: z.enum(['equal','percentage','fixed']),shares: z.record(z.string(),z.string()),category: z.enum(['food','transport','lodging','activities','shopping','other']),day: z.string(),time: z.string(),note: z.string(),timeChanged: z.boolean() });

export function ExpenseForm({ trip, finance, parent, resolutionParents }: { trip: TripRecord; finance: Finance; parent?: FinancialEventV2Dto; resolutionParents?: FinancialEventV2Dto[] }) {
  const { user } = useSession(), navigate = useNavigate();
  const previous = parent?.entityKind === 'expense' ? parent.payload : undefined;
  const context = finance.context!;
  const people = context.people.filter(person => person.status === 'active' || previous?.payerIds.includes(person.personId) || previous?.participantIds.includes(person.personId));
  const [title, setTitle] = useState(previous?.title ?? ''), [amount, setAmount] = useState(previous ? moneyInput(previous.total, trip.currency) : '');
  const [payerIds, setPayerIds] = useState(previous?.payerIds ?? [trip.memberBindings[user!.uid]!]);
  const [payments, setPayments] = useState<Record<string, string>>(Object.fromEntries(previous?.payerIds.map((id,i) => [id,moneyInput(previous.payerAmounts[i]!,trip.currency)]) ?? []));
  const [includedSelection, setIncluded] = useState<string[] | null>(previous?.participantIds ?? null);
  // Untouched defaults follow newly confirmed membership. Explicit exclusions
  // and reviewed revisions remain exactly as chosen by the user.
  const included = includedSelection ?? people.filter(p => p.status === 'active').map(p => p.personId);
  const [mode, setMode] = useState<ExpenseSnapshot['splitMode']>(previous?.splitMode ?? 'equal');
  const [shares, setShares] = useState<Record<string, string>>(Object.fromEntries(previous?.participantIds.map((id,i) => [id,previous.splitMode === 'percentage' ? percentageInput(previous.weights[i]!) : previous.splitMode === 'fixed' ? moneyInput(previous.shareAmounts[i]!,trip.currency) : '']) ?? []));
  const [category, setCategory] = useState<ExpenseSnapshot['category']>(previous?.category ?? 'other');
  const initialTime = localDateTime(previous?.occurredAt ?? new Date().toISOString(),trip.timezone);
  const [day, setDay] = useState(initialTime.day), [time, setTime] = useState(initialTime.time), [note, setNote] = useState(previous?.note ?? '');
  const [timeChanged, setTimeChanged] = useState(false);
  const draftId = `${trip.id}/expense/${resolutionParents?.map(p => p.operationId).join('/') ?? parent?.operationId ?? 'new'}`;
  const writer = useFinancialWrite(trip.id, () => navigate(`/viajes/${trip.id}`),draftId);
  const toggle = (ids: string[], id: string) => ids.includes(id) ? ids.filter(item => item !== id) : [...ids,id];
  const build = () => {
    const total = parseMoney(amount,trip.currency,true);
    const allocations = splitExpense(total, mode === 'equal' ? { mode, personIds: included } : mode === 'percentage'
      ? { mode, weights: included.map(personId => ({ personId, weight: percentageWeight(shares[personId] ?? '') })) }
      : { mode, shares: included.map(personId => ({ personId, amount: parseMoney(shares[personId] ?? '',trip.currency) })) });
    const payload = { title, total: moneyToDto(total,true), note: note.trim() || null, category, occurredAt: previous && !timeChanged ? previous.occurredAt : occurredAt(day,time,trip.timezone), day,
      payerIds, payerAmounts: payerIds.map(id => moneyToDto(payerIds.length === 1 ? total : parseMoney(payments[id] ?? '',trip.currency,true),true)),
      participantIds: allocations.map(row => row.personId), shareAmounts: allocations.map(row => moneyToDto(row.amount)), splitMode: mode,
      weights: mode === 'fixed' ? [] : allocations.map(row => mode === 'equal' ? 1 : percentageWeight(shares[row.personId] ?? '')),
      visual: null, attachmentId: null, status: 'active', mergedInto: null };
    return resolutionParents ? prepareResolution(context,{ uid: user!.uid,personId: trip.memberBindings[user!.uid]! },resolutionParents,payload) : prepareOperation(context,{ uid: user!.uid,personId: trip.memberBindings[user!.uid]! },'expense',payload,parent);
  };
  return <><PageHeader title={previous ? 'Editar gasto' : 'Agregar gasto'} description="Pagas tú, se divide por igual entre participantes activos. Puedes ajustar las opciones." />
    <form aria-label="Gasto compartido" onSubmit={event => { event.preventDefault(); void writer.submit(build); }}>
      <fieldset disabled={writer.locked} className="financial-fields"><legend className="sr-only">Datos del gasto</legend>
        <Field label="Concepto" value={title} onChange={event => setTitle(event.target.value)} required maxLength={100} autoFocus />
        <div className="amount-field"><Field label={`Importe en ${trip.currency}`} value={amount} onChange={event => setAmount(event.target.value)} inputMode={trip.currency === 'COP' ? 'numeric' : 'decimal'} required hint="Sin separadores de miles." /></div>
        <p className="small muted">Pagadores: {payerIds.map(id => people.find(person => person.personId === id)?.displayName).join(', ')} · {included.length} incluidos · {mode === 'equal' ? 'partes iguales' : mode === 'percentage' ? 'porcentajes' : 'importes fijos'}</p>
        <details className="form-block"><summary>Pagadores y división</summary>
          <fieldset className="form-block"><legend>Quién pagó</legend>{people.map(person => <div className="allocation-row" key={person.personId}><label className="check-label"><input type="checkbox" checked={payerIds.includes(person.personId)} onChange={() => setPayerIds(toggle(payerIds,person.personId))} />{person.displayName}{person.status === 'revoked' ? ' (acceso retirado)' : ''}</label>{payerIds.length > 1 && payerIds.includes(person.personId) && <Field label={`Aporte de ${person.displayName}`} inputMode="decimal" value={payments[person.personId] ?? ''} onChange={event => setPayments({ ...payments,[person.personId]: event.target.value })} required />}</div>)}</fieldset>
          <div className="field"><label htmlFor="split-mode">División del gasto</label><select id="split-mode" value={mode} onChange={event => { setMode(event.target.value as typeof mode); setShares({}); }}><option value="equal">Partes iguales</option><option value="percentage">Porcentajes</option><option value="fixed">Importes fijos</option></select></div>
          <fieldset className="form-block"><legend>Participantes incluidos</legend>{people.map(person => <div className="allocation-row" key={person.personId}><label className="check-label"><input type="checkbox" checked={included.includes(person.personId)} onChange={() => setIncluded(toggle(included,person.personId))} />{person.displayName}</label>{included.includes(person.personId) && mode !== 'equal' && <Field label={`${mode === 'percentage' ? 'Porcentaje' : 'Cuota'} de ${person.displayName}`} inputMode="decimal" value={shares[person.personId] ?? ''} onChange={event => setShares({ ...shares,[person.personId]: event.target.value })} required />}</div>)}</fieldset>
          {mode !== 'equal' && <p className="field-hint">{mode === 'percentage' ? 'Los porcentajes deben sumar exactamente 100%.' : 'Las cuotas deben sumar exactamente el total.'}</p>}
        </details>
        <details className="form-block"><summary>Categoría, fecha, hora y nota</summary><div className="form-block">
          <div className="field"><label htmlFor="expense-category">Categoría</label><select id="expense-category" value={category} onChange={event => setCategory(event.target.value as typeof category)}>{Object.entries(categories).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></div>
          <Field label="Fecha del gasto" type="date" min={trip.startDate} max={trip.endDate} value={day} required onChange={event => { setDay(event.target.value); setTimeChanged(true); }} />
          <Field label={`Hora (${trip.timezone})`} type="time" value={time} required onChange={event => { setTime(event.target.value); setTimeChanged(true); }} />
          <Field label="Nota (opcional)" maxLength={2000} value={note} onChange={event => setNote(event.target.value)} />
        </div></details>
        {(day < trip.startDate || day > trip.endDate) && <Notice kind="warning" title="Fecha fuera del viaje"><p>Elige una fecha entre {trip.startDate} y {trip.endDate} en las opciones de fecha.</p></Notice>}
      </fieldset>
      <WriteFeedback writer={writer} /><DraftPanel id={draftId} disabled={writer.locked} value={{ title,amount,payerIds,payments,included,mode,shares,category,day,time,note,timeChanged }} parse={draftSchema.parse} restore={draft => { setTitle(draft.title); setAmount(draft.amount); setPayerIds(draft.payerIds); setPayments(draft.payments); setIncluded(draft.included); setMode(draft.mode); setShares(draft.shares); setCategory(draft.category); setDay(draft.day); setTime(draft.time); setNote(draft.note); setTimeChanged(draft.timeChanged); }} /><div className="form-footer"><Button type="submit" disabled={writer.pending || finance.canWrite === false}>{writer.pending ? 'Guardando…' : writer.operation ? 'Reintentar misma operación' : 'Guardar gasto'}</Button>{!writer.operation && <Link to={`/viajes/${trip.id}`}>Cancelar</Link>}</div>
    </form>
  </>;
}
