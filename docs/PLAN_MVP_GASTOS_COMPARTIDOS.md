# PWA de gastos compartidos — Especificación del MVP v0.1

**Estado:** propuesta técnica inicial, lista para revisión y para diseñar antes de programar.  
**Plataformas:** Android, iOS y escritorio mediante PWA.  
**Modelo de negocio:** privado al inicio, preparado para ampliarse; sin servicios de pago obligatorios.

## 1. Objetivo

Que un grupo de entre 2 y 10 personas lleve las cuentas de un viaje o salida de forma rápida, incluso sin conexión. El organizador crea la sesión con una cuenta recuperable; los invitados entran con QR o enlace/código, eligen nombre y conservan acceso en su dispositivo sin registrar correo. En línea se sincronizan las operaciones entre participantes. El total, las participaciones y las deudas se recalculan automáticamente.

## 2. Alcance funcional del MVP

### Autenticación e invitaciones
- Organizador con cuenta permanente (correo/contraseña o Google; elegir uno antes de implementar).
- Participante invitado: autenticación anónima de Firebase ligada a su dispositivo + nombre visible, sin contraseña obligatoria.
- QR con enlace de invitación de alta entropía y caducidad; código alternativo. El primer ingreso requiere internet.
- El organizador puede invalidar enlaces. Protección mediante reglas Firestore; lectura privada para miembros.
- Máximo 10 miembros reales por sesión, reforzado en servidor/reglas, no solo en interfaz.
- Advertir al invitado que borrar datos del navegador o cambiar dispositivo puede hacerle perder su acceso anónimo; puede volver a unirse con invitación vigente. No prometer recuperación automática.

### Viajes/sesiones
- Crear viaje o salida con nombre, destino opcional, fecha inicio/fin, zona horaria, moneda única (COP predeterminado), participantes y portada opcional.
- Un viaje activo destacado; historial de viajes finalizados, que permanecen consultables.
- Una sesión de un día y una de varios días usan el mismo modelo.
- Cerrar viaje con pantalla de resumen. Para conservar auditabilidad, los cierres no borran historial.

### Gastos y movimientos
- Nombre, monto positivo, categoría, fecha/hora, nota opcional, imagen/icono/foto opcional.
- Uno o varios pagadores; la suma de sus aportes debe igualar el total.
- Reparto igualitario predeterminado entre quienes participan en el gasto.
- Posibilidad de excluir participantes (0%) y personalizar porcentajes con suma exacta de 100%.
- Dinero en unidades enteras menores; para COP usar pesos enteros. Redondeo determinista y distribución del sobrante para que la suma de cuotas siempre sea el gasto exacto.
- Transferencias o abonos entre personas reducen el saldo pendiente sin modificar el costo del viaje.
- Todos pueden editar o eliminar lógicamente gastos; cada cambio genera una entrada inmutable en el historial con autor, fecha lógica, antes/después.
- No borrar silenciosamente operaciones para resolver conflictos.

### Presupuestos y estadísticas
- Presupuesto total opcional y distribución inicial por día; cada día se puede personalizar.
- Mostrar gastado del día, cupo del día, presupuesto total usado y disponible.
- Si un día excede su asignación, recalcular el saldo disponible en días futuros, distribuyendo por igual cuando no existan topes manuales; explicitar reglas de presupuestos bloqueados y casos sin saldo.
- Ejemplo: $400.000/4 días = $100.000/día. Si el primer día se gastan $250.000, quedan $150.000; propuesta automática: $50.000/día para los 3 restantes.
- Estadísticas básicas: por día, categoría, participante; balance de pagos y repartos.

### Imágenes
- Iconos/ilustraciones livianos siempre disponibles sin conexión.
- Búsqueda online de imágenes abiertas a través de Openverse (sin credenciales para uso anónimo); respetar licencia y atribución. Al guardar una selección, persistir fuente, creador y licencia.
- Capturar o seleccionar una fotografía; para un MVP sin facturación, permitir **una miniatura comprimida** por gasto (por ejemplo WebP <= 40 KiB), guardada en un documento Firestore separado y no en el documento principal del gasto. Advertir que no se conserva el original en máxima calidad. La versión local funciona offline y la sincronización del adjunto es eventual.
- No usar Firebase Cloud Storage en plan Spark; en 2026 requiere Blaze. Diseñar una interfaz de adjuntos para poder migrar luego a almacenamiento en Raspberry/otro servicio.
- Si una foto falla, el gasto monetario debe seguir guardándose.

### Experiencia offline y sincronización
- Cachear shell de la PWA (HTML/JS/CSS/iconos) mediante service worker.
- Persistencia IndexedDB de Firestore para gastos y sesiones previamente abiertas; habilitar cache multitab si corresponde.
- Crear/editar/eliminar lógicamente gastos, calcular balances y navegar datos descargados sin conexión.
- Indicadores: sincronizado / sin conexión / cambios pendientes / error / conflicto.
- Reintentar automáticamente al reconectar y ofrecer «Sincronizar ahora» como acción auxiliar. No prometer sincronización si el navegador/PWA está cerrada.
- Crear/join de sesión, invitaciones y otros flujos que necesitan validación central requieren conexión.
- NO depender exclusivamente de la resolución last-write-wins de Firestore para datos financieros.
- Diseñar un registro inmutable de operaciones con ID único (idempotencia) y revisión base para detectar modificaciones concurrentes. Si dos usuarios modifican el mismo gasto desde revisiones incompatibles, conservar ambas propuestas y marcar conflicto para revisión. Mientras tanto, mostrar el saldo como provisional si depende de ese gasto.
- Dos gastos distintos con el mismo nombre («Café») no son necesariamente duplicados. Detectar candidatos por nombre normalizado, monto, día, pagador y proximidad temporal; permitir «Son distintos» o «Unificar» sin borrar auditoría y sin contar dos veces el mismo gasto.
- Evitar transacciones Firestore que deban ejecutarse offline; usar operaciones/batches compatibles y reconciliación al volver a estar online.

## 3. Reglas de cálculo (tests obligatorios)

- Para cada gasto: `suma(aportes_pagadores) == total == suma(cuotas_participantes)`.
- Saldo por usuario = `total_pagado_en_compras - cuotas_asignadas + transferencias_enviadas - transferencias_recibidas`.
- Un saldo positivo representa dinero a recibir, negativo dinero a aportar; `suma(saldos) == 0`.
- Ejemplo 2 participantes: gasto $200.000, A aporta $150.000 y B $50.000, reparto $100.000 c/u -> A +$50.000, B -$50.000: B transfiere $50.000 a A.
- Reparto impar: $100 entre 3 -> $34, $33, $33, estable, reversible y sin crear ni perder dinero.
- Repartos personalizados: porcentajes en centésimas de porcentaje o racionales; suma 100% exacta, reparto final por método de restos mayores y desempate determinista.
- Saldos se calculan a partir de gastos válidos y abonos; nunca son un total editable de forma independiente.
- Un gasto eliminado lógicamente no impacta balances ni presupuesto, pero permanece en el historial.
- Optimización de deudas entre N personas puede hacerse proponiendo transferencias desde saldos negativos a positivos, sin alterar el histórico.
- Las categorías y la fecha se usan para agrupar gastos, pero no alteran los cálculos monetarios.
- Si un conflicto afecta un gasto, no mostrar una cifra como definitiva.

## 4. Arquitectura recomendada

- **Frontend:** React + TypeScript + Vite.
- **UI:** CSS propio con design tokens; iconos consistentes tipo Lucide; sin librería visual grande en MVP.
- **PWA:** vite-plugin-pwa / Workbox con configuración explícita de cache y actualización.
- **Autenticación:** Firebase Auth, proveedor permanente del organizador y acceso anónimo de invitados.
- **Datos:** Cloud Firestore (edición Standard) con reglas de seguridad y cache IndexedDB persistente.
- **Imágenes abiertas:** Openverse API con atribución y comportamiento graceful sin conexión.
- **Hosting inicial:** Firebase Hosting (Spark); posterior frontend estático en Raspberry con HTTPS. Firestore sigue en nube y es independiente de que Raspberry esté encendida.
- **Estado/UI:** TanStack Query o capa de repositorio propia solo si aporta valor; evitar estado duplicado con Firestore.
- **Validación:** Zod para modelos compartidos y formularios.
- **Testing:** Vitest para motor de cálculo; Firebase Emulator Suite para reglas y sincronización; Playwright para flujos web/PWA.
- **CI:** GitHub Actions, formato/lint/tests/build.
- **Reglas:** restringir lecturas a miembros, escrituras autorizadas por rol, invitaciones no enumerables, no confiar en nombre visible, restringir membresía a 10 y validar payloads. Revisar abuso de identidades anónimas.
- **Operaciones:** no se necesitan Cloud Functions de pago para MVP; documentar cualquier flujo que requiera garantías adicionales antes de implementarlo.

## 5. Modelo conceptual preliminar

- `users/{uid}`: perfil mínimo, auth provider.
- `trips/{tripId}`: ownerId, title, dates, timezone, currency, status, budget, settings, cover, version.
- `trips/{tripId}/members/{uid}`: nombre, rol, estado, joins; el conteo o cupos se valida online con reglas y escrituras atómicas.
- `trips/{tripId}/invites/{inviteId}`: token opaco, caducidad, revocación; acceso controlado; nunca index/listado público.
- `trips/{tripId}/expenses/{expenseId}`: id, autor, día, total (entero), aportes, cuotas, imagen ref, estado de conflicto, revisión.
- `trips/{tripId}/expenseEvents/{eventId}`: registro inmutable de cambios, revisión base, payload, actor, ID de operación.
- `trips/{tripId}/settlements/{settlementId}`: origen, destino, monto, estado, autor.
- `trips/{tripId}/attachments/{attachmentId}`: miniatura opcional, metadata y tamaño tope.
- `trips/{tripId}/dailyBudgets/{date}`: distribución manual/automática.
- `trips/{tripId}/conflicts/{conflictId}`: propuestas de edición/duplicación, estado y resolución.

*La estructura exacta se decidirá en arquitectura. No permitir que Codex improvise esquemas divergentes entre módulos.*

## 6. Pantallas previstas (móvil primero)

1. Bienvenida / acceso como organizador / unirse con QR o código.
2. Selección de viaje (activo destacado e historial).
3. Inicio de viaje: saldo, presupuesto disponible, gasto de hoy, lista cronológica y botón fijo «+ Gasto».
4. Añadir/editar gasto: nombre, importe, pagadores, división, categoría, imagen, nota, fecha.
5. Desglose de gasto y auditoría de modificaciones.
6. Participantes, invitación QR y estado de acceso.
7. Presupuesto total y diario (editar asignaciones, desbordes).
8. Balances y registrar abono.
9. Estadísticas sencillas.
10. Actividad, pendientes de sincronización y resolución de conflictos.
11. Resumen y cierre de viaje.

## 7. Guía de diseño (evitar interfaz genérica de IA)

- Inspiración iOS minimalista: jerarquía tipográfica clara, abundante aire, contraste AA, composición intencional, contenido primero.
- No abusar de tarjetas, sombras, bordes, degradados ni efecto glassmorphism; usar separadores sutiles y grupos por espacio.
- Máximo un acento cromático principal, paleta sobria y valores definidos en tokens; no mezclar muchos estilos de iconos.
- Una acción principal evidente; importe y saldo con máxima legibilidad; teclado numérico para montos.
- Estados reales: carga, vacío, sin conexión, pendiente, conflicto, fallo, formulario inválido, viaje finalizado.
- Mobile-first, safe areas iOS, targets >=44 px, tipografía sistema; contenido responsivo a escritorio.
- No hacer navegación confusa ni modales anidados. Usar formularios progresivos para una captura rápida.
- No agregar funciones sociales/románticas ni gamificación.

## 8. Fases de Codex y criterios de salida

**Fase 0 — Documentación y decisiones.** Crear `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/CALCULATION_RULES.md`, `docs/OFFLINE_SYNC.md`, `docs/UI_GUIDELINES.md`, `docs/TEST_PLAN.md`, `docs/DECISIONS.md`. Confirmar límites de servicio. Criterio: cada función tiene definición y al menos un caso de prueba. **No implementar código productivo.**

**Fase 1 — Wireframes y diseño.** Flujos y prototipos de pantallas principales, variantes móvil/escritorio y todos los estados. Criterio: agregar gasto puede hacerse en pocos pasos; diseño aprobado visualmente.

**Fase 2 — Base PWA.** Vite React TS, CSS tokens, routing, PWA/offline shell, Firebase emulators, ESLint, Vitest, Playwright smoke, scripts. Criterio: PWA instalable, abre tras recargar offline y CI verde.

**Fase 3 — Motor financiero probado.** Modelos y funciones puras: reparto, múltiples pagadores, abonos, saldos, presupuesto diario, redondeo. Criterio: tests con 2 a 10 miembros y dinero impar, invariante de suma cero.

**Fase 4 — Usuarios, viajes e invitaciones.** Cuenta de organizador, invitados anónimos, QR, límite 10, reglas de acceso, crear/cerrar viajes. Criterio: invitado sin email participa, desconocidos no leen, usuario eliminado no accede, no hay grupo de 11.

**Fase 5 — Gastos compartidos y presupuestos.** CRUD, historial, balances, abonos, alertas y estadísticas sencillas, primero online. Criterio: dos navegadores reflejan actualizaciones correctas.

**Fase 6 — Offline-first, conflictos y duplicados.** Cache, cambios pendientes, reconciliación, operaciones idempotentes, conflictos por edición y duplicados candidatos. Criterio: dos dispositivos crean y editan sin internet, reconectan y no pierden movimientos ni cuentan dos veces las operaciones.

**Fase 7 — Fotografías e imágenes abiertas.** Openverse + atribuciones, cámara, miniaturas limitadas, fallback sin conexión. Criterio: falla de imagen no afecta la contabilidad, nada exige Blaze.

**Fase 8 — QA, accesibilidad, seguridad, despliegue.** Reglas Emulator Suite, E2E, pruebas de desconexión reales, instalación en Android e iOS, rendimiento, hosting Spark y guía Raspberry. Criterio: flujos críticos probados en dos dispositivos, privacidad y recuperación documentadas.

## 9. Casos de prueba prioritarios

1. 2 personas, gastos alternados, saldo neto correcto.
2. 3 personas, monto no divisible entre 3; sumas exactas.
3. 10 personas, 50/50 no aplica; reparto 10% c/u.
4. Una persona exenta, los restantes absorben el total.
5. Porcentajes que sumen 99,99% o 100,01% se rechazan con mensaje claro.
6. Dos pagadores para un solo gasto; no duplicar el importe.
7. Abono parcial y abono total; saldo queda en cero.
8. Presupuesto $400.000/4 días, día 1 $250.000, cupo de días restantes $50.000.
9. Dos cafés legítimos con nombre idéntico se mantienen separados.
10. Dos cargas del mismo gasto se detectan como candidato de duplicado; al unificar queda un único importe efectivo e historial íntegro.
11. Dos ediciones offline del mismo gasto originan conflicto visible, no pérdida silenciosa.
12. Desconexión/reconexión repetidas sin duplicar eventos.
13. Invitación caducada/revocada no permite entrar; no miembros no pueden leer.
14. Intento de agregar participante 11 rechazado en servidor.
15. Fallo de subida de foto no borra el gasto.
16. Recarga offline con viaje previamente cacheado funciona en iOS/Android compatibles.
17. Logout o limpieza de navegador no se confunde con recuperación garantizada de invitado anónimo.

## 10. Decisiones por ratificar, que no bloquean el diseño

- Nombre definitivo de la aplicación.
- Método de cuenta permanente del organizador: Google, correo/contraseña o ambos.
- Estilo de moneda: COP como predeterminado y elección por viaje, sin conversiones en MVP.
- Acceso de miembro invitado que pierde su dispositivo: solo reinvitación por organizador para MVP; recuperación robusta posterior.
- Regla exacta de presupuestos diarios fijados manualmente vs redistribución automática.
- Fotos: tamaño máximo de miniatura y política de retención en Firestore; valorar si conviene habilitar fotos compartidas en 1.0 o 1.1.
- Confirmación requerida para cerrar viajes con gastos sin resolver.

## 11. Primer prompt para Codex — Fase 0

> Estamos diseñando una PWA de gastos compartidos de 2 a 10 personas, offline-first, con Firebase Auth (organizador permanente e invitados anónimos mediante QR/código), Firestore, React/TS/Vite, saldos matemáticamente exactos, presupuestos diarios y conflictos explícitos. Usa el documento `PLAN_MVP_GASTOS_COMPARTIDOS.md` como fuente de verdad. **En esta fase NO escribas código de la aplicación.** Inspecciona el repositorio y crea/actualiza los documentos de requisitos, arquitectura, modelo de datos, reglas financieras, sincronización offline, reglas de seguridad propuestas, UX, decisiones y plan de pruebas. Identifica riesgos técnicos (acceso anónimo, invitaciones, máximo 10 usuarios, fotos sin Blaze, operaciones concurrentes), plantea soluciones concretas que funcionen en Firebase Spark y registra alternativas/compromisos. Documenta contratos de datos, invariantes, casos de prueba y criterios de aceptación de cada fase. Evita funcionalidades no pedidas, dependencias de pago, suposiciones sobre el comportamiento de Firestore y soluciones que pierdan cambios silenciosamente. Devuelve un resumen de archivos creados, decisiones pendientes y problemas que debamos validar antes de iniciar la Fase 1. No hagas commits ni push.

## Referencias verificadas (noviembre de 2026)

- Firestore persistencia offline y última escritura: https://firebase.google.com/docs/firestore/manage-data/enable-offline
- Firestore transacciones vs batches sin conexión: https://firebase.google.com/docs/firestore/manage-data/transactions
- Cuotas de Firestore Standard: https://firebase.google.com/docs/firestore/quotas
- Auth anónima: https://firebase.google.com/docs/auth/web/anonymous-auth
- Persistencia de identidad: https://firebase.google.com/docs/auth/web/auth-state-persistence
- Cloud Storage y Blaze: https://firebase.google.com/docs/storage/faq-and-troubleshooting
- Firebase Hosting: https://firebase.google.com/docs/hosting/usage-quotas-pricing
- Openverse (API gratuita sin auth en modo anónimo): https://api.openverse.org/v1/
