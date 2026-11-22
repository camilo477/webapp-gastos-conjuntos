# Requisitos del MVP

Fecha: 2026-11-21. Fuente: [plan original](PLAN_MVP_GASTOS_COMPARTIDOS.md). Estado: especificación de Fase 0, pendiente de ratificación de las decisiones señaladas.

## Objetivo y alcance

Un grupo de 2–10 personas registra compras y abonos de un viaje de uno o varios días, consulta presupuestos, conoce quién debe pagar a quién y conserva un historial de cambios. El organizador tiene cuenta recuperable; los invitados no necesitan correo. La sesión puede crearse con el organizador solo y queda «esperando participantes» hasta llegar a dos. El máximo incluye al organizador.

Se ofrece PWA para Android, iOS y escritorio. COP es el valor inicial; cada viaje usa una sola moneda sin conversiones. La cuenta, la primera incorporación, las invitaciones, la administración de acceso y el cierre requieren conexión. Los viajes previamente descargados permiten captura y cálculo local.

Fuera del MVP: pagos bancarios, cambio de moneda, OCR, originales fotográficos, notificaciones garantizadas en segundo plano, recuperación automática de invitados, funcionalidades sociales y backend de pago. Los iconos locales no requieren servicios externos.

## Requisitos trazables

| ID | Función y aceptación observable | Pruebas |
| --- | --- | --- |
| RF-01 | Organizador se registra, entra y recupera contraseña; ningún anónimo puede crear un viaje como propietario. Propuesta: correo/contraseña con correo verificado para crear. | AUTH-01, AUTH-02 |
| RF-02 | Invitado entra online por QR/enlace o código completo, indica nombre y mantiene su UID en ese navegador. Advertencia explícita sobre pérdida de acceso. | AUTH-03, AUTH-04 |
| RF-03 | Invitación caduca, puede revocarse, no permite enumeración ni lectura previa de datos privados. Once miembros simultáneos son imposibles bajo reglas. | SEC-01–SEC-06 |
| RF-04 | Crear viaje con título, destino opcional, fechas inclusivas, zona IANA, moneda y portada opcional. Un viaje destacado es preferencia local; otros activos siguen accesibles. | TRIP-01 |
| RF-05 | Historial de viajes cerrados consultable. Solo propietario cierra online; deudas pueden permanecer, conflictos conocidos bloquean cierre. | TRIP-02, SYNC-09 |
| RF-06 | Gasto con título, total positivo, categoría, fecha/hora y nota; uno o varios pagadores suman exactamente el total. | FIN-01, FIN-05, VAL-01 |
| RF-07 | Reparto igual, exclusiones o porcentajes exactos; cuotas enteras, suma conservada y desempate estable. | FIN-02–FIN-04, FIN-10 |
| RF-08 | Todos los miembros activos crean, editan o eliminan lógicamente gastos. Cada cambio conserva autor autenticado, antes/después y revisión base. | AUD-01, SEC-07 |
| RF-09 | Registrar abonos entre dos personas distintas, consultar saldos y sugerencias de pago. Abonos no aumentan costo ni gasto presupuestario. | FIN-06, FIN-11 |
| RF-10 | Presupuesto opcional, cupos diarios automáticos/manuales, disponible y exceso claros; exceso redistribuye días futuros desbloqueados. | BUD-01–BUD-05 |
| RF-11 | Estadísticas por día, categoría y participante derivadas del mismo conjunto financiero válido. | STAT-01 |
| RF-12 | Abrir shell y viaje descargado tras recarga offline; registrar cambios locales durables con estado visible. | PWA-01, SYNC-01, SYNC-10 |
| RF-13 | Reintentos no duplican operaciones; ediciones incompatibles permanecen como propuestas visibles y balances provisionales. | SYNC-02–SYNC-06 |
| RF-14 | Dos cafés distintos pueden conservarse; unificar duplicados conserva auditoría y deja un único importe efectivo. | DUP-01–DUP-04 |
| RF-15 | Una miniatura opcional por gasto, comprimida hasta 40 KiB y guardada aparte. Fallo de imagen no pierde dinero. | IMG-01–IMG-03 |
| RF-16 | Búsqueda Openverse online con fuente, creador y licencia persistidos; fallback local cuando falla. | IMG-04, IMG-05 |
| RF-17 | Interfaz móvil accesible: navegación clara, teclado numérico, controles ≥44 px, estados reales y uso con teclado/lector. | UX-01–UX-03 |

## Comportamientos de producto

- El nombre visible no identifica una cuenta ni recupera deudas. Un invitado reincorporado recibe identidad nueva salvo reasignación explícita del organizador a la persona histórica; se revoca el acceso anterior y se conserva el `personId`.
- Expulsar a alguien revoca nuevas lecturas/escrituras del servidor, pero conserva sus compras y deudas. No permite borrar datos ya descargados en otro dispositivo.
- «Guardado en este dispositivo» significa persistencia local confirmada; «Sincronizado» requiere confirmación del servidor y proyección completa. Un caché parcial jamás se presenta como viaje completo.
- Un conflicto no se resuelve eligiendo la última hora. Se conserva cada propuesta y se requiere una resolución registrada.
- Duplicados son candidatos, no decisiones automáticas. La misma operación reenviada se reconoce por ID; dos operaciones distintas se analizan por contenido.
- El cierre congela movimientos en servidor. No implica saldo cero ni permite saber si otro dispositivo desconectado tiene cambios. Los cambios rechazados al reconectar se conservan y se pueden copiar/exportar; no se reabre automáticamente.

## Entregas y puertas de salida

| Fase | Entregable | Criterio de salida |
| --- | --- | --- |
| 0 | Estos documentos y fuente versionable | Cada RF enlaza pruebas; contratos únicos, riesgos y propuestas explícitos. Sin código productivo. |
| 1 | Flujos y wireframes de las 11 pantallas, móvil/escritorio y estados | Captura rápida, recorrido accesible y aprobación visual del usuario. |
| 2 | React/TS/Vite, routing, tokens, shell PWA, emuladores, lint, Vitest, smoke Playwright y CI | Build/lint/tests verdes, manifiesto válido y recarga offline del shell. |
| 3 | Motor puro y modelos compartidos | Casos de 2–10 personas, propiedades de conservación y presupuesto pasan. |
| 4 | Auth, viajes, invitaciones, QR y reglas | Invitado sin email participa; desconocidos/revocados no acceden; carrera por cupo 10 validada en Emulator Suite. |
| 5 | Gastos, auditoría, balances, abonos y estadísticas online | Dos contextos de navegador convergen sin saldos editables. Ya se escribe el registro inmutable; no se migra después desde CRUD destructivo. |
| 6 | Persistencia durable, cola, conflictos y duplicados | Dos dispositivos offline reconectan sin pérdida ni duplicación por reintento; las ramas quedan visibles. |
| 7 | Fotos y Openverse | Falla del adjunto aislada, atribución completa y ninguna dependencia de Blaze. |
| 8 | QA, accesibilidad, seguridad y preparación de hosting | E2E críticos, reglas, Android/iOS reales, presupuestos de recursos y guía Raspberry verificados. Publicación solo con autorización. |

## Estado de esta entrega

La documentación es revisable; no se han ejecutado pruebas de aplicación ni configurado un proyecto Firebase. Las decisiones de producto siguen propuestas. Las hipótesis de reglas, DAG y admisión deben validarse en las fases técnicas indicadas en [TEST_PLAN](TEST_PLAN.md); redactarlas no demuestra que funcionen.
