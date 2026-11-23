import { Link } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { Notice } from '../../components/Notice';
import { PageHeader } from '../../components/PageHeader';

export function ExpensePage() {
  return <><Link className="text-button" to="/">Volver a Inicio</Link><PageHeader title="Registrar gasto" description="Formulario visual de ejemplo. Los campos están deshabilitados." />
    <Notice title="Vista previa del formulario"><p>El guardado, los pagadores y el reparto se implementarán después del motor financiero.</p></Notice>
    <form aria-label="Gasto de demostración" onSubmit={event => event.preventDefault()}>
      <Field label="Concepto" defaultValue="Almuerzo" disabled />
      <div className="amount-field"><Field label="Importe en COP" defaultValue="120000" inputMode="numeric" disabled hint="Pesos enteros · sin conversiones" /></div>
      <div className="setting-row"><span>Pagó</span><strong>Ana · ejemplo</strong></div><div className="setting-row"><span>Reparto</span><strong>3 personas · partes iguales</strong></div>
      <details className="form-block"><summary>Categoría, fecha y nota</summary><div className="form-block"><Field label="Categoría" defaultValue="Comida" disabled /><Field label="Fecha" type="date" defaultValue="2026-11-21" disabled /><Field label="Nota" defaultValue="Ejemplo sin persistencia" disabled /></div></details>
      <div className="form-footer"><Button disabled aria-describedby="save-help">Guardar gasto</Button><p id="save-help" className="field-hint">No se guarda ni se envía información en esta fase.</p></div>
    </form>
  </>;
}
