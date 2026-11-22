# Plan de pruebas y aceptación

Estado: **pruebas especificadas, no ejecutadas**. En Fase 0 solo se valida documentación. No hay aún app, reglas compiladas, emuladores ni suites instaladas. Cada requisito RF del [PRD](PRD.md) referencia al menos uno de los casos siguientes.

## Capas y datos

- Vitest: funciones puras, esquemas, proyector y cola con adaptadores de pruebas. Reloj, IDs y zona horaria explícitos. Iterar cantidad de miembros 2–10 y permutaciones del orden de entrada; generador determinista para importes/pesos, sin requerir dependencia extra de property testing inicialmente.
- Firebase Emulator Suite + `@firebase/rules-unit-testing`: identidades owner, dos invitados, extraño, revocado y nueve/diez concurrentes; clientes no privilegiados para aserciones. Seed admin solo prepara fixtures y nunca demuestra permisos de producción.
- Playwright: contextos independientes y perfiles persistentes cuando corresponda, app construida para comprobar service worker real. Emulación de red controlada y aserciones de IndexedDB/estados, no solo interceptar un endpoint y asumir desconexión Firebase.
- QA física: Android Chrome/PWA e iOS Safari/PWA, cámara, instalación, suspensión/reanudación, almacenamiento, modo avión y red compartida. WebKit de Playwright no sustituye iPhone real.

Fixtures sin datos personales: personas A/B/C hasta J, COP, viaje de cuatro días en America/Bogota y otro con cambio horario en America/New_York. Nunca cargar datos de producción para probar.

## Motor financiero y validación

| Caso | Preparación/acción | Resultado esperado |
| --- | --- | --- |
| FIN-01 | 2 personas; gasto 200.000, aportes 150.000/50.000, cuotas iguales; luego gastos alternados | Saldos +50.000/−50.000 iniciales y neto posterior calculado; suma cero |
| FIN-02 | 100 entre A/B/C, todas las permutaciones | Cuotas 34/33/33 por ID estable; no se crean/pierden unidades |
| FIN-03 | 2–10 personas, peso igual; caso 10% por persona para 10 | Sumas exactas; para T=100 y 10 personas cada una=10 |
| FIN-04 | Una persona excluida; 99,99% y 100,01%; porcentajes negativos | Excluida=0; sumas distintas de 100% y negativos rechazados con mensaje claro |
| FIN-05 | Dos pagadores, aportes iguales/desiguales y suma incorrecta | Total se cuenta una vez; suma incorrecta rechazada |
| FIN-06 | B→A parcial 20.000 y restante 30.000 sobre saldo 50.000 | Saldos 30.000 y luego cero; costo sin cambios; borrar abono restaura saldo anterior |
| FIN-07 | Delete/restaurar gasto con reparto impar | Delete no afecta totales; historial conserva valores; restore recupera cuotas exactas |
| FIN-08 | Repetir 1.000 conjuntos deterministas, 2–10 miembros, importes hasta límite | Suma cuotas=total, saldo global=0, resultados independientes del orden |
| FIN-09 | 10^12 con pesos 3333/3333/3334 y sumas grandes de movimientos | BigInt evita overflow; no persistir ni mostrar Number inexacto |
| FIN-10 | T=1, pesos 5000/5000; repetir editar/restaurar | 1/0 por ID y pesos conservados; sin deriva monetaria |
| FIN-11 | Sugerir transferencias y simularlas | Todos los saldos a cero; ninguna sugerencia modifica el historial hasta confirmar |
| VAL-01 | Cero, negativos, fracciones COP, NaN, IDs duplicados, listas desalineadas, importe fuera de rango | Rechazo tanto en esquema como en reglas donde corresponda; UI preserva formulario |
| VAL-02 | USD/EUR con decimales; DST y cambio de zona del dispositivo | Parseo entero exacto; agrupación por zona del viaje y días inclusivos correctos |
| STAT-01 | Gastos de categorías/días distintos, abonos, borrados, conflicto | Estadísticas coinciden con mismo conjunto financiero; abonos fuera de costo, provisional explícito |

## Presupuesto

| Caso | Preparación/acción | Resultado esperado |
| --- | --- | --- |
| BUD-01 | 400.000/4 días, gastar 250.000 el día 1 | Cupo inicial 100.000; proyección días 2–4 a 50.000; disponible 150.000 |
| BUD-02 | Igual, día 4 manual 80.000 | Días 2/3=35.000; reserva no cambia |
| BUD-03 | Gastado 350.000 con reserva futura 80.000 | Automáticos=0; déficit asignado 30.000; disponible real 50.000 |
| BUD-04 | Sin presupuesto, presupuesto 0, gasto >B, último día, sobrante, antes/después de viaje | Estados diferentes, no división por cero ni cupos negativos; disponible real puede ser negativo |
| BUD-05 | Editar cupos repetidos/fuera de rango, reserva excesiva; gasto retroactivo; dos cambios de budget offline | Rechazar config inválida; recalcular fechas posteriores; conflicto de revisiones visible |

## Auth, acceso y reglas

| Caso | Acción | Resultado esperado |
| --- | --- | --- |
| AUTH-01 | Registrar/login/logout/reset password de organizador; crear sin verificar correo | Identidad permanente recuperable; creación bloqueada hasta verificación propuesta |
| AUTH-02 | Anónimo o proveedor no admitido intenta crear owner | Rechazado en servidor |
| AUTH-03 | Invitado entra con enlace/QR/código sin email y recarga mismo perfil | UID y acceso persistidos, nombre visible, advertencia de pérdida mostrada |
| AUTH-04 | Limpiar navegador, otro dispositivo o salir con pendientes | No fingir recuperación; cola no se sube con otro UID; reinvitación/reasignación explícitas |
| SEC-01 | Extraño lee trip, gastos/eventos, miembros, fotos o lista invitaciones | Denegado aunque tenga Auth anónima y conozca tripId |
| SEC-02 | Token expirado/revocado, hora local manipulada, join iniciado antes y commit después de revocación | Join rechazado por estado/hora servidor; sin alta parcial |
| SEC-03 | Join sin lectura previa de trip; batch trip+member+person | Completa alta válida y luego permite leer; lectura previa sigue denegada |
| SEC-04 | Con 9 activos, dos joins concurrentes; con 10, intento 11; carrera entre owner y join | Nunca más de 10 bindings ni personas activas; uno obtiene cupo final |
| SEC-05 | Crear solo member/person; manipular otros bindings/activeUids, duplicar personId, rol owner o membershipVersion | Denegado; espejos no divergen; incluir rutas especiales owner/create/rebind |
| SEC-06 | Expulsar, volver con mismo UID y token común; owner reasigna a UID nuevo | Revocado pierde servidor; no reactiva solo; reasignación conserva personId y deudas, UID anterior sin acceso |
| SEC-07 | Update/delete evento, autor falso, parent de otro viaje, reloj falso, campos extra | Denegado; antes/después coincide con padres y actor real |
| SEC-08 | Payload financiero hostil: sumas, pesos y cuotas incorrectas; 10 entradas, pares de merge, presupuesto 366 días | Reglas rechazan conservación inválida y respetan presupuesto de evaluación; proyector detecta semántica no garantizada por reglas |
| SEC-09 | Reglas reales: crear viaje+budget, joins, 2 padres y merge de dos eventos | Compilan y no exceden 10 accesos por operación, 20 por batch ni límites de expresiones |
| SEC-10 | Miembro revocado con caché persistente, dos pestañas y usuario nuevo | Servidor niega acceso; UI no expone viaje a nuevo usuario; no prometer borrado remoto de caché |
| TRIP-01 | Crear viaje un día/varios días, datos inválidos, dos activos e historial | Moneda/zona/fechas validadas, espera inicial con 1 persona, preferencia de activo local sin ocultar otros |
| TRIP-02 | Owner cierra con deuda y sin conflicto; miembro intenta cerrar; repetir cierre | Resumen consultable, deudas conservadas, solo owner; repetición no altera historia |
| AUD-01 | Otro miembro edita/borra gasto y corrige abono | Historial muestra antes/después, actor, reloj y recepción; nunca update de evento antiguo |

Los emuladores no reproducen límites de cuota de producción ni todas las particularidades de Auth/correo. Validar configuración real en proyecto de pruebas propio antes del despliegue, sin habilitar facturación de forma implícita.

## Offline, concurrencia y duplicados

| Caso | Preparación/acción | Resultado esperado |
| --- | --- | --- |
| SYNC-01 | Descargar viaje, offline crear/editar/delete, recargar | Operaciones durables, proyección local correcta, estado pendiente visible |
| SYNC-02 | Dos dispositivos editan R a A/B offline, reconectar en ambos órdenes | Conserva A/B; conflicto; excluido del subtotal, saldo provisional, ninguna edición perdida |
| SYNC-03 | Resolver A/B a C; recibir D sobre R después; dos resoluciones simultáneas | C no consume D; conflicto reabre; resolución por pares termina de forma convergente |
| SYNC-04 | Desconectar en commit, reenviar mismo ID repetidas veces y desde dos pestañas | Un solo evento efectivo; read-back verifica contenido; ID existente distinto produce error |
| SYNC-05 | Descargar eventos permutados, hijo antes de padre, medio par de merge, caché parcial | No declarar total completo; mismo conjunto completo produce mismo estado y balances |
| SYNC-06 | Cola rechazada por reglas, UID revocado, cuota o versión desconocida | Sin pérdida silenciosa, estado correcto, propuesta preservada; no bucle agresivo de reintentos |
| SYNC-07 | IndexedDB no disponible/lleno, error al guardar outbox | No afirmar guardado; formulario recuperable/copiable y modo limitado explícito |
| SYNC-08 | Logout/login de otro usuario, dos pestañas, actualización SW con pendientes | Datos aislados, cola ligada a UID, actualización no descarta operaciones |
| SYNC-09 | Dispositivo A offline editando, owner cierra online, A reconecta; gasto justo antes de cierre | Rechazo preservado; resumen actualizado/provisional si incidencia; no promesa de detectar colas remotas |
| SYNC-10 | Suspender/cerrar PWA y volver con/sin red | Reanudar cola al abrir, sin prometer sync mientras estuvo cerrada |
| DUP-01 | Dos cafés reales mismo título, pero distinta hora o pagador | Permanecen como gastos separados; nunca borrar por nombre |
| DUP-02 | Dos cargas con mismo título normalizado, monto/día/pagadores y proximidad | Candidato visible; «Son distintos» conserva ambos; no confundir con replay de mismo ID |
| DUP-03 | Unificar dos candidatos con par atómico | Un gasto efectivo, otro merged, auditoría completa; descartar batch incompleto |
| DUP-04 | Dos merges incompatibles, ciclo, edición/delete/restauración antigua del oculto | Componente provisional; no doble conteo definitivo ni desaparición silenciosa; resolución conjunta |

## Imágenes, PWA y UX

| Caso | Acción | Resultado esperado |
| --- | --- | --- |
| IMG-01 | Cámara/galería, archivo grande/HEIC no decodificable, cancelación y permiso denegado | Comprimir WebP ≤40.960 bytes o informar fallback; quitar metadata; gasto puede guardarse sin foto |
| IMG-02 | Reglas reciben foto con tamaño real >tope o tamaño declarado falso | Rechazo sin afectar evento financiero; bytes no aparecen en documento principal ni índices |
| IMG-03 | Guardar foto offline, falla envío, reintentar y cambiar miniatura | Dinero confirmado independiente; solo una miniatura actual, referencias históricas conservadas |
| IMG-04 | Búsqueda Openverse, selección y recarga offline | Creador/fuente/licencia persistidos y atribución accesible; fallback si miniatura remota no está cacheada |
| IMG-05 | API 429/403/timeout, CORS de imagen, URL caída, metadata incompleta | Sin reintentos masivos ni imagen sin atribución; usar icono local sin bloquear captura |
| PWA-01 | Build instalado, visitar online y recargar offline ruta interna | Shell abre sin red; si viaje nunca se descargó, explicar falta de datos |
| PWA-02 | Android/iOS instalar, safe areas, modo avión y reapertura; migrar origen Raspberry | Flujos medidos en equipos reales; pérdida de identidad entre orígenes advertida |
| UX-01 | Captura por defecto en móvil 390px y teclado numérico, validación y cancelación | Ruta rápida clara sin foto obligatoria; inputs/acción no quedan tapados |
| UX-02 | Teclado, lector, foco/contraste, zoom 200%, 320px, reduced-motion | Sin pérdida de información monetaria; controles ≥44px, errores anunciados |
| UX-03 | Carga/vacío/offline/pendiente/error/conflicto/closed en móvil y escritorio | Acciones y mensajes correctos, diseño aprobado visualmente antes de Fase 2 |

## Orden y criterios de entrega

Antes de Fase 1: ratificar decisiones de UX y revisar limitaciones; no se necesita Firebase productivo. En Fase 2 preparar scripts futuros `lint`, `test`, `test:rules`, `test:e2e`, `build` y CI reproducible. Fase 3 exige FIN/VAL/BUD. Fase 4 exige AUTH/SEC/TRIP, incluida prueba de concepto de join. Fase 5 exige integración de dos contextos y AUD/STAT. Fase 6 exige SYNC/DUP y proyector con pruebas de permutaciones. Fase 7 exige IMG. Fase 8 integra todo, auditoría de accesibilidad y pruebas físicas.

No considerar compilación suficiente. Un check omitido queda reportado como no ejecutado; fallos de permisos o autenticación externa no se evaden. El reporte de cada fase debe indicar comandos, resultados, limitaciones y evidencia. Los ejemplos numéricos del documento no equivalen a haber corrido el motor.
