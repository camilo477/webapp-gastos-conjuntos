# Revisión y ajustes visuales de Fase 1

La composición original fue revisada por el usuario. Se conserva su identidad: misma paleta, familia tipográfica, jerarquía, separadores, tres destinos de navegación y temas claro/oscuro. Esta entrega aplica ajustes concretos; no ratifica la Fase 2.

## Entregables actualizados

- [Prototipo de 23 pantallas](../../design/prototype/index.html).
- [Composición principal](../../design/review/composition.png) y [SVG](../../design/review/composition.svg).
- [Detalle ilustrado de presupuesto](../../design/review/budget-composition.png) y [SVG](../../design/review/budget-composition.svg).
- [Pruebas DOM y recorridos](../../design/review/dom-results.json), [contrastes/documentación](../../design/review/document-results.json) y [resultado del intento de navegador](../../design/review/browser-results.json).
- [Fixture financiero exportado desde las vistas](../../design/review/verified-fixture.json), utilizado para generar las composiciones y evitar cifras divergentes.

## Presupuesto diario

Inicio conserva dos indicadores secundarios. «Disponible del viaje» mantiene su relación con el total; «Gastado hoy» añade debajo cupo asignado y exceso o diferencia. No se añaden tarjetas ni la tabla diaria a Inicio.

Presupuesto separa total/disponible del bloque «Hoy»: cupo asignado, gasto del día y exceso o ahorro provisional. El ahorro es provisional porque el día puede tener más movimientos. «Para los próximos días» explica la redistribución y la tabla mantiene inicial, gastado y propuesta. Una reserva manual sigue fija; nunca se impide anotar un gasto por superar el cupo.

| Concepto del ejemplo solicitado | Importe |
| --- | --- |
| Total / duración | $400.000 / 4 días |
| Inicial y cupo del primer día | $100.000 |
| Gasto del primer día | $250.000 |
| Exceso del primer día | $150.000 |
| Disponible del viaje | $150.000 |
| Propuesta días 2, 3 y 4 | $50.000 cada uno |

También se comprueba ahorro provisional de $16.000 con gasto diario de $84.000; el remanente de $316.000 se reparte exactamente aunque haya sobrante de un peso. Los días anteriores no se incluyen de nuevo en el divisor del cupo actual.

## Balance y coherencia de cifras

El cálculo del prototipo ya proponía ambos pagos; la composición original omitía el segundo. Se completó sin cambiar el fixture:

| Persona | Saldo neto | Pago sugerido |
| --- | --- | --- |
| Ana | Recibe $20.000 | Bruno → Ana: $20.000 |
| Bruno | Aporta $30.000 | Total enviado: $30.000 |
| Carla | Recibe $10.000 | Bruno → Carla: $10.000 |

Las pruebas aplican las sugerencias a los saldos para 2, 3 y 10 personas y verifican residuo cero. Otra prueba registra los dos abonos del ejemplo por la interfaz y confirma que nadie queda debiendo; el costo sigue siendo $250.000.

La actividad inicial se deriva de los registros ficticios en lugar de repetir textos monetarios fijos. El importe y las fechas de la gráfica acumulada se calculan a partir de los datos actuales; al superar el presupuesto, el punto de gasto queda por encima de su línea, sin recorte engañoso. La tabla accesible ofrece los importes exactos. No se proyectan compras futuras ficticias.

## Gasto y captura con una mano

Concepto e importe siguen siendo las entradas principales. Pagadores y reparto permanecen visibles; «Categoría, fecha y nota» usa divulgación progresiva. Una fila discreta «Añadir imagen · opcional» abre tres accesos separados: Cámara, Galería y Stock/Openverse. No se solicitan cámara, archivos ni API reales.

La simulación de selección de imagen conserva el borrador y devuelve el foco al control de origen. Fechas tienen límites reales del viaje; ya no contienen interpolación literal. Seleccionar una persona/pagador o modo de reparto conserva el foco de teclado tras actualizar las cuotas.

## Variante del botón fijo

Escenarios permite comparar «Fijo · ancho cómodo» y «Fijo · compacto». El botón conserva acento, altura cómoda y jerarquía. En móvil, ambas variantes ocupan una banda reservada sobre la navegación; la zona de desplazamiento termina antes de esa banda. Las alturas reales de controles y navegación se miden con ResizeObserver para responder a reflujo y áreas seguras. En formularios se mantiene guardado en flujo normal, sin banda ni navegación inferior que interfieran con teclado.

Se comprobó la estructura DOM, la alternancia sin perder contenido, los estilos de reserva y las referencias de safe areas. **No se midieron rectángulos renderizados ni se verificó ausencia de solape en navegador**, porque Chromium no pudo iniciar. La ilustración representa la variante prevista; no demuestra geometría HTML real.

## Sincronización e identificación de operaciones

| Estado | Representación |
| --- | --- |
| Sincronizado | Texto e icono; ninguna operación pendiente |
| Sin conexión | Captura local disponible; operaciones con «Pendiente de envío» |
| Cambios pendientes | Contador y lista con concepto, importe y tipo de operación |
| Sincronizando | Cada operación enviada indica «Enviando» |
| Error | «Envío sin confirmar», operación conservada y opción de revisión/copia |
| Conflicto | Gasto identificado, subtotal provisional y acceso a comparar propuestas |

Los movimientos de Inicio y su detalle señalan cuáles esperan confirmación. Actividad enumera, por ejemplo, el gasto «Almuerzo» y el abono Bruno→Ana, en lugar de mostrar solo un contador genérico. Los adjuntos pendientes se distinguen del dinero. Copiar propuesta usa los textos de las operaciones pendientes del escenario actual.

Sincronizar no elimina conflictos ni declara completos datos parciales. En la simulación, solo se confirman las operaciones incluidas al comenzar el envío; una operación añadida mientras tanto sigue pendiente. Todo este estado es local y efímero, sin outbox productivo ni servidor.

## Verificación y límites

Automático: sintaxis/formato, 23 pantallas en ambos temas en JSDOM, labels/recursos/IDs, recorridos financieros, presupuestos, estados por operación, foco explícito y preservación de formulario. El [reporte DOM](../../design/review/dom-results.json) contiene el número final y los casos realmente ejecutados. Se verifican 32 pares de contraste y se compara la paleta con la anterior; no se cambia la identidad.

Visual ejecutado: inspección de las dos ilustraciones PNG generadas, con ambos pagos, contexto diario, banda de acción y cupos futuros. Son composiciones ilustradas, no capturas de HTML ni pruebas en teléfonos.

Navegador: se intentó iniciar Chromium con Playwright y falló por restricción de procesos/sockets (`shutdown: Operation not permitted`). No se reintentó con escalación ni se cambió el entorno de seguridad. Permanecen pendientes:

- Renderizar las 23 pantallas a 320/390/768/1280/1440 px y confirmar reflujo sin overflow.
- Medir la banda fija durante scroll, safe areas reales y la legibilidad de importes largos.
- Probar zoom/texto al 200%, teclado virtual y navegador suspendido/reanudado.
- Recorrer Tab/Shift+Tab/Enter/Escape y comprobar foco nativo de dialog con VoiceOver/TalkBack.
- Validar temas claro/oscuro en Android e iPhone reales.

Gemini se omitió porque la credencial continúa sin configurar; se realizó revisión propia. No se conectó Firebase, no se agregaron dependencias de producción, no se hicieron commits/push ni despliegue. La entrega se detiene en estos ajustes de Fase 1.
