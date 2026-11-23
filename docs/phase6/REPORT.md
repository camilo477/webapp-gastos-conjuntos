# Fase 6 · Sincronización offline y conflictos

Fecha: 2026-11-23. Implementación limitada al entorno local Firebase Emulator
Suite, proyecto demo-/loopback. No se habilitan producción, fotografías, pagos,
cierre ni reasignación. No se inicia Fase 7.

## Base e investigación

Antes de editar se verificaron main, árbol limpio, remoto y publicación de Fase 5:
`a89e2b630426929fd9fe33dc8184a65825fc252c` coincidía con origin/main y con
`git ls-remote origin refs/heads/main`. Se leyeron los documentos requeridos y
se inspeccionaron dominio, proyector, repositorios, sesión, React, SW y Firebase.
El [plan previo](PLAN.md) registra las decisiones. Se conserva toda documentación
anterior. El informe final de la sesión identifica commit/push realmente realizados.

## Arquitectura y durabilidad

`src/sync/storage.ts` usa IndexedDB nativo, separado por proyecto Firebase y UID;
los registros contienen además viaje e IDs de operación. No se usa localStorage
para dinero. Cuatro stores: viajes descargados (metadatos, personas y eventos
confirmados), operaciones/grupos, IDs reservados y borradores explícitos de gastos.
No hay tablas de saldos ni de estadísticas. Registros locales v1, base física v2:
la actualización crea el índice `state` sin borrar registros; una base v1 se
actualiza en transacción `onupgradeneeded`. El esquema se documenta aquí antes de
su primera publicación. Los documentos de Firestore mantienen contrato v2 y ruta
`trips/{tripId}/events/{operationId}`; no se reescriben datos financieros previos.

El guardado espera `IDBTransaction.oncomplete`, con durabilidad estricta. La
propuesta, reserva de IDs y eliminación de su borrador se confirman juntas.
Quota/error/abort no equivale a guardado: el formulario conserva valores, el
mismo evento y una representación copiable. Los borradores no son operaciones ni
se suben al servidor; «Guardar borrador» requiere confirmación de su transacción.
No se promete recuperación de texto visible que nunca se guardó.

Solo un viaje descargado con raíz presupuestaria, personas y metadatos suficientes
habilita captura local. Los snapshots confirmados se acumulan sin borrar hechos
inmutables cuando un listener anterior aún no incluye la última confirmación.
La copia local no afirma conocer compras publicadas durante la desconexión.
IndexedDB no es una copia de seguridad permanente: borrado, evicción del navegador,
fallo o pérdida del dispositivo pueden destruirla. Los emuladores reiniciados sin
exportación tampoco conservan el servidor.

## Coordinador, entrega e idempotencia

`src/sync/coordinator.ts` despierta al abrir, volver a primer plano, recuperar
conectividad, cambiar la cola y mediante sondeo activo. `navigator.onLine` es solo
una señal; se comprueba disponibilidad intentando el servicio. Hay acción manual
«Sincronizar ahora». Errores temporales aplican backoff exponencial con jitter,
tope de 60 segundos; permisos e integridad requieren revisión. No se garantiza
trabajo cuando la PWA está cerrada o suspendida.

Cada operación conserva operationId, autor UID/persona, padres, payload y reloj.
Las revisiones pendientes se envían después de sus padres; un padre rechazado no
se sustituye silenciosamente. Un lease transaccional de 45 segundos coordina
pestañas. Si se cierra una pestaña durante el envío, otra puede esperar hasta su
vencimiento. BroadcastChannel comunica solo invalidaciones, sin contenido privado.
El sondeo usa el índice de estados y no vuelve a parsear todo el historial ya
confirmado cada segundo. Las vistas memorizan eventos y proyección independientemente
de los estados de entrega y de las interacciones visuales.

El transporte existente se amplía a grupos de uno o dos eventos. Sigue usando
REST autenticado create-only, con timeout, evitando una segunda cola financiera
opaca del SDK. Firestore permanece en memoria. Primero se consulta el ID; después
de commit se lee otra vez el servidor y se compara contenido canónico, excluyendo
solo el timestamp de recepción. Una respuesta perdida lleva a reintentar el mismo
ID. ID existente distinto o grupo parcial se conserva como incidencia. Un
`permission-denied` jamás demuestra éxito; sin lectura autorizada no se afirma
confirmación. Confirmar el grupo y actualizar la copia local es otra transacción
atómica; si falla, los IDs originales siguen recuperables para nueva verificación.

## Proyección, conflictos y unificaciones

El motor existente continúa siendo la única implementación financiera. Se amplía
`projectFinancialEvents`, sin resolver por authoredAt, receivedAt ni orden de
llegada. Padres ausentes, entidades inválidas, varias cabezas y componentes merge
incompatibles se excluyen del subtotal validado y vuelven provisionales balances,
presupuestos y estadísticas. Padres tardíos, eventos repetidos idénticos y
permutaciones conservan el mismo resultado una vez completo el conjunto.

Actividad compara importes, pagadores, cuotas, personas, fecha, nota y cambios.
Se elige una propuesta o se prepara una versión corregida. La resolución genera
un evento con dos padres y before completos. Con más ramas se resuelve por pares;
un descendiente no consume una rama desconocida. Dos resoluciones simultáneas
son nuevas cabezas en conflicto. Presupuesto solo lo prepara/resuelve el propietario.

La heurística de duplicados normaliza Unicode NFKC, mayúsculas/espacios y exige
igual concepto, total, día, pagadores/aportes y proximidad de ocurrencia ≤5 minutos.
Puede equivocarse por relojes o compras legítimas. Nunca elimina automáticamente.
«Mantener separados» crea decisión inmutable ligada a ambas revisiones concretas;
un cambio posterior vuelve a evaluarse. Las decisiones no suman dinero.

«Unificar» exige selección y confirmación explícita. `mergeKeep` conserva el
snapshot elegido, `mergeHide` conserva el otro cambiando solo status/mergedInto.
Comparten mergeId y referencias recíprocas; se guardan juntos localmente y llegan
en un único commit del servidor. No se suman importes. Si hace falta corregir el
importe, se revisa primero el superviviente y se reafirma el par en Actividad.

El proyector comprueba reciprocidad, autor, recepción atómica y conservación.
Construye componentes con todos los enlaces históricos, valida cabezas y rutas
sin ciclos hacia un único superviviente, y no aplica medios pares. Edición,
borrado/restauración parcial, rama antigua tardía o merge concurrente vuelven el
componente provisional hasta resolver cabezas y reafirmar pares. Se conservan los
originales. Reafirmaciones sucesivas permiten resolver componentes con más de dos
gastos. No hay «deshacer» como toggle ni cambio silencioso de superviviente.

Extensión compatible del lector v2: un `mergeKeep` de reafirmación puede conservar
un superviviente **deleted**, además de active. Así una eliminación explícita y su
par coherente dejan costo cero sin resucitar el duplicado; restaurar y reafirmar
recupera el costo. No cambia el esquema de campos ni migra dinero existente:
Fase 5 rechazaba todos los merges persistidos y esta es su primera habilitación.
Lectores anteriores deben actualizarse antes de interpretar estas nuevas acciones.

## Seguridad y sesiones

Las reglas mantienen denegación por defecto e inmutabilidad. Cada escritura exige
sesión real, binding activo, viaje activo, autor/persona, contrato v2, campos
permitidos, padres de la misma entidad y reloj/before coherentes. Se conserva la
validación de importes, aportes, cuotas, personas y presupuesto solo propietario.
Los pares usan `getAfter` y rechazan una contraparte preexistente: ambos documentos
deben nacer en el mismo batch, con roles/autor/referencias/recepción coincidentes.
Cada mitad debe autorizarse por sí misma; no basta que una haga referencia a otra.
Snapshots merge se heredan de padres v2 autorizados, sin permitir cambiar dinero.
Las decisiones distinct referencian dos revisiones expense del mismo viaje.

El servidor garantiza autorización, forma, conservación heredada y atomicidad.
La semántica global del grafo (cabezas actuales, ramas que aún no llegaron, ciclos,
componentes y carácter completo del registro) corresponde al proyector. También
siguen allí restos mayores exactos, zona IANA/fecha y disponibilidad global de
reservas. La validación exclusiva del cliente no se presenta como protección del
servidor. Se prueba el límite real de reglas con diez participantes/pagadores,
nota máxima, resolución de dos padres y pares merge; no se debilitan reglas para
aceptar un caso. Accesos repetidos se benefician de la caché de evaluación. Se retira una
comparación redundante operationId≠entityId en revisiones: la raíz ya ocupa ese ID
y el servidor no permite update; los padres válidos conservan esa raíz por inducción.
La ruta rápida de resolve mantiene el caso máximo dentro del límite de expresiones.

Cambiar UID detiene el coordinador anterior y cambia la partición; rutas privadas
se desmontan por identidad. No se transmite la cola de A con credenciales de B.
Cerrar sesión conserva las propuestas y advierte del riesgo anónimo. Una revocación
bloquea el viaje al detectarse, retira su vista privada y mantiene propuestas propias
copiables en Actividad global. Un viaje cerrado rechaza gastos pendientes y los
conserva; el cierre de la aplicación permanece deshabilitado. No se promete borrar
copias que otras personas descargaron previamente ni recuperar identidades perdidas.
Habilitar cierre exige definir conciliación posterior y garantías sobre colas remotas
que ningún cliente puede inspeccionar globalmente.

## PWA y experiencia

El build explícito `--mode emulator-pwa` conecta únicamente demo-/loopback. El
build habitual conserva la demostración. El SW existente guarda solo recursos
públicos estáticos y fallback de navegación; nunca respuestas Auth/Firestore ni
outbox. La actualización espera escrituras IDB en curso, avisa de formularios sin
guardar y conserva operaciones durables; el usuario decide cuándo activarla.

Se conservan diseño, temas, navegación y controles existentes. Hay texto accesible
para offline, guardado local, envío, confirmación, rechazo, conflicto e incompletitud.
Actividad permite revisar/copiar propuestas, reintentar, comparar versiones y revisar
similitudes. La fecha local pendiente se distingue de la recepción del servidor.
Los valores predeterminados de participantes siguen la membresía nueva mientras
no se hayan elegido exclusiones; ediciones y selecciones explícitas se mantienen.

## Rendimiento

Mismo workload puro Node 24.22.3, 500/2.500/10.000 eventos, antes/después en esta
sesión. Medición única orientativa; no es latencia de red, navegador o producción.

| Eventos | Antes: proyección | Después: proyección | Resumen después |
| --- | ---: | ---: | ---: |
| 500 | 278 ms | 77 ms | 2 ms |
| 2.500 | 1.126 ms | 227 ms | 3 ms |
| 10.000 | 4.055 ms | 772 ms | 8 ms |

Se redujeron parseos repetidos de padres ya validados y creación repetida de
Intl.DateTimeFormat; caché de zonas acotada a 64. No cambian cálculos BigInt ni
criterios de revisión. La prueba conserva total 1.010.000 y suma de balances cero
para 10.000 eventos. El JSON ronda 6,85 MB; delta heap final ~56 MB, sensible al GC.
Resultados regenerables: `.cache/phase6/performance.json`; baseline conservada
localmente. Sin índices remotos nuevos ni saldos persistidos.

Cada viaje descarga todo el historial autorizado; suscripciones Firestore no son
paginadas. Las lecturas iniciales crecen con eventos y participantes y pueden agotar
cuotas gratuitas; no hay estimación de cuota productiva a partir del emulador.
Copias/eventos/operaciones conservados crecen en disco y memoria. Actividad financiera
pagina por 50; no se implementa compactación destructiva ni archivado de eventos.
La heurística puede producir muchos candidatos para numerosas compras idénticas.

## Verificación

**407 casos distintos aprobados**, sin fallos de prueba pendientes después de las
correcciones. Lint, typecheck y build aprobados. Desglose:

| Suite | Resultado |
| --- | --- |
| Vitest, 25 archivos | 215 aprobadas |
| Security Rules sobre emuladores | 135 aprobadas |
| Firefox: acceso y finanzas | 19 casos aprobados; ejecución inicial 16/19 y repetición corregida 3/3 |
| Firefox: shell PWA, SW, temas y accesibilidad | 19 aprobadas |
| Firefox: offline/IndexedDB/dos dispositivos | 17/17, más reconexión inversa de conflictos y migración v1→v2 2/2 |

Comandos ejecutados: `npm run check`, `npm run lint`, `npm run typecheck`,
`npm run build`, `npm test`; con emuladores ya activos, `node --test
tests/rules/*.test.mjs`; Playwright `--project=firefox` con configuraciones
`playwright.emulator.config.ts`, `playwright.config.ts` y
`playwright.offline.config.ts`. Los dos casos adicionales usaron filtro específico,
otro directorio de salida y reporte list, preservando el resultado completo previo.
Node 24 y `PLAYWRIGHT_BROWSERS_PATH` apuntaron a la instalación local disponible.

Los dispositivos A/B publicaron una sola vez sus cuatro IDs originales, verificados
directamente en Firestore, total COP $125.000 y transferencia COP $27.500. Editar,
eliminar/restaurar gastos/abonos y modificar presupuesto offline convergió con
costo COP $120.000 y deuda COP $17.000. Conflictos en ambos órdenes, dos resoluciones
concurrentes y rama tardía conservaron propuestas. Candidatos distintos siguieron
sumando; la unificación atómica y su corrección contaron solo el superviviente.

Auditoría de fuentes e historial: sin patrones de secretos; exclusiones y enlaces
locales correctos. `npm audit`: 17 avisos moderados de herramientas/transitivas,
sin altos/críticos; `npm audit --omit=dev`: cero. No se actualizan dependencias
fuera del alcance para ocultar estos avisos. Continúa el aviso de bundle >500 kB.

Resultados definitivos y cobertura: [test-results-summary.json](test-results-summary.json). Las ejecuciones parciales que detectaron fallos no cuentan
como aprobadas; se corrigieron y se repitieron los casos correspondientes.

Correcciones confirmadas durante la verificación: desmontaje del formulario al
crear sesión invitada, compatibilidad con StrictMode al cerrar/reabrir IndexedDB,
deserialización estricta del ID del viaje, presupuesto de expresiones para dos
padres, valores predeterminados de membresía y error de redondeo del límite de
backoff. También se corrigieron carreras en pruebas (desmontaje de ruta mientras
Auth iniciaba sesión, retirada de interceptores antes de abortar la respuesta) y
se separó guardado durable de confirmación en las regresiones heredadas.

Gemini se omitió: el CLI disponible había agotado cuota en la revisión anterior;
no se repitieron invocaciones fallidas. Codex realizó revisión propia de contratos,
autorización, transacciones, reintentos, identidad y diff, además de pruebas reales.
No se atribuye una revisión efectiva a Gemini.

## Límites y publicación

Sin pruebas en dispositivos físicos Android/iOS, Chromium o WebKit en esta sesión;
la CI incorpora la suite offline, sin declarar verificada su ejecución remota.
Sin cifrado local adicional ni copia de seguridad garantizada. La separación por
UID es lógica en la aplicación; quien controle el perfil del navegador puede
inspeccionar su almacenamiento. Acceso local requiere
la identidad Firebase conservada. Un rechazo no se convierte automáticamente en
operación de otro autor; puede revisarse/copiarse y registrarse conscientemente.
No se garantiza sync cerrada ni detección global de colas antes de cerrar un viaje.
No se implementa Fase 7.

README y AGENTS reflejan este estado. Se auditan fuentes/secretos, exclusiones y
diff antes del commit. Si `.git` continúa protegido, los cambios se conservan y
se entregan comandos Ubuntu sin eludir el control del entorno.
