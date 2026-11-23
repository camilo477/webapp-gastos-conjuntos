# Offline y sincronización

## Responsabilidades de persistencia

El service worker conserva el shell y recursos locales. Firestore mantiene caché de datos utilizados; IndexedDB propio mantiene outbox y borradores por `(proyecto, uid, tripId)`. No guarda otro saldo ni reemplaza el registro financiero. En dispositivo compartido se ofrece sesión sin persistencia y se explica que no sobrevive offline a una recarga. Ver límites verificados en [SERVICE_LIMITS](SERVICE_LIMITS.md).

Un viaje se considera descargado después de recibir metadatos, personas y registro completo desde servidor y construir la proyección. Tener algunos gastos en caché no basta. Cuando solo hay datos parciales, mostrar lo disponible con esa etiqueta y no un total definitivo. Persistencia fallida, cuota de disco o expulsión de caché deben producir estado visible. Ningún almacenamiento de navegador constituye copia de seguridad garantizada.

## Ciclo de una operación

1. Leer la revisión o conjunto de revisiones desde la proyección. Validar el formulario y calcular pesos/cuotas con el motor compartido.
2. Generar una sola vez `operationId`, payload, padres y reloj lógico. Guardar operación completa en una transacción IndexedDB. Solo entonces mostrar «Guardado en este dispositivo» y aplicar la proyección optimista.
3. Enviar creación inmutable a Firestore; si se opera sin red, la escritura queda pendiente. No esperar a una promesa de commit remoto para desbloquear el formulario offline.
4. Listener con metadata distingue pendiente local (`hasPendingWrites`) y datos de caché (`fromCache`). Mostrar «Sincronizado» solo con confirmación remota y sin incidencias de proyección; `navigator.onLine` es apenas una pista.
5. Mantener outbox hasta confirmar mismo ID y contenido canónico desde servidor. Después se puede retirar su copia de transporte: el evento queda en Firestore y su caché.
6. Reintentar con el mismo ID, nunca generar otra operación por timeout. Si el servidor ya tiene ese ID, verificar contenido semántico (sin comparar timestamp servidor con el sentinel local). Igual: confirmado; diferente: error de integridad visible, no sobrescribir.

Las reglas permiten **create, no update**. Repetir `setDoc` sobre un evento existente puede recibir permission-denied; no se considera éxito solo por ese error. Si el miembro aún tiene acceso, una lectura de servidor comprueba identidad y payload. Si ya no tiene acceso, se conserva estado no confirmado sin afirmar entrega. La idempotencia de aplicación es por ID, no por nombre o hash del gasto.

El reenvío de cola y Firestore pueden coincidir; un coordinador por pestaña, bloqueo renovable y avisos entre pestañas reducen trabajo redundante. La corrección sigue dependiendo del mismo ID y eventos inmutables, aunque dos pestañas envíen a la vez. Cancelar una escritura local ya encolada no equivale a deshacer: una eliminación posterior es otro evento.

## Errores y reconexión

| Estado | Tratamiento |
| --- | --- |
| Sin red / unavailable | Conservar, reintento con backoff y jitter, al reanudar pestaña o evento online |
| Cuota Firestore agotada | Error explicativo; conservar y espaciar reintentos, sin elevar a Blaze automáticamente |
| Autenticación vencida | Intentar renovar credenciales; si falla, pedir acceso sin descartar cola |
| Permiso revocado / viaje cerrado | No reintentar indefinidamente; conservar propuesta rechazada y opción de copiar/exportar localmente |
| Payload inválido / versión desconocida | Incidencia visible y corrección mediante nueva propuesta; no cambiar una operación ya confirmada |
| Foto fallida | Cola de adjunto aparte; dinero sigue confirmado |
| Error IndexedDB | No afirmar guardado durable; mantener formulario y permitir copiar datos antes de salir |

«Sincronizar ahora» revisa estado, reanuda reintentos y espera confirmaciones razonables con posibilidad de cancelar espera. No llama `clearIndexedDbPersistence` ni usa `waitForPendingWrites` como espera infinita offline. La PWA cerrada/suspendida no garantiza trabajo en segundo plano.

## Grafo de revisiones y proyección

Fuente: todos los eventos válidos por `(tripId, entityKind, entityId)`. Orden de recepción y de iteración no decide resultados. Validar esquema, existencia de padres, identidad de entidad, antes/después, reloj y semántica monetaria. Un padre pendiente local puede proyectarse de forma tentativa; para sincronizar cadenas, escribir raíz/ancestros antes de hijos o en batch pequeño comprobado con `getAfter`.

- Raíz única: evento create, sin padres, `operationId == entityId`.
- Cabezas: eventos que ningún otro evento válido de la misma entidad referencia como padre. Un padre que aún no se ha descargado marca datos incompletos, no nueva raíz.
- Una cabeza y cadena válida: snapshot efectivo de esa cabeza, salvo delete/merged.
- Varias cabezas: conflicto. Ninguna se elimina por mayor `receivedAt`, `authoredAt`, UID o reloj. El gasto se excluye del subtotal validado y se marca el balance como provisional.
- Snapshot inválido: conservar evento y señalar incidencia. No promover descendientes de un padre inválido a estado definitivo; requieren revisión/corrección explícita. No ocultar el fallo usando solo el último snapshot válido.
- Resolver: el usuario compara dos cabezas y crea un evento con ambos padres y payload completo elegido/editado. Con más de dos cabezas se resuelve por pares hasta cubrirlas; mientras quede otra, sigue conflicto. Una resolución sobre ancestros no relacionados con todas las cabezas no las consume.

Ejemplo: raíz R por 100; A y B editan offline sobre R a 120 y 90. Llegan A y B: cabezas `{A,B}`, no total 120 ni 90 definitivo. Resolución C con padres A/B y total revisado 110: una cabeza C. Si aparece D sobre R más tarde: cabezas `{C,D}`, vuelve conflicto. Se preservan las cinco propuestas y todos ven el mismo resultado con el mismo conjunto.

Un mismo miembro puede resolver conflictos de gastos/abonos; presupuesto solo propietario. Dos resoluciones concurrentes son otras ramas, sin tratamiento privilegiado. La vista de auditoría muestra padre(s), autor UID/persona, fecha lógica, fecha recibida y diferencias antes/después. No atribuye automáticamente un evento remoto al nuevo titular de un nombre.

## Duplicados y unificación

Normalizar título con trim, Unicode normalizado, case folding y espacios consecutivos. Candidato propuesto si coinciden total, día del viaje, conjunto de pagadores e importes, y diferencia de ocurrencia ≤5 minutos; el título debe coincidir normalizado. Son heurísticas de UI, no identidad contable. Horas incorrectas pueden causar falsos positivos/negativos.

Mientras son candidatos, ambos gastos siguen contando: aún podrían ser dos compras reales. Ofrecer «Son distintos» y «Unificar», con comparación de montos, pagadores, cuotas y fotos. «Son distintos» registra decisión inmutable ligada a ambas revisiones. Un cambio posterior vuelve a evaluar; ninguna decisión suma dinero.

«Unificar» elige explícitamente un gasto superviviente y su contenido final; **no suma automáticamente los dos importes**. Crear dos eventos en el mismo batch, con IDs conocidos previamente:

1. `mergeKeep` sobre la revisión del superviviente, payload final y referencia al evento compañero.
2. `mergeHide` sobre la revisión del duplicado, conservando su snapshot y marcando mergedInto al superviviente.

Ambos llevan `mergeId` compartido y referencias recíprocas. Las reglas exigen contraparte mediante `getAfter`, mismo autor/viaje, roles complementarios, entidades distintas y correspondencia de destino. No permiten ocultar sin compañero. El proyector comprueba el par completo y sus revisiones antes de aplicar efecto: exactamente un gasto activo. Ambas entidades deben tener una cabeza no conflictiva y no formar ciclo/cadena ambigua.

Si se edita una rama antigua, si llegan dos unificaciones incompatibles o si alguien borra/restaura parcialmente un gasto ya unificado, el componente de gastos conectado queda en conflicto y fuera del subtotal validado hasta resolución conjunta. Nunca se resucita silenciosamente un duplicado. La resolución de un grupo también se publica como pares coherentes; mientras una entidad esté en conflicto el grupo sigue provisional. No se ofrece deshacer unificación como simple toggle en el MVP.

Si la contraparte todavía no se ha descargado, marcar proyección incompleta; no aplicar medio par. Probar específicamente intercalados de listeners y batch remoto. El diseño de pares y ciclos requiere prueba de concepto antes de la Fase 6; no basta el historial individual de cada gasto.

## Sesión, acceso y cierre

Cerrar sesión requiere informar si quedan cambios y confirmar descarte local si el usuario elige borrar. No subir cola de un UID con credenciales de otro. Finalizar listeners, aislar datos y limpiar las cachés de usuario cuando proceda; coordinar otras pestañas para no volver a mostrarlos. No prometer que signOut por sí solo borra Firestore persistente.

Revocación en servidor no borra datos descargados previamente. Al detectarla, bloquear operaciones nuevas del viaje y retirar la vista privada; las propuestas locales pendientes se preservan para el usuario con explicación. Una reinvitación no reasigna automáticamente esos eventos a otra persona.

Cierre online: propietario descarga registro actual, comprueba ausencia de incidencias conocidas y escribe estado closed con revisión de metadatos. Las reglas rechazan nuevos eventos contra viaje cerrado. Un evento puede confirmarse justo antes del cierre y llegar después al listener: reconstruir resumen hasta tener snapshot actual. El cliente no garantiza haber detectado cambios simultáneos ni colas de otros dispositivos; el resumen es derivado y puede mostrar incidencia tardía.

Para resolver una incidencia descubierta después del cierre se propone permitir únicamente eventos `resolve` y pares de reconciliación por el propietario online, con auditoría y resumen marcado provisional hasta terminar. No se admiten nuevas compras/abonos corrientes ni reapertura automática. Esta excepción necesita ratificación y pruebas dedicadas; alternativa conservadora: informe provisional y conciliación fuera de la app. No se declara un cierre libre de conflictos garantizado globalmente sin coordinador confiable.

## Implementación verificada de Fase 6

El detalle ejecutable y las fronteras de servidor/proyector están en
[el informe de Fase 6](phase6/REPORT.md). IndexedDB propio conserva snapshots y
outbox por proyecto/UID; Firestore permanece en memoria. Reintentos usan IDs
inmutables, read-back canónico y leases entre pestañas. La cola se ejecuta solo
mientras la aplicación está abierta. Borradores explícitos de gastos no son
operaciones; almacenamiento local no equivale a copia de seguridad permanente.

La primera habilitación de merges v2 añade reafirmación de superviviente eliminado:
un par coherente puede conservar `mergeKeep` con snapshot `deleted`, con costo cero.
Esto evita resucitar el duplicado después de una eliminación explícita. Una
restauración requiere revisión activa y reafirmación del par. La estructura v2 no
cambia; lectores anteriores deben actualizarse para estas acciones, que Fase 5 no
permitía persistir. Continúan bloqueados cierre, recuperación/reasignación de identidad,
fotos y producción. La excepción propuesta para conciliar después del cierre no
está habilitada.

## Adjuntos habilitados en Fase 7

La restricción histórica sobre fotos corresponde a Fase 6; Fase 7 habilita
miniaturas sin habilitar producción/cierre/identidades. IndexedDB v3 añade
attachments con estados pending/sending/error/rejected/confirmed, revisión asociada,
backoff y lease entre pestañas. Proyecto/UID/viaje/ID aíslan cada propuesta. Se
preserva el evento si falla IDB de imágenes; reintentar imagen no repite el gasto.
Crear fotos locales, comprimir y recuperar borradores funciona offline; Openverse,
confirmaciones y descargas nuevas requieren internet. Bytes históricos permanecen;
SW no cachea documentos privados. [Arquitectura y pruebas](phase7/REPORT.md).
