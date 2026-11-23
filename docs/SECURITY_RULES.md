# Propuesta de reglas y fronteras de seguridad

Fase 4 implementa `firestore.rules` y prueba acceso, creación, join y revocación
en Firebase Emulator Suite. No se han desplegado reglas ni conectado producción.
Fase 5 permite gastos, abonos y revisiones budget v2 inmutables, con padres directos,
conservación y autor real. Adjuntos, cierre, reasignación y unificaciones siguen
denegados. La especificación completa de fases futuras se conserva abajo; las
[garantías efectivas y límites de Fase 5](phase5/REPORT.md) distinguen servidor
y proyector. Ver
[informe y límites de evaluación](phase4/REPORT.md). Denegación por defecto.

## Acceso y operaciones

| Recurso | Lectura | Escritura |
| --- | --- | --- |
| users/uid | Titular | Titular con campos mínimos; ningún campo concede roles |
| trips/id | Miembro activo, listado con restricción demostrable al propio UID | Crear propietario permanente verificado; actualizar propietario o camino especial de join acotado |
| members, people | Miembros activos; miembro puede consultar su propio estado de acceso | Altas/bajas/vinculación atómicas; perfil propio acotado o administración por propietario |
| invites/token | Propietario para gestión; invitado autenticado solo get exacto vigente | Propietario, revocación monotónica, sin cambiar token ni ampliar caducidad existente |
| invites (list) | Solo propietario | Sin acceso público ni listado por invitados |
| events | Miembros activos | Solo create validado, nunca update/delete; presupuesto solo propietario |
| attachments | Miembros activos, preferentemente get por ID | Solo create acotado por miembro; no modificaciones/borrados ordinarios de miniaturas históricas |

Rol se determina por `trip.ownerId`, UID y `memberBindings`, no por nombre visible, ruta elegida o un campo de perfil controlado por el cliente. El propietario no puede eliminar su propia membresía ni cambiar propietario en el MVP. No se conceden lecturas globales a todas las identidades anónimas.

Las consultas de viajes necesitan condición `array-contains` en `activeUids` del propio UID; reglas validan el espejo y pueden autorizar la consulta con esa pertenencia. Una colección no autorizada no se vuelve segura filtrando datos en React.

## Incorporación sin filtrar información privada

Invitación: token criptográfico de 128 bits mínimo (propuesta 160 bits, Base32), caducidad inicial 7 días, multientrada hasta capacidad, revocable. QR se genera localmente. Enlace propuesto `/join#<tripId>.<token>`; código manual es ese mismo par completo, agrupado para lectura. No ofrecer código corto de seis dígitos sin mecanismo servidor de limitación de intentos.

El token es secreto de acceso. No se almacena en analytics ni logs; se elimina de URL al consumirlo y no se adjunta como query a imágenes externas. Metadatos de invitación no contienen título ni personas. Get exacto requiere Auth (anónima sirve), `revoked == false` y `request.time < expiresAt`; el propietario conserva acceso a invitaciones expiradas para gestión. Caducidad en reglas, sin depender de borrado TTL ni reloj del cliente.

El invitado **no lee el viaje antes de entrar**. Tras autenticar, envía batch ciego que:

1. Añade únicamente `memberBindings[uid] = uid` usando FieldPath seguro, agrega uid a `activeUids` y `participantIds`, incrementa `membershipVersion` y actualiza timestamp.
2. Crea members/uid activo con `personId=uid`, rol member, nombre, token y hora servidor.
3. Crea people/uid con identidad/nombre iniciales.

Reglas de trip comparan `resource` con `request.resource`: solo esos campos cambian; el solicitante no existía ni tenía perfil revocado; diferencia de claves exactamente `{uid}`; todos los bindings previos conservados; valores de persona únicos; número final ≤10; `activeUids` coincide como conjunto con claves sin repetidos; `participantIds` solo agrega esa persona; versión +1. Validan perfil/persona con getAfter e invitación con get, sin que el cliente necesite leerlos previamente.

Reglas de members/people exigen contraparte trip posterior y alta propia coherente. **También comprobar la transición anterior** (UID ausente en bindings previos y perfil no existente), no basta pertenecer al estado posterior: de lo contrario podría crearse un perfil extra o reactivarse un revocado. Todas las rutas deben rechazar un alta independiente que no actualice el control de capacidad. La creación inicial de owner es un camino separado con batch de viaje, miembro, persona y raíz budget.

Dos altas compiten con nueve miembros: se evalúa el estado resultante de cada commit; solo cabe una. No se usa un contador cliente ni se obtiene el tamaño de una subcolección. Una misma persona física puede crear varias cuentas: las reglas limitan diez identidades vinculadas, no demuestran diez humanos distintos. El organizador controla usos indebidos por revocación.

## Revocación y reinvitación

Solo propietario puede quitar un binding, actualizar activeUids y marcar members/uid revoked en la misma transacción. Mantener participantIds, people y eventos. Prohibir cambiar otros bindings incidentalmente. Un usuario revocado no puede usar una invitación común para reactivar ese UID por sí mismo.

Reasignación por propietario: comprobar identidad fuera del nombre, revocar UID antiguo, vincular UID nuevo a `personId` histórico y crear/actualizar el perfil autorizado en el mismo commit. No reasignar a una persona ya vinculada a otro UID activo ni crear dos bindings al mismo personId. Requiere conexión y una solicitud/UID nuevo conocido; un código de invitación común no concede reclamar una persona previa. La eliminación de cachés ya descargadas en otro dispositivo no puede garantizarse.

## Validación de eventos

- Autor UID igual a request.auth.uid y personId igual al binding activo actual; recepción igual a request.time. El payload no puede elevar roles.
- Esquema/campos permitidos, enums, límites numéricos y de texto y arrays paralelos. Acotar tamaño mediante límites de cada campo; `map.size()` cuenta campos, no bytes serializados. IDs de viaje/persona válidos.
- Create raíz con ID de entidad igual al ID de operación, sin padres, reloj cero. Budget solo en budgetEntityId. Para reemplazo/borrado, padre existente de misma entidad, before exacto y reloj+1. Resolución dos padres distintos y reloj máximo+1.
- Validar padres con lecturas directas; para pares/chains atómicas usar getAfter cuando corresponda. Impedir referencias cruzadas de viaje/tipo y ciclos por reloj estrictamente creciente.
- Pagadores/participantes entre 1 y 10, IDs sin repetidos, importes enteros, `suma(aportes) == total == suma(cuotas)`. Validadores explícitos hasta 10 posiciones, con guardas por tamaño. Reparto porcentual suma exactamente 10000; igual usa peso 1.
- Personas nuevas deben estar activas. En edición permitir únicamente activos o personas ya incluidas en padres; validar conjuntos explícitamente.
- Abono con personas distintas, importe positivo y status permitido; nunca permitir actualizar un documento de «saldo».
- Budget: propietario, total entero/null y lista acotada. Validación semántica completa de fechas/reservas y algoritmo de reparto en proyector compartido; no suponer bucles arbitrarios disponibles en reglas. Contenido inválido produce incidencia visible, no presupuesto definitivo.
- Unificación: counterpart getAfter, referencias recíprocas, IDs de entidades distintos, mismo mergeId/autor/viaje y roles complementarios. No confiar en un simple mergedInto sin pareja.

Reglas comprueban seguridad y conservación local. No pueden descubrir todas las cabezas del grafo, duplicados globales ni validar zona IANA. El proyector verifica semántica completa y no trata payloads remotos como cálculos confiables. Si una garantía de servidor requerida no cabe en reglas, se documenta y revisa arquitectura antes de implementar, no se sustituye por validación visual.

## Viajes cerrados

Evento ordinario requiere trip activo al commit, incluso si se originó offline. Cierre por owner y revisión de metadatos, no por anónimo. Propuesta excepcional pendiente: owner puede crear únicamente resoluciones/reconciliaciones sobre entidades existentes después de cierre. Si se ratifica, reglas necesitan camino explícito que no permita create raíz ni nuevas compras/abonos bajo la etiqueta resolve. El servidor no garantiza inexistencia de colas desconectadas ni de ramas aún desconocidas por el cliente de cierre.

## Adjuntos y abuso

Rechazar bytes mayores a 40.960, tamaño declarado distinto de longitud real, metadata excesiva, tipos/formatos de campos no admitidos y gasto de otro viaje. MIME declarado no prueba contenido; decodificación y reencodificación local eliminan originales/EXIF y rechazan archivos no soportados. No persistir una foto como parte del evento monetario. Reintentar adjunto sin generar un segundo gasto.

Spark sin backend no ofrece rate limiting robusto por IP en reglas ni verificación de humanidad. Se propone limitar exposición de enlaces, caducidad y miembros, payloads pequeños, paginar búsquedas y observar uso. App Check puede evaluarse después, con compatibilidad PWA/offline y cuotas del proveedor verificadas; no se cuenta como garantía existente ni sustituto de Auth. Un miembro autorizado puede agotar cuota escribiendo eventos: riesgo residual explícito para uso privado.

## Presupuesto de evaluación y puertas técnicas

Fuentes y límites: [condiciones de reglas](https://firebase.google.com/docs/firestore/security/rules-conditions) y [límites Firestore](https://firebase.google.com/docs/firestore/quotas). Diseñar ≤10 lecturas por operación y ≤20 por batch, además de respetar límites de expresiones y tamaño compilado. No asumir que las lecturas repetidas serán cacheadas para justificar el límite.

Estimar caso peor de join: regla trip lee invitación y member/person posteriores (3); regla member lee trip previo/posterior e invitación (3); regla person lee trip previo/posterior y member posterior (3): objetivo 9 accesos, sin contar caché. Crear viaje con budget raíz y pares de merge necesitan presupuestos separados. Cada validación debe medirse con reglas reales; el esquema no demuestra que compile o admita todos los casos de diez personas.

Probar clientes maliciosos directamente contra SDK/REST en emuladores: bypass de formulario, altas parciales, rol owner falso, campo adicional, lista repetida, abono incoherente, update/delete de eventos y parent inexistente. No se autoriza despliegue hasta que estas pruebas y las carreras de capacidad pasen.


## Cotas de acceso verificadas · Fase 4

La estimación original de nueve accesos para join era un objetivo de diseño.
La implementación agrega comprobaciones explícitas de inexistencia y contrapartes:
crear viaje usa una cota de **17 invocaciones** de acceso (6+4+4+3 por write),
join **15** (5+5+5), revocación **9** (4+5, contando evaluación de ramas fallidas).
Cada operación queda por debajo de 10 y cada commit de 20 **sin descontar caché**.
Metadatos: 0; crear invitación: 2; revocarla: 1. Las lecturas cliente de la
transacción son peticiones separadas, no nuevas llamadas get/getAfter de reglas.
El informe diferencia esta revisión estática conservadora de la cobertura real
del emulador, que no proporciona una traza por petición de accesos facturados.

La creación valida el documento completo. Las actualizaciones preservan campos
inmutables mediante diff/affectedKeys y validan los campos modificados y espejos;
no vuelven a evaluar calendarios inmutables. Esto corrigió un exceso inicial de
1.000 expresiones en revocación sin suprimir controles de autorización/coherencia.
Los casos positivos con diez miembros y todos los ataques se ejecutan contra las
reglas finales. Estos presupuestos no cubren todavía merges ni padres financieros.

## Reglas implementadas en Fase 6

Los pares merge v2 exigen `getAfter`, referencias recíprocas, roles complementarios,
mismo autor/recepción y contraparte inexistente antes del commit. Cada mitad debe
superar sus reglas y hereda dinero de su padre v2. Distinct referencia revisiones
de dos gastos del mismo viaje. Se mantienen denegación por defecto, inmutabilidad,
bindings activos y presupuesto solo propietario. Cabezas actuales, ciclos y
componentes incompletos se comprueban en el proyector, sin presentar esa comprobación
local como autorización del servidor. Pruebas adversariales y límites medidos:
[informe de Fase 6](phase6/REPORT.md).
