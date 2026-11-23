# Fase 8A · Auditoría y estabilización del MVP

Base publicada verificada antes de editar: `a9ac5e22171681ad7319246b555695fcfe2c02aa`,
`main` limpio. Se conservan la revisión inicial, sus resultados y las correcciones
publicadas de CI. Esta continuación cubre el alcance completo recibido después.
**Validación final en curso; no autoriza producción ni despliegue.**

Entregables: [riesgos](RISK_INVENTORY.md), [checklist](RELEASE_CHECKLIST.md),
[preparación operativa](DEPLOYMENT_PLAN.md), [pruebas móviles](MOBILE_TEST_PLAN.md),
[resultados compactos](test-results-summary.json) y [publicación](PUBLISH.md).

## Hallazgos y correcciones

| Hallazgo demostrado | Corrección y evidencia |
| --- | --- |
| Chromium no arranca bajo AppArmor del runner Ubuntu 26.04; el helper SUID instalado tampoco pasa la comprobación de seguridad | Chrome preinstalado, ruta permitida por AppArmor, `chromiumSandbox:true`. Preflight y proyectos comparten configuración. Actions ya ejecutó shell y finanzas correctamente; sin `--no-sandbox`, cambios de permisos, sysctl ni AppArmor |
| WebKit: Tab compite con el efecto de foco de navegación y la prueba observa main/outline:none | Esperar foco de navegación en main antes de Tab; comprobar enlace concreto y contorno sólido de 3 px. Diez repeticiones iniciales y suites completas posteriores pasan |
| Un fallo inicial de navegador ocultaba suites posteriores | Matriz navegador × suite, 12 jobs independientes, fail-fast:false, artefactos y preflight. Ningún fallo se convierte en éxito |
| Un rechazo de apertura de IndexedDB quedaba memorizado para toda la sesión; éxito tardío tras timeout dejaba una conexión abierta | Invalidar intento fallido, generaciones al cerrar, cerrar handles tardíos; cinco regresiones fallaban antes y pasan después. Error transitorio real de IDB ensayado también en PWA |
| Fallo de la transacción de descarga dejaba la copia local antigua sin reintento hasta otro snapshot | Reutilizar backoff acotado del coordinador, cancelar temporizador al salir; pruebas unitarias y PWA con transacción abortada |
| Se podía anunciar viaje descargado/sincronizado mientras la última transacción de caché aún estaba pendiente | Asociar acuse durable al snapshot/contexto/viaje y mostrar «Actualizando la copia local…» hasta completar IDB. Prueba con promesa retenida y recarga del historial de 500 gastos |
| Invitación fría en WebKit podía perder su fragmento por efecto lateral dentro del inicializador de estado React | Capturar token una vez al arrancar el documento, retirarlo de URL antes de Auth y pasarlo en memoria. Prueba unitaria y dos clientes WebKit; no persistir token ni recuperar por nombre |
| Navegación inferior desbordaba 320 px con tipografía ampliada | min-width:0 y ajuste de palabras; regresión geométrica con objetivos separados y ≥44 px, sin rediseño |
| Pruebas leían IDB antes de terminar el adjunto, recargaban presupuesto antes de finalizar guardado o navegaban antes de terminar signOut | Esperar señales observables de finalización; conservar importes, identidad y aserciones de servidor. No ampliar expectativas monetarias |
| context.route no intercepta consistentemente fetch controlado por SW en todos los motores | Inyección de fallos antes del SW solo en pruebas. La respuesta perdida sucede después del commit real; se comprueban código 200, contenido e IDs del emulador. No desactivar SW ni simular confirmación exitosa |

No cambian el motor, contratos financieros v2, reglas, dependencias ni fuentes
de verdad. Persisten eventos inmutables en `events`, adjuntos separados y una
sola outbox financiera propia; Firestore SDK permanece en memoria.

## Auditoría financiera

Se revisaron dinero BigInt, límites, asignaciones, contratos, preparación de
revisiones, DAG/proyector, balances, liquidaciones, presupuesto y estadísticas,
así como sus consumidores React y repositorios. Ningún agregado nuevo vive en
componentes. Se reutilizan los vectores deterministas existentes para 2–10
personas, porcentajes exactos, importes fijos, exclusiones y multipagadores,
conservación, redondeos, manuales presupuestarios y permutaciones de eventos.

Se añadieron tres referencias mixtas calculadas explícitamente para COP/USD/EUR:
hotel 200.000, aportes 150.000/50.000; café 100 pagado por B y abono B→A 30.000
(todas las cifras en unidades menores de cada moneda).
Total 200.100, consumos 100.050 por persona, saldos A +19.950/B −19.950.
Presupuesto 400.000: quedan 199.900 y cupos futuros 66.634/66.633/66.633.
Revisión visual no cambia dinero; borrado/restauración, conflicto y orden
invertido/IDs repetidos conservan las expectativas. Abonos no aumentan costo.
No se encontró un defecto aritmético que justifique cambiar el dominio.

El cupo del día se deriva de lo gastado **antes** de ese día conforme al contrato;
no se cambió a un saldo recalculado descontando el día corriente. Conflictos,
padres ausentes e información inválida siguen produciendo subtotal provisional,
sin ganador por hora del cliente. Servidor y proyector mantienen responsabilidades
distintas; validación exclusiva del cliente no se presenta como seguridad.

## Durabilidad y convergencia offline

Se conserva aislamiento por proyecto/UID/viaje/operación, transacciones strict,
IDs generados una vez, leases IDB entre pestañas y reintentos con backoff. Un
permission-denied no equivale a publicación: read-back autorizado y comparación
canónica son necesarios. Las propuestas rechazadas quedan recuperables y se
excluyen de saldos confirmados. IndexedDB es almacenamiento local, no backup.

La suite ampliada verifica cuatro compras de dos identidades sin conexión,
recarga y ambos órdenes de reconexión; recepción de operaciones publicadas por
el otro cliente; ACK perdido después del commit; dos pestañas; interrupción del
documento después del commit y recuperación del lease de 45 s; cuota/IDB
inaccesible; apertura y caché transitoriamente fallidas; proceso Firefox cerrado limpiamente
y reabierto con perfil durable (no equivale a corte eléctrico/expulsión por SO); borradores; cambio de cuenta; revocación;
cierre administrativo simulado; migración local y eliminación del almacenamiento;
SW actualizado con dinero e imagen pendientes.

Los conflictos conservan ambas ramas, permiten propuesta corregida, resuelven
con padres explícitos, admiten resoluciones concurrentes y se reabren con rama
tardía. Duplicados reales pueden mantenerse separados; mergeKeep/mergeHide se
publican atómicamente, con referencias recíprocas y validación conservadora.
No hay borrado histórico ni reintento que genere otro gasto.

## Seguridad

Reglas sin cambios, SHA-256:
`f5b7db5f0c6676a2d2d351a8f36b7e24dd3224eb314b5114326c1b8202a56d40`.
Se ejecutaron **204/204 pruebas de reglas**, incluidas cuatro nuevas con clientes
no privilegiados. El administrador solo prepara fixtures; las aserciones de
lectura/escritura usan Auth ordinario. Se verifica que dueño y UID nuevo con el
mismo nombre tampoco puedan robar personId mediante batch, ni aplicar mitades.
Viaje cerrado conserva lectura pero rechaza nuevas compras, revisiones, abonos,
presupuestos y reapertura, incluso del propietario. La app no habilita cierre.

Cobertura conservada: viajes ajenos, autores falsos, revocados, exceso de campos,
importes/cupos/aportes inconsistentes, participantes inexistentes, padres y
revisiones, dos padres/diez personas y coste de reglas, merges parciales/ciclos,
bytes reales de adjuntos ≤40960, inmutabilidad y privacidad. El servidor valida
estructura, permisos, referencias y garantías locales del contrato; no inspecciona
un DAG completo ni demuestra algoritmos globales de reparto, IANA o duplicados.
El proyector rechaza/incorpora provisionalmente propuestas incompatibles.

Se revisaron Auth/persistencia, invitaciones hash/token/expiración, revocación,
transportes REST, IDB, URLs/licencias, límites de decodificación e imágenes y SW.
No se incluyen tokens en logs nuevos ni bytes privados en precache; el snapshot
financiero no descarga miniaturas. Aislamiento de IDB evita exposición en la UI
de otra cuenta, pero no cifra ante un atacante con acceso al perfil/origen: no
se promete borrado remoto de copias ni protección contra compromiso del equipo.

Auditoría npm actual: **17 moderadas de herramientas, cero altas/críticas**;
la auditoría separada `npm audit --omit=dev` también devuelve cero. Los avisos
afectan transitivas de firebase-tools/workbox (glob/minimatch, uuid y propagación
de baggage OpenTelemetry); las soluciones sugeridas incluyen downgrades mayores
de herramientas. No se aplican automáticamente ni se confunden con código
servido al navegador. Mantener herramientas locales/emuladores sin exposición
pública y revisar actualizaciones compatibles antes del piloto.
Escaneo de fuentes/historial, exclusiones y enlaces locales se repite antes de
publicar. Los patrones son una comprobación adicional, no prueba de inexistencia
de cualquier secreto imaginable. Artefactos y perfiles de emulador no van a Git.

## Cierre seguro: permanece deshabilitado

No basta con leer «sin conflictos» y cambiar status: una compra/revisión puede
confirmarse entre ambas acciones. Las reglas actuales no pueden escanear toda
la colección ni garantizar ese estado global. Activar cierre con una comprobación
solo cliente introduciría una carrera financiera. Se probaron rechazos tardíos y
su recuperación local, sin permitir escrituras excepcionales tras el cierre.

Para habilitarlo falta un protocolo revisado de congelación atómica/estado
intermedio, lectura completa confirmada y proyección durante la barrera,
recuperación si el dueño desaparece y reglas/migración/pruebas de concurrencia.
Debe admitir deudas pero impedir cierre con conflictos conocidos. No puede
prometer descubrir colas desconocidas de equipos apagados. La política D-13 de
incidencias tardías necesita ratificación; no se introducen excepciones.

## Recuperación de invitados: permanece deshabilitada

Al unirse, personId e identidad autenticada quedan ligados y el historial es
inmutable. Reasignar por nombre o por voluntad unilateral sin prueba acordada
permitiría suplantación. Hace falta ratificar D-14: prueba de posesión/consentimiento,
autorización del dueño, solicitud de UID nuevo, desafío de un uso con expiración,
revocación atómica del UID viejo y tratamiento de sus propuestas firmadas.

Alternativas a decidir: vincular credencial recuperable antes de perder sesión
(conserva UID); secreto de recuperación emitido previamente con prueba de reglas;
o verificación externa explícita por organizador con política de responsabilidad.
No se implementa una operación atómica incompleta. No se reescriben autores de
outbox ni eventos ni se afirma que pueda borrarse la copia del dispositivo viejo.

## Openverse público: validación parcial, disponibilidad no aprobada

Se consultó [la documentación oficial](https://api.openverse.org/v1/) y se
hicieron solicitudes directas anónimas, sin proxy ni credenciales. Una búsqueda
coffee CC0/CC BY devolvió **200**, 4070 bytes y CORS `*` en 15,711 s. Cabeceras
observadas: 20 búsquedas/minuto, 200/día; no se presentan como cupos permanentes.
Miniatura oficial: **200**, JPEG 33794 bytes, CORS `*`, 0,470 s; límite observado
1000 miniaturas/día. Metadatos CC BY 2.0 completos validados por el parser real.

La búsqueda con los parámetros exactos de la app respondió **504** sin cabecera
CORS; el cliente Firefox informó error de conexión. No hay evidencia suficiente
para aprobar búsqueda pública estable. La descarga real de la miniatura a través
del código de la app en Firefox sí pasó CORS, decodificación y compresión:
**WebP 561×640, 19964 bytes**, 662 ms, atribución conservada. No se guardan esas
fotografías públicas en Git. No hubo scraping, proxy desconocido ni servicios de pago.

Las pruebas controladas de 403/429/timeout/CORS/metadata sirven para el manejo
de errores, nunca para afirmar disponibilidad pública. Su fixture intercepta fetch
antes del SW y evita descargas nativas de IDs sintéticos. Se conservan iconos y
fotografías locales cuando el proveedor falla; dinero y adjuntos son independientes.

## Rendimiento y accesibilidad

Medición Node 24 con el mismo workload financiero de Fase 6, sin modificar el
proyector: 500/2500/10000 eventos, **79/220/830 ms** proyección y **2/2/8 ms**
resumen. Para 10000, JSON 6848891 bytes y delta heap 63204992 bytes; heap/tiempo
son mediciones puntuales con ruido de GC. Fase 6 optimizada: 772 ms; no se
atribuye mejora estadística. La referencia previa sin optimizar era 4055 ms.
Se desactiva únicamente WebSocket/discovery del servidor de benchmark para no
iniciar trabajo ajeno a la medición. No se aplicó optimización especulativa.

Tres contextos nuevos por motor a 390×844 midieron inicio hasta login usable:
Firefox 684–945 ms, WebKit 560–585 ms; navegación login→registro 49–76 ms y
54–58 ms respectivamente. JS decodificado inicial ~1,12 MB; sin throttling ni
red de teléfono, con caché de SO compartida y variación por host/GC. No es una
medición de primera instalación en red móvil ni memoria total del proceso.

UI 500 gastos bajo reglas ordinarias: Firefox ~4,6 s, WebKit ~4,9–5,1 s en este
host; no es SLA de teléfonos. Las vistas memorizan proyección por datos, no por
interacción visual. Lectura inicial de todo el historial, copias JSON/IDB y
miniaturas históricas siguen limitando memoria y cuotas. La prueba de cientos
de miniaturas verifica carga bajo demanda, sin suscripción de bytes financiera.

Shell/finanzas verifican teclado, foco, axe, contraste automático, modo oscuro,
responsive, zoom/texto ampliado, scroll y formularios/teclado numérico. Se corrigió
el desbordamiento a 320 px sin rediseño. Los chequeos automáticos no sustituyen
lectores de pantalla y teclado virtual físicos.

## Correspondencia con el plan de pruebas

| Grupo | Evidencia y límite |
| --- | --- |
| FIN/VAL/BUD/STAT | Dominio exacto y 19 integraciones financieras/acceso por motor; referencias mixtas independientes nuevas |
| SYNC-01–08, DUP-01–04 | Outbox/IDB/coordinador, DAG, reglas y dos contextos independientes; ACK perdido se contrasta con Firestore real del emulador |
| SYNC-09 | Fixture administrativo cambia a cerrado, servidor ordinario rechaza y propuesta se conserva. No demuestra cierre concurrente habilitable; esa función sigue denegada |
| SYNC-10 | Reapertura de proceso Firefox y salida del documento tras commit. Suspensión/expulsión por SO móvil y corte eléctrico quedan pendientes físicos |
| SEC-07–10, AUD-01 | Reglas adversariales, revocación/aislamiento y revisiones/historial en integración; sin cliente privilegiado para las aserciones |
| IMG-01–05 | Archivos/cámara simulados, WebP/EXIF/límites, imagen offline/reintento/privacidad. Openverse público parcial y cámara/HEIC físicos sin aprobar |
| Accesibilidad | Axe, foco/teclado, temas y viewport/texto ampliado; TalkBack/VoiceOver y teclado virtual pendientes |

## Verificación y CI

Lint, TypeScript/build y **258 Vitest en 29 archivos** pasan. Resultados locales
consolidados pendientes de finalización: shell Firefox/WebKit 40/40; acceso y
finanzas Firefox 19/19, WebKit 19/19; reglas 204/204; ocho regresiones de imágenes
Firefox/WebKit 8/8. Offline Firefox/WebKit: **43 aprobadas y 1 omitida** (reapertura de perfil solo
Firefox); imágenes completas: **60/60**. Estos resultados locales no aprueban
por sí solos CI ni compatibilidad física.
Los conteos de regresiones dirigidas no se suman de nuevo a suites completas.

Se leyeron logs completos y artefactos de los fallos de Fases 5–7, conservados
en [inventario](RISK_INVENTORY.md). La primera reparación publicada
`a763ce52d798e5b1b77c686cd74b1ee2aa3c9c68`,
[Actions 45274580059](https://github.com/camilo477/webapp-gastos-conjuntos/actions/runs/45274580059),
pasó validate y shell Firefox/WebKit, pero detectó helper SUID inválido y nuevos
fallos de suites que antes se omitían. La segunda,
`1b8158fd53b56895ed12096d0c3320433d75ba58`,
[Actions 45280786995](https://github.com/camilo477/webapp-gastos-conjuntos/actions/runs/45280786995),
confirmó Chrome sandboxed y shell/finanzas verdes; los fallos posteriores de
sesión/guardado/transporte se investigaron y corrigieron en esta continuación.
**La CI del código final aún debe verificarse; no se declara verde.**

Chromium empaquetado local sigue bloqueado por sandbox; Chrome del runner es la
verificación del motor Chromium, identificado expresamente. Firefox y WebKit
locales son navegadores reales, no DOM. WebKit usa bibliotecas extraídas en caché
ignorada; no se modificó el sistema. Cámara simulada no es cámara física.
Gemini se intentó una vez en modo plan/read-only, sin extensiones y timeout 45 s;
no terminó. Se omite como revisión efectiva; revisión propia y pruebas son la evidencia.

## Preparación productiva y pendientes

No se conectó Firebase real, no se desplegó, no se habilitó facturación ni se
comenzó Fase 8B. El build actual rechaza producción deliberadamente: no basta
cambiar .env. [El plan](DEPLOYMENT_PLAN.md) identifica adaptadores HTTPS pendientes,
Spark, Auth, región, reglas/índices, dominios, Hosting/Pi, cuotas, operación y rollback.
No se promete backup gratis permanente ni almacenamiento local como respaldo.

Pendientes de lanzamiento: CI final comprobada, QA física Android/iPhone/PWA
instalada/cámara/QR/modo avión/actualización/teclado; ratificación de exclusión o
políticas de cierre/recuperación; origen/región/recuperación y adaptación productiva
bajo autorización nueva. La búsqueda Openverse sigue siendo opcional e inestable.
Ver checklist para puertas concretas; preparación documental no equivale a MVP
aprobado para producción. Los commits y resultados finales se añadirán tras
terminar las suites y consultar Actions del SHA publicado.
