# Fase 5 · Gastos compartidos reales en emuladores

## Resultado y alcance

Fase 5 implementada con autorización explícita del usuario el 2026-11-23.
Gastos, abonos, revisiones, eliminaciones/restauraciones, historial, balances,
presupuestos y estadísticas usan eventos financieros **v2**, Firebase Emulator
Suite y el motor existente de Fase 3. Dos contextos independientes de Firefox
observan cambios confirmados sin recarga y conservan propuestas concurrentes.
No hay un segundo motor, balances persistidos ni CRUD destructivo.

Base verificada: `main` limpio y `origin/main` en
`545fb36bc41d9781d23b8f55946133c718232f2a`. GitHub confirmó ese SHA antes de
editar. Fase 4 está publicada; los párrafos de publicación pendiente de su
informe describen su entrega original. Se leyeron los documentos exigidos,
los informes anteriores y el código. El prototipo y `src/domain/` se conservan.

Únicamente proyecto `demo-`, loopback, Auth 9199 y Firestore 8180 en desarrollo.
Sin Firebase productivo, despliegue, fotos, Openverse ni Fase 6. Cierre de viajes
y reasignación de identidades permanecen denegados. Publicación Git: ver cierre.

## Arquitectura y archivos principales

| Archivo o módulo | Responsabilidad |
| --- | --- |
| `src/repositories/financial/events.ts` | DTO/Timestamp, personas históricas, registro completo, preparación v2, commit REST y read-back idempotente |
| `src/features/financial/useFinance.ts` | Suscripciones por viaje/UID, completitud, memoización del proyector y resumen único |
| `src/features/financial/TripFinance.tsx` | Rutas y edición sobre base capturada; estado provisional visible |
| `ExpenseForm.tsx`, `SettlementForm.tsx` | Formularios progresivos y validación mediante dominio |
| `FinanceViews.tsx` | Inicio, detalle, auditoría, balances, presupuesto y estadísticas textuales |
| `useFinancialWrite.ts`, `WriteFeedback.tsx` | Confirmación, exclusión de envíos simultáneos, propuesta e ID conservados para reintento |
| `formValues.ts` | Adaptación de texto/fecha/hora; ninguna aritmética contable |
| `firestore.rules` | Autorización, inmutabilidad, conservación y padres directos |
| `tests/rules/phase5.test.mjs` | Ataques de cliente ordinario y límites de reglas |
| `tests/emulator-e2e/financial.spec.ts` | Dos usuarios, finanzas, concurrencia, 500 gastos y accesibilidad Firefox |
| `scripts/measure-financial.mjs` | Carga reproducible de 500/2.500/10.000 eventos del dominio |

Se reutilizan Button, Field, Dialog, Notice, PageHeader, tokens, temas, navegación
y tipografía. Sin nuevas dependencias ni cambios al lockfile. La ruta financiera
se integra en TripPage; la demo conserva fixtures de solo lectura y su etiqueta.
La información administrativa queda debajo de las prioridades financieras.

`projectFinancialEvents` recibe todo el registro y contexto histórico;
`summarizeTrip` proporciona balances, sugerencias, estadísticas y presupuesto.
React formatea esos resultados sin calcular cuotas, saldos o agregados propios.
`splitExpense`, validadores de cambios, padres y presupuesto se reutilizan al
preparar operaciones. El reloj explícito se actualiza cada minuto para el día del
viaje; la proyección solo se recalcula al cambiar eventos/contexto/completitud.

## Eventos y confirmación

Única fuente: `trips/{tripId}/events/{operationId}`. Cada evento contiene versión,
entidad/tipo, operación, autor UID/personId, padres, reloj lógico, snapshot completo,
before, hora declarada y recepción de servidor. `merge` permanece null. Se permite
create/replace/delete; el servidor valida también resolve de dos padres del
contrato, sin ofrecer resolución distribuida en la interfaz.

1. Validar formulario y preparar una operación inmutable con UUID v4 antes del
   intento. Una edición captura la revisión mostrada, aunque llegue otra después.
2. Consultar ese ID en servidor. Si ya existe, comparar todo salvo receivedAt;
   normalizar mapas mediante representación canónica y contratos compartidos.
3. Enviar REST `documents:commit` con ID token de cliente ordinario, precondición
   `exists:false` y transform `receivedAt=REQUEST_TIME`, con timeout de 15 segundos.
4. Confirmar mediante lectura de servidor del mismo ID/contenido. Un 403, un
   timeout o un snapshot local pendiente nunca constituyen confirmación.
5. En caso incierto conservar operación/ID en la pantalla, bloquear cambios al
   payload y ofrecer reintento del mismo ID y texto copiable. Reintentar después
   de una respuesta perdida no crea otro documento.

No se usa setDoc/writeBatch del SDK para operaciones financieras: no se deja una
escritura en su cola offline. Hay memoria de formulario, **no outbox durable**.
Salir, navegar o recargar puede perder la propuesta; el mensaje lo explica y se
registra beforeunload mientras hay una operación incierta. La navegación interna
no garantiza conservarla. Comprobar historial antes de registrar una nueva.

Listeners con metadata descartan datos pendientes como fuente confirmada y
mantienen provisionalidad ante caché/desconexión. Se espera también el contexto
de personas y la raíz budget declarada por el viaje. Eventos inválidos conservan
su incidencia/cabecera para que el dominio bloquee la entidad; no se filtran
silenciosamente y luego se presenta un total definitivo. No se depende del orden
ni de la hora del cliente para elegir una revisión.

## Funcionalidades

- Captura rápida: concepto e importe, un pagador propio, activos incluidos,
  división igual, hora/fecha actuales y categoría Otros. Opciones progresivas
  para aportes múltiples, exclusiones, porcentajes exactos, fixed, categoría,
  fecha/hora en zona del viaje y nota. COP entero; USD/EUR con dos decimales.
- Edición por cualquier miembro activo, eliminación lógica y restauración con
  nueva revisión. Los anteriores permanecen intactos. Revocados históricos
  pueden conservarse en una revisión donde ya figuraban.
- Balances: pagado, consumido, enviado, recibido, saldo neto y sugerencias del
  dominio. Positivo debe recibir, negativo debe aportar; suma cero.
- Abonos declarados: registro, corrección, eliminación y restauración. No son
  transferencias bancarias verificadas y no aumentan el costo. Advertencia
  confirmable para adelantos/saldos provisionales.
- Historial: creación, edición, eliminación, restauración, abonos y presupuesto;
  responsable, recepción, cambios antes/después y revisión vigente/histórica o
  provisional. Todos los gastos son accesibles desde actividad, incluso fuera
  de los ocho recientes. Render inicial de 50 entradas, con «Mostrar más».
- Presupuesto: total, gasto acumulado, disponible, gasto/cupo/exceso del día,
  déficit, reconstrucción por día y propuesta futura. Solo organizador edita;
  una reserva manual por revisión, preservando las demás. Quitar presupuesto
  requiere retirar previamente cada reserva. La validación usa validateBudgetEdit.
- Estadísticas textuales accesibles por día, categoría y persona, separando
  pagado/consumido; evolución presupuestaria en la vista de presupuesto.
- Conflictos: ambas ramas permanecen en actividad. La entidad se excluye del
  subtotal y todos los resultados quedan provisionales. No hay ganador por
  timestamp ni una conciliación inventada; resolver corresponde a Fase 6.

## Seguridad efectiva y fronteras

Denegación por defecto. Usuarios ordinarios no pueden update/delete eventos;
propietario tampoco. La aplicación no usa Admin SDK. Fixtures privilegiados
solo preparan estados de prueba; las aserciones de autorización usan clientes
ordinarios. La carga de 500 eventos también pasa por reglas autenticadas.

| Garantía | Servidor / dominio |
| --- | --- |
| Pertenencia activa, viaje activo y presupuesto por owner | Reglas, vinculadas a memberBindings/ownerId existentes |
| Autor real y persona contable | Reglas: UID autenticado y binding actual |
| v2, acciones, campos, formato, enums, tamaños de listas/textos | Reglas; contrato estricto compartido vuelve a validar al recibir |
| Aportes positivos, cuotas no negativas y sumas exactas al total | Reglas; suma int acotada y dominio BigInt |
| Pesos equal=1, porcentaje entero no negativo con suma 10.000, fixed sin pesos | Reglas y dominio |
| IDs únicos por listas, referencias activas o ya presentes en padres | Reglas; padres en el mismo viaje/tipo/entidad |
| Raíz única, before exacto, reloj 1+máximo de padres, padres distintos | Reglas, por inducción desde raíz inmutable; dominio vuelve a comprobar |
| Borrado conserva importes/snapshot salvo status | Reglas y dominio |
| Restos mayores y desempate exacto de cuotas equal/percentage | **Dominio/proyector**, no algoritmo completo en reglas |
| Calendario/instante IANA y coincidencia entre ocurrido y día | **Dominio**; reglas ordinarias comprueban formato/rango, no conversión IANA |
| Reservas manuales | Reglas validan la nueva fila por revisión, rango, dinero, campos y longitud; dominio comprueba unicidad por fecha y semántica global |
| Reservas contra gasto conocido/remanente | **Dominio** con datos completos; servidor no agrega el registro |
| Cabezas incompatibles, ancestros ausentes y completitud | Proyector y metadata de suscripción; servidor valida padres directos, no recorre todo el DAG |
| Límite serializado UTF-8 de 32 KiB | Contrato compartido; reglas acotan estructura/textos pero no garantizan esa cota exacta de bytes |

Un miembro autorizado puede enviar cuotas conservadas pero incompatibles con
restos mayores; un owner puede enviar reservas semánticamente incompatibles.
El servidor no certifica esa semántica ni que una compra ocurrió. El lector y
proyector rechazan esos snapshots y hacen provisional el resultado, excluyendo
la entidad completa, incluidos descendientes si el ancestro es inválido.
Esto **no es protección semántica completa del servidor**. Puede bloquear una
entidad hasta conciliación futura; no se presenta como contabilidad definitiva.

### Coste de reglas

Las primeras implementaciones fallaron con 1.000 expresiones. Se corrigieron
mediante ramas explícitas y garantías inductivas, sin permitir mutaciones ni
renunciar a conservación. `monetaryList` combina join/regex decimal acotada,
suma entera de diez posiciones y total exacto: regex por sí sola no verifica
el tipo. Trece dígitos por entrada limitan el cálculo intermedio; sumas de texto,
fracciones compensadas, signos, bools y desbordamientos se rechazan en pruebas.

Campos adicionales se rechazan con hasOnly; todos los obligatorios se leen y
su ausencia falla cerrada. Se probaron omisiones individuales de los 14 campos
del envelope y 16 del gasto. Cardinalidades, IDs de entidad y relojes no negativos
se garantizan inductivamente con la raíz y padres existentes inmutables. No se
requiere repetir validaciones idénticas de calendarios/metadatos antiguos.

Cota conservadora sin descontar caché para escritura financiera: raíz **2**
accesos (exists/get trip), un padre **3**, dos padres **4**. Crear trip/budget
conserva su cota anterior de 17 por commit. La prueba de carga usa diez raíces
por commit, cota conservadora 20. No se publican lotes financieros encadenados.
Se comprobaron diez pagadores/participantes, porcentajes, dos padres con importes
nuevos y nota de 2.000 caracteres, más presupuesto con 366 reservas y dos padres.
La última suite completa pasa sin errores de máximo de expresiones.

Se consultaron la [referencia oficial de List](https://firebase.google.com/docs/reference/rules/rules.List)
y los [límites de Firestore](https://firebase.google.com/docs/firestore/quotas).
Las cotas de acceso se derivan del código; cobertura acumulada no equivale a
medición exacta de expresiones o accesos por petición.

## Pruebas ejecutadas

Detalle reproducible en [test-results-summary.json](test-results-summary.json).
Node 24.22.3; Firebase Emulator Suite; Playwright 1.65.1, Firefox 159.

| Suite | Resultado |
| --- | --- |
| ESLint | Aprobado |
| Typecheck de aplicación + dominio sin DOM | Aprobado |
| Vitest | 197 aprobadas, 0 fallidas, 23 archivos; conserva 180 anteriores |
| Build Vite + PWA | Aprobado; advertencia heredada de chunk SDK >500 kB |
| Reglas completas Fases 2/4/5 | 117 aprobadas, 0 fallidas; conserva 45 anteriores |
| Firefox Auth/viajes previo | 10 aprobadas, 0 fallidas |
| Firefox finanzas | 9 aprobadas, 0 fallidas en la ejecución final |
| Firefox demo/PWA | 19 aprobadas, 0 fallidas; SW/offline y actualización entre dos builds |
| Chromium/WebKit y equipos físicos | No ejecutados en esta fase; no se declaran aprobados |

Se comprobaron: dos miembros con gastos 60.000 y 40.000 (deuda 10.000), abono
5.000, edición del primero a 80.000 (deuda 15.000), eliminación/restauración,
corregir/eliminar/restaurar abono, presupuesto manual, estadísticas e historial.
Otro viaje no expone esos datos. Múltiples pagadores 150.000/50.000 producen
±50.000; porcentajes 70/30, rechazo de 99,99%, fixed y exclusiones funcionan.
Dos formularios abiertos sobre la misma base conservan dos propuestas online,
subtotal cero para esa entidad y aviso provisional en ambos usuarios.

Respuesta HTTP perdida después del commit: un único envío, mismo ID reintentado,
un único gasto efectivo. Offline informa no confirmado; reconectar no encola el
gasto automáticamente. Vitest cubre raíz budget ausente, caché, limpieza de los
dos listeners, ID/contenido distinto, cambio de UID y snapshots inválidos.

Finanzas: 320/390/768/1440 px, claro/oscuro, formularios progresivos, inputMode
numérico, mensajes de error, texto ampliado al 200%, foco y axe sobre las vistas.
Las seis resoluciones administrativas anteriores también se repitieron.
No se atribuyen teclado móvil real, instalación, cámara o pruebas iOS/Android
físicas a Playwright. Las capturas y trazas regenerables permanecen ignoradas.

## Carga, lecturas y rendimiento

500 gastos creados mediante 50 commits autenticados ordinarios y vistos por el
listener: **7.055 ms** en esta sesión, con total/estadísticas exactos. No es una
promesa de latencia de producción. Actividad muestra 50 y luego 100 al ampliar;
la proyección sigue usando todo el registro.

Carga pura Node, ejecutada con `node scripts/measure-financial.mjs`:

| Eventos | Proyección | Resumen | JSON sintético |
| --- | ---: | ---: | ---: |
| 500 | 340 ms | 2 ms | 341.891 bytes |
| 2.500 | 1.292 ms | 2 ms | 1.711.391 bytes |
| 10.000 | 4.955 ms | 10 ms | 6.848.891 bytes |

Todos conservan suma cero, conteo y total exactos. Heap delta observado:
15/45/74 MB aproximadamente, con ruido de GC; no representa pico ni memoria
absoluta de navegador. Una proyección de varios segundos puede bloquear UI en
viajes grandes. No se han implementado worker, snapshots autoritativos ni
reconciliación incremental prematura.

Se descarga la colección completa. Abrir/reabrir viaje y cada revisión añaden
lecturas; el historial inmutable crece. Hay una suscripción financiera y una de
personas por viaje montado, además del listener de metadatos existente. No se
suscriben fotos ni viajes ajenos. Los límites Spark se comparten entre usuarios:
[cuotas oficiales](https://firebase.google.com/docs/firestore/quotas) y
[límites documentados del proyecto](../SERVICE_LIMITS.md). Emuladores no prueban
cuotas, costes, red de producción ni abuso. No hay rate limiting robusto por IP.

## Correcciones, revisión y límites pendientes

Se corrigieron excesos de reglas, pérdida de contexto durante transiciones de
caché, interpretación de hora en zona del viaje, conservación de base durante
ediciones concurrentes, completitud ante raíz budget ausente y acceso a gastos
antiguos desde actividad. Se conserva la fecha/instante original si no se edita.
DST inexistente se rechaza; una hora ambigua nueva usa el offset encontrado por
el adaptador. El instante UTC resultante se valida en el dominio.

Gemini CLI se ejecutó en modo plan/read-only, sin extensiones y con timeout de
45 segundos. El proveedor devolvió cuota excedida; no completó revisión. No se
reintentó ni se alteró autenticación. **Gemini fue omitido como revisión efectiva**;
se aplicaron revisión propia, pruebas reales y regresiones. Ningún hallazgo se
atribuye a Gemini.

Auditoría npm: 0 vulnerabilidades de ejecución; 17 moderadas heredadas de
herramientas, 0 altas/críticas. Sin upgrades para ocultar avisos. Revisión de
secretos: 293 candidatos, 286 textos y cuatro commits previos sin patrones
detectados; 35 documentos sin enlaces locales rotos y 17 controles de exclusión
correctos. `.gitignore` conserva fuentes/fixtures y excluye dependencias, cachés,
emuladores, credenciales y capturas. Diff de trabajo y staged revisados; sin
errores de whitespace ni cambios al motor financiero/prototipo.

Pendientes de Fase 6, únicamente con autorización nueva: outbox durable por UID,
recuperación de propuestas al recargar, reconciliación offline, resolución
explícita distribuida y duplicados. Fotos/Openverse, producción, despliegue,
cierre seguro y reasignación no se habilitan. Los abonos siguen siendo hechos
declarados y los cupos pasados reconstrucciones, no auditoría de valores vistos
por cada dispositivo.

## Git y entrega

El primer `git add` preparó 30 archivos y se revisaron `git diff --cached`,
whitespace, fuentes, fixtures y exclusiones. Al añadir la actualización final
de este informe y del resumen, Git devolvió:
`Unable to create .git/index.lock: Read-only file system`.

Se conserva el índice inicial y toda la documentación final en el árbol de
trabajo. Los cambios de documentación posteriores al primer staging y
PUBLISH.md todavía necesitan añadirse. No se eludió el montaje, no se usó sudo,
no se cambió de rama ni se intentó publicar por otro servicio.

**Commit nuevo: no generado. Push: no realizado. CI remota: no comprobada.**
`main` local sigue `origin/main` en
`545fb36bc41d9781d23b8f55946133c718232f2a`; el remoto se verificó por SSH al cierre.
No se declara publicada la Fase 5. [Comandos seguros para Ubuntu](PUBLISH.md).
La siguiente fase recomendada es Fase 6, únicamente tras publicar/revisar esta
entrega y recibir una nueva autorización explícita. El trabajo se detiene aquí.
