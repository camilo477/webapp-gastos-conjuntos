# Fase 1 · Diseño UX/UI

**Estado actual (2026-11-22): Fase 1 aceptada provisionalmente por el usuario
para continuar; Fase 2 expresamente autorizada.** Se mantienen las pruebas
multiplataforma y físicas pendientes. El prototipo y los resultados anteriores
se conservan. Ver [Fase 2](../phase2/REPORT.md).

La [validación automatizada ampliada](AUTOMATED_TEST_REPORT.md) conserva 108 pruebas
DOM/lógica aprobadas y 68 auditorías axe parciales. Firefox ya ejecutó pruebas
reales y generó capturas; consultar la actualización final del informe para los
resultados HTTP, las correcciones y las repeticiones por archivo. La aprobación
multiplataforma sigue pendiente.

La composición inicial ya fue revisada por el usuario y su identidad se conserva. Los [ajustes visuales solicitados](VISUAL_ADJUSTMENTS.md) están aplicados: contexto de cupo diario, ambos pagos sugeridos, opciones progresivas, botón fijo y operaciones pendientes identificables. Se mantienen pendientes las validaciones de navegador/dispositivos indicadas en el reporte.

## Entregables

| Entregable solicitado | Resultado |
| --- | --- |
| A. Flujos | [Recorridos principales y arquitectura de información](USER_FLOWS.md) |
| B. Wireframes | [Especificación de pantallas](WIREFRAMES.md), [tablero móvil/escritorio](../../design/wireframes.html) y [composición ilustrada](../../design/review/composition.png) |
| C. Sistema de diseño | [Tipografía, tokens claro/oscuro, componentes, responsive y estados](DESIGN_SYSTEM.md) |
| D. Prototipo visual | [23 pantallas navegables con datos en memoria](../../design/prototype/index.html) |
| Diferencias con Fase 0 | [Reconciliación documentada antes de diseñar](SCOPE_RECONCILIATION.md) |
| Evidencia y limitaciones | [Revisión de la entrega](REVIEW.md) |
| Ajustes posteriores a la revisión | [Cambios, verificaciones y pendientes](VISUAL_ADJUSTMENTS.md) y [detalle de presupuesto](../../design/review/budget-composition.png) |

## Revisión sugerida

1. Abrir Inicio y registrar un gasto con concepto/importe, dejando el resto por defecto.
2. Probar tres personas y $100; ver $34/$33/$33. Cambiar a porcentajes e importes específicos.
3. Seleccionar varios pagadores y comprobar diferencia aportada.
4. Revisar el presupuesto de $400.000 y cupos diarios con reservas manuales.
5. Usar Escenarios para sin conexión, error, conflicto, duplicado, viaje cerrado y grupo de diez personas.
6. Alternar claro/oscuro y abrir el tablero en marcos de 390/1280 px. Evaluar después 320 px y zoom 200% en navegador real.

Los controles de revisión no forman parte de la aplicación. Se usan datos ficticios y no se deben introducir contraseñas reales. Cambiar escenario/grupo o recargar restablece el ejemplo.

## Decisiones que esta entrega permite evaluar

Captura rápida sin campos opcionales obligatorios; tres destinos de navegación; menú secundario visible; cuotas y pagadores separados; avisos que no impiden trabajar offline; cifras provisionales claras; modo oscuro; política de presupuesto fijo y confirmación de cierre. El reparto por importes específicos es ampliación explícita solicitada en esta fase y necesita actualizar el contrato antes de implementar.

Nombre/proveedor permanente y tratamiento de incidencias tardías siguen pendientes. La aprobación del diseño no equivale a probar reglas, cuotas, sincronización distribuida, instalación PWA o recuperación de invitados.
