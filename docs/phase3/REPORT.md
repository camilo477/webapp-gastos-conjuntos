# Fase 3 · Motor financiero y modelos de dominio

## Resultado y alcance

Motor puro implementado en `src/domain/`, sin importar React, Firebase, navegador,
red ni reloj implícito. La interfaz sigue usando los fixtures de Fase 2; no se
habilitaron escrituras, cuentas, QR, fotos ni despliegue. Fase 4 no iniciada.

La Fase 2 se verificó publicada en GitHub y localmente en `main`, SHA
`9071de8da696ad698f99cf127511cc9c2aaca4d5`. No había conflictos ni modificaciones
versionadas. El archivo previo sin seguimiento `tatus --short --branch` se
conservó en `.cache/pre-phase3/`, según la decisión delegada por el usuario;
no se borró ni se incluye en el commit.

## Arquitectura y API

Todos los cálculos utilizan el mismo `FinancialState` validado. El contexto de
cálculo contiene fechas, zona, moneda y personas históricas; no pretende ser un
documento completo de viaje ni otorgar permisos. Los DTO contienen Number
enteros acotados; el motor y todas sus salidas monetarias usan BigInt.

| Archivo | Funciones y responsabilidad |
| --- | --- |
| `money.ts` | `parseMoney`, `formatMoney`, `moneyToBigInt`, `moneyToDto`, `sumMoney`; COP/USD/EUR y límites |
| `dates.ts` | `tripDay`, `inclusiveDays`, esquemas de fecha civil, instante UTC y zona IANA |
| `allocation.ts` | `allocateByWeight`, `splitExpense`; reparto equal/percentage/fixed y desempate ordinal |
| `schemas.ts` | Contexto, personas, gastos, abonos, presupuestos y metadata visual; validaciones de contexto y cambios |
| `events.ts` | DTO v1/v2, `migrateFinancialEventV1`, `validateEventParents`, `serializedByteLength` |
| `state.ts` | `prepareFinancialState`; selección canónica de snapshots/revisiones, errores y completitud |
| `projection.ts` | `projectFinancialEvents`; proyección contable local conservadora por entidad |
| `balances.ts` | `calculateBalances`, `suggestTransfers`; sin saldos editables ni pagos automáticos |
| `budget.ts` | `calculateBudget`, `validateBudgetEdit`; cupos, reservas, proyecciones y evolución |
| `statistics.ts` | `calculateStatistics`; total, día, categoría, pagado/consumido por persona |
| `summary.ts` | `summarizeTrip`; resumen coherente de todas las vistas |
| `index.ts` | Exportaciones públicas del dominio |

Se crean once archivos de pruebas y fixtures propios bajo `domain/testing/`.
`vitest.config.ts` separa los proyectos `domain` (Node, sin setup DOM/React) y
`ui` (las pruebas anteriores). `tsconfig.domain.json` comprueba la compilación
sin lib DOM ni tipos React/Firebase. No se modificaron componentes o estilos.
Zod **4.6.7**, ya existente de forma transitiva, se registra como dependencia
directa exacta; el lockfile no cambia versiones del resto de paquetes.

## Contratos y validación

El contrato financiero se extiende explícitamente a **schemaVersion 2** para el
modo `fixed` solicitado en UX-D01. `fixed` conserva cuotas enteras exactas y
requiere `weights: []`; no se aproxima a porcentajes ni se reescala al editar.
`equal` y `percentage` recalculan y verifican las cuotas por restos mayores.
Los metadatos del MVP conservan v1. El lector v1 rechaza fixed y la migración
pura a v2 preserva cantidades/asociaciones, normalizando opcionales y ordenando
listas alineadas. No existen documentos reales migrados o escritos.

Los esquemas rechazan campos desconocidos, importes inválidos, IDs duplicados,
listas desalineadas, pagadores cero/negativos, cuotas incoherentes, porcentajes
no enteros o cuya suma no sea 10.000, fechas inválidas/fuera del viaje y días
incompatibles con la zona. Un nuevo gasto/abono no añade revocados; una edición
puede conservar personas ya presentes en el padre. Un pagador puede no consumir.

El tope por movimiento es 10^12 unidades menores; agregados pueden superarlo y
superar Number seguro. `moneyToDto` impide persistir un agregado fuera del tope.
El formato es español determinista desde enteros, con código de moneda; parseo
sin agrupadores, símbolos, exponentes o redondeo silencioso. COP no admite
fracciones; USD/EUR hasta dos decimales con un único separador coma/punto.

Los eventos validan UUID v4, versión, acciones, estado, padres/before, reloj y
snapshot conservado al eliminar. Una resolución puede elegir estado eliminado.
El límite cliente de 32 KiB se mide sobre JSON UTF-8 completo, incluidos before,
sin TextEncoder. No equivale a reglas de servidor; Timestamp se representa como
DTO `{seconds,nanoseconds}` sin importar Firebase.

## Algoritmos y ejemplos

Reparto: producto/división/resto BigInt, bases por división entera y sobrantes
por resto descendente/personId ordinal ascendente. Pesos cero no reciben
sobrantes. Entre tres, 100 produce A=34, B=33, C=33, con cualquier orden.

Saldo = pagado − consumido + enviado − recibido. Gasto 200.000, A paga 150.000,
B paga 50.000, cuotas 100.000: A=+50.000, B=−50.000. B→A de 20.000 deja
±30.000; otro de 30.000 liquida. Un adelanto de 70.000 invierte los saldos
sin aumentar el costo. Borrar/restaurar y editar recalculan desde snapshots.

Liquidación: deudores/acreedores por magnitud descendente y personId como
desempate, transferir min(deuda, crédito) hasta agotar. No modifica historial
ni promete mínimo global de transferencias. Una sugerencia agregada puede
superar 10^12; la integración futura debe dividir su registro en abonos válidos.

Presupuesto: distribución inicial equitativa por fecha, reconstrucción de cupos
con gasto anterior y reserva manual, cupo de hoy independiente de compras de
hoy, proyección futura desde todo gasto conocido. Reservas no se reducen por
exceso; automáticos nunca negativos. Una edición de reserva excesiva se rechaza
con datos completos; una proyección posterior preserva la reserva y muestra déficit.

| Caso de cuatro días | Disponible total | Propuesta días 2/3/4 | Déficit |
| --- | ---: | --- | ---: |
| B=400.000, gasto día 1=250.000 | 150.000 | 50.000 / 50.000 / 50.000 | 0 |
| Igual, día 4 manual=80.000 | 150.000 | 35.000 / 35.000 / 80.000 | 0 |
| Gasto día 1=350.000, reserva=80.000 | 50.000 | 0 / 0 / 80.000 | 30.000 |

En el primer caso el cupo inicial del día 1 es 100.000 y el exceso 150.000.
Se diferencian presupuesto null, cero, agotado, gasto superior, antes/después,
último día y sobrante sin asignar. Retroactivos reconstruyen días posteriores.
La evolución por día expone gasto, acumulado, cupo inicial/reconstruido y saldo
presupuestario. Las estadísticas usan únicamente las compras efectivas;
los abonos nunca aumentan costo.

## Eventos, conflictos e incompletitud

`projectFinancialEvents(context, events, complete)` valida también ancestros y
sus snapshots, identifica cabezas y conserva todas las entradas del llamador.
No aplica last-write-wins ni decide por hora. Una sola cabeza válida proyecta;
varias cabezas, padres faltantes, revisiones inválidas o un mismo ID con contenido
incompatible excluyen la entidad y hacen provisionales todas las vistas.
Repetir el mismo ID/contenido no cuenta dos veces. Una resolución explícita
sobre dos padres puede dejar una cabeza; una rama tardía vuelve a abrir conflicto.

También existe entrada de snapshots seleccionados mediante `prepareFinancialState`.
En esa API el llamador debe aportar revisión y estado explícitos. La completitud
global siempre requiere información del llamador: no se puede detectar una
entidad enteramente ausente sin referencias. Padres referenciados ausentes sí se
detectan aun si complete=true. Cero provisional no representa costo definitivo.
`budgetStatus: unavailable` distingue un presupuesto desconocido de uno sin total.

Es una proyección local de contabilidad, no la sincronización de Fase 6: no hay
cola, IndexedDB, envío/reintento, autorización remota ni ejecución de pares merge.
Los merges y sus entidades vinculadas se conservan fuera del subtotal y como
pendientes; no se interpreta un flag merged aislado como conciliación válida.

## Pruebas ejecutadas

Comando final: `npm run check`, con Node **24.22.3**, Vitest **4.1.12** y
TypeScript **5.9.3**. Ejecución local 2026-11-22, 19:58:15 America/Bogota.
Resultado: **169 aprobadas, 0 fallidas, 17 archivos**; 135 nuevas de dominio y
34 anteriores de UI/configuración. Lint, typecheck general, typecheck de dominio
y build PWA también terminaron correctamente. Log local ignorado:
`.cache/phase3-check.log`. Ver [resumen versionado](test-results-summary.json).

Dentro de esos casos (no contados como miles de pruebas independientes):

- **4.500 vectores** de reparto/balance, 500 por cada tamaño de grupo 2–10:
  equal/percentage/fixed, mínimos/máximos, permutaciones, varios pagadores,
  abonos y aplicación de sugerencias con residuo cero.
- **1.000 presupuestos** deterministas verifican conservación del remanente,
  reservas y no negatividad de automáticos.
- **1.000 conjuntos de eventos** permutados verifican edición, borrado,
  restauración, conflictos y padres ausentes.
- Una carga de **10.000 movimientos de 10^12** produce 10^16 exactos;
  el formato de 10^16+1 conserva esa unidad fuera del rango seguro Number.
- Todas las permutaciones de 100/3; 1/2 con 1/0 estable; 10 personas al 10%;
  entradas congeladas, exclusiones, fixed, revocados y pagador no consumidor.
- Bogotá/UTC, cambio de zona del proceso, DST primavera/otoño New York,
  bisiesto, límites inclusivos, fechas inválidas y reloj implícito bloqueado.

| Casos documentales | Cobertura de dominio |
| --- | --- |
| FIN-01/05/06/07/11 | balances.test.ts y projection.test.ts |
| FIN-02/03/04/09/10 | allocation.test.ts, money.test.ts y properties.test.ts |
| FIN-08 | properties.test.ts: 4.500 vectores + permutaciones |
| VAL-01 | schemas.test.ts, money.test.ts, events.test.ts |
| VAL-02 | dates.test.ts y money.test.ts |
| BUD-01–05 | budget.test.ts, properties.test.ts, projection.test.ts |
| STAT-01 | statistics.test.ts y summary integrado |
| Aislamiento e inmutabilidad | isolation.test.ts y tsconfig.domain.json |

No se eliminaron ni modificaron pruebas anteriores. E2E y reglas de emuladores
no se repitieron: interfaz, Firebase, reglas y versiones de sus dependencias no
cambiaron. Sus resultados anteriores se conservan; no se suman como pruebas de
Fase 3. Las limitaciones multiplataforma/físicas de Fases 1/2 siguen pendientes.

## Correcciones y revisión

Se corrigieron una importación sin uso, la expresión de exclusión de controles
Unicode señalada por ESLint y un fixture de prueba que validaba el undécimo
integrante antes de alcanzar la aserción esperada. En revisión propia se
reforzaron resolución eliminada, conservación del snapshot en delete, estado
no disponible del presupuesto, límite UTF-8 y validación de ancestros. Sus
regresiones están incluidas en la ejecución final aprobada.

Gemini **omitido**: el CLI está instalado, pero la autenticación ya había fallado
en esta sesión; se aplicó el fallback acordado sin reintentos ni envío de código
privado. Ningún resultado de este informe se atribuye a una revisión Gemini.

`npm audit --omit=dev --json`: **0 vulnerabilidades de ejecución**.
Auditoría completa: los **17 avisos moderados heredados** de herramientas de
Firebase CLI/Workbox permanecen; 0 altos/críticos. `.gitignore` conserva fuentes,
pruebas, lockfile y configuración, y excluye dependencias, compilados, cachés,
`.env` reales y reportes regenerables. Auditoría de secretos y Git se registran
al cierre de la publicación. El control final inspeccionó **244 candidatos** sin
detectar patrones de secretos; comprobó 16 rutas de exclusión/retención y el hash
del plan original. El archivo previo conserva sus 5.234 bytes en la ubicación
acordada. La validación documental comprobó **27 documentos** y **32 pares de
contraste**, sin incidencias y sin sobrescribir resultados anteriores.

## Limitaciones y decisiones pendientes

- Los permisos/roles, miembros activos en servidor y coherencia de rutas de
  Firestore deben comprobarse en repositorios/reglas futuros. El dominio no
  autentica al autor ni certifica que una compra haya sucedido.
- No se implementa transporte distribuido ni merge de duplicados, tampoco se
  persisten eventos o saldos. Los metadatos completos de cuentas/invitaciones
  y adjuntos siguen siendo contratos futuros.
- La interpretación de zona depende de los datos IANA/ICU del runtime; se
  prueban casos concretos y no se toma la zona ni el reloj implícito del equipo.
- Los cupos históricos son reconstrucciones con presupuesto y eventos conocidos,
  no snapshots auditados del presupuesto visto por cada dispositivo en el pasado.
- BigInt no es JSON directo: DTO y conversiones explícitas; no convertir agregados
  a Number ni dividir cuotas con floats desde una integración futura.
- La interfaz permanece demostrativa. No se inicia Fase 4.

## Git y publicación

`git add --all` falló con `Unable to create .git/index.lock: Read-only file
system`. Se conserva todo el trabajo. No se eludió el montaje protegido ni se
intentó publicar por otra vía. El índice sigue vacío; se revisaron el diff de
trabajo y las fuentes nuevas, pero no fue posible preparar un diff staged.

**Commit nuevo: no generado. Push: no realizado, pendiente. CI remota: pendiente.**
La consulta final a GitHub confirma `main` todavía en el SHA de Fase 2:
`9071de8da696ad698f99cf127511cc9c2aaca4d5`. Localmente `main` sigue `origin/main`
y no hay conflictos. Los comandos para revisar, publicar y comprobar SHA desde
Ubuntu están en [GIT_SETUP](../GIT_SETUP.md). No se declara publicada la Fase 3.


## Actualización de publicación verificada al iniciar Fase 4

La limitación Git descrita arriba corresponde a la entrega original. Se confirmó
posteriormente en GitHub que Fase 3 sí fue publicada como
[`7524563b13b0efa4c681101e9cea050870663a0d`](https://github.com/camilo477/webapp-gastos-conjuntos/commit/7524563b13b0efa4c681101e9cea050870663a0d).
Al iniciar Fase 4, `main` local y remoto coincidían y el árbol estaba limpio.
Se conserva el informe original y sus resultados sin reinterpretarlos.
