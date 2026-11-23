# Validación automatizada de Fase 1

Fecha: 21 de noviembre de 2026. Alcance: prototipo de revisión, sin aplicación productiva.

**Actualización final:** Firefox real repitió los 15 casos después de corregir, con **15 aprobados y cero fallidos**, por `file://`. El intento HTTP de Ubuntu había dado 14 aprobados, uno fallido y 30 omitidos de Chromium/WebKit. Hay capturas reales revisadas. La [sección 15](#15-resultados-reales-correcciones-y-publicación) distingue transportes, regresiones, límites y el bloqueo de Git; las secciones 1–14 conservan el historial anterior.

## 1. Resumen ejecutivo

**Recomendación: mantener pendiente la aprobación de la Fase 1.** Se ejecutaron 108 pruebas DOM/lógica, todas aprobadas, y 68 auditorías parciales axe sin infracciones detectadas en las reglas evaluables. Se corrigieron seis defectos reproducibles. Los 32 pares de contraste estático cumplen sus umbrales.

Se intentó iniciar Chromium, Firefox y WebKit con Playwright. Ninguno consiguió abrir una página. El servidor HTTP local también fue rechazado por permisos. La suite Playwright terminó con **45 pruebas omitidas, cero ejecutadas y cero aprobadas**; su código de salida cero no demuestra funcionamiento del prototipo en navegador. Faltan evidencias de renderizado responsive, interacción nativa y capturas reales para aprobar esta fase.

No se modificaron requisitos, paleta, tipografía ni CSS. Se conserva la documentación anterior. No se implementó Firebase, persistencia ni funcionalidad de producción. No hubo commits, push o despliegue y no se inició Fase 2.

## 2. Entorno utilizado

Workspace `/mnt/Datos/gastos`, Linux x86_64, kernel 7.0.0-43, Node 20.19.5, Python 3 y usuario sin capacidades efectivas. Herramientas de pruebas en `/tmp/gastos-phase1-tools/node_modules`: Playwright 1.56.1, JSDOM 26.1.0, axe-core 4.10.3 y Prettier 3.3.3. Se reutilizaron las suites existentes y se añadieron pruebas fuera del runtime del prototipo.

Permisos observados: `NoNewPrivs=1`, `Seccomp=2`, un filtro activo, `CapEff=0`. No se utilizó sudo, no se desactivó el sandbox y no se cambió configuración global. Las dependencias auxiliares de WebKit se extrajeron únicamente dentro de `design/review/testing/environment/runtime/`; sus paquetes y hashes están conservados.

La carpeta no tiene un repositorio Git operativo. La revisión de cambios usa hashes previos y una [diferencia de los archivos del prototipo](../../design/review/testing/corrections/prototype.diff), validada contra esos hashes. El plan original en Descargas y su copia documental conservan el mismo SHA-256 `455b9c3d7ba9be0cffb746142418bbd6a39afce7d7c59f81978899cceb804605`.

## 3. Navegadores realmente intentados

| Motor disponible en caché | Intento real mediante Playwright | Resultado observado |
| --- | --- | --- |
| Chromium, revisión 1187 | Proceso headless con `chromiumSandbox: true` | Crashpad: `setsockopt: Operation not permitted`; salida SIGTRAP antes de abrir página |
| Firefox, revisión 1490 | Proceso headless; espera de 15 segundos | `unshare(CLONE_NEWPID): EPERM`, operación de pipe denegada y errores gráficos; timeout sin conexión de automatización |
| WebKit, revisión 2203 | Wrapper instalado y reintentos con dependencias locales | Primero faltaban bibliotecas; último intento termina por `libyuv.so.0` ausente |

Los procesos sí se invocaron; **cero motores consiguieron navegar o renderizar el prototipo**. No se obtuvo una versión de navegador mediante conexión exitosa. Las revisiones de caché difieren de las esperadas por Playwright 1.56.1 (1194/1495/2215), por lo que su compatibilidad de protocolo tampoco está validada. Los errores registrados ocurren antes de poder evaluar el producto.

Se ejecutó `ldd` tanto directamente como con las rutas de bibliotecas de los wrappers: Chromium y Firefox no muestran bibliotecas ausentes con sus rutas correctas. Para WebKit se descargaron paquetes Ubuntu de libwoff1, libevent, libavif16 y libgav1, se comprobaron sus SHA-256 contra metadatos locales de APT y se extrajeron sin instalación global. Falta libyuv; sus descargas fallaron por resolución DNS tanto en archive.ubuntu.com como en security.ubuntu.com. No se continuó reintentando sin un cambio del entorno.

Evidencia: [sondas y servidor](../../design/review/testing/environment/browser-probes.json), [Chromium](../../design/review/testing/environment/launch-chromium.log), [Firefox](../../design/review/testing/environment/launch-firefox.log), [último WebKit](../../design/review/testing/environment/webkit-local-results.json), [dependencias locales](../../design/review/testing/environment/local-dependencies.json).

## 4. Resoluciones y temas

| Resolución solicitada | Claro/oscuro en navegador real | Overflow, solapes, scroll y objetivos táctiles |
| --- | --- | --- |
| 320 × 568 | No ejecutado | Pendiente |
| 375 × 667 | No ejecutado | Pendiente |
| 390 × 844 | No ejecutado | Pendiente |
| 430 × 932 | No ejecutado | Pendiente |
| 768 × 1024 | No ejecutado | Pendiente |
| 1440 × 900 | No ejecutado | Pendiente |

La suite preparada contempla esas seis resoluciones, ambos temas y las 23 pantallas. Las pruebas DOM recorrieron ambos temas y contenido largo, pero no establecen geometría, recorte, visibilidad física ni reflujo. JSDOM no es un navegador headless.

## 5. Número y resultados de pruebas

Los conteos corresponden a casos o auditorías, no al número de aserciones, pantallas visitadas ni vectores internos. Las repeticiones antes/después no se suman como cobertura nueva.

| Suite final | Ejecutadas | Aprobadas en su alcance | Fallidas | Omitidas |
| --- | ---: | ---: | ---: | ---: |
| DOM existente, 23 pantallas y escenarios | 39 | 39 | 0 | 0 |
| DOM ampliada y regresiones | 42 | 42 | 0 | 0 |
| Propiedades de reparto, 2–10 personas y tres modalidades | 27 | 27 | 0 | 0 |
| Axe en JSDOM, ambos temas | 68 | 68 sin infracciones detectadas; auditorías parciales | 0 detectadas | 0 auditorías; reglas incompletas/excluidas |
| Playwright, tres proyectos | 0 | 0 | 0 pruebas de producto; arranque bloqueado | 45 |

**Total final: 176 casos/auditorías ejecutados, 108 pruebas DOM/lógica aprobadas y 68 auditorías axe parciales sin infracciones detectadas; cero fallos finales en esas suites.** Además, se ejecutaron 32 comprobaciones de contraste de tokens, todas aprobadas, y el verificador de documentación/recursos. Los intentos fallidos de infraestructura se informan por separado; no cuentan como pruebas del producto aprobadas.

Antes de corregir: la suite ampliada tuvo 36/41 aprobadas y cinco fallos; axe tuvo 16/58 auditorías sin infracciones y 42 con la misma infracción repetida. Los cinco fallos DOM y el defecto semántico de axe están corregidos. Tras corregir, se repitieron 41/41 y 58/58; después se añadieron diez auditorías de hojas modales, dando las 68 finales. Se reforzaron las regresiones de errores/borrador y se añadió la prueba de jerarquía de encabezados: 42/42 casos ampliados finales. Se conservaron los reportes previos.

Evidencia: [39 casos existentes](../../design/review/testing/dom/dom-results.json), [antes](../../design/review/testing/dom/extended-before.json), [42 casos finales](../../design/review/testing/dom/extended-final.json), [propiedades](../../design/review/testing/dom/calculation-properties.json), [axe antes](../../design/review/testing/accessibility/axe-before.json), [axe final](../../design/review/testing/accessibility/axe-final.json), [Playwright JSON](../../design/review/testing/playwright/results.json) y [reporte HTML](../../design/review/testing/playwright/html-report/index.html).

[Resumen estructurado](../../design/review/testing/summary.json), [integridad de archivos](../../design/review/testing/corrections/integrity.json) y [procedencia/hashes de evidencias](../../design/review/testing/provenance.json). Las instrucciones reproducibles están en el [índice de evidencias](../../design/review/testing/README.md).

## 6. Cobertura de recorridos y registro de gastos

En DOM se recorrieron las 23 rutas: bienvenida, acceso, alta, verificación, recuperación, unión anónima, viajes, creación, inicio, gasto, reparto, pagadores, detalle, balance, abono, presupuesto, edición de presupuesto, estadísticas, invitación/personas, actividad, conflictos, duplicados y resumen/cierre. Se ejercitaron acciones reales del JavaScript del prototipo, además del selector externo de pantallas; este selector por sí solo no demostraría navegación de usuario.

Se probaron gasto normal; concepto vacío/largo; importe vacío, cero, negativo, decimal, no numérico, infinito, máximo aceptado de $1.000.000.000.000 y superior al máximo; reparto igual, porcentual y por cantidades; exclusiones; grupos de dos, tres y diez; aportes de varios pagadores válidos e inválidos; cambios de importe que invalidan cuotas; guardar, editar, borrar/restaurar y conservar el formulario ante errores.

También se ejercitaron cuentas y acceso anónimo de muestra, presupuesto opcional/cero, abonos, creación/cierre, cambio de tema sin perder formulario, rutas de historial mediante `popstate`, roles simulados y estados vacíos/largos. Cámara, galería y stock abren sus demostraciones. Las pruebas comprueban que estos accesos no invocan cámara ni API externa. No se prueban permisos de hardware, selección real de archivos, carga de imágenes ni Openverse real.

El harness emula `matchMedia`, scroll, clipboard y apertura/cierre de `dialog`; despacha eventos DOM y submit sintético. Por tanto no acredita la validación nativa del formulario, Tab, Escape, bloqueo de foco, historial nativo completo, teclado virtual o portapapeles del sistema.

## 7. Cálculos y ejemplos financieros

El fixture inicial tiene gastos por $250.000, presupuesto de $400.000 y cuatro días. El JavaScript calcula $150.000 disponibles, cupo inicial de $100.000, exceso del primer día de $150.000 y sugerencia de $50.000 para cada uno de los tres días futuros. También se comprobaron cupos manuales y redistribución impar sin perder unidades.

Los saldos netos iniciales calculados son Ana +$20.000, Bruno −$30.000 y Carla +$10.000. Las sugerencias Bruno→Ana $20.000 y Bruno→Carla $10.000 se registraron como abonos simulados: los tres saldos quedan en cero y el costo sigue en $250.000. También se liquidaron las sugerencias para dos y diez participantes.

Las 27 pruebas de propiedades ejecutaron **6.750 vectores válidos** (250 por grupo de personas/modalidad) y **2.250 vectores porcentuales inválidos**, con semilla 20261121. Se comprobó conservación de pesos enteros, cuotas no negativas, restos de reparto igual por ID estable, proporcionalidad exacta mediante aritmética BigInt, cantidades específicas exactas y rechazo de 100,01%. Incluyen importes de 1 peso y del máximo del prototipo. No es una demostración exhaustiva para todos los números posibles.

Estas funciones existen y se ejecutaron en `app.js`; las pruebas de propiedades acceden a ellas mediante instrumentación aislada del harness, sin exportarlas en el prototipo. Los grupos 4–9 se prueban allí; el selector de revisión solo ofrece 1/2/3/10. Gastos, pagos iniciales, nombres, día de referencia y estados de red son fixtures. Las ilustraciones SVG/PNG son representaciones de esos datos, no cálculos ni capturas del navegador. No se validó el futuro motor financiero de producción.

Evidencia de cifras: [fixture exportado del DOM](../../design/review/testing/dom/verified-fixture.json).

## 8. Sincronización simulada e invitaciones

Se probaron sincronizado, offline, pendiente, sincronizando, error, conflicto, invitación expirada y revocada. Las operaciones pendientes se identifican individualmente, con entidad y estado; se conserva la distinción entre datos parciales, errores y conflictos. Se probaron elección de versiones y decisión de duplicados, sin ocultar incidencias por renovar una invitación.

Se verificó que una confirmación simulada no absorba operaciones creadas después del inicio del envío, y se corrigió un temporizador antiguo que podía confirmar operaciones nuevas tras reiniciar un escenario. Los temporizadores se controlan en pruebas, sin esperar red real.

No hay Firebase, servidor de sincronización, desconexión real de una PWA, reglas de seguridad, concurrencia entre dispositivos ni prueba de entrega durable. Los mensajes existen y las restricciones simuladas funcionan en DOM; su comprensión por personas requiere evaluación de usabilidad.

## 9. Accesibilidad y evidencia visual

Axe se ejecutó en las 23 pantallas y en once variantes adicionales por tema: vacío, pendientes, error, invitaciones inválidas, contenido largo y cinco hojas de confirmación/opciones. Tras corregir el banner duplicado no detectó infracciones en las reglas que consiguió evaluar.

**Las 68 auditorías son parciales.** El JSON conserva reglas `incomplete`, sus mensajes y nodos. Entre las causas observadas está `document.elementFromPoint is not a function`; por ejemplo, `landmark-one-main` y `page-has-heading-one` quedan incompletas. No se sustituyó esa API por geometría ficticia para fabricar aprobaciones. Las pruebas DOM verifican etiquetas, nombres de controles, IDs y contenido; una prueba adicional recorre la jerarquía de encabezados de las 23 rutas en ambos temas, y la regresión del detalle vacío verifica su `h1`. Los errores de importe se comprobaron como alertas, con foco DOM y atributos de campo inválido.

Se excluyeron de axe `color-contrast` y `target-size` por requerir renderizado. El contraste se comprobó por separado sobre 32 pares de tokens claro/oscuro, con umbrales 4,5:1 para texto y 3:1 para controles/foco. Esto no acredita contraste de todos los píxeles, estados superpuestos o componentes reales. Foco visible, orden Tab, zoom de texto al 200%, tamaños táctiles reales, teclado móvil, scroll/solapes y safe areas siguen sin ejecutar.

**No se generaron capturas nuevas de navegador**, porque no hubo página renderizada. Tampoco se realizó inspección visual nueva ni comparación por píxeles. Las composiciones previas siguen siendo ilustraciones. La suite Playwright contiene captura diagnóstica limitada de inicio móvil claro y escritorio oscuro por motor; no se tomó ninguna. No se establecieron snapshots ni referencias visuales, y no se actualizó ninguna imagen para ocultar fallos.

## 10. Problemas encontrados y corregidos

| ID | Defecto reproducido y causa | Corrección y regresión |
| --- | --- | --- |
| B01 | `popstate` evitaba la confirmación de salida de un gasto modificado | Reutilizar la guarda de navegación; mantener borrador y URL al cancelar |
| B02 | URL inicial sin hash dejaba la pantalla anterior | Resolver la ruta vacía como Inicio |
| B03 | Gastos de escenario conservaban fecha fija ajena a un viaje nuevo | Sembrar la fecha de referencia acotada al viaje; edición posterior válida |
| B04 | Timer de sincronización antiguo confirmaba IDs reutilizados por otro escenario | Identificador de generación invalidado al reseed/inicio de envío |
| B05 | Detalle vacío carecía de encabezado principal | Añadir el título del detalle también al vacío |
| B06 | Banda de revisión y cabecera de aplicación producían dos banners | Banda externa convertida en sección con nombre; misma clase y apariencia |

Las correcciones afectan solamente `design/prototype/app.js` e `index.html`. El CSS y las imágenes de composición permanecen intactos. Se reutilizaron patrones existentes; no se añadieron dependencias al prototipo. [Registro estructurado de defectos](../../design/review/testing/corrections/issues.json) y [diff](../../design/review/testing/corrections/prototype.diff).

## 11. Limitaciones del entorno y pruebas pendientes

La creación de socket IPv4 devuelve `EPERM`; `http.listen(127.0.0.1)` también. Un socket Unix puede crearse, pero su `shutdown` devuelve `EPERM`. Chromium falla en una operación de socket de Crashpad. Firefox registra denegaciones de namespace/pipe y errores gráficos; no se puede atribuir todo su timeout a una única causa. `strace` tampoco pudo trazar el proceso propio: `PTRACE_TRACEME` denegado. No se conoce la regla exacta del filtro que aplica cada denegación.

El [intento Chromium anterior](../../design/review/browser-results.json) registró `sandbox_host_linux.cc:41, shutdown: Operation not permitted`. La sonda aislada de socket Unix reproduce precisamente la denegación de `shutdown`, sin cargar el prototipo. En el intento nuevo Chromium se detiene antes, en `setsockopt` de Crashpad. Son bloqueos del arranque por operaciones del sistema denegadas; no se alcanzó el JavaScript de la aplicación en ninguno de los dos casos.

Esto explica por qué no se trata de un fallo de navegación del prototipo ni de instalar simplemente Chromium. WebKit tiene además el bloqueo independiente de bibliotecas descrito antes. Se preservaron las restricciones del entorno.

Evidencia: [sondas de permisos/sockets](../../design/review/testing/environment/socket-results.json), [limitaciones de dependencias](../../design/review/testing/environment/dependency-limitations.json). Permanecen pendientes las 45 pruebas Playwright, las capturas móviles/escritorio/oscuras y cobertura posterior de geometría de todas las hojas, objetivos táctiles, zoom, contenido largo y teclado. La suite preparada es un punto de partida; no se considera validada al no haberse ejecutado sus cuerpos.

| Tipo de verificación | Estado |
| --- | --- |
| DOM / lógica del prototipo | Ejecutada; 108 casos aprobados |
| Comportamiento simulado | Ejecutado en DOM; sin servicios ni hardware |
| Accesibilidad axe en DOM | 68 auditorías parciales; cero infracciones detectadas, reglas incompletas explícitas |
| Contraste estático / documentación | Ejecutado; 32 pares correctos |
| Navegador real / HTTP | Arranque intentado; cero pruebas de producto ejecutadas |
| Visual / responsive / screenshots | No ejecutado en esta validación |
| Integración real / Firebase / instalación PWA | No implementada ni probada; fuera de esta fase |
| Dispositivos físicos / lectores de pantalla | No ejecutado |

## 12. Revisión y límites de cambios

Se inspeccionaron las suites, el código afectado y la diferencia final; se repitieron las pruebas existentes y las regresiones. Los hashes verifican conservación del CSS, imágenes, plan original y documentos de Fase 0. La ampliación documental enlaza este informe sin borrar los reportes históricos.

**Gemini fue omitido:** el CLI existe, pero `GEMINI_API_KEY` no está configurada y la revisión previa documentada ya falló por autenticación. No se reintentó ni se atribuye revisión a Gemini. Se realizó revisión propia y verificación ejecutada.

## 13. Recomendación y cierre

Mantener **pendiente la aprobación de la Fase 1** hasta disponer de evidencia ejecutada en un entorno que permita navegador y HTTP local. No quedan fallos reproducidos sin corregir en las suites DOM ejecutadas; sí quedan riesgos sin medir de disposición, foco nativo, zoom, teclado, safe areas y diferencias entre motores. La ausencia de infracciones DOM no resuelve esos riesgos.

Esta validación completa lo posible con los permisos actuales, deja las pruebas bloqueadas identificadas y no solicita al usuario ejecutar comprobaciones que ya se pudieron automatizar. No autoriza ni inicia la Fase 2.

## 14. Ejecución real de Playwright y permisos

Se atendió la solicitud posterior de ejecutar navegadores, sin repetir las suites DOM/lógica. Se reutilizaron Playwright 1.56.1, axe-core 4.10.3 y los 45 casos existentes, ampliando sus aserciones para la futura ejecución real. No se modificó el prototipo ni su CSS en esta tarea.

### Diagnóstico comprobado

Se repitió una sonda independiente de la aplicación: UID 1000, sin capacidades efectivas, `NoNewPrivs=1`, `Seccomp=2`. La creación de sockets IPv4 y `shutdown` de socket Unix devolvieron `EPERM`. El nuevo servidor de `webServer` también terminó con `listen EPERM: operation not permitted 127.0.0.1:4173`. Esto confirma una denegación de operaciones del sistema en el contexto restringido, antes de servir el HTML.

Se utilizó la vía oficial `exec_command` con `sandbox_permissions=require_escalated` para pedir únicamente una comprobación de loopback/IPC fuera de la restricción. **La política rechazó la solicitud antes de ejecutarla o mostrar una autorización al usuario**, porque `sandbox_approval: false`. No se cambió la política ni se intentó eludirla. [Registro de la solicitud y rechazo](../../design/review/testing/runs/2026-11-21T23-43-55-243Z/permission-request.json).

No fue posible realizar la comparación dentro/fuera del sandbox. Por tanto, no se atribuye de forma concluyente el filtro de syscalls exclusivamente a Codex, al contenedor o al sistema anfitrión. Sí está comprobado que esta sesión restringida deniega las operaciones y que su mecanismo de elevación no está habilitado. No es una evidencia de fallo del código del prototipo. WebKit tiene además una causa independiente confirmada: falta `libyuv.so.0`. La diferencia entre revisiones instaladas y las esperadas por Playwright sigue identificada; el ejecutor puede descargar las revisiones correctas fuera de este bloqueo, sin instalar paquetes del sistema.

### Ejecución más reciente

Comando realmente ejecutado:

```bash
node /mnt/Datos/gastos/design/review/testing/run-browser-tests.cjs --install-browsers
```

Intento consolidado: `2026-11-21T23-43-55-243Z`. Se lanzaron los tres motores con el sandbox del navegador conservado: Chromium falló en `setsockopt` de Crashpad, Firefox agotó 15 segundos con denegaciones de namespace/pipe y errores gráficos, y WebKit terminó por libyuv ausente. Ninguno renderizó siquiera el documento de diagnóstico de la sonda. Se intentó arrancar el HTTP de Playwright, que fue rechazado; no se llegó a los cuerpos de prueba.

| Resultado actual | Cantidad |
| --- | ---: |
| Casos descubiertos por Playwright | 45 |
| Pruebas de producto iniciadas | 0 |
| Pruebas aprobadas | 0 |
| Pruebas fallidas de producto | 0 |
| Casos omitidos por el runner en este intento | 0 |
| Casos no iniciados por fallo de infraestructura | 45 |
| Error global de Playwright | 1: `webServer` no pudo iniciar |
| Capturas reales generadas | 0 |
| Dispositivos físicos / integración real | 0 |

El proceso Playwright salió con código 1; el ejecutor devolvió código 2 para indicar bloqueo/fallo. Esta distinción sustituye el conteo anterior de 45 `skipped`: ahora el servidor se intenta iniciar de verdad mediante `webServer`, antes de que puedan aplicarse omisiones por motor. No se presenta ninguno de los dos resultados como aprobación.

Evidencias de esta ejecución: [informe](../../design/review/testing/runs/2026-11-21T23-43-55-243Z/RUN_REPORT.md), [diagnóstico](../../design/review/testing/runs/2026-11-21T23-43-55-243Z/diagnostic.json), [sondas](../../design/review/testing/runs/2026-11-21T23-43-55-243Z/preflight.json), [error HTTP](../../design/review/testing/runs/2026-11-21T23-43-55-243Z/http-server.log), [45 casos enumerados](../../design/review/testing/runs/2026-11-21T23-43-55-243Z/discovery.json), [log](../../design/review/testing/runs/2026-11-21T23-43-55-243Z/runner.log), [JSON Playwright](../../design/review/testing/runs/2026-11-21T23-43-55-243Z/results.json), [HTML Playwright](../../design/review/testing/runs/2026-11-21T23-43-55-243Z/html-report/index.html) y [resumen](../../design/review/testing/runs/2026-11-21T23-43-55-243Z/summary.json).

Se realizaron intentos acotados durante la preparación y corrección del ejecutor; no se seguirá repitiendo el mismo bloqueo. Los intentos previos se conservan en `testing/runs/`. La última ejecución completa es la enlazada arriba.

### Ejecutor local y verificaciones de preparación

El comando anterior se puede utilizar desde una terminal normal de Ubuntu fuera de la sesión restringida. Reutiliza herramientas existentes, puede preparar dependencias de pruebas locales y descargar motores faltantes, enumera la suite, inicia el servidor de solo lectura mediante `webServer`, genera reportes, captura únicamente páginas reales y gestiona sus procesos. Si un motor está bloqueado, lo identifica con una sonda nueva de la misma ejecución; no decide a partir de los JSON históricos.

Los resultados se guardan por fecha en `design/review/testing/runs/`. Las capturas se guardarán en `design/review/testing/screenshots/<fecha>/` para inicio, gasto, balance, presupuesto, invitaciones, conflicto, modo oscuro y escritorio, más una captura diagnóstica de texto ampliado. No se generaron capturas ficticias, ni snapshots o referencias visuales. [Instrucciones y alcance del ejecutor](../../design/review/testing/LOCAL_BROWSER_TESTS.md), [estado de las capturas](../../design/review/testing/screenshots/README.md).

Durante la preparación se reprodujo otro límite: la lectura de stdout/stderr mediante pipes de un hijo Node devolvía cero bytes, mientras que redirigir esos mismos descriptores a fichero conservaba ambos mensajes. Se corrigió la captura de logs del ejecutor usando ficheros y un reporte de descubrimiento escrito directamente. Tres pruebas de regresión de **infraestructura del ejecutor** comprobaron stdout/stderr, código de salida fallido y ejecutable ausente: **3/3 aprobadas**. No son pruebas DOM ni pruebas del prototipo en navegador. [Resultado ejecutado](../../design/review/testing/runs/2026-11-21T23-43-55-243Z/runner-unit-tests.log).

Se comprobó la sintaxis/formato de los scripts y el descubrimiento de los 45 casos. Se inspeccionaron los resultados de Playwright y los logs reales de los tres motores. Tras el intento no se encontraron procesos en ejecución que coincidieran con los comandos de servidor/runner/perfiles de pruebas inspeccionados. El cierre con servidor operativo y navegador abierto no pudo probarse aquí; queda como límite de la preparación, no como comportamiento certificado.

[Verificaciones finales de preparación](../../design/review/testing/runs/2026-11-21T23-43-55-243Z/preparation/checks.json): sintaxis, formato, enumeración de los 45 casos, tres regresiones del ejecutor y enlaces/documentación correctos. También se verificó por hash que `app.js`, `index.html`, `styles.css` y los documentos de Fase 0 no cambiaron respecto a la validación previa. Los hashes de cada intento conservan el estado de ese intento; los de preparación identifican los scripts entregados finalmente, cuyos cuerpos de navegador siguen pendientes de ejecución.

Los casos preparados recorren 23 pantallas por resolución/tema; incluyen formularios, scroll, controles fuera del ancho, importes recortados, botón fijo, menú, operaciones simuladas, teclado, foco visible, dialog/Escape y axe en navegador con contraste. La ampliación de texto al 200% usa CSS controlada y no equivale al zoom nativo del navegador/OS. Las safe areas y los dispositivos físicos continúan pendientes. Los cuerpos de esos casos siguen sin validar en navegador real.

### Recomendación actual

**Mantener pendiente la aprobación de Fase 1.** Se entregó el ejecutor solicitado y se probó su recorrido de bloqueo, pero la sesión no permite producir el renderizado y las capturas que faltan. No se corrigieron supuestos defectos visuales sin poder reproducirlos. Se mantuvieron el sistema de diseño, los requisitos y los datos de producción fuera del alcance; no hubo Firebase, commits, push, despliegue ni Fase 2. Gemini continúa omitido por la autenticación no disponible documentada anteriormente.

## 15. Resultados reales, correcciones y publicación

Actualización final tras la ejecución manual del usuario en Ubuntu. Esta sección
prevalece para el estado actual; los reportes anteriores se conservan sin borrar
sus resultados. Los identificadores de ejecución usan UTC.

### Resultados comprobados y alcance

| Ejecución | Transporte / motor | Ejecutadas | Aprobadas | Fallidas | Omitidas |
| --- | --- | ---: | ---: | ---: | ---: |
| Usuario: `2026-11-22T00-18-45-770Z` | HTTP local, Firefox 142.0.1 | 15 | 14 | 1 | 0 de Firefox |
| Mismo intento, otros motores | Chromium y WebKit | 0 | 0 | 0 de producto | 30 |
| Repetición final: `2026-11-22T00-40-01-483Z-firefox-file-final` | Navegador Firefox real, `file://` | 15 | 15 | 0 | 0 dentro del proyecto Firefox seleccionado |

La última repetición seleccionó solamente Firefox: no registra como aprobados ni
como ejecutados los 30 casos de los otros motores. Tampoco sustituye una nueva
ejecución HTTP de las correcciones. Las repeticiones intermedias y el caso de
regresión antes/después se conservan, sin sumarlos como cobertura independiente.
La configuración sigue descubriendo 45 casos, 15 por motor.

El usuario instaló las revisiones esperadas por Playwright 1.56.1. Su diagnóstico
confirma HTTP permitido, `NoNewPrivs=0`, `Seccomp=0` y Firefox 142.0.1 operativo.
Chromium 1194 terminó con `No usable sandbox!`; no se utilizó la alternativa de
desactivarlo que menciona el log. WebKit 2215 terminó por falta de
`libwoff2dec.so.1.0.2`. Son fallos de infraestructura y disponibilidad, no pruebas
del prototipo aprobadas. No se alteraron controles globales ni se utilizó root.

En esta sesión Codex, crear sockets IPv4 sigue devolviendo `EPERM`, pero Firefox
1495 sí consiguió abrir el prototipo local. Por eso se añadió un modo explícito
`GASTOS_TEST_TRANSPORT=file` a la misma configuración de Playwright. El modo
normal mantiene HTTP y `webServer`; el ejecutor HTTP fija ese transporte para
que una variable heredada no lo etiquete incorrectamente. La repetición por
archivo utiliza un navegador completo, con geometría, imágenes, eventos,
teclado y capturas; **no usa JSDOM**. No prueba servidor HTTP, service worker,
instalación ni funcionamiento productivo de una PWA.

### Fallo real y correcciones verificadas

El único fallo del intento HTTP ocurrió en `Responsive 390x844 light`, al ampliar
el texto al 200% mediante CSS: la pantalla Presupuesto desbordaba horizontalmente
y «Ajustar presupuesto» salía del ancho. La traza, el contexto DOM y la captura
de fallo confirman la causa: los elementos flex del encabezado no podían
reorganizar título y acción con las anchuras mínimas del texto ampliado.

La corrección permite envolver el encabezado y limita sus hijos al ancho
disponible. En móvil, la acción conserva palabras completas; con texto ampliado
puede pasar debajo del título. Los valores diarios usan una distribución flexible
que conserva dos columnas con texto normal y apila los importes cuando sus
anchuras mínimas crecen. Se mantienen paleta, tipografía, separadores, iconos,
dimensiones táctiles y la presentación normal aprobada.

La inspección de una repetición intermedia detectó que el primer ajuste dejaba
el botón demasiado estrecho, aunque las aserciones de overflow pasaban. Se
añadió una regresión que mide la palabra más ancha del botón y comprueba que los
dos importes diarios permanezcan en una línea. La regresión falló antes de la
corrección final (36,07 px disponibles frente a un mínimo de 115,75 px) y pasó
después. Se eliminó la ruptura arbitraria de palabras del botón. La suite
completa volvió a ejecutarse tras esa corrección: 15/15 aprobadas.

También se corrigió el helper de escenarios: el prototipo ya cerraba la banda
de revisión al cambiar el estado y la prueba la volvía a abrir con otro clic.
Ahora solo la cierra si sigue abierta y exige que esté cerrada antes de capturar.
Por eso las capturas finales de conflictos ya muestran el contenido descubierto.
Esta corrección pertenece a las pruebas; no cambia la interfaz de la aplicación.

Se reforzaron los casos existentes con límites del encabezado, legibilidad,
scroll hasta abonos/último día/acciones de invitación y una captura offline. Se
conserva el conteo de 45 casos; no se inflan los números contando cada aserción.

### Cobertura de navegador, accesibilidad y revisión visual

Los doce casos responsive de Firefox recorrieron las 23 pantallas en
320×568, 375×667, 390×844, 430×932, 768×1024 y 1440×900, tanto claro como oscuro.
Los demás casos ejercitaron login ficticio, viajes, gasto, varios pagadores,
reparto, balance/abonos, presupuesto, estadísticas, invitaciones, actividad,
cierre, estados simulados, errores de formulario, Tab, foco visible, diálogo,
Escape y retorno al control de origen. El texto al 200% se verifica en el caso
móvil indicado, sin presentarlo como zoom nativo del navegador o del sistema.

Axe ejecutó 46 auditorías en Firefox (23 pantallas por dos temas), dentro de uno
de los 15 casos. No detectó infracciones en las reglas evaluadas. **Dos auditorías
de Inicio mantienen `color-contrast` incompleto**, con nodos fuera de la zona
visible o recortados por contenedores; el JSON conserva los nodos para revisión.
No equivale a certificación WCAG completa ni convierte esas reglas en aprobadas.

Se revisaron capturas reales anteriores y posteriores: inicio móvil, gasto,
balance, presupuesto normal/ampliado, invitaciones, conflictos, actividad
offline, modo oscuro y escritorio. La última repetición guardó 10 archivos PNG,
incluida la captura de actividad offline. Se comprobó visualmente la identidad
conservada, el botón de presupuesto legible y el panel de escenarios cerrado.
La captura completa de una página larga dibuja la navegación fija en la posición
del primer viewport; no se interpreta por sí sola como contenido inaccesible.
Las aserciones de scroll verificaron que los movimientos y acciones inspeccionados
pueden quedar por encima de la navegación al desplazarse.

Las capturas previas y sus trazas no se sustituyeron ni se cambiaron referencias
para ocultar fallos. No hay comparación por píxeles ni snapshots de referencia.
No se probaron teléfonos físicos, teclado virtual, safe areas físicas, zoom
nativo, instalación PWA ni Firebase. Offline y conflictos siguen siendo UX con
fixtures y temporizadores simulados, aunque se ejerciten en un navegador real.

### Evidencia actual

- [Resumen Firefox versionable](../../design/review/testing/firefox-followup-run.json).
- [JSON del intento HTTP del usuario](../../design/review/testing/runs/2026-11-22T00-18-45-770Z/results.json).
- [Resumen HTTP de 45 casos](../../design/review/testing/runs/2026-11-22T00-18-45-770Z/summary.json).
- [Traza original del fallo](../../design/review/testing/runs/2026-11-22T00-18-45-770Z/artifacts/prototype-Responsive-390x844-light-firefox/trace.zip).
- [Regresión de legibilidad antes](../../design/review/testing/runs/budget-readability-before/results.json) y [después](../../design/review/testing/runs/budget-readability-after/results.json).
- [Últimos resultados Playwright](../../design/review/testing/runs/2026-11-22T00-40-01-483Z-firefox-file-final/results.json), [reporte HTML](../../design/review/testing/runs/2026-11-22T00-40-01-483Z-firefox-file-final/html-report/index.html) y [axe nativo](../../design/review/testing/runs/2026-11-22T00-40-01-483Z-firefox-file-final/axe-firefox.json).
- [Presupuesto normal](../../design/review/testing/screenshots/2026-11-22T00-40-01-483Z-firefox-file-final/firefox-390x844-light-budget.png), [texto ampliado](../../design/review/testing/screenshots/2026-11-22T00-40-01-483Z-firefox-file-final/firefox-390x844-light-budget-text200.png), [conflictos](../../design/review/testing/screenshots/2026-11-22T00-40-01-483Z-firefox-file-final/firefox-390x844-light-conflict.png) y [offline](../../design/review/testing/screenshots/2026-11-22T00-40-01-483Z-firefox-file-final/firefox-390x844-light-activity-offline.png).

Los reportes voluminosos, capturas y trazas continúan excluidos de Git y se
conservan localmente. Los enlaces a esas evidencias pueden faltar en un checkout
nuevo; fuentes, fixtures, resúmenes y scripts sí se conservan.

### Verificaciones complementarias y Git

Se repitieron en una copia publicable, conservando las salidas anteriores:
108 pruebas DOM/lógica aprobadas (incluidos los 9.000 vectores de cálculo),
68 auditorías axe DOM parciales, 32 pares de contraste estático, tres regresiones
del ejecutor y cuatro pruebas de exportación Git. Estas últimas comprueban
59 reglas de exclusión/retención, incluida `.gitattributes`.

Git está inicializado en `main`, sin commits todavía. `origin` guarda la URL
HTTPS correcta; la configuración preexistente la reescribe a SSH para el mismo
repositorio. No se reinicializó ni se reemplazó el remoto. No hay conflictos y
los 144 archivos preparados inicialmente no incluyen resultados ignorados.
Se revisaron tanto el índice como los candidatos actuales, sin patrones de
secretos ni cuentas de servicio detectados. Los participantes son datos ficticios.

`git diff --cached --check` detectó inicialmente dos saltos Markdown escritos
con espacios finales en el plan original. `.gitattributes` limita a ese archivo
la excepción `whitespace=-blank-at-eol`, preservando el formato y su SHA-256.
El control vuelve a terminar sin errores; no se cambiaron preferencias globales.

El intento real de incorporar las correcciones mediante `git add` falló con
`Unable to create .git/index.lock: Read-only file system`. No se intentó evadir
esa protección, ni crear un commit con el índice antiguo. Por tanto, commit,
push, SHA publicado y seguimiento `origin/main` siguen pendientes. GitHub confirmó
que el remoto continúa vacío. Los [comandos mínimos](../GIT_SETUP.md) preparan
las correcciones, verifican y publican desde una terminal normal, sin force push.

Las ocho reglas de cierre por fase quedan en `AGENTS.md`. Gemini fue omitido
por la autenticación no disponible ya documentada; se realizó revisión propia.

### Estado de cierre

El defecto reproducido de presupuesto está corregido y verificado en Firefox
real, y la validación Firefox de la última versión termina sin fallos. Se puede
publicar el estado inicial documentado del proyecto. **La aprobación completa
multiplataforma de Fase 1 sigue pendiente**: faltan Chromium/WebKit, una repetición
HTTP de la corrección final y las comprobaciones físicas/nativas indicadas. Dos
auditorías de contraste nativo conservan comprobaciones incompletas. En la tabla
diaria ampliada algunas etiquetas y cifras se envuelven en varias líneas: el
texto se conserva, pero su comodidad de lectura en dispositivos requiere
validación. No se inició Fase 2 ni se implementó Firebase.

## 16. Aceptación provisional y continuidad autorizada (2026-11-22)

El usuario confirmó la publicación inicial en GitHub y aceptó provisionalmente
la Fase 1 para continuar con Fase 2. El commit inicial `07ce6ef` se verificó en
GitHub y el checkout en `main` estaba limpio. La autorización explícita sustituye
las restricciones históricas de no avanzar, sin convertir pruebas omitidas o
bloqueadas en aprobadas.

Se conservan íntegros los resultados anteriores y el prototipo. Quedan pendientes
las pruebas multiplataforma, repetición HTTP de la corrección final de Fase 1,
pruebas físicas, safe areas/teclado/zoom nativos y las comprobaciones incompletas
de contraste descritas en la sección 15. Las suites React/PWA de Fase 2 validan
una implementación distinta y no sustituyen los casos pendientes del prototipo.
Ver [informe de Fase 2](../phase2/REPORT.md).
