# Fase 7 · Imágenes y adjuntos offline

Base verificada: `926aef92b9d1820f913252001c3d424893dc5d6f`, `main`, coincidente
con GitHub antes de editar. No había cambios ajenos. Desarrollo exclusivo en Auth
y Firestore Emulator Suite, con datos e imágenes sintéticos. No se habilitó
Storage, Functions, Blaze, otro backend, producción ni despliegue público.

## Arquitectura y contratos

`src/attachments/` separa contratos/validación, procesamiento, cámara, Openverse,
IndexedDB, transporte, coordinador y presentación. Reutiliza React, Firebase,
IndexedDB nativo, el SW y las bibliotecas existentes; ninguna dependencia nueva.
El motor financiero y su proyector conservan sus cálculos, contratos v2 y DAG.

El formulario añade un selector opcional y conserva creación rápida, selección de galería,
iconos locales, preview, eliminación de referencia y edición. Cambiar/quitar imagen
genera una revisión financiera normal; no modifica documentos anteriores. Las
respuestas tardías del transporte de imágenes nunca generan revisiones de gastos.
Las imágenes históricas continúan disponibles por ID; no hay borrado destructivo.
Eliminar/restaurar y unificar gastos conservan esas referencias y sus importes.

Se habilita exactamente el contrato de adjuntos v1 previsto en DATA_MODEL:
`trips/{tripId}/attachments/{attachmentId}`. Campos estrictos: schemaVersion,
expenseId, createdBy, createdAt, mimeType, bytes, byteLength, width, height,
sourceKind, attribution. Firestore Bytes, no base64 almacenado como texto.
REST usa base64 únicamente como representación de transporte de Bytes.

**Decisión de residencia de metadatos:** las nuevas referencias financieras son
`visual:null` o un icono local y `attachmentId:UUID|null`. La atribución completa
de Openverse reside en `attachment.attribution`, tanto local como remotamente.
El detalle y la comparación de propuestas la recuperan del mismo adjunto. No se
introduce otro contrato financiero ni una colección de gastos paralela. El dominio
conserva su unión histórica de visuales; las reglas de nuevas escrituras no permiten
incluir metadata completa de stock dentro del evento. Fase 6 no publicaba esos
visuales. No se necesita migrar documentos anteriores.

Esta separación evita exceder las 1.000 expresiones al combinar atribución completa,
diez aportaciones/cuotas/porcentajes y snapshots padre. Los primeros prototipos
excedieron ese límite y se descartaron. Las reglas finales mantienen las sumas
enteras exactas. Listas uniformes usan multiplicación exacta; diez posiciones
no uniformes usan suma directa; listas cortas conservan padding. Identidades y
pesos exactamente iguales al padre autorizado heredan sus invariantes, mientras
cada importe nuevo vuelve a comprobarse. Cambiar identidades, modo o pesos exige
validación completa. No se omite autorización ni conservación para admitir fotos.

## Procesamiento y cámara

Se aceptan JPEG, PNG y WebP comprobando cabecera real y decodificación. Entrada
máxima 20 MiB, 16.777.216 píxeles y 16.384 por lado; mínimo legible de 24 px por
lado, también tras reducir. HEIC/HEIF no se declara compatible: se explica cómo
convertirlo o continuar sin fotografía. SVG, animaciones WebP y bytes corruptos se
rechazan. No se persisten originales.

`createImageBitmap` aplica orientación; canvas recodifica WebP y elimina EXIF/XMP.
Se prueban lados 640, 512, 384 y 320 y calidades .86, .74 y .62. Se verifica MIME,
cabecera WebP, dimensiones y tamaño real final ≤40.960 bytes. No se baja de esa
calidad para forzar una imagen ilegible. La vista previa permite decidir antes de
guardar; un fallo/cancelación mantiene válido el formulario financiero. Bitmap,
canvas y URLs temporales se liberan.

La cámara pide solo vídeo y permite cambiar orientación environment/user.
Se detienen todos los tracks al cancelar, cambiar cámara, ocultar la aplicación
o desmontar el flujo, incluso si getUserMedia termina tarde. Se ofrece captura
nativa del sistema o archivos como alternativa. Firefox se prueba con MediaStream
sintético real de canvas; no constituye prueba de cámara física Android/iPhone.

## Durabilidad, entrega y privacidad

Migración local aditiva IndexedDB v2→v3: añade `attachments` y su índice de estado,
conservando los cuatro stores previos, IDs y borradores. La partición sigue siendo
proyecto Firebase/UID; cada fila identifica viaje/attachmentId, revisión financiera
asociada, bytes, metadata, estado, intentos, error y lease. Los borradores explícitos
pueden conservar miniaturas comprimidas; no forman parte del saldo.

Primero termina la transacción durable financiera. Después se guarda la miniatura
en otra transacción. Si esta falla por cuota/error IDB, se informa que el gasto ya
está guardado, se conserva la imagen/formulario visible y se permite reintentar
solo la imagen, copiar su contenido recuperable o continuar sin ella. La copia
contiene una URL de datos WebP; se verifica el contenido real antes de ofrecerla. El flujo auxiliar de descarga Blob se bloqueó en el Firefox
disponible y se retiró; la recuperación copiable no depende de descargar archivos.
No se repite la operación financiera.

El coordinador de imágenes es independiente del financiero. Espera confirmación
de la revisión referenciada y aprovecha online, pageshow, visibilidad y sondeo
activo de 1,5 s; emplea backoff existente, ID fijo y lease de 45 s entre pestañas.
Solo procesa oportunidades elegibles, sin que rechazados bloqueen toda la cola.
Escritura REST create-only con token del autor, timestamp del servidor y read-back
canónico. Documento existente distinto es incidencia; permission-denied nunca se
interpreta como confirmación. No hay outbox duplicada en Firestore SDK, que sigue
en memoria. El serializador común incorpora booleanValue para `modified`; se
añade regresión sin cambiar números monetarios.

Confirmación/error/reintento son estados propios del adjunto. Un rechazo conserva
bytes y permite revisión/copia explícita local en Actividad. Cambiar UID detiene
servicios y cambia partición; no se envía A con credenciales B. La vista de imágenes
identifica también la partición para evitar un preview antiguo al cambiar cuenta.
Revocación/cierre rechazan nuevas escrituras sin descartar propuestas. IndexedDB no está cifrado por UID: la partición aísla las sesiones de la app,
no a alguien con control del perfil o herramientas del navegador. No se puede
borrar a distancia una imagen ya descargada por otro dispositivo. IndexedDB no es
copia de seguridad permanente; borrar datos o perder identidad puede perder acceso.
No se promete sincronización con la PWA cerrada.

## Openverse y licencias

Búsqueda anónima explícita, sin consultas al iniciar la app: CC0/CC BY, ocho
resultados por página, hasta tres páginas, caché acotada y cancelación de consultas
anteriores. Espera mínima de un segundo entre solicitudes; HTTP 429 conserva una
pausa de 30–300 s según Retry-After; timeout de diez segundos. No hay secretos.

Se valida ID, creador, fuente, licencia/versión/URL canónicas, URLs HTTPS públicas
y metadata obligatoria. Los nombres se normalizan y los enlaces se validan contra
el formato aceptado por Rules antes de ofrecer persistencia. Las reglas validan
sintaxis HTTPS; no resuelven DNS. El cliente excluye hosts locales/IPs y solo
descarga desde el endpoint oficial. No se renderiza HTML de atribución. Solo se intenta descargar
`https://api.openverse.org/v1/images/{id}/thumb/?compressed=true`, endpoint oficial,
con CORS, sin credenciales, sin redirects ni proxies públicos. Límite de descarga
2 MiB y recodificación local idéntica a fotografías. El original no se descarga.

Una miniatura descargada y confirmada conserva título, autor/URL, fuente, página
original, licencia/versión/URL, ID, thumbnailUrl y modified. La atribución accesible
aparece en el detalle, también offline si el adjunto fue descargado. Una URL externa
caída no afecta a esa copia. Si falla la descarga, el selector muestra atribución de
la propuesta y ofrece **Continuar con icono local**: no se reutiliza la imagen ajena,
no se promete su persistencia ni se presenta el icono propio como foto de stock.

Documentación consultada: [API oficial](https://api.openverse.org/v1/) y
[cliente oficial](https://docs.openverse.org/packages/js/api_client/index.html).
La prueba contra el servicio público se distingue de respuestas controladas: la
consulta real con curl agotó 25 s sin bytes, Firefox devolvió TypeError de red/CORS
tras 8,37 s y la herramienta web recibió HTTP 403.
No se declara verificado el CORS/disponibilidad de una búsqueda pública real a
partir de mocks. La integración determinista comprueba el flujo y sus fallbacks;
la disponibilidad del proveedor sigue siendo una limitación externa documentada.

## Seguridad

Reglas de adjuntos: miembro activo autenticado, viaje activo, creador real,
attachmentId UUID, raíz expense v2 del mismo viaje, timestamp servidor, campos
exactos, MIME WebP, dimensión entera 1–640, Bytes reales 1–40.960 y longitud declarada
idéntica. Photo exige attribution:null; stock exige metadata estricta con CC0/CC BY,
licencias canónicas y endpoint oficial. Get individual solo miembros; list, update
y delete denegados. Ninguna regla financiera concede permisos generales.

El servidor **no decodifica píxeles**, comprueba EXIF real ni certifica titularidad
de licencias. El lector/procesador valida WebP y sus dimensiones, rechaza metadatos
y muestra fallback ante fallo de decodificación; el usuario revisa legibilidad.
Un cliente hostil podría guardar bytes ilegibles dentro del tamaño permitido,
pero no cambiar contabilidad ni exponer otro viaje mediante esos bytes.

Cota conservadora de accesos al crear adjunto: trip para member, trip para estado y
raíz expense (tres sin descontar caché, normalmente dos documentos únicos). Se
publica una imagen por commit. Bytes y attribution quedan fuera de índices.
No se alteran garantías de pares merge, permisos de presupuesto o historial.

## Cuotas y carga

Solo se solicitan imágenes de los ocho movimientos recientes visibles o del
detalle abierto mediante IntersectionObserver. Watches por ID se comparten,
usan caché IDB y se desmontan al dejar de usarse. No hay listener de colección
attachments ni bytes en eventos, before, estadísticas o caché pública del SW.
El registro financiero completo continúa descargándose como en Fase 6.

Estimación de payload, no capacidad garantizada: 300×40.960=11,72 MiB;
1.000=39,06 MiB. Diez clientes descargando esas 1.000 imágenes consumen hasta
10.000 lecturas y 390,63 MiB de bytes, más protocolo, reglas y otros documentos.
Reemplazar fotos conserva históricos y aumenta almacenamiento. Se suman nombres,
campos, metadata e índices al tamaño calculado oficialmente; el base64 de transporte
no equivale al tamaño almacenado como Bytes.

Las [cuotas publicadas de Firestore](https://firebase.google.com/docs/firestore/quotas)
consultadas el 2026-11-23 son 1 GiB, 50.000 lecturas/día, 20.000 escrituras/día y
10 GiB salientes/mes; son compartidas con toda la app. Ver
[cálculo oficial de tamaño](https://firebase.google.com/docs/firestore/storage-size).
Ni esos números ni el emulador garantizan gratuidad indefinida o capacidad real.
Las colas independientes no reservan cuota: agotar Firestore también puede dejar
movimientos financieros pendientes, que se conservan en el dispositivo.

## Verificación y entrega

Entorno: Node 24.22.3, Java/Firestore Emulator local, Playwright Firefox 1572.
**530 casos distintos aprobados**, sin fallos pendientes.
Lint, typecheck de aplicación/dominio y build PWA aprobados; continúa la advertencia
ya conocida del chunk Firebase >500 kB. No se agregaron dependencias.

| Suite | Resultado |
| --- | --- |
| Vitest, 26 archivos | 243 aprobadas |
| Firestore Rules ordinarias | 200 aprobadas, cero fallos |
| Imágenes/adjuntos Firefox | 30 casos distintos aprobados |
| Auth, viajes y finanzas Firefox | 19 casos distintos aprobados |
| Shell PWA Firefox | 19 aprobadas |
| Offline/conflictos Fase 6 Firefox | 19 aprobadas |

Imágenes: tanda completa 28/30; se corrigió el selector de tema y se esperó a que
la segunda pestaña terminara de preparar sesión/viaje antes de desconectarla. La
repetición de esos dos casos y del flujo Openverse dio 3/3. Se mantienen los otros
28 resultados, sin duplicar casos al contar. Auth/finanzas: 18/19 y repetición
corregida 1/1; la prueba recargaba antes del ACK local y esperaba 15 s frente al
lease de 45 s. Ahora espera Sincronizado antes de recargar, sin cambiar importes.

IMG-01..05: cámara sintética sin audio, permiso denegado, cámara tardía oculta,
JPEG/PNG/WebP, orientación EXIF, bytes corruptos/HEIC, exceso de bytes/píxeles,
miniaturas demasiado pequeñas/estrechas, cancelación, cuotas/errores IDB, borrador,
recarga offline, pérdida de acuse y dos pestañas, rechazo/reintento independiente,
revocación/cambio de UID, actualización real del SW, atribución offline, API
403/429/timeout/CORS, metadata insuficiente, cambios/eliminación/restauración,
conflictos y merge con fotos distintas. Móvil Firefox a 390 px, texto ampliado,
modo oscuro, foco/Escape y axe pasan. No son dispositivos físicos.

Dos clientes: gasto con foto de COP 20.000 confirmado una sola vez, ambos ven la
miniatura y el mismo costo; deuda sugerida COP 10.000. Subida rechazada conserva
ese gasto; reintentar imagen no crea otro evento. Cambiar/quitar imagen conserva
COP 20.000; eliminación lógica lleva a cero y restauración a COP 20.000. Ramas
con fotos distintas y su resolución convergen; unificación conserva una compra de
COP 20.000 y ambas miniaturas históricas. No se modificó ninguna expectativa
financiera para aceptar imágenes.

Seguridad: Bytes reales exactamente a 40.960 aceptados, 40.961/declaración falsa,
usuarios ajenos/revocados, gasto de otro viaje, cierre, autor falsificado, campos
extra/ausentes/tipos y modificación/borrado rechazados. Diez pagadores/cuotas,
porcentajes no uniformes, nota de 2.000 caracteres y dos padres pasan, incluso
cambiando los porcentajes de la resolución. Ataques a importes/identidades/pesos
no eluden la validación heredada. La cobertura acumulada no se presenta como
medidor exacto de expresiones por petición.

Mediciones sintéticas representativas conservadas en el resumen:

| Escenario | Medición |
| --- | --- |
| PNG de ruido 1.800×1.200 | 7.239.646 bytes de entrada |
| WebP resultante | 34.890 bytes, 320×213, bajo 40.960 |
| JPEG EXIF orientación 6 | 200×100 →100×200, sin EXIF ni sentinela GPS |
| 300 imágenes añadidas más referencia inicial | 301 remotas, 208.894 bytes de imagen |
| Cliente en estadísticas | Cero miniaturas descargadas |
| Cliente en movimientos visibles | Seis miniaturas, 4.164 bytes locales |
| Siembra, proyección y navegaciones del ensayo | 2.737 ms; no es tiempo puro del motor |

La prueba de carga usa fixtures sintéticos por API administrativa del emulador
para aislar lectura/renderizado; las reglas se prueban aparte con clientes
ordinarios. No mide heap total del proceso ni simula facturación de producción.
No se añade una galería de versiones históricas: las referencias se conservan y
son consultables por ID; el detalle normal muestra la referencia vigente.

Problemas corregidos: límites iniciales de reglas sin relajar conservación,
serialización de modified, liberación de cámara tardía/URLs, validación de borradores
y metadatos antes de ofrecer persistencia. Los intentos de descarga Blob no fueron
fiables en el Firefox de este entorno y se sustituyeron por contenido copiable
validado. También se corrigieron preparación/esperas de pruebas, sin variar dinero.

Auditoría npm: cero incidencias de producción; 17 moderadas transitivas de
herramientas de desarrollo, sin altas/críticas, ya presentes antes y sin cambiar
el lockfile. La auditoría de fuentes/historial y .gitignore se vuelve a ejecutar antes del commit.
Ninguna fotografía original, credencial, base de emulador ni captura temporal forma
parte de los entregables. El resumen compacto y los tests sí se versionan.

Archivos principales: src/attachments/{contracts,process,local,remote,service,
openverse,Camera,ImagePicker,ExpenseImage,AttachmentActivity}; ExpenseForm,
useFinancialWrite, FinanceViews, ConflictReview, SyncActivity, SyncProvider y
OfflineStore; firestore.rules/indexes, pruebas y scripts/CI de imágenes.

Publicación autorizada en main, mensaje previsto:
`feat: implement expense images and Openverse integration`.
El SHA posterior al push se verifica contra origin/main y se comunica en la entrega;
no se incluye un SHA autorreferencial dentro de este mismo commit.

Resumen versionado: [test-results-summary.json](test-results-summary.json).

Gemini se omitió: la revisión anterior agotó cuota y no se repitió una invocación
conocidamente bloqueada. Se aplica revisión propia, pruebas adversariales y
navegador real. Cámaras físicas, Android/iPhone, Chromium/WebKit no ejecutados y
disponibilidad pública de Openverse no se declaran aprobados. Cierre de viajes,
reasignación de identidad, OCR, pagos y producción siguen deshabilitados. No se
inicia Fase 8.
