# Modelo y contratos de datos v1

Estado: propuesta compartida para todo el MVP. Los ejemplos de campos son contratos documentales, no implementación. Toda entidad persistida lleva `schemaVersion: 1`. Campos no permitidos se rechazan; valores ausentes opcionales se normalizan a `null` cuando corresponda. Una nueva versión exige migración explícita, nunca interpretación silenciosa.

## Tipos comunes

| Tipo | Contrato |
| --- | --- |
| `Uid` | Identificador de Firebase Auth; autoría basada en `request.auth.uid` |
| `PersonId` | Identidad contable estable dentro del viaje. Al ingresar por primera vez equivale al UID inicial; una reinvitación puede vincular otro UID explícitamente a esa persona |
| `OperationId` | UUID v4 generado con fuente criptográfica antes de persistir. Se reutiliza en todos los reintentos |
| `Money` | Entero seguro entre 0 y 1.000.000.000.000 unidades menores; total de gasto/abono estrictamente >0. Operaciones agregadas/intermedias con BigInt |
| `Currency` | Código permitido y exponente fijados al crear: propuesta inicial COP/0, USD/2 y EUR/2; no cualquier ISO arbitrario |
| `TripDay` | `YYYY-MM-DD` en la zona IANA del viaje, dentro de fechas inclusivas |
| `Revision` | `OperationId` de un evento, no una hora ni número incremental |
| `Timestamp` | Firestore Timestamp UTC para recepción; fecha ISO UTC para ocurrencia del gasto; hora local de autoría no confiable |

Topes de producto propuestos: título 1–100 caracteres tras trim; nombre 1–60; destino ≤120; nota ≤2.000; viaje ≤366 días; objetivo de evento ≤32 KiB sin foto, incluidos snapshots before. Importe decimal de formulario se parsea desde texto según moneda; nunca `parseFloat` para contabilidad. Los límites se comparten entre esquema y reglas, probando diferencias entre longitud Unicode y bytes. El tamaño serializado del evento se mide en cliente y tests: las reglas limitan campos/listas/textos, no se supone que `map.size()` devuelva bytes. Antes de fijar 32 KiB como garantía de servidor, verificar una cota conservadora de todos los campos y snapshots.

## Rutas persistidas

| Ruta | Campos principales y autoridad |
| --- | --- |
| `users/{uid}` | `displayName`, `createdAt`, `schemaVersion`. Solo el titular lee/escribe; no otorga roles y no almacena contraseña |
| `trips/{tripId}` | `ownerId`, `title`, `destination`, `startDate`, `endDate`, `timezone`, `currency`, `currencyExponent`, `status: active/closed`, `memberBindings: {uid: personId}`, `activeUids: Uid[]`, `participantIds: PersonId[]`, `budgetEntityId`, `cover`, `metadataVersion`, `membershipVersion`, `createdAt`, `updatedAt`, `closedAt` |
| `trips/{tripId}/members/{uid}` | `personId`, `displayName`, `role: owner/member`, `status: active/revoked`, `inviteId: null/token`, `joinedAt`, `revokedAt`. Espejo de acceso validado atómicamente contra `memberBindings` |
| `trips/{tripId}/people/{personId}` | `displayName`, `createdAt`, `createdBy`. Identidad histórica; no se borra al expulsar o reasignar UID |
| `trips/{tripId}/invites/{token}` | `createdBy`, `createdAt`, `expiresAt`, `revoked`. Sin título, nombres, correos ni listado de participantes |
| `trips/{tripId}/events/{operationId}` | Evento inmutable descrito abajo; única fuente financiera |
| `trips/{tripId}/attachments/{attachmentId}` | Miniatura y metadata inmutables, fuera del evento financiero |

No se crean colecciones paralelas de saldos o de gastos autoritativos. `expenses`, `settlements`, `dailyBudgets`, `conflicts` y estadísticas son vistas locales regenerables. La lista `participantIds` conserva personas revocadas; `memberBindings` contiene solo los accesos activos, máximo 10, con valores únicos. Se propone un tope explícito de 1.000 personas históricas por viaje para acotar el documento; al alcanzarlo se rechazan nuevas personas con un mensaje claro, no se purga el historial.

`ownerId` y `budgetEntityId` son inmutables. No hay transferencia de propiedad en el MVP. Metadatos editables: título, destino y portada, online por propietario y con comprobación de `metadataVersion`. Fechas, zona y moneda permanecen fijas. El estado solo pasa de active a closed. El presupuesto vive en eventos, no en un campo mutable de `trips`.

## Evento financiero

| Campo | Contrato |
| --- | --- |
| `operationId` | Igual al ID del documento |
| `entityKind` | `expense`, `settlement`, `budget` o `duplicateDecision` |
| `entityId` | ID del evento raíz. El primer evento de presupuesto coincide con `trip.budgetEntityId` |
| `action` | `create`, `replace`, `delete`, `resolve`, `mergeKeep`, `mergeHide` o `dismissDuplicate`, según tipo |
| `actorUid` / `actorPersonId` | UID autenticado y persona vinculada en el viaje al crear el evento |
| `parentIds` | 0 en create; 1 en replace/delete/merge/dismiss; 2 distintos en resolve |
| `logicalClock` | 0 para raíz; `1 + max(clock de padres)`; entero acotado a 1.000.000.000 |
| `before` | Lista de snapshots, uno por padre en el mismo orden; coincide con `parent.payload`. Vacía para raíz |
| `payload` | Snapshot completo posterior válido para ese tipo; no parches ambiguos |
| `authoredAt` | Hora UTC declarada por cliente, solo informativa |
| `receivedAt` | Timestamp servidor, igual a `request.time` al crear; no ordena revisiones |
| `merge` | `null` o `{mergeId, peerEntityId, peerOperationId, role: keep/hide}` para una unificación atómica |
| `schemaVersion` | `1` |

Todos los padres pertenecen al mismo viaje, tipo y entidad; se consultan directamente por ID, sin recorrer el grafo en reglas. La igualdad de `entityId` con la raíz se garantiza inductivamente al validar cada padre. No se admiten padres repetidos, autorreferencias ni cambiar tipo. Crear una segunda raíz con el mismo `entityId` es imposible porque el ID de documento debe ser ese mismo ID. Resoluciones con un padre ancestral redundante se consideran revisiones ordinarias a efectos de proyección, nunca borran cabezas ajenas.

Un evento `delete` conserva el snapshot monetario y añade `status: deleted`; el proyector lo excluye. Una restauración explícita es `replace` sobre esa revisión con `status: active`. Los cambios se ven completos en el historial; no se reescriben eventos anteriores.

## Snapshot de gasto

| Campo | Contrato |
| --- | --- |
| `title`, `note` | Texto plano con límites anteriores; nunca HTML interpretable |
| `total` | Money >0 en moneda del viaje |
| `category` | `food`, `transport`, `lodging`, `activities`, `shopping` u `other`; catálogo traducible |
| `occurredAt`, `day` | Instante ISO UTC y día en zona del viaje. Dominio comprueba consistencia; reglas comprueban tipo/formato/rango permitido, no implementan conversión IANA |
| `payerIds`, `payerAmounts` | Listas paralelas de longitud 1–10, IDs únicos, importes >0, suma exacta igual a total |
| `participantIds`, `shareAmounts` | Listas paralelas de longitud 1–10, IDs únicos, importes ≥0, suma exacta igual a total |
| `splitMode`, `weights` | `equal` con peso 1 para cada incluido; `percentage` con enteros 0–10.000 sumando exactamente 10.000 |
| `visual` | `null`, `{kind: icon, key}` o metadata Openverse; referencia opcional de miniatura mediante `attachmentId` |
| `status`, `mergedInto` | `active/deleted/merged`; destino solo para mergeHide, diferente a propia entidad |

Listas paralelas permiten validadores acotados de 10 posiciones en reglas; el dominio las transforma a estructuras cómodas sin cambiar el contrato. Las personas con 0% pueden figurar con cuota 0; al menos una tiene peso positivo. Pagadores y beneficiarios no necesitan ser el mismo conjunto.

Todos los IDs deben pertenecer al historial del viaje; un gasto nuevo solo incluye personas activas. En ediciones se permiten personas ya presentes en el snapshot padre aunque hayan sido revocadas; se pueden retirar, pero no añadir una persona revocada ajena al gasto. Los saldos históricos siguen perteneciendo a esas personas.

El motor recalcula cuotas desde pesos; un payload que no coincida se marca inválido y no entra en totales, incluso si llegó al caché. Las reglas deben verificar conservación y pesos exactos; verificar el algoritmo completo de restos mayores en reglas es una hipótesis pendiente de viabilidad (SEC-08). Si no se consigue, el proyector hace la verificación semántica y muestra el evento rechazado como incidencia; nunca acepta un saldo arbitrario.

## Otros snapshots

- **Settlement**: `fromPersonId`, `toPersonId`, `amount >0`, `occurredAt`, `day`, `note`, `status: active/deleted`. Personas distintas del viaje. Nuevo abono requiere ambas activas; editar conserva identidades históricas del padre. Todos los miembros activos pueden registrar/corregir con auditoría. Representa un pago declarado, no una transacción bancaria verificada. Borrar/corregir un abono también crea evento.
- **Budget**: `total: Money|null`, `lockedDays: [{day, amount}]`, `status: active`. Lista sin fechas repetidas y ≤366 entradas; días en rango. `total:null` implica lista vacía. Solo propietario cambia o resuelve presupuesto. Raíz creada atómicamente con viaje, incluso sin presupuesto. Los cupos automáticos son derivados; nunca se guardan como otro total editable.
- **DuplicateDecision**: raíz con dos IDs de gasto ordenados, revisiones vistas y `decision: distinct`; entidad raíz con ID propio. Nuevas revisiones de cualquiera invalidan esa supresión para la versión nueva. Decisiones repetidas idénticas no afectan dinero. Solo se crean para gastos existentes y distintos.

## Adjuntos y atribución

`attachmentId` UUID independiente. Campos: `expenseId`, `createdBy`, `createdAt`, `mimeType: image/webp`, `bytes` (Firestore Bytes, ≤40.960), `byteLength`, `width`, `height`, `sourceKind: photo/openverse`, `attribution: null/metadata`, `schemaVersion`. Excluir bytes y notas largas de índices. Las reglas comparan longitud real con declarada; no basta confiar en `byteLength`. El tipo Bytes sí tiene [size en bytes](https://firebase.google.com/docs/reference/rules/rules.Bytes). El decodificador comprueba formato y dimensiones; los permisos no inspeccionan píxeles. Topes propuestos de imagen: lado máximo 640 px, tipo decodificado WebP y tamaño final obligatorio.

Metadata Openverse: `id`, `title`, `source`, `foreignLandingUrl`, `creator`, `creatorUrl`, `license`, `licenseVersion`, `licenseUrl`, `thumbnailUrl`, `modified: true/false`. URLs https con límites y render seguro; la API no otorga permiso por sí sola. No se guarda HTML de atribución como HTML ejecutable.

Puede haber miniaturas históricas al cambiar foto, pero solo una seleccionada por revisión de gasto. No se borran automáticamente mientras un evento las referencia. Si aún no se sincronizó una miniatura, la referencia es válida con fallback; no impide registrar el gasto. Ver política de cuota/retención propuesta en [DECISIONS](DECISIONS.md).

## Consultas e índices previstos

Listado de viajes mediante consulta restringida a `memberBindings.<uid> == personId` no es práctico con claves variables para índices globales. Por eso `activeUids` es **espejo exacto de las claves de memberBindings validado en reglas**. Consultar `array-contains uid`, y filtrar/ordenar los pocos viajes localmente inicialmente. No consultar toda la colección esperando que las reglas filtren.

Viaje abierto: suscribir metadatos, personas/miembros y registro completo de eventos del viaje. No suscribir todas las fotos: obtener por ID cuando se necesita. La proyección necesita todo el registro, no solo los últimos gastos. Paginar descargas grandes manteniendo estado «datos incompletos» hasta completar y reconciliar con listener. Un filtro por timestamp recibido sin empates e IDs podría perder eventos; no se introduce como optimización inicial.

No se fijan índices compuestos hasta comprobar consultas reales; excluir payloads grandes y bytes de indexación. Medir lecturas y tiempo de proyección con 10.000 eventos como escenario de carga, sin afirmar capacidad ilimitada.
