# Reglas financieras

Estas reglas son independientes de UI, red y Firebase. Los tests descritos en [TEST_PLAN](TEST_PLAN.md) son obligatorios antes de presentar dinero como correcto.

## Representación y validación

Dinero en enteros de la unidad menor de la moneda del viaje; COP usa pesos enteros. La entrada «100,50» no es válida en COP; no se trunca ni redondea silenciosamente. Monedas con exponente 2 aceptan hasta dos decimales. No conversiones ni mezclas de moneda.

Importe por movimiento entre 1 y 10^12. Pesos porcentuales enteros en centésimas de porcentaje: 33,33% se representa como 3333 y 100% como 10000. Usar BigInt para productos y sumas; `10^12 × 10000` excede el rango entero seguro de Number. Persistir números únicamente tras comprobar rango entero seguro. Formatear desde unidades menores, sin usar resultados de `Intl` como entrada de cálculo.

Se rechazan total no positivo, fracciones indebidas, NaN/infinito, pagadores repetidos, listas desalineadas, participante desconocido, reparto vacío, porcentaje negativo o suma distinta de 10000. Los aportes se introducen como importes, no se infieren de cuotas. Un pagador puede no consumir el gasto.

## Reparto por restos mayores

Para total `T`, personas incluidas y pesos no negativos `w_i` con suma `W > 0`:

1. Ordenar las personas por `personId` en comparación ordinal estable, independiente del idioma y de la posición visual.
2. Calcular cuota base `q_i = floor(T × w_i / W)` y resto `r_i = (T × w_i) mod W` con enteros exactos.
3. Quedan `R = T − suma(q_i)` unidades. Asignar una unidad a las primeras R personas por resto descendente; empate por `personId` ascendente. Los pesos 0 no reciben sobrantes.
4. Guardar pesos y cuotas finales; al editar, recalcular desde total y pesos, nunca redondear cuotas ya redondeadas.

Igualitario: pesos 1 por persona incluida. Porcentual: W = 10000 obligatorio. Excluir a alguien equivale a quitarlo o peso 0; el resto debe definir el 100% completo. Al cambiar de igualitario a porcentajes, la UI pide corregir cualquier centésima faltante; no acepta 99,99% como aproximadamente 100%.

Ejemplos con IDs A < B < C:

| Caso | Cuotas |
| --- | --- |
| T=100; igual entre A, B, C | A=34, B=33, C=33 |
| T=100; A=3333, B=3333, C=3334 | A=33, B=33, C=34 |
| T=1; A=5000, B=5000 | A=1, B=0 |
| T=100; A excluido, B y C iguales | A=0, B=50, C=50 |
| T=100; 10 participantes iguales | Cada persona=10 |

Invariante por gasto efectivo: `suma(aportes) = total = suma(cuotas)`. Eliminar lógicamente excluye todo el gasto; restaurar aplica otra vez el snapshot recalculado exacto. «Reversible» significa sin pérdida monetaria al editar/restaurar usando el historial, no que las divisiones enteras permitan recuperar pesos originales sin guardarlos.

## Ampliación fixed y fronteras numéricas (Fase 3)

`fixed` usa importes enteros explícitos por persona, suma exacta del total y
`weights: []`. No se aplica redondeo ni conversión a porcentaje. Al editar el
total, las cuotas deben volver a sumar el nuevo importe; no se escalan
automáticamente. Véase la extensión financiera v2 de DATA_MODEL.

El parseo acepta texto sin agrupadores ni símbolos; COP solo dígitos, USD/EUR
hasta dos decimales con coma o punto (un único separador). Espacios exteriores
se eliminan; exponentes, signos, agrupadores y redondeo implícito se rechazan.
El formateo del motor es español determinista con código de moneda, agrupador
de miles `.` y separador decimal `,`, desde enteros exactos, también para saldos
negativos. No depende de la configuración regional del dispositivo.

Las sugerencias se calculan sobre agregados BigInt y pueden superar el tope de
un abono individual. Son propuestas de dominio, no documentos persistibles; una
integración posterior deberá dividir un pago superior a 10^12 en movimientos
permitidos sin alterar el total. No se cambia el algoritmo min(deuda, crédito).

## Saldos y abonos

Para cada persona:

`saldo = compras_pagadas − cuotas_asignadas + abonos_enviados − abonos_recibidos`

Positivo: debe recibir. Negativo: debe aportar. `suma(saldos) = 0`. Agregar todos los gastos activos válidos una sola vez y todos los abonos activos válidos una sola vez. La identidad es `personId`, no nombre ni UID actual. Las personas revocadas permanecen en la contabilidad.

Ejemplo: T=200.000, A paga 150.000, B paga 50.000, cuotas 100.000 cada uno. Saldos A=+50.000, B=−50.000. Un abono B→A de 20.000 produce +30.000/−30.000; otro de 30.000 produce 0/0. Costo del viaje sigue siendo 200.000.

No bloquear abonos mayores que la deuda calculada: puede estar provisional o una persona puede adelantar dinero. Advertir antes de confirmar; registrar el hecho y permitir saldo invertido. No permitir origen=destino, importe cero ni referenciar otra moneda/viaje.

Sugerencias de liquidación: ordenar deudores y acreedores por importe absoluto descendente y `personId` como desempate. Proponer `min(deuda, crédito)` hasta agotar ambos. El resultado reduce saldos a cero si se ejecuta, sin prometer mínimo global de transferencias. Las propuestas no escriben pagos hasta confirmación explícita del usuario.

## Costos, estadísticas y conflicto

Costo = suma de gastos efectivos; los abonos no lo modifican. Por día/categoría: sumar total de cada gasto; por persona ofrecer por separado pagado y consumido, sin sumarlos como otro costo. Fechas y categoría solo agrupan. Usar zona del viaje, incluso si el dispositivo cambia de zona.

Evento inválido, padre faltante o varias cabezas: entidad fuera del subtotal validado. Mostrar cuántas entidades/importes están pendientes y que el saldo global es provisional. El subtotal de entidades válidas mantiene suma cero, pero no representa el viaje completo. No presentar una liquidación definitiva ni cierre si hay conflictos conocidos. Offline la vista es una estimación local con completitud de la última descarga.

## Presupuesto diario

Propuesta pendiente de ratificar: solo propietario modifica presupuesto; los cupos manuales son asignaciones reservadas, no límites que impidan registrar gastos. Todas las fechas son inclusivas y el «hoy» se calcula en zona del viaje, con un reloj inyectado en tests.

- Sin presupuesto total: mostrar gasto por día y costo, disponible «Sin presupuesto»; nunca usar cero como si se hubiera agotado.
- Al crear B para D días sin bloqueos: repartir B por igual con restos mayores, desempate por fecha ascendente.
- Presupuesto usado = costo válido acumulado. Disponible real = B − costo, puede ser negativo. Abonos no cuentan.
- Para proponer cupos desde el día actual: restar de B el gasto real de días anteriores. Reservar cupos manuales de hoy/futuro. Dividir el remanente no negativo entre días sin cupo manual de hoy/futuro. La asignación automática de hoy no baja por cada compra de hoy; su disponible es asignación menos gasto de hoy.
- Al avanzar al siguiente día, el gasto real de hoy sustituye su asignación y se redistribuye el remanente futuro. Mostrar además proyección de mañana en el día actual usando todo el gasto ya registrado: permite ver inmediatamente el impacto de un exceso.
- Ejemplo: B=400.000, cuatro días; día 1 asignado 100.000 y gastado 250.000. Hoy disponible=−150.000; proyección días 2–4 =50.000 cada uno. Al iniciar día 2, su cupo automático es 50.000.
- Cupos manuales futuros permanecen iguales aunque haya exceso anterior. Si gastado pasado + reservas > B, automáticos=0 y se muestra déficit de financiación; no se producen cupos negativos ni se ajustan reservas sin permiso.
- Un cambio manual se rechaza si la suma de reservas futuras supera el remanente no negativo al momento de editar según datos completos. Ediciones/gastos posteriores pueden producir déficit; no se rechazan gastos por eso.
- Día manual de hoy superado: mostrar exceso; no elevar automáticamente su cupo. Lo gastado se aplica a la proyección de mañana. Sin días futuros, mostrar exceso final o sobrante sin asignar.
- Antes del viaje se distribuye desde startDate; después de endDate no quedan días redistribuibles. Sobrante no se asigna a días pasados.
- Gastos retroactivos recalculan días posteriores y resumen. Cupos de días pasados se consultan como asignación manual o estimación reconstruida a partir de eventos conocidos, nunca como un valor histórico almacenado que se actualiza sin explicación.
- Conflicto financiero o datos incompletos produce presupuesto provisional. Cambiar B o reservas crea revisión de la entidad budget; dos cambios offline no se pisan.

Prueba con reserva: B=400.000, día 1 gastado 250.000, día 4 manual 80.000. Días 2 y 3 reciben 35.000 cada uno. Si día 1 gastó 350.000, reserva 80.000 permanece, automáticos=0 y déficit reservado=30.000. Disponible real del viaje todavía es 50.000; no confundir ese dato con el déficit de asignaciones.

En Fase 3 las proyecciones descuentan también compras ya conocidas con fecha
futura, una sola vez. De una reserva futura solo se aparta su parte no gastada;
el cupo manual visible permanece fijo. Los automáticos futuros muestran su gasto
ya conocido más la asignación del remanente libre. Un presupuesto no disponible
por conflicto se distingue de un presupuesto conocido con total null.
