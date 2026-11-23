# Revisión y aceptación de Fase 1

Estado actual (2026-11-22): el usuario acepta provisionalmente Fase 1 y autoriza
Fase 2, conservando las comprobaciones multiplataforma pendientes. Identidad y
[ajustes solicitados](VISUAL_ADJUSTMENTS.md) conservados. El contenido siguiente
documenta la revisión histórica; sus límites no se consideran pruebas aprobadas.

Actualización: el [informe de validación automatizada completa](AUTOMATED_TEST_REPORT.md) contiene los resultados más recientes, seis correcciones reproducidas y los intentos de los tres motores. Las evidencias anteriores que siguen a continuación se conservan como historial; no sustituyen el informe actual.

Firefox ya produjo resultados y capturas reales en Ubuntu. La actualización final
del informe documenta el fallo de ampliación de texto, su corrección, la revisión
visual y las repeticiones reales posteriores. Los bloqueos descritos abajo
corresponden a la entrega histórica.

## Cambios y decisiones relevantes

Se leyó README y toda la documentación previa; la copia del plan original sigue intacta. Se prepararon flujos, wireframes, tokens/componentes y un prototipo local de revisión. Se mantuvieron los documentos de Fase 0 como referencia y las diferencias se registraron en [SCOPE_RECONCILIATION](SCOPE_RECONCILIATION.md) antes del prototipo.

Ampliaciones solicitadas: cantidades específicas y modo oscuro. El primero requiere futuro contrato `fixed` explícito; no se aproxima mediante porcentajes. Crear viaje no crea invitados ficticios: primero organizador y después invitaciones. Cierre no presupone que dispositivos offline ya enviaron cambios ni habilita una reapertura no aprobada.

Se evitó navegación de muchas pestañas, tarjetas para cada cifra, bibliotecas visuales y recursos remotos. Lucide local es la única familia de iconos; las dependencias de herramientas están en /tmp y no se incorporaron al runtime del proyecto.

## Verificación ejecutada

| Comprobación | Resultado y alcance |
| --- | --- |
| `node --check design/prototype/app.js` | Sintaxis correcta |
| Prettier 3.3.3 sobre HTML/CSS/JS de diseño | Archivos formateados y parseados; no modifica documentación fuente |
| `node design/review/verify-prototype.cjs` | Comprobaciones DOM de recorridos y escenarios; número exacto y casos en [reporte](../../design/review/dom-results.json) |
| `python3 design/review/verify-docs.py` | Enlaces locales, bloques Markdown, hash del plan, paleta conservada y 32 pares de contraste; [reporte](../../design/review/document-results.json) |
| Composición principal y detalle de presupuesto SVG/PNG | Ambas generadas e inspeccionadas visualmente; no es screenshot ni valida CSS de navegador |
| Chromium/Playwright | Bloqueado al iniciar por restricciones de procesos/sockets (`Operation not permitted`); sin capturas reales |
| Android/iPhone, navegador real, lectores | No ejecutado en este entorno |
| Firebase/emuladores/instalación PWA | No corresponde a implementación de Fase 1; no ejecutado |

Las pruebas DOM ejercitan elementos reales del prototipo: 23 rutas, todos los estados de revisión, labels, iconos locales, fixture financiero, captura rápida, porcentajes exactos, importes específicos, exclusiones, diez personas, varios pagadores, borrado/restauración con historial, abonos, cupos manuales, offline simulado, fallo local, conflictos, duplicados, roles, invitación inválida, creación y cierre. No se presentan como pruebas del futuro motor financiero ni de Firestore.

Se revisaron cifras entre pantallas, incluyendo los dos pagos que liquidan los saldos (Bruno→Ana 20.000 y Bruno→Carla 10.000): 250.000 de compras, 150.000 disponibles y saldos +20.000/−30.000/+10.000 para el fixture con abono. Los candidatos de café cuentan ambos hasta decisión; unificar deja un único importe efectivo. Gasto en conflicto queda fuera del subtotal y se rotula provisional.

## Matriz de revisión manual pendiente

| Prueba visual/física | Anchos/condición | Criterio |
| --- | --- | --- |
| Inicio y captura | 320, 390, 768, 1280 y 1440 px | Sin solapes; CTA accesible; dinero y nombres sin cortar |
| Formularios y teclado | Android Chrome, iPhone Safari/PWA | Campo enfocado y guardar visibles al desplazar; safe areas respetadas |
| Zoom/texto mayor | 200%, nombre largo e importe de 12 dígitos | Reflujo antes de elipsis; conservar moneda/signo |
| Claro/oscuro | Sistema y selector de revisión | Contraste real de todos los estados, iconos y controles |
| Teclado/lector | Tab, Shift+Tab, Enter, Escape, VoiceOver/TalkBack | Labels correctos, foco de hojas y retorno al origen, errores anunciados |
| Red lenta/offline | Escenarios de diseño; luego red real en Fase 6 | No spinner infinito ni falso sincronizado; no confundir caché parcial con vacío |
| Grupo 2–10 | Reparto, pagadores, balance y personas | Sin carrusel obligatorio ni targets reducidos |
| Cierre y conflictos | Incidencia conocida y tardía | Provisional explícito, sin cierre/reapertura no autorizados |

## Gemini

Gemini fue omitido: el CLI está instalado, pero `GEMINI_API_KEY` continúa sin configurar y la revisión anterior ya había fallado por autenticación. No se volvió a intentar ni se cambió configuración. Se realizó revisión propia; no se atribuye aprobación independiente a Gemini.

## Riesgos y límites restantes

- Falta aprobación visual del usuario y recorrido en dispositivos reales. No se puede afirmar accesibilidad completa o layout verificado por las comprobaciones de tokens/DOM.
- Autenticación, red, roles, borradores y auditoría son simulaciones de UX. Los cambios en memoria se reinician al recargar/cambiar escenario; no hay recuperación durable.
- La evolución gráfica usa las fechas/valores actuales y escala compartida con el presupuesto, también si hay exceso; etiquetas fuera del SVG y tabla accesible. Sigue pendiente verificar legibilidad y geometría en rangos grandes y navegador real.
- No están implementados cámara, carga WebP, consultas Openverse, QR de acceso, persistencia, reglas ni reconciliación distribuida. Sus flujos/errores están diseñados y las validaciones técnicas conservan sus puertas en fases posteriores.
- Proveedor de cuenta, nombre, catálogo de moneda, reservas diarias, retención de fotos y tratamiento de incidencias tardías siguen propuestos según DECISIONS y reconciliación.

## Salida propuesta

Revisar los entregables concretos: [prototipo](../../design/prototype/index.html), [wireframes](../../design/wireframes.html), [flujos](USER_FLOWS.md), [sistema visual](DESIGN_SYSTEM.md). Una vez aprobados composición y recorridos, registrar qué decisiones se ratificaron antes de iniciar infraestructura productiva. Esta entrega no registra por sí misma esa aprobación.

La ampliación de verificaciones y la distinción entre DOM, contrastes, ilustraciones y navegador bloqueado están en [VISUAL_ADJUSTMENTS](VISUAL_ADJUSTMENTS.md). Los reportes enlazados reflejan la última ejecución, no solo la entrega inicial.
