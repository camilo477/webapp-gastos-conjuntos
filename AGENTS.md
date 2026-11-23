# Instrucciones del repositorio para Codex

## Alcance y estado

Proyecto de gastos compartidos. Leer `README.md`, la documentación de la fase
afectada y el plan antes de cambiar comportamiento. La Fase 1 fue aceptada
provisionalmente por el usuario el 2026-11-22 para continuar a Fase 2;
consultar `docs/phase1/AUTOMATED_TEST_REPORT.md` para conservar resultados
y pruebas multiplataforma pendientes. La Fase 2 está expresamente autorizada:
React/TypeScript/Vite, Firebase limitado a emuladores y shell PWA. No rediseñar
ni reemplazar el prototipo. El usuario autorizó expresamente la Fase 3: motor
financiero puro y modelos de dominio, sin integración con gastos reales.
La Fase 3 está publicada (`7524563`). El usuario autorizó expresamente Fase 4:
Auth, viajes e invitaciones exclusivamente en emuladores, con reglas reales.
Cierre y reasignación siguen deshabilitados por consistencia/identidad pendientes.
La Fase 4 se verificó publicada en `545fb36`. El usuario autorizó expresamente
Fase 5 el 2026-11-23: eventos financieros v2 inmutables, gastos, abonos, historial,
balances, presupuestos y estadísticas exclusivamente online en emuladores.
La Fase 5 se verificó publicada en `a89e2b630426929fd9fe33dc8184a65825fc252c`.
El usuario autorizó Fase 6 el 2026-11-23: IndexedDB durable por proyecto/UID,
outbox, sincronización activa, conflictos y unificaciones atómicas v2.
Consultar `docs/phase6/REPORT.md` y `docs/phase6/PLAN.md` para arquitectura,
pruebas y publicación real. La Fase 6 se verificó publicada en
`926aef92b9d1820f913252001c3d424893dc5d6f`. El usuario autorizó Fase 7 el
2026-11-23: imágenes opcionales, WebP ≤640 px/40960 bytes, IndexedDB y adjuntos
inmutables separados en Firestore; Openverse anónimo CC0/CC BY. Consultar
`docs/phase7/PLAN.md` y `docs/phase7/REPORT.md`. Nuevos visuales financieros:
icono/null más attachmentId; atribución completa solo en el adjunto. No almacenar
originales ni bytes en eventos/SW, ni usar Storage/Blaze/Functions. Gasto durable
antes del adjunto; sus entregas y reintentos son independientes. Migración local
v2→v3 aditiva. No afirmar cámara física o API pública verificada por usar mocks.
Fase 7 publicada en `a9ac5e22171681ad7319246b555695fcfe2c02aa`. El usuario
autorizó Fase 8A: estabilización, auditoría y reparación de CI. Consultar
`docs/phase8a/RISK_INVENTORY.md` y `docs/phase8a/REPORT.md`. Se recibió la
continuación completa: auditorías financiera/offline/seguridad, compatibilidad,
rendimiento y preparación documental. No declarar completa Fase 8A por reparar CI.
Mantener producción deshabilitada; cierre y reasignación requieren garantías
demostradas y decisiones ratificadas. No iniciar Fase 8B ni desplegar.
Mantener Firestore en memoria: la cola propia es la única cola financiera.
No afirmar guardado hasta completar la transacción IDB ni confirmación antes de
read-back canónico del servidor. No descartar propuestas rechazadas. No producir
saldos fuera del motor ni resolver por timestamps. Los pares merge son atómicos;
componentes incompatibles permanecen provisionales. Cierre y reasignación siguen
bloqueados. Firebase solo demo-/loopback, incluido build `emulator-pwa` explícito.

## Git y publicación

Estas reglas proceden de la autorización explícita del usuario para mantener
el historial y publicar los cambios validados. Sustituyen la restricción
anterior de no hacer commits ni push para este proyecto.

- Repositorio: `https://github.com/camilo477/webapp-gastos-conjuntos.git`.
- Rama principal: `main`. Inspeccionar estado, rama, remotos y commits antes
  de cambiar archivos. Conservar modificaciones ajenas e historiales existentes.
- Usar la identidad Git existente. No reemplazar configuración global.
- Cada fase completada debe tener commits propios con mensajes descriptivos.
  Las correcciones importantes deben quedar registradas. Separar fases cuando
  sea razonable; la importación inicial puede reunir los entregables existentes
  de Fase 0 y Fase 1, sin declarar aprobada la Fase 1.
- Ejecutar las pruebas disponibles antes de publicar. Documentar con precisión
  las pruebas bloqueadas o pendientes; nunca presentar DOM como navegador real.
- Revisar todo el contenido preparado con `git diff --cached`, comprobar
  `.gitignore` y auditar secretos antes de cada publicación. La autorización
  para publicar no incluye secretos, datos reales de participantes ni basura
  temporal. Si aparece un secreto real en archivos o historial, detener la
  publicación y explicar el problema sin reproducir el secreto.
- Mantener `.gitignore`: conservar fuentes, documentación, diseño, composiciones
  de referencia, fixtures auditados y pruebas; excluir credenciales,
  dependencias, cachés, compilaciones y ejecuciones voluminosas regenerables.
- Hacer push al finalizar cambios validados dentro del alcance autorizado.
  Si el remoto tiene avances, fetch e inspección antes de integrar; no
  sobrescribir historiales ni resolver conflictos descartando trabajo ajeno.
- Nunca utilizar force push, borrar documentación o resultados anteriores,
  ejecutar Git destructivo ni cambiar de rama sin autorización. Crear/configurar
  `main` para la importación inicial está autorizado por el usuario.
- Tras publicar, verificar SHA remoto, seguimiento `origin/main`, archivos
  necesarios y estado local. No declarar éxito sin comprobar el remoto.
- Si permisos o autenticación bloquean Git, conservar todo el trabajo,
  documentar el bloqueo y proporcionar los comandos exactos para una terminal
  normal. No eludir controles del entorno ni usar sudo/root.

## Trabajo y verificación

Al finalizar cada fase: ejecutar pruebas disponibles, corregir errores
reproducibles, actualizar documentación, revisar `.gitignore`, auditar secretos,
crear commits descriptivos, hacer push a `origin/main` y verificar el SHA remoto
y el estado local. Una prueba omitida o bloqueada no cuenta como aprobada. Si
`.git` está protegido, no intentar eludirlo: entregar comandos mínimos para una
terminal normal y distinguir lo preparado de lo realmente publicado.

Entender el código antes de editarlo; aplicar la corrección mínima, añadir las
regresiones necesarias, ejecutar las comprobaciones relevantes y revisar el
resultado. No añadir dependencias o abstracciones innecesarias. El prototipo y
las pantallas de demostración usan datos ficticios. El shell PWA no constituye
persistencia financiera ni sincronización real.

La revisión con Gemini es opcional: usarla cuando aporte valor y esté disponible
y autorizada, sin enviar secretos ni datos privados. Si falta autenticación o
falla, seguir con revisión propia y señalarlo en el informe final.
