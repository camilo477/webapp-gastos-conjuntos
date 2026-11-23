import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { Notice } from '../../components/Notice';
import { PageHeader } from '../../components/PageHeader';
import { moneyToDto, parseMoney } from '../../domain';
import type { Currency } from '../../domain';
import { createTrip, editTripMetadata } from '../../repositories/access/trips';
import type { TripRecord } from '../../repositories/access/contracts';
import { useSession } from './session';
import { useAction } from './useAction';
import { ActionFeedback } from './ActionFeedback';

export function TripFormPage({ existing }: { existing?: TripRecord }) {
  const { client, user } = useSession(), action = useAction(), navigate = useNavigate();
  const [title, setTitle] = useState(existing?.title ?? ''), [destination, setDestination] = useState(existing?.destination ?? '');
  const [start, setStart] = useState(''), [end, setEnd] = useState(''), [timezone, setTimezone] = useState('America/Bogota');
  const [currency, setCurrency] = useState<Currency>('COP'), [amount, setAmount] = useState(''), [cover, setCover] = useState(existing?.cover?.key ?? '');
  if (!user) return <Navigate to="/login" replace />;
  if (user.isAnonymous || !user.emailVerified || existing && existing.ownerId !== user.uid) return <Notice title="No disponible"><p>Se requiere la cuenta verificada del organizador. <a href="/verificar">Verificar correo</a></p></Notice>;
  return <><PageHeader title={existing ? 'Editar viaje' : 'Crear viaje'} description={existing ? 'Fechas, zona y moneda permanecen fijas.' : 'El viaje empieza contigo. Después podrás invitar hasta nueve personas.'} />
    <form onSubmit={event => { event.preventDefault(); void action.run(async () => {
      const metadata = { title, destination: destination.trim() || null, cover: cover ? { kind: 'icon', key: cover } : null };
      if (existing) { await editTripMetadata(client,existing.id,existing.metadataVersion,metadata); navigate(`/viajes/${existing.id}`); }
      else { const id = await createTrip(client,{ ...metadata, startDate: start, endDate: end, timezone, currency, budget: amount.trim() ? moneyToDto(parseMoney(amount,currency)) : null }); navigate(`/viajes/${id}`); }
    }); }}>
      <Field label="Nombre del viaje" value={title} onChange={event => setTitle(event.target.value)} required maxLength={100} />
      <Field label="Destino (opcional)" value={destination} onChange={event => setDestination(event.target.value)} maxLength={120} />
      {!existing && <><Field label="Fecha inicial" type="date" value={start} onChange={event => setStart(event.target.value)} required /><Field label="Fecha final" type="date" min={start} value={end} onChange={event => setEnd(event.target.value)} required />
        <Field label="Zona horaria IANA" value={timezone} onChange={event => setTimezone(event.target.value)} required hint="Ejemplo: America/Bogota" />
        <div className="field"><label htmlFor="trip-currency">Moneda</label><select id="trip-currency" value={currency} onChange={event => setCurrency(event.target.value as Currency)}><option>COP</option><option>USD</option><option>EUR</option></select></div>
        <Field label="Presupuesto total (opcional)" value={amount} onChange={event => setAmount(event.target.value)} inputMode={currency === 'COP' ? 'numeric' : 'decimal'} hint={currency === 'COP' ? 'Pesos enteros, sin separadores de miles.' : 'Hasta dos decimales, sin separadores de miles.'} />
      </>}
      <div className="field"><label htmlFor="trip-cover">Portada (opcional)</label><select id="trip-cover" value={cover} onChange={event => setCover(event.target.value as typeof cover)}><option value="">Sin portada</option><option value="mountain">Montaña</option><option value="car">Trayecto</option><option value="wallet">Gastos</option></select><p className="field-hint">Solo iconos locales; no se almacenan fotografías.</p></div>
      <ActionFeedback error={action.error} /><Button type="submit" disabled={action.pending}>{action.pending ? 'Guardando…' : existing ? 'Guardar cambios' : 'Crear viaje'}</Button>
    </form>
  </>;
}
