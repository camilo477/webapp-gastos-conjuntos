# Decisiones y riesgos

## Fase 3 · Decisiones previas a implementar

- D-26: contrato financiero v2 para incluir `fixed`, con `weights: []` y cuotas
  explícitas conservadas exactamente. v1 se valida/migra de forma explícita,
  sin datos remotos ni cambios en las versiones de metadatos.
- D-27: 2–10 integrantes en los grupos de prueba; permitir 1–10 beneficiarios
  por gasto para que excluir participantes también funcione en grupos de dos.
- D-28: agregados BigInt ilimitados por el tope de cada movimiento; Number solo
  en DTO validados hasta 10^12. Salidas ordenadas ordinalmente por personId/día.
- D-29: input de entidades con revisión/estado o de eventos para proyección local
  conservadora (padres, snapshots, relojes y cabezas). Excluir conflictos,
  entidades inválidas/incompletas y propagar provisionalidad. Sin reconciliación
  distribuida, pares merge ni elección automática de una revisión ganadora.
- D-30: presupuesto reconstruido por fecha, preservando reservas manuales. Se
  distingue validación de una edición (rechaza reservas excesivas con datos
  completos) de proyección posterior (conserva la reserva y muestra déficit).
- D-31: motor aislado en Node con esquemas Zod según arquitectura acordada;
  formatos de fecha/importe estrictos y zona/reloj explícitos. No integración UI.
- D-32: proyección futura descuenta todo gasto conocido una vez y reserva solo
  la parte no consumida de cupos manuales futuros. Las asignaciones históricas
  se documentan como reconstrucciones, no como auditoría almacenada.
- D-33: validación pura de padres directos y tamaño UTF-8 de evento hasta 32 KiB.
  No constituye proyector DAG, autenticación ni garantía de reglas de servidor.
- D-34: una resolución admite snapshot activo o eliminado; una eliminación
  conserva el snapshot anterior. No se fuerza a restaurar al resolver un conflicto.

Fecha: 2026-11-21. «Base» significa indicado por el plan, no software ya implementado. «Propuesta» es una decisión de ingeniería/producto pendiente de ratificación; no representa aprobación del usuario.

## Registro de decisiones

| ID | Estado | Decisión y motivo |
| --- | --- | --- |
| D-01 | Base | React + TypeScript + Vite, CSS propio y Firebase Spark. Sin dependencias de pago obligatorias, Functions ni Storage. |
| D-02 | Propuesta para Fase 1 | Nombre de trabajo «Gastos compartidos»; confirmar nombre final antes de identidad visual/manifiesto. |
| D-03 | Propuesta para Fase 1 | Correo/contraseña para organizador, recuperación con Firebase y correo verificado antes de crear. Un solo proveedor inicial reduce flujos; Google puede sustituirlo si el usuario lo prefiere. |
| D-04 | Base + propuesta | COP inicial con pesos enteros, moneda única. Catálogo inicial propuesto COP/USD/EUR con exponentes explícitos; sin conversiones. |
| D-05 | Base | Invitados con Auth anónima persistente, sin correo; pérdida de navegador/dispositivo puede perder acceso. No vincular por nombre ni prometer recuperación. |
| D-06 | Propuesta | Invitación de 160 bits, 7 días, multientrada hasta capacidad, revocable. Código alternativo es tripId+token completo; un código corto requiere defensa de intentos adicional no incluida. |
| D-07 | Propuesta técnica | Join mediante batch ciego y mapa de máximo 10 bindings; no leer viaje privado antes de pertenecer. Prueba de reglas obligatoria SEC-03–SEC-05/SEC-09. |
| D-08 | Propuesta técnica | Una colección events y proyector DAG; vistas de gastos/abonos/presupuestos/conflictos derivadas. Evitar fuentes financieras divergentes. Validar viabilidad de reglas y convergencia. |
| D-09 | Base + propuesta | Dinero entero; BigInt intermedio; reparto por restos mayores y desempate por personId. Tope 10^12 por movimiento para persistencia segura y payloads acotados. |
| D-10 | Propuesta para Fase 1 | Cupos manuales reservados, redistribuir únicamente automáticos; déficit explícito, gastos nunca bloqueados por falta de presupuesto. Owner administra presupuesto. Ejemplos en CALCULATION_RULES. |
| D-11 | Base + propuesta | Una miniatura actual WebP ≤40 KiB por gasto, documentos separados y reintentos independientes. Conservar versiones históricas referenciadas; sin TTL automático ni originales. Compartir fotos previsto en Fase 7, sujeto a viabilidad de cuotas/reglas. |
| D-12 | Propuesta para Fase 1 | Cierre online solo owner; bloquea conflictos conocidos, permite deudas tras aviso. No promete detectar operaciones desconectadas. |
| D-13 | Pendiente antes de Fase 4 | ¿Permitir a owner resolver incidencias tardías en viaje cerrado, sin compras nuevas? Recomendación: sí, con resolución auditada y reglas específicas. Alternativa: conservar resumen provisional y conciliación externa. Hasta ratificar, no implementar excepción de escritura en cerrados. |
| D-14 | Propuesta técnica | Personas históricas separadas del UID actual; reasignar acceso requiere decisión explícita de owner, revocando UID anterior. Máximo 10 activos y tope propuesto de 1.000 personas históricas por viaje. |
| D-15 | Propuesta | Fechas, zona y moneda fijas desde creación. Título/destino/portada editables online por owner. Evita reasignación temporal de gastos; revisar si UX exige corregir fechas. |
| D-16 | Propuesta técnica | Caché multitab de Firestore + outbox propio mínimo por UID para conservar rechazos y evidencia de entrega. SW solo cachea shell/recursos públicos seleccionados. |
| D-17 | Propuesta técnica | Duplicados por heurística, nunca eliminación automática. Unificar con par atómico keep/hide; nuevas ramas reabren conflicto del grupo. |
| D-18 | Propuesta | Un viaje puede empezar con un solo organizador y permanece esperando invitados. Límite máximo incluye owner; no es máximo de diez invitados adicionales. |

## Ratificación antes de wireframes

Actualización 2026-11-22: el usuario acepta provisionalmente Fase 1 y autoriza
Fase 2. Esto habilita la base técnica, sin ratificar automáticamente todas las
propuestas de producto ni aprobar pruebas multiplataforma pendientes.

Presentar las propuestas anteriores al usuario con los diseños concretos. Priorizar nombre, método de cuenta, catálogo monetario, política de cupos manuales, acceso perdido/reasignación y comportamiento de cierre. No bloquear la redacción documental esperando esos datos; no presentar una propuesta como decisión ya tomada.

## Política de imágenes y capacidad

Retención propuesta: no borrar automáticamente fotos referenciadas por historial; caducidad de invitaciones por reglas sin necesidad de purga. Exponer consumo y permitir desactivar nuevas fotos cuando el uso real no deje margen. El umbral exacto y mantenimiento requieren definir operación del proyecto antes de Fase 7; la aplicación no puede medir de forma confiable toda la cuota desde un cliente sin permisos de administrador.

No introducir un límite visual de fotos como si fuera garantía global de almacenamiento. Las cuotas son compartidas por todos los viajes. Si fotos compartidas no son sostenibles en Spark, presentar cambio a iconos/foto solo local o posponer a 1.1 antes de cambiar alcance; nunca activar Blaze automáticamente. Las miniaturas históricas cuestan espacio aunque solo una esté seleccionada.

## Riesgos y validación necesaria

| Riesgo | Impacto | Respuesta y puerta |
| --- | --- | --- |
| Invitado necesita leer documento privado para hacer join | Bloqueo funcional o filtración | Batch ciego con control de estado en reglas; SEC-03 antes de Fase 4 |
| Alta 11 por carrera, caminos owner/rebind desprotegidos | Acceso fuera de alcance | Un mapa autoritativo acotado, espejos atómicos y pruebas adversariales SEC-04/05 |
| Tokens compartidos/abuso anónimo/cuotas | Servicio indisponible | Alta entropía, caducidad, revocación, uso privado y medición. No garantía de rate limit por IP ni de humanidad |
| Validador acotado excede expresiones/accesos de reglas | Diseño no implementable tal cual | PoC de 10 participantes, 2 padres y merges en SEC-08/09; simplificar contrato o revisar arquitectura sin rebajar silenciosamente garantía |
| Convergencia y grupo de duplicados incompletos | Dinero perdido/doble conteo | Inmutabilidad, mismos IDs, proyección determinista, conflictos de componente y SYNC/DUP con permutaciones |
| Caché parcial, expulsión de IndexedDB o cambio de origen | Datos incompletos/acceso perdido | Etiquetas, outbox, gestión de errores y reinvitación; QA móvil real |
| Cuotas fotos/lecturas por registro completo | Límite Spark alcanzado | Fotos bajo demanda, 40 KiB, índices exentos, medir 10.000 eventos y no prometer escala ilimitada |
| Cierre compite con eventos o dispositivo offline | Resumen tardíamente provisional | No prometer barrera global desde cliente; ratificar D-13, conservar rechazos |
| Participante revocado mantiene copia local | Privacidad posterior a descarga | Explicar limitación, aislar usuarios y bloquear servidor; SEC-10 |
| Openverse o URL de origen falla, licencia incompleta | Foto ausente/atribución incorrecta | Persistir metadata, fallback local y verificación real de integración en Fase 7 |

## Revisión de esta fase

Se inspeccionó la carpeta, se leyó la fuente íntegra y se verificaron fuentes oficiales de servicios. No había aplicación, rama ni cambios Git que revisar. La fuente se copió sin editar a docs.

Gemini CLI está instalado. Se intentó revisión de arquitectura en modo no interactivo `--approval-mode plan`, sin extensiones, con un resumen genérico sin secretos ni código de empresa. No produjo revisión: terminó por falta de `GEMINI_API_KEY`. No se modificó autenticación ni se reintentó. **Gemini fue omitido por falta de autenticación**; no se atribuyen hallazgos a Gemini.

Revisión propia: se eliminó el join que requeriría leer trip antes de ser miembro; se separó identidad contable del UID; se fijó moneda/zona/fechas para no recalcular agrupaciones de forma implícita; se especificó read-back para reintentos rechazados por inmutabilidad; se distinguieron cuotas reservadas de dinero realmente disponible y se registraron las limitaciones de cierre/caché. Estos razonamientos no sustituyen pruebas de implementación.

Validación documental ejecutada con Python: 12 archivos Markdown (README, plan fuente y 10 documentos de especificación), enlaces locales existentes, bloques de código cerrados, 17 requisitos RF consecutivos y 60 casos de prueba definidos. Se comprobó correspondencia de referencias del PRD con IDs de casos. Cero incidencias en esa comprobación. La copia del plan coincide byte a byte con el original; SHA-256 `455b9c3d7ba9be0cffb746142418bbd6a39afce7d7c59f81978899cceb804605`.

En Fase 0 no se ejecutaron Vitest, Playwright, emuladores ni pruebas físicas;
las referencias se consultaron documentalmente. Este párrafo es histórico.
Git está ahora inicializado y el commit inicial `07ce6ef` publicado. El estado
de las suites nuevas está en [Fase 2](phase2/REPORT.md).

## Decisiones técnicas de Fase 2 (2026-11-22)

- D-19: Firebase 12 por compatibilidad con `@firebase/rules-unit-testing` 5;
  SDK 13 no satisface su peer dependency. Node 24 LTS (mínimo 24.12) por los
  engines de dependencias transitivas. Vite 8, React 19 y TypeScript 5.9 estricto.
- D-20: demo por defecto; SDK diferido solo en desarrollo con emuladores,
  proyecto `demo-` y loopback. Reglas deny-all hasta Fase 4. No existe conexión
  productiva habilitada ni persistencia financiera en la base.
- D-21: `react-router-dom` para rutas reales y navegación accesible. CSS propio
  conservando tokens/geometría del prototipo; fixtures de presentación separados.
  Sin estado global de producto ni bibliotecas visuales adicionales.
- D-22: Workbox precache estático con fallback SPA, actualización por confirmación
  y ninguna runtime cache. Dos builds reales en E2E verifican cambio de versión.
- D-23: no implementar todavía el contrato `fixed` pendiente de UX-D01.
  No crear módulos vacíos de dominio, sincronización o adjuntos.
- D-24: override exacto `@grpc/grpc-js` 1.14.7, misma versión mayor, corrige los
  avisos altos que la dependencia `~1.9.0` del SDK retenía. Se valida con las
  pruebas de reglas. No aplicar degradaciones ni upgrades mayores automáticos
  del CLI/Workbox para silenciar avisos moderados de herramientas.
- D-25: fijar `@firebase/app` 0.16.2 y `@firebase/app-compat` 0.5.18, las versiones
  del SDK 12.19.0 elegido. Sus peers `0.x` permitían mezclar paquetes core/compat
  de la línea posterior; la prueba real falló con `firestore is not a function`.
  El lockfile conserva una sola instancia consistente de cada paquete.
