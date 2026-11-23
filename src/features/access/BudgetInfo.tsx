import { useEffect, useState } from 'react';
import { formatMoney } from '../../domain';
import type { TripRecord } from '../../repositories/access/contracts';
import { getInitialBudget } from '../../repositories/access/trips';
import { useSession } from './session';

export function BudgetInfo({ trip }: { trip: TripRecord }) {
  const { client } = useSession();
  const [value, setValue] = useState<number | null | undefined>(), [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    void getInitialBudget(client,trip).then(total => { if (active) setValue(total); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [client,trip]);
  return <div><dt>Presupuesto inicial</dt><dd>{failed ? 'No se pudo consultar. Vuelve a abrir el viaje.' : value === undefined ? 'Consultando…' : value === null ? 'Sin presupuesto' : formatMoney(BigInt(value),trip.currency)}</dd></div>;
}
